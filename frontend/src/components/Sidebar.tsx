import React from 'react';
import { FileText, Briefcase, Download, Download as ExportIcon, Upload, Trash2, Settings, MessageSquare, Menu, X, ChevronLeft, ChevronRight, Search, List } from 'lucide-react';

const tabs = [
  { id: 'master', name: 'Master Data', icon: FileText },
  { id: 'job', name: 'Job Description', icon: Briefcase },
  { id: 'generate', name: 'Generate CV', icon: Download },
  { id: 'jobhunt', name: 'Job Hunt', icon: Search },
  { id: 'jobtracker', name: 'Job Tracker', icon: List },
];

export default function Sidebar({ 
  activeTab, 
  setActiveTab,
  onExport,
  onImport,
  onClearAll,
  onSettings,
  onShowHistory,
  userName,
  resumeFolder,
  chatHistoryCount = 0,
  jobDescriptionSaved = false,
  cvFileSaved = false,
  optimizationSaved = false,
  optimizationScore = 0,
  isSidebarCollapsed = false,
  onToggleSidebar,
  apiHitLimit = 50,
  apiHitsUsed = 0,
  apiHitsByProvider = { gemini: 0, 'gemini-vertex': 0, openrouter: 0, local: 0 },
  apiResetTime = '00:00',
  apiResetFrequency = 'daily',
  currentApiProvider = null
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [apiUsageView, setApiUsageView] = React.useState<'total' | 'providers'>('total');

  // Helper function to get next reset time
  const getNextResetTime = () => {
    if (apiResetFrequency === 'never') return null;
    
    const now = new Date();
    const [resetHour, resetMinute] = apiResetTime.split(':').map(Number);
    
    switch (apiResetFrequency) {
      case 'daily':
        const resetTimeToday = new Date(now);
        resetTimeToday.setHours(resetHour, resetMinute, 0, 0);
        
        if (now >= resetTimeToday) {
          resetTimeToday.setDate(resetTimeToday.getDate() + 1);
        }
        return resetTimeToday;
        
      case 'weekly':
        const resetTimeThisWeek = new Date(now);
        resetTimeThisWeek.setHours(resetHour, resetMinute, 0, 0);
        resetTimeThisWeek.setDate(resetTimeThisWeek.getDate() + (7 - resetTimeThisWeek.getDay()));
        return resetTimeThisWeek;
        
      case 'monthly':
        const resetTimeThisMonth = new Date(now);
        resetTimeThisMonth.setHours(resetHour, resetMinute, 0, 0);
        resetTimeThisMonth.setDate(1);
        resetTimeThisMonth.setMonth(resetTimeThisMonth.getMonth() + 1);
        return resetTimeThisMonth;
        
      default:
        return null;
    }
  };

  const nextReset = getNextResetTime();
  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gradient-to-r from-ocean-500 to-ocean-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
      >
        <Menu className="w-6 h-6" />
      </button>

              

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden mobile-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`h-full bg-white border-r flex flex-col py-3 shadow-sm lg:relative lg:transition-all lg:duration-300 ${
        isSidebarCollapsed ? 'lg:w-12 lg:px-1' : 'lg:w-48 xl:w-56 2xl:w-64 lg:px-3'
      } ${
        isMobileMenuOpen ? 'mobile-sidebar open' : 'mobile-sidebar'
      }`}>
        {/* Mobile close button */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 text-gray-600 hover:text-gray-800"
        >
          <X className="w-6 h-6" />
        </button>


              {/* Header */}
        <div className="mb-4">
          <div className="flex items-center space-x-3 mb-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
              </svg>
            </div>
            {!isSidebarCollapsed && (
              <span className="text-lg font-bold tracking-tight text-blue-700">ResuPrompt</span>
            )}
          </div>
        </div>

        {/* API Provider Indicator */}
        {currentApiProvider && (
          <div className="mb-3">
            {!isSidebarCollapsed ? (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-2">
                <div className="flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></div>
                  <span className="text-xs font-medium text-blue-700">Using {currentApiProvider}</span>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" title={`Using ${currentApiProvider}`}></div>
              </div>
            )}
          </div>
        )}

      {/* Navigation - Main tabs */}
      <nav className="flex-1 space-y-2 mb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center w-full px-3 py-2.5 rounded-lg text-left transition-colors duration-150 ${
              activeTab === tab.id ? 'bg-blue-100 text-blue-700 font-semibold shadow-sm' : 'hover:bg-gray-100 text-gray-700'
            } ${isSidebarCollapsed ? 'justify-center' : ''}`}
            title={isSidebarCollapsed ? tab.name : undefined}
          >
            <tab.icon className={`w-5 h-5 ${isSidebarCollapsed ? '' : 'mr-3'}`} />
            {!isSidebarCollapsed && <span className="text-sm font-medium">{tab.name}</span>}
          </button>
        ))}
      </nav>

              {/* CV Score Circular Progress - Compact */}
        {optimizationSaved && (
          <div className="mb-2">
            {!isSidebarCollapsed ? (
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                <div className="text-sm font-semibold text-gray-800 mb-2 text-center">CV Score</div>
                <div className="relative w-16 h-16 mx-auto">
                  <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-gray-200"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className={`transition-all duration-500 ${
                        optimizationScore >= 80 ? 'text-emerald-500' :
                        optimizationScore >= 60 ? 'text-yellow-500' :
                        'text-red-500'
                      }`}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={`${optimizationScore}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-sm font-bold ${
                      optimizationScore >= 80 ? 'text-emerald-600' :
                      optimizationScore >= 60 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {optimizationScore}%
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative w-5 h-5 mx-auto">
                <svg className="w-5 h-5 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-200"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={`transition-all duration-500 ${
                      optimizationScore >= 80 ? 'text-emerald-500' :
                      optimizationScore >= 60 ? 'text-yellow-500' :
                      'text-red-500'
                    }`}
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${optimizationScore}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-xs font-bold ${
                    optimizationScore >= 80 ? 'text-emerald-600' :
                    optimizationScore >= 60 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {optimizationScore}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

      {/* Bottom Section - Compact API Usage, User Info, Buttons, Status */}
      <div className="mt-auto space-y-2">
        {/* API Progress Bar */}
        {!isSidebarCollapsed ? (
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="font-semibold text-gray-800">API Usage</span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setApiUsageView('total')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    apiUsageView === 'total' 
                      ? 'bg-ocean-500 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Total Usage"
                >
                  Total
                </button>
                <button
                  onClick={() => setApiUsageView('providers')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    apiUsageView === 'providers' 
                      ? 'bg-ocean-500 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Provider Usage"
                >
                  Providers
                </button>
              </div>
            </div>
            
            {apiUsageView === 'total' ? (
              <>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 shadow-sm ${
                      apiHitsUsed / apiHitLimit >= 0.9 ? 'bg-gradient-to-r from-red-400 to-red-600' :
                      apiHitsUsed / apiHitLimit >= 0.7 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                      'bg-gradient-to-r from-ocean-400 to-cyan-500'
                    }`}
                    style={{ width: `${Math.min((apiHitsUsed / apiHitLimit) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 text-center">
                  {apiResetFrequency !== 'never' && nextReset ? (
                    `Resets ${apiResetFrequency} at ${apiResetTime}`
                  ) : (
                    'No auto-reset'
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-blue-600 font-medium">Gemini</span>
                  <span className="text-blue-600">{apiHitsByProvider.gemini || 0}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-green-600 font-medium">Gemini Vertex</span>
                  <span className="text-green-600">{apiHitsByProvider['gemini-vertex'] || 0}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-purple-600 font-medium">OpenRouter</span>
                  <span className="text-purple-600">{apiHitsByProvider.openrouter || 0}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-orange-600 font-medium">Local LLM</span>
                  <span className="text-orange-600">{apiHitsByProvider.local || 0}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full transition-all duration-300 ${
                apiHitsUsed / apiHitLimit >= 0.9 ? 'bg-gradient-to-r from-red-400 to-red-600' :
                apiHitsUsed / apiHitLimit >= 0.7 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                'bg-gradient-to-r from-ocean-400 to-cyan-500'
              }`}
              style={{ width: `${Math.min((apiHitsUsed / apiHitLimit) * 100, 100)}%` }}
              title={`API Hits: ${apiHitsUsed}/${apiHitLimit}${apiResetFrequency !== 'never' && nextReset ? `\nResets ${apiResetFrequency} at ${apiResetTime}\nNext reset: ${nextReset.toLocaleDateString()} ${nextReset.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : '\nNo auto-reset'}`}
            ></div>
          </div>
        )}

        {/* User Information */}
        {!isSidebarCollapsed && (userName || resumeFolder) && (
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
            <div className="text-sm font-semibold text-gray-800 mb-2">User Info</div>
            {userName && (
              <div className="flex items-center mb-2">
                <div className="w-2 h-2 bg-ocean-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-700 font-medium truncate">{userName}</span>
              </div>
            )}
            {resumeFolder && (
              <div className="flex items-start">
                <div className="w-2 h-2 bg-cyan-500 rounded-full mr-2 mt-1 flex-shrink-0"></div>
                <div className="text-sm text-gray-600 font-mono break-all leading-tight max-h-8 overflow-hidden">
                  {resumeFolder}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {!isSidebarCollapsed ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onExport}
                  className="px-3 py-2 rounded text-sm font-medium bg-gradient-to-r from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700 transition-all duration-200 flex items-center justify-center shadow-sm"
                  title="Export data"
                >
                  <ExportIcon className="w-4 h-4 mr-2" />
                  <span>Export</span>
                </button>
                <button
                  onClick={() => document.getElementById('import-input')?.click()}
                  className="px-3 py-2 rounded text-sm font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center shadow-sm"
                  title="Import data"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  <span>Import</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onClearAll}
                  className="px-3 py-2 rounded text-sm font-medium bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-all duration-200 flex items-center justify-center shadow-sm"
                  title="Clear all data"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  <span>Clear</span>
                </button>
                <button
                  onClick={onSettings}
                  className="px-3 py-2 rounded text-sm font-medium bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center shadow-sm"
                  title="Settings"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  <span>Settings</span>
                </button>
              </div>
              <button
                onClick={onShowHistory}
                className="w-full px-3 py-2 rounded text-sm font-medium bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center shadow-sm"
                title="View chat history"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                <span>Chat History</span>
              </button>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={onExport}
                className="p-1 rounded bg-gradient-to-r from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700 transition-all duration-200 shadow-sm"
                title="Export data"
              >
                <ExportIcon className="w-2.5 h-2.5 mx-auto" />
              </button>
              <button
                onClick={() => document.getElementById('import-input')?.click()}
                className="p-1 rounded bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm"
                title="Import data"
              >
                <Upload className="w-2.5 h-2.5 mx-auto" />
              </button>
              <button
                onClick={onClearAll}
                className="p-1 rounded bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-sm"
                title="Clear all data"
              >
                <Trash2 className="w-2.5 h-2.5 mx-auto" />
              </button>
              <button
                onClick={onSettings}
                className="p-1 rounded bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-sm"
                title="Settings"
              >
                <Settings className="w-2.5 h-2.5 mx-auto" />
              </button>
            </div>
          )}
        </div>
        
        {/* Hidden import input */}
        <input 
          id="import-input" 
          type="file" 
          accept=".json" 
          onChange={onImport} 
          className="hidden" 
        />
        
        {/* Status Indicators */}
        {!isSidebarCollapsed && (
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
            <div className="text-sm font-semibold text-gray-800 mb-2">Status</div>
            <div className="grid grid-cols-2 gap-2">
              <div className={`flex items-center justify-between p-2 rounded ${chatHistoryCount > 0 ? 'bg-ocean-50 border border-ocean-200' : 'bg-gray-50 border border-gray-200'}`}>
                <span className="text-sm font-medium text-gray-700">Chat</span>
                <span className={`text-sm font-bold ${chatHistoryCount > 0 ? 'text-ocean-600' : 'text-gray-500'}`}>
                  {chatHistoryCount > 0 ? chatHistoryCount : '0'}
                </span>
              </div>
              <div className={`flex items-center justify-between p-2 rounded ${jobDescriptionSaved ? 'bg-ocean-50 border border-ocean-200' : 'bg-gray-50 border border-gray-200'}`}>
                <span className="text-sm font-medium text-gray-700">JD</span>
                <span className={`text-sm font-bold ${jobDescriptionSaved ? 'text-ocean-600' : 'text-gray-500'}`}>
                  {jobDescriptionSaved ? '✓' : '✗'}
                </span>
              </div>
              <div className={`flex items-center justify-between p-2 rounded ${cvFileSaved ? 'bg-ocean-50 border border-ocean-200' : 'bg-gray-50 border border-gray-200'}`}>
                <span className="text-sm font-medium text-gray-700">CV</span>
                <span className={`text-sm font-bold ${cvFileSaved ? 'text-ocean-600' : 'text-gray-500'}`}>
                  {cvFileSaved ? '✓' : '✗'}
                </span>
              </div>
              <div className={`flex items-center justify-between p-2 rounded ${optimizationSaved ? 'bg-ocean-50 border border-ocean-200' : 'bg-gray-50 border border-gray-200'}`}>
                <span className="text-sm font-medium text-gray-700">Opt</span>
                <span className={`text-sm font-bold ${optimizationSaved ? 'text-ocean-600' : 'text-gray-500'}`}>
                  {optimizationSaved ? '✓' : '✗'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Section with Toggle and Version */}
      <div className="mt-auto">
        {!isSidebarCollapsed && (
          <div className="text-xs text-gray-400 mb-2 text-center">v1.0</div>
        )}
        {/* Compact Toggle button */}
        <button
          onClick={onToggleSidebar}
          className={`w-full px-2 py-2 rounded transition-all duration-300 text-xs font-semibold shadow-sm ${
            isSidebarCollapsed 
              ? 'bg-gradient-to-r from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700 hover:shadow-md' 
              : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300 hover:shadow-md'
          }`}
          title={isSidebarCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
        >
          {isSidebarCollapsed ? (
            <div className="flex items-center justify-center">
              <ChevronRight className="w-3 h-3" />
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <ChevronLeft className="w-3 h-3 mr-1" />
              <span>Collapse</span>
            </div>
          )}
        </button>
      </div>
      </aside>
    </>
  );
} 