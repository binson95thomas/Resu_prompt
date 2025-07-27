import React from 'react';
import { FileText, Briefcase, Download, Download as ExportIcon, Upload, Trash2, Settings, MessageSquare, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';

const tabs = [
  { id: 'master', name: 'Master Data', icon: FileText },
  { id: 'job', name: 'Job Description', icon: Briefcase },
  { id: 'generate', name: 'Generate CV', icon: Download },
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
  isSidebarCollapsed = false,
  onToggleSidebar
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-blue-600 text-white rounded-md shadow-lg"
      >
        <Menu className="w-6 h-6" />
      </button>

              {/* Desktop sidebar toggle button */}
        <button
          onClick={onToggleSidebar}
          className={`hidden lg:flex absolute top-4 right-4 z-40 p-2 rounded-md shadow-lg border transition-all duration-300 ${
            isSidebarCollapsed 
              ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' 
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
          title={isSidebarCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
        >
          {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>

        {/* Compact sidebar indicator */}
        {isSidebarCollapsed && (
          <div className="hidden lg:block absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="w-1 h-8 bg-blue-200 rounded-full"></div>
          </div>
        )}

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden mobile-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`h-full bg-white border-r flex flex-col py-4 shadow-sm lg:relative lg:transition-all lg:duration-300 ${
        isSidebarCollapsed ? 'lg:w-16 lg:px-2' : 'lg:w-56 lg:px-3'
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

        {/* Desktop close button - only show when sidebar is expanded */}
        {!isSidebarCollapsed && (
          <button
            onClick={onToggleSidebar}
            className="hidden lg:flex absolute top-4 right-4 p-2 text-gray-600 hover:text-gray-800"
            title="Collapse sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
              {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
              </svg>
            </div>
            {!isSidebarCollapsed && (
              <span className="text-xl font-bold tracking-tight text-blue-700">ResuPrompt</span>
            )}
          </div>
          {!isSidebarCollapsed && userName && (
            <div className="text-xs text-gray-600 mb-1">
              User: <span className="font-semibold text-gray-700">{userName}</span>
            </div>
          )}
          {!isSidebarCollapsed && resumeFolder && (
            <div className="text-xs text-gray-600 font-mono break-all">
              {resumeFolder}
            </div>
          )}
        </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center w-full px-3 py-2 rounded-md text-left transition-colors duration-150 text-sm ${
              activeTab === tab.id ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100 text-gray-700'
            } ${isSidebarCollapsed ? 'justify-center' : ''}`}
            title={isSidebarCollapsed ? tab.name : undefined}
          >
            <tab.icon className={`w-4 h-4 ${isSidebarCollapsed ? '' : 'mr-2'}`} />
            {!isSidebarCollapsed && tab.name}
          </button>
        ))}
      </nav>

      {/* Action Buttons */}
      <div className="space-y-2 mb-4">
        <button 
          onClick={onExport} 
          className={`w-full px-3 py-2 rounded bg-green-100 text-green-800 font-semibold flex items-center hover:bg-green-200 transition text-sm ${isSidebarCollapsed ? 'justify-center' : ''}`}
          title={isSidebarCollapsed ? "Export" : undefined}
        >
          <ExportIcon className={`w-4 h-4 text-green-700 ${isSidebarCollapsed ? '' : 'mr-2'}`} />
          {!isSidebarCollapsed && "Export"}
        </button>
        <label className={`w-full px-3 py-2 rounded bg-blue-100 text-blue-800 font-semibold flex items-center hover:bg-blue-200 cursor-pointer transition text-sm ${isSidebarCollapsed ? 'justify-center' : ''}`}
          title={isSidebarCollapsed ? "Import" : undefined}
        >
          <Upload className={`w-4 h-4 text-blue-700 ${isSidebarCollapsed ? '' : 'mr-2'}`} />
          {!isSidebarCollapsed && "Import"}
          <input type="file" accept=".json" onChange={onImport} className="hidden" />
        </label>
        <button 
          onClick={onClearAll} 
          className={`w-full px-3 py-2 rounded bg-red-100 text-red-800 font-semibold flex items-center hover:bg-red-200 transition text-sm ${isSidebarCollapsed ? 'justify-center' : ''}`}
          title={isSidebarCollapsed ? "Clear All" : undefined}
        >
          <Trash2 className={`w-4 h-4 text-red-700 ${isSidebarCollapsed ? '' : 'mr-2'}`} />
          {!isSidebarCollapsed && "Clear All"}
        </button>
        <button 
          onClick={onSettings} 
          className={`w-full px-3 py-2 rounded bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200 transition text-sm ${isSidebarCollapsed ? 'justify-center' : ''}`}
          title={isSidebarCollapsed ? "Settings" : undefined}
        >
          <Settings className={`w-4 h-4 text-gray-700 ${isSidebarCollapsed ? '' : 'mr-2'}`} />
          {!isSidebarCollapsed && "Settings"}
        </button>
        <button
          onClick={onShowHistory}
          className={`w-full px-3 py-2 rounded bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition text-sm ${isSidebarCollapsed ? 'justify-center' : ''}`}
          title={isSidebarCollapsed ? "Chat History" : undefined}
        >
          <MessageSquare className={`w-4 h-4 ${isSidebarCollapsed ? '' : 'mr-2'}`} />
          {!isSidebarCollapsed && "Chat History"}
        </button>
      </div>

      {/* Status Indicators */}
      {!isSidebarCollapsed && (
        <div className="space-y-2 mb-4">
          <div className="text-xs font-medium text-gray-700 mb-2">Status:</div>
          <div className="space-y-1">
            <div className={`px-2 py-1 rounded text-xs flex items-center justify-between ${chatHistoryCount > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
              <span>Chat</span>
              <span className="font-semibold">{chatHistoryCount}</span>
            </div>
            <div className={`px-2 py-1 rounded text-xs flex items-center justify-between ${jobDescriptionSaved ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
              <span>Job Description</span>
              <span className="font-semibold">{jobDescriptionSaved ? '✓' : '✗'}</span>
            </div>
            <div className={`px-2 py-1 rounded text-xs flex items-center justify-between ${cvFileSaved ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
              <span>CV File</span>
              <span className="font-semibold">{cvFileSaved ? '✓' : '✗'}</span>
            </div>
            <div className={`px-2 py-1 rounded text-xs flex items-center justify-between ${optimizationSaved ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
              <span>Optimization</span>
              <span className="font-semibold">{optimizationSaved ? '✓' : '✗'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Version */}
      {!isSidebarCollapsed && (
        <div className="mt-auto px-3 text-xs text-gray-400">v1.0</div>
      )}
      </aside>
    </>
  );
} 