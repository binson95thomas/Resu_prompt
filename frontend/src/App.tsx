import React, { useState, useEffect } from 'react';
import { FileText, Briefcase, Settings, Download } from 'lucide-react'
import MasterDataTab from './components/MasterDataTab'
import JobDescriptionTab from './components/JobDescriptionTab'
import GenerateCVTab from './components/GenerateCVTab'
import GeminiChatHistory, { ChatEntry } from './components/GeminiChatHistory';
import SettingsModal from './components/SettingsModal';
import Sidebar from './components/Sidebar';

interface Todo {
  id: string;
  content: string;
  status: 'pending' | 'completed' | 'cancelled';
}

type TabType = 'master' | 'job' | 'generate'

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('isSidebarCollapsed');
    return saved === 'true';
  });
  const [userName, setUserName] = useState(() => localStorage.getItem('userName') || '');
  const [resumeFolder, setResumeFolder] = useState(() => localStorage.getItem('resumeFolder') || '');
  const [todos, setTodos] = useState<Todo[]>([]);

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

  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem('isSidebarCollapsed', isSidebarCollapsed.toString());
  }, [isSidebarCollapsed]);

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
        userName: localStorage.getItem('userName'),
        isSidebarCollapsed: localStorage.getItem('isSidebarCollapsed')
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
      if (preserve.isSidebarCollapsed) localStorage.setItem('isSidebarCollapsed', preserve.isSidebarCollapsed);
      alert('All data cleared. Your output folder and name settings are preserved, but you need to re-upload your CV and job description.');
    }
  };

  // Toggle sidebar
  const handleToggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    // Show a brief notification
    const message = newState ? 'Sidebar collapsed' : 'Sidebar expanded';
    console.log(message); // You can replace this with a toast notification if you have one
  };

  // Keyboard shortcut for sidebar toggle (Ctrl/Cmd + B)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        handleToggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarCollapsed]);

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
    }
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        onExport={handleExportData}
        onImport={handleImportData}
        onClearAll={handleClearAllData}
        onSettings={() => setSettingsOpen(true)}
        onShowHistory={() => setShowHistory(true)}
        userName={userName}
        resumeFolder={resumeFolder}
        chatHistoryCount={chatHistory.length}
        jobDescriptionSaved={!!jobDescription}
        cvFileSaved={!!masterCVName}
        optimizationSaved={!!optimizationResults}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={handleToggleSidebar}
      />
      <div className={`flex-1 flex flex-col min-w-0 lg:transition-all lg:duration-300`}>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 md:p-12 bg-gray-50 mobile-padding">
          <div className="max-w-7xl mx-auto">
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
          </div>
        </main>
        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          initialUserName={userName}
          initialResumeFolder={resumeFolder}
          onSave={({ userName, resumeFolder }) => {
            setUserName(userName);
            setResumeFolder(resumeFolder);
            localStorage.setItem('userName', userName);
            localStorage.setItem('resumeFolder', resumeFolder);
          }}
        />
        <GeminiChatHistory
          open={showHistory}
          onClose={() => setShowHistory(false)}
          chatHistory={chatHistory}
          onClearChat={handleClearChat}
        />
      </div>
    </div>
  );
} 