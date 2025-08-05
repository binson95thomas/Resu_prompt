import React, { useState, useEffect } from 'react';
import { FileText, Briefcase, Settings, Download } from 'lucide-react'
import MasterDataTab from './components/MasterDataTab'
import JobDescriptionTab from './components/JobDescriptionTab'
import GenerateCVTab from './components/GenerateCVTab'
import JobHuntTab from './components/JobHuntTab'
import JobTrackerTab from './components/JobTrackerTab'
import GeminiChatHistory, { ChatEntry } from './components/GeminiChatHistory';
import SettingsModal from './components/SettingsModal';
import Sidebar from './components/Sidebar';
import { getAIService, updateAIService } from './services/aiService'
import { getDefaultModelSettings } from './types/modelSettings'

interface Todo {
  id: string;
  content: string;
  status: 'pending' | 'completed' | 'cancelled';
}

type TabType = 'master' | 'job' | 'generate' | 'jobhunt' | 'jobtracker'

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
  const [coverLetterTemplate, setCoverLetterTemplate] = useState<File | null>(null);
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
  // Load settings with fallback to individual localStorage items
  const loadSettings = () => {
    const settingsData = localStorage.getItem('resuPromptSettings');
    if (settingsData) {
      try {
        const settings = JSON.parse(settingsData);
        const result = {
          userName: settings.userName || localStorage.getItem('userName') || '',
          resumeFolder: settings.resumeFolder || localStorage.getItem('resumeFolder') || '',
          apiHitLimit: settings.apiHitLimit || parseInt(localStorage.getItem('apiHitLimit') || '50'),
          apiHitsUsed: settings.apiHitsUsed || parseInt(localStorage.getItem('apiHitsUsed') || '0'),
          apiResetTime: settings.apiResetTime || localStorage.getItem('apiResetTime') || '00:00',
          apiResetFrequency: settings.apiResetFrequency || localStorage.getItem('apiResetFrequency') || 'daily'
        };
        console.log('🔢 Loaded settings:', result);
        return result;
      } catch (error) {
        console.warn('Failed to parse settings, using fallback values');
      }
    }
    const result = {
      userName: localStorage.getItem('userName') || '',
      resumeFolder: localStorage.getItem('resumeFolder') || '',
      apiHitLimit: parseInt(localStorage.getItem('apiHitLimit') || '50'),
      apiHitsUsed: parseInt(localStorage.getItem('apiHitsUsed') || '0'),
      apiResetTime: localStorage.getItem('apiResetTime') || '00:00',
      apiResetFrequency: localStorage.getItem('apiResetFrequency') || 'daily'
    };
    console.log('🔢 Loaded fallback settings:', result);
    return result;
  };

  const initialSettings = loadSettings();
  const [userName, setUserName] = useState(initialSettings.userName);
  const [resumeFolder, setResumeFolder] = useState(initialSettings.resumeFolder);
  const [apiHitLimit, setApiHitLimit] = useState(initialSettings.apiHitLimit);
  const [apiHitsUsed, setApiHitsUsed] = useState(initialSettings.apiHitsUsed);
  const [apiHitsByProvider, setApiHitsByProvider] = useState(() => {
    const saved = localStorage.getItem('apiHitsByProvider');
    const result = saved ? JSON.parse(saved) : {
      gemini: 0,
      'gemini-vertex': 0,
      openrouter: 0,
      local: 0
    };
    console.log('🔢 Loaded apiHitsByProvider:', result);
    return result;
  });
  const [apiResetTime, setApiResetTime] = useState(initialSettings.apiResetTime);
  const [apiResetFrequency, setApiResetFrequency] = useState(initialSettings.apiResetFrequency);
  const [currentApiProvider, setCurrentApiProvider] = useState<string | null>(null);
  const [apiLastReset, setApiLastReset] = useState(() => {
    const saved = localStorage.getItem('apiLastReset');
    return saved ? new Date(saved) : new Date();
  });
  const [todos, setTodos] = useState<Todo[]>([]);

  // Initialize AI service with model settings
  useEffect(() => {
    const loadModelSettings = async () => {
      try {
        // Try to load from localStorage first
        const savedModelSettings = localStorage.getItem('modelSettings');
        console.log('🔧 App - Loading model settings from localStorage:', savedModelSettings);
        
        if (savedModelSettings) {
          const settings = JSON.parse(savedModelSettings);
          console.log('🔧 App - Parsed localStorage settings:', settings);
          updateAIService(settings);
        } else {
          console.log('🔧 App - No localStorage settings, loading from backend...');
          // Try to load from backend
          const response = await fetch('/api/settings/model-settings');
          if (response.ok) {
            const settings = await response.json();
            console.log('🔧 App - Loaded settings from backend:', settings);
            updateAIService(settings);
            localStorage.setItem('modelSettings', JSON.stringify(settings));
          } else {
            console.log('🔧 App - Backend failed, using defaults');
            // Use defaults
            const defaultSettings = getDefaultModelSettings();
            updateAIService(defaultSettings);
            localStorage.setItem('modelSettings', JSON.stringify(defaultSettings));
          }
        }
      } catch (error) {
        console.error('🔧 App - Failed to load model settings:', error);
        // Use defaults on error
        const defaultSettings = getDefaultModelSettings();
        updateAIService(defaultSettings);
        localStorage.setItem('modelSettings', JSON.stringify(defaultSettings));
      }
    };

    loadModelSettings();
  }, []);

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

  // Persist API tracking state
  useEffect(() => {
    localStorage.setItem('apiHitLimit', apiHitLimit.toString());
  }, [apiHitLimit]);

  useEffect(() => {
    localStorage.setItem('apiHitsUsed', apiHitsUsed.toString());
  }, [apiHitsUsed]);

  useEffect(() => {
    localStorage.setItem('apiHitsByProvider', JSON.stringify(apiHitsByProvider));
  }, [apiHitsByProvider]);

  useEffect(() => {
    localStorage.setItem('apiResetTime', apiResetTime);
  }, [apiResetTime]);

  useEffect(() => {
    localStorage.setItem('apiResetFrequency', apiResetFrequency);
  }, [apiResetFrequency]);

  useEffect(() => {
    localStorage.setItem('apiLastReset', apiLastReset.toISOString());
  }, [apiLastReset]);

  // Persist user settings
  useEffect(() => {
    localStorage.setItem('userName', userName);
  }, [userName]);

  useEffect(() => {
    localStorage.setItem('resumeFolder', resumeFolder);
  }, [resumeFolder]);

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
    setCoverLetterTemplate(null);
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
      // Include settings in export
      settings: {
        userName,
        resumeFolder,
        apiHitLimit,
        apiHitsUsed,
        apiResetTime,
        apiResetFrequency
      },
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
        
        // Import settings if available
        if (data.settings) {
          setUserName(data.settings.userName || '');
          setResumeFolder(data.settings.resumeFolder || '');
          setApiHitLimit(data.settings.apiHitLimit || 50);
          setApiHitsUsed(data.settings.apiHitsUsed || 0);
          setApiResetTime(data.settings.apiResetTime || '00:00');
          setApiResetFrequency(data.settings.apiResetFrequency || 'daily');
          
          // Save settings to localStorage
          const settings = {
            userName: data.settings.userName || '',
            resumeFolder: data.settings.resumeFolder || '',
            apiHitLimit: data.settings.apiHitLimit || 50,
            apiHitsUsed: data.settings.apiHitsUsed || 0,
            apiResetTime: data.settings.apiResetTime || '00:00',
            apiResetFrequency: data.settings.apiResetFrequency || 'daily',
            lastUpdated: new Date().toISOString()
          };
          localStorage.setItem('resuPromptSettings', JSON.stringify(settings));
        }
        
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
      // Preserve settings from the dedicated settings object
      const settingsData = localStorage.getItem('resuPromptSettings');
      const currentSettings = settingsData ? JSON.parse(settingsData) : {};
      
      setMasterCV(null);
      setStructuredData({ skills: [], experience: [], education: [] });
      setOptimizationResults(null);
      setJobDescription('');
      setChatHistory([]);
      setActiveTab('master');
      setShowHistory(false);
      
      // Clear all localStorage except settings
      const keysToPreserve = ['resuPromptSettings', 'isSidebarCollapsed'];
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToPreserve.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      
      // Ensure settings are properly saved
      if (Object.keys(currentSettings).length > 0) {
        localStorage.setItem('resuPromptSettings', JSON.stringify(currentSettings));
      }
      
      alert('All data cleared. Your settings are preserved, but you need to re-upload your CV and job description.');
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

  // Check if API hits should be reset based on time
  const checkApiReset = () => {
    if (apiResetFrequency === 'never') return;

    const now = new Date();
    const lastReset = new Date(apiLastReset);
    const [resetHour, resetMinute] = apiResetTime.split(':').map(Number);
    
    let shouldReset = false;
    
    switch (apiResetFrequency) {
      case 'daily':
        // Reset if it's past the reset time and a day has passed
        const resetTimeToday = new Date(now);
        resetTimeToday.setHours(resetHour, resetMinute, 0, 0);
        
        const resetTimeYesterday = new Date(resetTimeToday);
        resetTimeYesterday.setDate(resetTimeYesterday.getDate() - 1);
        
        shouldReset = now >= resetTimeToday && lastReset < resetTimeYesterday;
        break;
        
      case 'weekly':
        // Reset if it's been a week since last reset and it's past reset time
        const weekAgo = new Date(lastReset);
        weekAgo.setDate(weekAgo.getDate() + 7);
        shouldReset = now >= weekAgo;
        break;
        
      case 'monthly':
        // Reset if it's been a month since last reset and it's past reset time
        const monthAgo = new Date(lastReset);
        monthAgo.setMonth(monthAgo.getMonth() + 1);
        shouldReset = now >= monthAgo;
        break;
    }
    
    if (shouldReset) {
      console.log('🔢 API Reset triggered! Resetting apiHitsUsed to 0');
      setApiHitsUsed(0);
      setApiLastReset(now);
      localStorage.setItem('apiHitsUsed', '0');
      localStorage.setItem('apiLastReset', now.toISOString());
    }
  };

  // Check for reset on component mount and every minute
  useEffect(() => {
    checkApiReset();
    const interval = setInterval(checkApiReset, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [apiResetFrequency, apiResetTime, apiLastReset]);

  // Increment API hits
  const incrementApiHits = (provider?: string) => {
    console.log('🔢 incrementApiHits called with provider:', provider);
    console.log('🔢 Current apiHitsUsed:', apiHitsUsed);
    
    // Check for reset before incrementing
    checkApiReset();
    
    setApiHitsUsed(prev => {
      const newValue = prev + 1;
      console.log('🔢 Setting apiHitsUsed to:', newValue);
      localStorage.setItem('apiHitsUsed', newValue.toString());
      return newValue;
    });

    // Also increment provider-specific count if provider is specified
    if (provider) {
      setApiHitsByProvider(prev => {
        const newProviderHits = {
          ...prev,
          [provider]: (prev[provider] || 0) + 1
        };
        console.log('🔢 Setting provider hits:', newProviderHits);
        localStorage.setItem('apiHitsByProvider', JSON.stringify(newProviderHits));
        return newProviderHits;
      });
    }
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
        optimizationScore={optimizationResults?.matchScore || 0}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={handleToggleSidebar}
        apiHitLimit={apiHitLimit}
        apiHitsUsed={apiHitsUsed}
        apiHitsByProvider={apiHitsByProvider}
        apiResetTime={apiResetTime}
        apiResetFrequency={apiResetFrequency}
        currentApiProvider={currentApiProvider}
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
                coverLetterTemplate={coverLetterTemplate}
                setCoverLetterTemplate={setCoverLetterTemplate}
                setChatHistory={setChatHistory}
                incrementApiHits={incrementApiHits}
            />
          )}
          {activeTab === 'job' && (
            <JobDescriptionTab
              jobDescription={jobDescription}
              setJobDescription={setJobDescription}
              setChatHistory={setChatHistory}
              incrementApiHits={incrementApiHits}
              aiService={getAIService()}
              setCurrentApiProvider={setCurrentApiProvider}
            />
          )}
          {activeTab === 'generate' && (
            <GenerateCVTab
              masterCV={masterCV}
              jobDescription={jobDescription}
              optimizationResults={optimizationResults}
              setOptimizationResults={setOptimizationResults}
                setChatHistory={setChatHistory}
                incrementApiHits={incrementApiHits}
                coverLetterTemplate={coverLetterTemplate}
                setActiveTab={setActiveTab}
                setCurrentApiProvider={setCurrentApiProvider}
            />
          )}
          {activeTab === 'jobhunt' && (
            <JobHuntTab
              setChatHistory={setChatHistory}
              incrementApiHits={incrementApiHits}
              setActiveTab={setActiveTab}
            />
          )}
          {activeTab === 'jobtracker' && (
            <JobTrackerTab
              setChatHistory={setChatHistory}
              incrementApiHits={incrementApiHits}
              setActiveTab={setActiveTab}
            />
          )}
        </div>
      </main>
        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          initialUserName={userName}
          initialResumeFolder={resumeFolder}
          initialApiHitLimit={apiHitLimit}
          initialApiHitsUsed={apiHitsUsed}
          initialApiHitsByProvider={apiHitsByProvider}
          initialApiResetTime={apiResetTime}
          initialApiResetFrequency={apiResetFrequency}
          onSave={({ userName, resumeFolder, apiHitLimit, apiHitsUsed, apiHitsByProvider, apiResetTime, apiResetFrequency, modelSettings }) => {
            console.log('🔧 App - onSave called with modelSettings:', modelSettings);
            setUserName(userName);
            setResumeFolder(resumeFolder);
            setApiHitLimit(apiHitLimit);
            setApiHitsUsed(apiHitsUsed);
            setApiHitsByProvider(apiHitsByProvider);
            setApiResetTime(apiResetTime);
            setApiResetFrequency(apiResetFrequency);
            // Save settings immediately to localStorage
            localStorage.setItem('userName', userName);
            localStorage.setItem('resumeFolder', resumeFolder);
            localStorage.setItem('apiHitLimit', apiHitLimit.toString());
            localStorage.setItem('apiHitsUsed', apiHitsUsed.toString());
            localStorage.setItem('apiHitsByProvider', JSON.stringify(apiHitsByProvider));
            localStorage.setItem('apiResetTime', apiResetTime);
            localStorage.setItem('apiResetFrequency', apiResetFrequency);
            // Save model settings if provided
            if (modelSettings) {
              console.log('🔧 App - Saving modelSettings to localStorage:', modelSettings);
              localStorage.setItem('modelSettings', JSON.stringify(modelSettings));
              // Update the AI service with new settings
              console.log('🔧 App - Updating AI service with new settings');
              updateAIService(modelSettings);
            }
            // Also save to a dedicated settings object
            const settings = {
              userName,
              resumeFolder,
              apiHitLimit,
              apiHitsUsed,
              apiResetTime,
              apiResetFrequency,
              modelSettings,
              lastUpdated: new Date().toISOString()
            };
            localStorage.setItem('resuPromptSettings', JSON.stringify(settings));
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