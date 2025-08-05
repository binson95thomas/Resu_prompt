import React, { useState, useEffect } from 'react';
import { Settings, TestTube, Save, RotateCcw, Brain, FileText, Briefcase, Search, List } from 'lucide-react';
import { TabModelSettings, getDefaultModelSettings, getAvailableProviders } from '../types/modelSettings';
import toast from 'react-hot-toast';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (settings: any) => void;
  initialUserName: string;
  initialResumeFolder: string;
  initialApiHitLimit: number;
  initialApiHitsUsed: number;
  initialApiHitsByProvider: any;
  initialApiResetTime: string;
  initialApiResetFrequency: string;
}

export default function SettingsModal({ 
  open, 
  onClose, 
  onSave, 
  initialUserName, 
  initialResumeFolder, 
  initialApiHitLimit, 
  initialApiHitsUsed, 
  initialApiHitsByProvider, 
  initialApiResetTime, 
  initialApiResetFrequency 
}: SettingsModalProps) {
  const [userName, setUserName] = useState(initialUserName || '');
  const [resumeFolder, setResumeFolder] = useState(initialResumeFolder || '');
  const [apiHitLimit, setApiHitLimit] = useState(initialApiHitLimit || 50);
  const [apiHitsUsed, setApiHitsUsed] = useState(initialApiHitsUsed || 0);
  const [apiHitsByProvider, setApiHitsByProvider] = useState(initialApiHitsByProvider || {
    gemini: 0,
    'gemini-vertex': 0,
    openrouter: 0,
    local: 0
  });
  const [apiResetTime, setApiResetTime] = useState(initialApiResetTime || '00:00');
  const [apiResetFrequency, setApiResetFrequency] = useState(initialApiResetFrequency || 'daily');
  
  // Model settings state
  const [modelSettings, setModelSettings] = useState<TabModelSettings>(getDefaultModelSettings());
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'models'>('general');
  const [showSavedMessage, setShowSavedMessage] = useState(false);

  const availableProviders = getAvailableProviders();

  // Load model settings on mount
  useEffect(() => {
    if (open) {
      console.log('🔧 SettingsModal - Modal opened, loading settings...');
      loadModelSettings();
    }
  }, [open]);

    const loadModelSettings = async () => {
    try {
      console.log('🔧 SettingsModal - Loading model settings...');
      setIsLoadingModels(true);
      
      // Try to load from localStorage first
      const savedModelSettings = localStorage.getItem('modelSettings');
      console.log('🔧 SettingsModal - localStorage modelSettings:', savedModelSettings);
      
      if (savedModelSettings) {
        const settings = JSON.parse(savedModelSettings);
        console.log('🔧 SettingsModal - Loaded settings from localStorage:', JSON.stringify(settings, null, 2));
        setModelSettings(settings);
        setIsLoadingModels(false);
        return;
      }
      
      // Fall back to backend if localStorage is empty
      console.log('🔧 SettingsModal - No localStorage settings, loading from backend...');
      const response = await fetch('/api/settings/model-settings');
      console.log('🔧 SettingsModal - Response status:', response.status);

      if (response.ok) {
        const settings = await response.json();
        console.log('🔧 SettingsModal - Loaded settings from backend:', JSON.stringify(settings, null, 2));
        setModelSettings(settings);
      } else {
        console.error('🔧 SettingsModal - Failed to load settings, status:', response.status);
      }
    } catch (error) {
      console.error('🔧 SettingsModal - Failed to load model settings:', error);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleProviderChange = (tabId: keyof TabModelSettings, provider: string) => {
    console.log('🔧 SettingsModal - handleProviderChange called:', tabId, provider);
    console.log('🔧 SettingsModal - Current modelSettings before change:', JSON.stringify(modelSettings, null, 2));
    setModelSettings(prev => {
      // Create a deep copy to avoid mutation issues
      const newSettings = JSON.parse(JSON.stringify(prev));
      newSettings[tabId] = {
        ...newSettings[tabId],
        provider: provider as 'gemini' | 'openrouter' | 'local'
      };
      console.log('🔧 SettingsModal - New model settings:', JSON.stringify(newSettings, null, 2));
      return newSettings;
    });
  };

  const testModel = async (tabId: string) => {
    setTestingModel(tabId);
    try {
      const response = await fetch('/api/settings/test-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tabId,
          settings: modelSettings[tabId as keyof TabModelSettings]
        })
      });
      
      if (response.ok) {
        toast.success('Model test successful!');
      } else {
        const error = await response.json();
        toast.error(`Model test failed: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      toast.error('Model test failed: Network error');
    } finally {
      setTestingModel(null);
    }
  };

  const saveModelSettings = async () => {
    try {
      console.log('🔧 SettingsModal - Saving model settings:', JSON.stringify(modelSettings, null, 2));
      
      const response = await fetch('/api/settings/model-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modelSettings)
      });
      
      console.log('🔧 SettingsModal - Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('🔧 SettingsModal - Save successful:', result);
        
        // Update localStorage
        localStorage.setItem('modelSettings', JSON.stringify(modelSettings));
        console.log('🔧 SettingsModal - Updated localStorage');
        
        // Notify parent component about the settings change
        console.log('🔧 SettingsModal - About to notify parent with modelSettings:', JSON.stringify(modelSettings, null, 2));
        onSave({
          userName,
          resumeFolder,
          apiHitLimit,
          apiHitsUsed,
          apiHitsByProvider,
          apiResetTime,
          apiResetFrequency,
          modelSettings
        });
        console.log('🔧 SettingsModal - Notified parent component');
        
        toast.success('Settings saved successfully!');
        // Auto-close the modal after a short delay
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        const error = await response.json();
        console.error('🔧 SettingsModal - Save failed:', error);
        toast.error(`Failed to save model settings: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('🔧 SettingsModal - Network error:', error);
      toast.error('Failed to save model settings: Network error');
    }
  };

  const resetModelSettings = () => {
    if (confirm('Are you sure you want to reset all model settings to defaults?')) {
      setModelSettings(getDefaultModelSettings());
    }
  };

  if (!open) return null;

  const tabs = [
    { id: 'jobDescription', name: 'Job Description', icon: Briefcase, description: 'Job description analysis' },
    { id: 'generateCV', name: 'Generate CV', icon: FileText, description: 'CV optimization and cover letter generation' },
    { id: 'jobHunt', name: 'Job Hunt', icon: Search, description: 'Job search and fetching' },
    { id: 'jobTracker', name: 'Job Tracker', icon: List, description: 'Job tracking and management' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Settings
          </h2>
          <button 
            className="text-gray-400 hover:text-gray-700 text-2xl" 
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'general'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            General Settings
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'models'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Brain className="w-4 h-4 inline mr-2" />
            AI Model Settings
          </button>
        </div>

        {/* Success Message */}
        {showSavedMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 mx-6 mt-4 rounded-md flex items-center">
            <Save className="w-4 h-4 mr-2" />
            Settings saved successfully!
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'general' ? (
            /* General Settings Tab */
            <div className="space-y-6">
              <div>
                <label className="block mb-2 font-medium">Your Name</label>
                <input
                  type="text"
                  className="input-field w-full"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder="e.g. Binson Sam Thomas"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium">Resume Output Folder</label>
                <input
                  type="text"
                  className="input-field w-full"
                  value={resumeFolder}
                  onChange={e => setResumeFolder(e.target.value)}
                  placeholder="e.g. D:/Personal_Projects/Resumes"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Use an absolute path. Ensure the backend has write permissions to this folder.
                </div>
              </div>

              <div>
                <label className="block mb-2 font-medium">API Hit Limit</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  className="input-field w-full"
                  value={apiHitLimit}
                  onChange={e => setApiHitLimit(parseInt(e.target.value) || 50)}
                  placeholder="50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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

              <div>
                <label className="block mb-2 font-medium">Reset API Hits Used</label>
                <button
                  className="btn-secondary w-full"
                  onClick={() => setApiHitsUsed(0)}
                >
                  Reset to 0
                </button>
              </div>

              {/* Provider-specific API Usage */}
              <div>
                <label className="block mb-2 font-medium">API Usage by Provider</label>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                    <span className="text-sm font-medium text-blue-700">Gemini API</span>
                    <span className="text-sm text-blue-600">{apiHitsByProvider.gemini || 0} hits</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span className="text-sm font-medium text-green-700">Gemini Vertex API</span>
                    <span className="text-sm text-green-600">{apiHitsByProvider['gemini-vertex'] || 0} hits</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                    <span className="text-sm font-medium text-purple-700">OpenRouter API</span>
                    <span className="text-sm text-purple-600">{apiHitsByProvider.openrouter || 0} hits</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                    <span className="text-sm font-medium text-orange-700">Local LLM</span>
                    <span className="text-sm text-orange-600">{apiHitsByProvider.local || 0} hits</span>
                  </div>
                </div>
                <div className="mt-2">
                  <button
                    className="btn-secondary w-full text-sm"
                    onClick={() => setApiHitsByProvider({
                      gemini: 0,
                      'gemini-vertex': 0,
                      openrouter: 0,
                      local: 0
                    })}
                  >
                    Reset All Provider Counts
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* AI Model Settings Tab */
            <div className="space-y-6">
              {isLoadingModels ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading model settings...</p>
                </div>
              ) : (
                <>
                                     <div className="mb-4">
                     <h3 className="text-lg font-semibold mb-2">Configure AI Providers for Each Feature</h3>
                     <p className="text-sm text-gray-600">
                       Select different AI providers for each feature. This allows you to optimize cost and performance.
                     </p>
                   </div>

                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    const currentSettings = modelSettings[tab.id as keyof TabModelSettings];
                    console.log('🔧 SettingsModal - Rendering tab:', tab.id, 'with settings:', currentSettings);
                    
                    return (
                      <div key={tab.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <Icon className="w-5 h-5 mr-2 text-blue-600" />
                            <div>
                              <h4 className="font-semibold">{tab.name}</h4>
                              <p className="text-sm text-gray-600">{tab.description}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => testModel(tab.id)}
                            disabled={testingModel === tab.id}
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50 flex items-center"
                          >
                            <TestTube className="w-3 h-3 mr-1" />
                            {testingModel === tab.id ? 'Testing...' : 'Test'}
                          </button>
                        </div>

                                                 <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">
                             AI Provider
                           </label>
                           <select
                             key={`${tab.id}-provider-select`}
                             value={currentSettings.provider}
                             onChange={(e) => {
                               console.log('🔧 SettingsModal - Dropdown changed for tab:', tab.id, 'to provider:', e.target.value);
                               handleProviderChange(tab.id as keyof TabModelSettings, e.target.value);
                             }}
                             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                           >
                             {availableProviders.map(provider => (
                               <option key={provider.id} value={provider.id}>
                                 {provider.name} - {provider.description}
                               </option>
                             ))}
                           </select>
                         </div>
                      </div>
                    );
                  })}

                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={resetModelSettings}
                      className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 flex items-center"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset to Defaults
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-2 p-6 border-t border-gray-200 bg-gray-50">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={() => {
                      onSave({
          userName,
          resumeFolder,
          apiHitLimit,
          apiHitsUsed,
          apiHitsByProvider,
          apiResetTime,
          apiResetFrequency,
          modelSettings
        });
              setShowSavedMessage(true);
              setTimeout(() => setShowSavedMessage(false), 3000);
            }}
            disabled={!userName.trim() || !resumeFolder.trim()}
          >
            Save All Settings
          </button>
        </div>
      </div>
    </div>
  );
} 