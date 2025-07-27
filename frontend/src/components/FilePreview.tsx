import React, { useEffect, useState } from 'react';

declare global {
  interface Window {
    mammoth: any;
  }
}

export default function FilePreview({ file }) {
  const [text, setText] = useState('');
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'formatted' | 'text'>('formatted');

    useEffect(() => {
    if (!file) {
      setText('');
      setHtml('');
      setError('');
      setIsLoading(false);
      return;
    }

    async function extractContent() {
      setError('');
      setText('');
      setHtml('');
      setIsLoading(true);
      
      try {
        // Try backend API first (more reliable)
        const formData = new FormData();
        formData.append('cv', file);
        
        const response = await fetch('/api/optimize/extract-cv-text', {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.cvText) {
            setText(data.cvText.split('\n').slice(0, 30).join('\n'));
            if (data.cvHtml) {
              setHtml(data.cvHtml);
              console.log('HTML received from backend:', data.cvHtml.substring(0, 200) + '...');
            } else {
              console.log('No HTML from backend, will try frontend mammoth');
            }
            return;
          }
        }
        
        // Fallback to frontend mammoth.js with HTML conversion
        let attempts = 0;
        while (!window.mammoth && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (window.mammoth) {
          const arrayBuffer = await file.arrayBuffer();
          
          // Get formatted HTML
          const htmlResult = await window.mammoth.convertToHtml({ arrayBuffer });
          setHtml(htmlResult.value);
          console.log('HTML from frontend mammoth:', htmlResult.value.substring(0, 200) + '...');
          
          // Get plain text as fallback
          const textResult = await window.mammoth.extractRawText({ arrayBuffer });
          setText(textResult.value.split('\n').slice(0, 30).join('\n'));
        } else {
          setError('Preview not available - mammoth.js not loaded.');
        }
      } catch (e) {
        console.error('Preview error:', e);
        setError('Failed to preview file.');
      } finally {
        setIsLoading(false);
      }
    }
    
    extractContent();
  }, [file]);

  if (!file) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden h-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Document Preview</h3>
              <p className="text-sm text-gray-600">Upload a CV to see preview</p>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Document Selected</h4>
              <p className="text-sm text-gray-600 max-w-xs mx-auto">
                Upload a CV file to see a preview of its contents here
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 truncate max-w-xs" title={file.name}>
                {file.name}
              </h3>
              <p className="text-xs text-gray-600">{(file.size/1024).toFixed(1)} KB</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isLoading && (
              <div className="flex items-center space-x-2 text-blue-600">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                <span className="text-xs font-medium">Processing...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-medium text-red-800">Preview Error</span>
            </div>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
        )}

        {(text || html) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">Document Preview</h4>
              <div className="flex items-center space-x-2">
                {html && (
                  <div className="flex bg-gray-100 rounded-md p-1">
                    <button
                      onClick={() => setViewMode('formatted')}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                        viewMode === 'formatted'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Formatted
                    </button>
                    <button
                      onClick={() => setViewMode('text')}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                        viewMode === 'text'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Text
                    </button>
                  </div>
                )}
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {html ? (viewMode === 'formatted' ? 'Full document' : 'First 30 lines') : 'Text only'}
                </span>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden max-h-[350px] overflow-y-auto">
              {viewMode === 'formatted' && html ? (
                <div 
                  className="p-4 document-preview"
                  dangerouslySetInnerHTML={{ __html: html }}
                  style={{
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    color: '#333'
                  }}
                />
              ) : (
                <div className="p-4 bg-gray-50">
                  <pre className="text-xs text-gray-800 leading-6 whitespace-pre-wrap font-mono">
                    {text}
                  </pre>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-center">
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                📄 Document loaded successfully
              </div>
            </div>
          </div>
        )}

        {!text && !error && !isLoading && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Preview Not Available</h4>
            <p className="text-sm text-gray-600 max-w-xs mx-auto">
              The document preview requires additional components to be loaded. The file has been uploaded successfully.
            </p>
          </div>
        )}

        {text && !html && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-xs font-medium text-yellow-800">Formatted Preview Unavailable</span>
            </div>
            <p className="text-xs text-yellow-700 mt-1">
              Only text preview is available. The formatted view requires additional processing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 