import React, { useState, useEffect } from 'react';
import { FileText, Briefcase, Settings, Download } from 'lucide-react'
import MasterDataTab from './components/MasterDataTab'
import JobDescriptionTab from './components/JobDescriptionTab'
import GenerateCVTab from './components/GenerateCVTab'
import GeminiChatHistory, { ChatEntry } from './components/GeminiChatHistory';
import SettingsTab from './components/SettingsTab';

type TabType = 'master' | 'job' | 'generate' | 'settings'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('activeTab');
    return (saved as TabType) || 'master';
  });
  const [showHistory, setShowHistory] = useState(() => {
    const saved = localStorage.getItem('showHistory');
    return saved === 'true';
  });
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>(() => {
    const saved = localStorage.getItem('geminiChatHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [masterCV, setMasterCV] = useState<File | null>(null);
  const [structuredData, setStructuredData] = useState<any>(() => {
    const saved = localStorage.getItem('structuredData');
    return saved ? JSON.parse(saved) : { skills: [], experience: [], education: [] };
  });
  const [jobDescription, setJobDescription] = useState(() => {
    const saved = localStorage.getItem('jobDescription');
    return saved || '';
  });
  const [optimizationResults, setOptimizationResults] = useState<any>(() => {
    const saved = localStorage.getItem('optimizationResults');
    return saved ? JSON.parse(saved) : null;
  });

  // Persist active tab
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  // Persist show history state
  useEffect(() => {
    localStorage.setItem('showHistory', showHistory.toString());
  }, [showHistory]);

  // Persist chat history
  useEffect(() => {
    localStorage.setItem('geminiChatHistory', JSON.stringify(chatHistory));
  }, [chatHistory]);

  // Persist structured data
  useEffect(() => {
    localStorage.setItem('structuredData', JSON.stringify(structuredData));
  }, [structuredData]);

  // Persist job description
  useEffect(() => {
    localStorage.setItem('jobDescription', jobDescription);
  }, [jobDescription]);

  // Persist optimization results
  useEffect(() => {
    if (optimizationResults) {
      localStorage.setItem('optimizationResults', JSON.stringify(optimizationResults));
    } else {
      localStorage.removeItem('optimizationResults');
    }
  }, [optimizationResults]);

  // Persist masterCV (file) name in localStorage (file objects can't be stored, so just store name for preview)
  useEffect(() => {
    if (masterCV) {
      localStorage.setItem('masterCVName', masterCV.name);
      localStorage.setItem('masterCVSize', masterCV.size.toString());
    } else {
      localStorage.removeItem('masterCVName');
      localStorage.removeItem('masterCVSize');
    }
  }, [masterCV]);

  // Load masterCV preview info on mount
  const masterCVName = localStorage.getItem('masterCVName');
  const masterCVSize = localStorage.getItem('masterCVSize');

  // Clear chat handler
  const handleClearChat = () => setChatHistory([]);

  // Back to main handler
  const handleBackToMain = () => setShowHistory(false);

  // Clear master data handler
  const handleClearMasterData = () => {
    setMasterCV(null);
    setStructuredData({ skills: [], experience: [], education: [] });
    setOptimizationResults(null);
    setJobDescription('');
    localStorage.removeItem('masterCVName');
    localStorage.removeItem('masterCVSize');
    localStorage.removeItem('structuredData');
    localStorage.removeItem('optimizationResults');
    localStorage.removeItem('jobDescription');
    localStorage.removeItem('jdAnalysis');
  };

  // Export all data
  const handleExportData = () => {
    const exportData = {
      activeTab,
      showHistory,
      chatHistory,
      structuredData,
      jobDescription,
      optimizationResults,
      masterCVName,
      masterCVSize,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ats-resume-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import data
  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        if (data.activeTab) setActiveTab(data.activeTab);
        if (data.showHistory !== undefined) setShowHistory(data.showHistory);
        if (data.chatHistory) setChatHistory(data.chatHistory);
        if (data.structuredData) setStructuredData(data.structuredData);
        if (data.jobDescription) setJobDescription(data.jobDescription);
        if (data.optimizationResults) setOptimizationResults(data.optimizationResults);
        
        // Note: File objects can't be imported, but we can restore the name/size info
        if (data.masterCVName) localStorage.setItem('masterCVName', data.masterCVName);
        if (data.masterCVSize) localStorage.setItem('masterCVSize', data.masterCVSize);
        
        alert('Data imported successfully! Note: You may need to re-upload your CV file.');
      } catch (error) {
        alert('Failed to import data. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  // Clear all data
  const handleClearAllData = () => {
    if (confirm('This will clear ALL data including chat history. Are you sure?')) {
      // Preserve settings
      const preserve = {
        resumeFolder: localStorage.getItem('resumeFolder'),
        userName: localStorage.getItem('userName')
      };
      setMasterCV(null);
      setStructuredData({ skills: [], experience: [], education: [] });
      setOptimizationResults(null);
      setJobDescription('');
      setChatHistory([]);
      setActiveTab('master');
      setShowHistory(false);
      // Clear all localStorage
      localStorage.clear();
      // Restore settings
      if (preserve.resumeFolder) localStorage.setItem('resumeFolder', preserve.resumeFolder);
      if (preserve.userName) localStorage.setItem('userName', preserve.userName);
      alert('All data cleared. Your output folder and name settings are preserved, but you need to re-upload your CV and job description.');
    }
  };

  // Example: Call this when you send a question and receive an answer from Gemini
  // function handleGeminiInteraction(question: string, answer: string) {
  //   setChatHistory(prev => [
  //     ...prev,
  //     { question, answer, timestamp: new Date().toISOString() }
  //   ]);
  // }

  const tabs = [
    {
      id: 'master' as TabType,
      name: 'Master Data',
      icon: FileText,
      description: 'Upload your master CV and structured data'
    },
    {
      id: 'job' as TabType,
      name: 'Job Description',
      icon: Briefcase,
      description: 'Paste the target job description'
    },
    {
      id: 'generate' as TabType,
      name: 'Generate CV',
      icon: Download,
      description: 'Optimize and download your CV'
    },
    {
      id: 'settings' as TabType,
      name: 'Settings',
      icon: Settings,
      description: 'Configure output folder and preferences'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {!showHistory && (
        <button
          className="fixed top-4 right-4 z-50 bg-primary-600 text-white px-4 py-2 rounded shadow"
          onClick={() => setShowHistory(true)}
        >
          Show Gemini Chat History
        </button>
      )}
      {showHistory ? (
        <GeminiChatHistory chatHistory={chatHistory} onClearChat={handleClearChat} onBackToMain={handleBackToMain} />
      ) : (
        <>
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-6">
                <div className="flex items-center">
                  <Settings className="h-8 w-8 text-primary-600 mr-3" />
                  <h1 className="text-2xl font-bold text-gray-900">
                    ATS Resume Optimizer
                  </h1>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-500">
                    AI-Powered CV Optimization
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleExportData}
                      className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                      title="Export all data"
                    >
                      Export Data
                    </button>
                    <label className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 cursor-pointer">
                      Import Data
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportData}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={handleClearAllData}
                      className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
                      title="Clear all data"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Navigation Tabs */}
          <nav className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex space-x-8">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center px-3 py-4 text-sm font-medium rounded-t-lg transition-colors duration-200 ${
                        activeTab === tab.id ? 'tab-active' : 'tab-inactive'
                      }`}
                    >
                      <Icon className="h-5 w-5 mr-2" />
                      {tab.name}
                    </button>
                  )
                })}
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Data Persistence Status */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <span className="text-blue-800 font-medium">Data Persistence Status:</span>
                  <span className={`px-2 py-1 rounded text-xs ${chatHistory.length > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    Chat History: {chatHistory.length} entries
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${jobDescription ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    Job Description: {jobDescription ? 'Saved' : 'Not saved'}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${masterCVName ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    CV File: {masterCVName ? 'Saved' : 'Not saved'}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${optimizationResults ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    Optimization: {optimizationResults ? 'Saved' : 'Not saved'}
                  </span>
                </div>
                <div className="text-blue-600 text-xs">
                  All data is automatically saved to reduce Gemini API calls
                </div>
              </div>
            </div>
            
            <div className="card">
              {activeTab === 'master' && (
                <MasterDataTab
                  masterCV={masterCV}
                  setMasterCV={setMasterCV}
                  structuredData={structuredData}
                  setStructuredData={setStructuredData}
                  masterCVName={masterCVName}
                  masterCVSize={masterCVSize}
                  onClearMasterData={handleClearMasterData}
                />
              )}
              {activeTab === 'job' && (
                <JobDescriptionTab
                  jobDescription={jobDescription}
                  setJobDescription={setJobDescription}
                  setChatHistory={setChatHistory}
                />
              )}
              {activeTab === 'generate' && (
                <GenerateCVTab
                  masterCV={masterCV}
                  jobDescription={jobDescription}
                  optimizationResults={optimizationResults}
                  setOptimizationResults={setOptimizationResults}
                  setChatHistory={setChatHistory}
                />
              )}
              {activeTab === 'settings' && <SettingsTab />}
            </div>
          </main>
        </>
      )}
    </div>
  )
} 