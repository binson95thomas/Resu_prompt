import React from 'react';
import { Clipboard, Copy, X } from 'lucide-react';

interface ManualOptimizationModalProps {
  open: boolean;
  onClose: () => void;
  onCopyPrompt: () => void;
  onPasteResponse: () => Promise<void>;
  manualResponse: string;
  setManualResponse: (response: string) => void;
  copiedPrompt: boolean;
  isCopyingPrompt: boolean;
  disabled: boolean;
}

export default function ManualOptimizationModal({
  open,
  onClose,
  onCopyPrompt,
  onPasteResponse,
  manualResponse,
  setManualResponse,
  copiedPrompt,
  isCopyingPrompt,
  disabled
}: ManualOptimizationModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl h-5/6 relative flex flex-col mobile-modal">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Clipboard className="mr-2" />
            Manual Generation
          </h2>
          <button 
            className="text-gray-400 hover:text-gray-700 text-2xl" 
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Copy Prompt Button */}
          <div>
            <button
              onClick={onCopyPrompt}
              className={`w-full btn-primary flex items-center justify-center ${copiedPrompt ? 'bg-green-600' : ''} ${isCopyingPrompt ? 'opacity-80' : ''}`}
              disabled={disabled || isCopyingPrompt}
            >
              {isCopyingPrompt ? <span className="spinner mr-2"></span> : <Copy className="w-4 h-4 mr-2" />}
              {isCopyingPrompt ? 'Copying...' : copiedPrompt ? 'Copied!' : 'Copy Prompt'}
            </button>
            <p className="text-xs text-gray-600 mt-1">
              Copy the prompt to use with any AI model
            </p>
          </div>

          {/* Paste Response Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paste AI Response
            </label>
            <textarea
              value={manualResponse}
              onChange={(e) => setManualResponse(e.target.value)}
              placeholder="Paste the JSON response from your AI model here..."
              className="w-full h-64 p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
                              onClick={async () => await onPasteResponse()}
              className="w-full btn-secondary mt-2 flex items-center justify-center"
              disabled={!manualResponse.trim()}
            >
              <Clipboard className="w-4 h-4 mr-2" />
              Process Response
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-3">Manual Generation Instructions:</h4>
            <ol className="text-sm text-blue-800 space-y-2">
              <li>1. Click "Copy Prompt" to get the complete generation prompt</li>
              <li>2. Paste it into any AI model (ChatGPT, Claude, etc.)</li>
              <li>3. Get the JSON response from the AI (make sure it includes the "model" field)</li>
              <li>4. Paste the response in the text area above</li>
              <li>5. Click "Process Response" to apply the results</li>
            </ol>
            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
              <span className="text-green-800 text-xs">✅ Uses exact same prompt as API - CV text automatically included</span>
            </div>
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <span className="text-yellow-800 text-xs">ℹ️ The AI will automatically include its model name in the response</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 