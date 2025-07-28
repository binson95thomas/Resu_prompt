import React, { useState } from 'react';

export default function SettingsModal({ open, onClose, onSave, initialUserName, initialResumeFolder, initialApiHitLimit, initialApiHitsUsed, initialApiResetTime, initialApiResetFrequency }) {
  const [userName, setUserName] = useState(initialUserName || '');
  const [resumeFolder, setResumeFolder] = useState(initialResumeFolder || '');
  const [apiHitLimit, setApiHitLimit] = useState(initialApiHitLimit || 50);
  const [apiHitsUsed, setApiHitsUsed] = useState(initialApiHitsUsed || 0);
  const [apiResetTime, setApiResetTime] = useState(initialApiResetTime || '00:00');
  const [apiResetFrequency, setApiResetFrequency] = useState(initialApiResetFrequency || 'daily');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative mobile-modal">
        <h2 className="text-xl font-bold mb-4">Settings</h2>
        <label className="block mb-2 font-medium">Your Name</label>
        <input
          type="text"
          className="input-field w-full mb-4"
          value={userName}
          onChange={e => setUserName(e.target.value)}
          placeholder="e.g. Binson Sam Thomas"
        />
        <label className="block mb-2 font-medium">Resume Output Folder</label>
        <input
          type="text"
          className="input-field w-full mb-4"
          value={resumeFolder}
          onChange={e => setResumeFolder(e.target.value)}
          placeholder="e.g. D:/Personal_Projects/Resumes"
        />
        
        <label className="block mb-2 font-medium">API Hit Limit</label>
        <input
          type="number"
          min="1"
          max="1000"
          className="input-field w-full mb-4"
          value={apiHitLimit}
          onChange={e => setApiHitLimit(parseInt(e.target.value) || 50)}
          placeholder="50"
        />
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-2 font-medium text-sm">Reset Frequency</label>
            <select
              className="input-field w-full"
              value={apiResetFrequency}
              onChange={e => setApiResetFrequency(e.target.value)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="never">Never</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 font-medium text-sm">Reset Time</label>
            <input
              type="time"
              className="input-field w-full"
              value={apiResetTime}
              onChange={e => setApiResetTime(e.target.value)}
            />
          </div>
        </div>
        
        <label className="block mb-2 font-medium">Reset API Hits Used</label>
        <button
          className="btn-secondary w-full mb-4"
          onClick={() => setApiHitsUsed(0)}
        >
          Reset to 0
        </button>
        
        <div className="flex justify-end space-x-2 mt-6">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={() => {
              onSave({ userName, resumeFolder, apiHitLimit, apiHitsUsed, apiResetTime, apiResetFrequency });
              onClose();
            }}
            disabled={!userName.trim() || !resumeFolder.trim()}
          >
            Save
          </button>
        </div>
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={onClose} aria-label="Close">&times;</button>
      </div>
    </div>
  );
} 