import React, { useState, useEffect } from 'react';

export default function SettingsTab() {
  const [folder, setFolder] = useState('');
  const [saved, setSaved] = useState(false);
  const [userName, setUserName] = useState(() => localStorage.getItem('userName') || '');

  useEffect(() => {
    const stored = localStorage.getItem('resumeFolder');
    if (stored) setFolder(stored);
  }, []);

  const handleSave = () => {
    localStorage.setItem('resumeFolder', folder);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Settings</h2>
      <label className="block mb-2 font-medium">Resume Output Folder</label>
      <input
        type="text"
        className="input-field w-full mb-3"
        value={folder}
        onChange={e => setFolder(e.target.value)}
        placeholder="e.g. D:/Personal_Projects/Resumes"
      />
      <div className="text-xs text-gray-500 mb-3">Use an absolute path. Ensure the backend has write permissions to this folder.</div>
      <button
        className="btn-primary px-4 py-2 rounded"
        onClick={handleSave}
      >
        Save
      </button>
      {saved && <div className="text-green-700 mt-2">Folder saved!</div>}
      {folder && (
        <div className="mt-4 text-sm text-gray-600">Current folder: <span className="font-mono">{folder}</span></div>
      )}
      <label className="block mb-2 font-medium">Your Name (for file naming)</label>
      <input
        type="text"
        className="input-field w-full mb-3"
        value={userName}
        onChange={e => setUserName(e.target.value)}
        placeholder="e.g. Binson Sam Thomas"
      />
      <button
        className="btn-primary px-4 py-2 rounded mb-2"
        onClick={() => {
          localStorage.setItem('userName', userName);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }}
      >
        Save Name
      </button>
      {userName && (
        <div className="mt-2 text-sm text-gray-600">Current name: <span className="font-mono">{userName}</span></div>
      )}
    </div>
  );
} 