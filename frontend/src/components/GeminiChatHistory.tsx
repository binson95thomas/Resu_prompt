import React, { useState } from 'react';
import { Clipboard, ClipboardCheck } from 'lucide-react';

export type ChatEntry = {
  question: string;
  answer: string;
  timestamp: string;
  model?: string;
  promptSource?: string;
};

function tryPrettyPrintJSON(str: string) {
  try {
    const obj = JSON.parse(str);
    return <pre className="whitespace-pre-wrap break-words bg-green-50 p-2 rounded text-green-900 text-xs font-mono">{JSON.stringify(obj, null, 2)}</pre>;
  } catch {
    return <pre className="whitespace-pre-wrap break-words bg-green-50 p-2 rounded text-green-900 text-xs font-mono">{str}</pre>;
  }
}

function CollapsibleBlock({ label, content }: { label: string; content: string }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className="relative group">
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-xs text-gray-500 uppercase tracking-wider">{label}</span>
        <button
          className="ml-2 p-1 rounded hover:bg-gray-200 transition"
          onClick={handleCopy}
          title="Copy to clipboard"
        >
          {copied ? <ClipboardCheck className="h-4 w-4 text-green-600" /> : <Clipboard className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />}
        </button>
        <button
          className="ml-2 text-xs text-blue-600 underline hover:text-blue-800"
          onClick={() => setExpanded(e => !e)}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      <div className={`transition-all ${expanded ? '' : 'max-h-32 overflow-hidden blur-sm'}`}
        style={{ fontFamily: 'monospace', fontSize: '0.85rem', background: '#f8fafc', borderRadius: 6, padding: 8, marginBottom: 8 }}>
        {content}
      </div>
    </div>
  );
}

export default function GeminiChatHistory({ open, onClose, chatHistory, onClearChat }: { open: boolean, onClose: () => void, chatHistory: ChatEntry[], onClearChat: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl h-5/6 relative flex flex-col mobile-modal">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Chat History</h2>
          <div className="flex space-x-2">
            <button
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
              onClick={onClearChat}
            >
              Clear All
            </button>
            <button 
              className="text-gray-400 hover:text-gray-700 text-2xl" 
              onClick={onClose}
              aria-label="Close"
            >
              &times;
            </button>
          </div>
        </div>
        
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatHistory.length === 0 && (
            <div className="text-gray-500 text-center mt-8">
              <div className="text-lg font-medium mb-2">No chat history yet</div>
              <div className="text-sm">Your optimization conversations will appear here</div>
            </div>
          )}
          {chatHistory.map((entry, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleString()}</span>
                  {entry.model && (
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                      {entry.model}
                    </span>
                  )}
                  {entry.promptSource && (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      entry.promptSource === 'fallback' 
                        ? 'bg-red-100 text-red-800' 
                        : entry.promptSource === 'shared-template'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {entry.promptSource === 'fallback' ? '⚠️ Fallback' : 
                       entry.promptSource === 'shared-template' ? '✅ Shared Template' :
                       entry.promptSource === 'manual' ? '📝 Manual' : entry.promptSource}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Prompt */}
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">Prompt to AI Model</h4>
                  <CollapsibleBlock label="View Prompt" content={entry.question} />
                </div>
                
                {/* Response */}
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">AI Response</h4>
                  <CollapsibleBlock label="View Response" content={entry.answer} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 