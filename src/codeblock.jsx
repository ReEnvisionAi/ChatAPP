import React, { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Sandpack } from '@codesandbox/sandpack-react';
import { nightOwl } from '@codesandbox/sandpack-themes';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faCode, faCopy, faCheck } from '@fortawesome/free-solid-svg-icons';

export const CodeBlock = ({ node, inline, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const [showSandpack, setShowSandpack] = useState(false);
  const [copied, setCopied] = useState(false);
  const [files, setFiles] = useState({});

  // Check if this is JavaScript/React code that can be run in Sandpack
  const isJavaScript = language === 'js' || language === 'jsx' || language === 'javascript';
  const isReact = language === 'jsx' || language === 'tsx' || language === 'react';
  const canRunInSandpack = isJavaScript || isReact;
  
  const code = String(children).replace(/\n$/, '');

  // Parse code to extract multiple files if they exist
  useEffect(() => {
    if (canRunInSandpack) {
      const extractedFiles = extractFilesFromCode(code);
      if (Object.keys(extractedFiles).length > 0) {
        setFiles(extractedFiles);
      } else {
        // If no files were extracted, use the default approach
        setFiles(getDefaultFiles());
      }
    }
  }, [code, canRunInSandpack, isReact]);

  // Extract files from code comments or special markers
  const extractFilesFromCode = (codeString) => {
    const extractedFiles = {};
    
    // Check if the code contains file markers like "// filename.js" or "/* filename.js */"
    const fileMarkerRegex = /\/\/\s*FILE:\s*([^\s]+)\s*\n([\s\S]*?)(?=\/\/\s*FILE:|$)/g;
    const fileCommentRegex = /\/\*\s*FILE:\s*([^\s]+)\s*\*\/\s*\n([\s\S]*?)(?=\/\*\s*FILE:|$)/g;
    
    // Try to match file markers
    let match;
    let foundFiles = false;
    
    // Check for // FILE: markers
    while ((match = fileMarkerRegex.exec(codeString)) !== null) {
      const [_, fileName, fileContent] = match;
      extractedFiles[`/${fileName.trim()}`] = { code: fileContent.trim() };
      foundFiles = true;
    }
    
    // Check for /* FILE: */ markers
    fileMarkerRegex.lastIndex = 0; // Reset regex index
    while ((match = fileCommentRegex.exec(codeString)) !== null) {
      const [_, fileName, fileContent] = match;
      extractedFiles[`/${fileName.trim()}`] = { code: fileContent.trim() };
      foundFiles = true;
    }
    
    // If we found explicit file markers, return those files
    if (foundFiles) {
      return extractedFiles;
    }
    
    // Check if the code appears to define multiple files using a common pattern
    // For example: "// index.js\n... code ...\n// styles.css\n... code ..."
    const simpleFileRegex = /\/\/\s*([^\/\s]+\.[a-zA-Z]+)\s*\n([\s\S]*?)(?=\/\/\s*[^\/\s]+\.[a-zA-Z]+\s*\n|$)/g;
    
    while ((match = simpleFileRegex.exec(codeString)) !== null) {
      const [_, fileName, fileContent] = match;
      // Only treat as a file marker if the filename has a valid extension
      if (/\.[a-zA-Z]+$/.test(fileName)) {
        extractedFiles[`/${fileName.trim()}`] = { code: fileContent.trim() };
        foundFiles = true;
      }
    }
    
    return foundFiles ? extractedFiles : {};
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Prepare default files for Sandpack if no explicit files were found
  const getDefaultFiles = () => {
    if (isReact) {
      // For React code, set up App.js with the code
      const defaultFiles = {
        '/App.js': {
          code: code.includes('export default') || code.includes('ReactDOM.render') 
            ? code 
            : `import React from 'react';\n\n${code}\n\nexport default App;`,
        },
        '/index.js': {
          code: `import React from 'react';\nimport ReactDOM from 'react-dom';\nimport App from './App';\n\nReactDOM.render(<App />, document.getElementById('root'));`,
          hidden: true,
        },
      };
      
      // Check if code references CSS files
      if (code.includes('import') && code.includes('.css')) {
        const cssImportRegex = /import\s+['"](.+\.css)['"]/g;
        let cssMatch;
        
        while ((cssMatch = cssImportRegex.exec(code)) !== null) {
          const cssFileName = cssMatch[1];
          // Add an empty CSS file to prevent import errors
          defaultFiles[`/${cssFileName}`] = { code: '/* CSS styles */' };
        }
      }
      
      return defaultFiles;
    } else {
      // For vanilla JavaScript, use index.js
      const defaultFiles = {
        '/index.js': { code },
        '/index.html': {
          code: `<!DOCTYPE html>
<html>
  <head>
    <title>JavaScript Example</title>
    <meta charset="UTF-8" />
  </head>
  <body>
    <div id="app"></div>
    <script src="index.js"></script>
  </body>
</html>`,
          hidden: true,
        },
      };
      
      // Check if code references other JS files
      if (code.includes('import') || code.includes('require')) {
        const jsImportRegex = /(?:import|require)\s+(?:.*from\s+)?['"](.+\.js)['"]/g;
        let jsMatch;
        
        while ((jsMatch = jsImportRegex.exec(code)) !== null) {
          const jsFileName = jsMatch[1];
          // Add an empty JS file to prevent import errors
          if (!defaultFiles[`/${jsFileName}`]) {
            defaultFiles[`/${jsFileName}`] = { 
              code: '// This file was referenced in your code\n// Add your implementation here' 
            };
          }
        }
      }
      
      return defaultFiles;
    }
  };

  if (inline) {
    // Style for inline code
    return <code className="inline-code" {...props}>{children}</code>;
  } else {
    // Code block with syntax highlighting and optional Sandpack
    return (
      <div className="code-block-container">
        <div className="code-block-header">
          <span className="code-language">{language || 'text'}</span>
          <div className="code-actions">
            {canRunInSandpack && (
              <button 
                className="code-action-button"
                onClick={() => setShowSandpack(!showSandpack)}
                title={showSandpack ? "Hide live preview" : "Show live preview"}
              >
                <FontAwesomeIcon icon={showSandpack ? faCode : faPlay} />
                <span>{showSandpack ? "Hide Preview" : "Run Code"}</span>
              </button>
            )}
            <button 
              className="code-action-button"
              onClick={copyToClipboard}
              title="Copy code"
            >
              <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
              <span>{copied ? "Copied!" : "Copy"}</span>
            </button>
          </div>
        </div>
        
        <SyntaxHighlighter
          style={oneDark}
          language={language}
          PreTag="div"
          {...props}
        >
          {code}
        </SyntaxHighlighter>
        
        {showSandpack && canRunInSandpack && (
          <div className="sandpack-container">
            <Sandpack
              template={isReact ? "react" : "vanilla"}
              theme={nightOwl}
              files={files}
              options={{
                showNavigator: true,
                showTabs: true,
                showLineNumbers: true,
                showInlineErrors: true,
                closableTabs: false,
                wrapContent: true,
                editorHeight: 400,
                editorWidthPercentage: 60,
              }}
            />
          </div>
        )}
      </div>
    );
  }
};
