import React, { useState } from 'react';

export default function SettingsModal({ open, onClose, onSave, initialUserName, initialResumeFolder }) {
  const [userName, setUserName] = useState(initialUserName || '');
  const [resumeFolder, setResumeFolder] = useState(initialResumeFolder || '');

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
        <div className="flex justify-end space-x-2 mt-6">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={() => {
              onSave({ userName, resumeFolder });
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