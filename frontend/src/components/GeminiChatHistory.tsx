import React, { useState } from 'react';
import { Clipboard, ClipboardCheck } from 'lucide-react';

export type ChatEntry = {
  question: string;
  answer: string;
  timestamp: string;
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

export default function GeminiChatHistory({ chatHistory, onClearChat, onBackToMain }: { chatHistory: ChatEntry[], onClearChat: () => void, onBackToMain: () => void }) {
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Modern Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur border-b border-gray-200 p-4 z-10 flex justify-between items-center shadow-sm">
        <button
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded shadow text-xs"
          onClick={onBackToMain}
        >
          ← Back
        </button>
        <h2 className="text-lg font-bold text-gray-900 tracking-tight">Gemini Chat History</h2>
        <button
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow text-xs"
          onClick={onClearChat}
        >
          Clear
        </button>
      </div>
      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-2 md:p-6 space-y-4">
        {chatHistory.length === 0 && <div className="text-gray-500 text-center mt-8">No chat history yet.</div>}
        {chatHistory.map((entry, idx) => (
          <div key={idx} className={`flex flex-col md:flex-row md:space-x-4 items-start group transition-shadow rounded-lg shadow-sm bg-white/90 hover:shadow-lg p-3 md:p-4 ${idx % 2 === 0 ? 'md:pl-12' : 'md:pr-12'}`}
            style={{ maxWidth: 900, margin: '0 auto' }}>
            {/* User Prompt (right) */}
            <div className="w-full md:w-1/2 flex flex-col items-end mb-2 md:mb-0">
              <CollapsibleBlock label="Prompt to Gemini" content={entry.question} />
              <span className="text-[10px] text-gray-400 mt-1">{new Date(entry.timestamp).toLocaleString()}</span>
            </div>
            {/* Gemini Response (left) */}
            <div className="w-full md:w-1/2 flex flex-col items-start">
              <CollapsibleBlock label="Gemini Response" content={entry.answer} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 