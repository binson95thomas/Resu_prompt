import React, { useState, useEffect } from 'react'
import { Briefcase, Search, Target, TrendingUp, Download as DownloadIcon, Copy as CopyIcon, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'

interface JobDescriptionTabProps {
  jobDescription: string
  setJobDescription: (description: string) => void
  setChatHistory: (fn: (prev: any[]) => any[]) => void
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Helper to hash a string using SHA-256 and return hex
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function JobDescriptionTab({ 
  jobDescription, 
  setJobDescription, 
  setChatHistory 
}: JobDescriptionTabProps) {
  const [analysis, setAnalysis] = useState<any>(() => {
    const saved = localStorage.getItem('jdAnalysis');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null)
  const [rawResponse, setRawResponse] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(true)
  const [isCached, setIsCached] = useState(false);
  const [lastHash, setLastHash] = useState<string | null>(null);

  // Persist analysis results
  useEffect(() => {
    if (analysis) {
      localStorage.setItem('jdAnalysis', JSON.stringify(analysis));
    } else {
      localStorage.removeItem('jdAnalysis');
    }
  }, [analysis]);

  // Persist show raw response state
  useEffect(() => {
    localStorage.setItem('showRawResponse', showRawResponse.toString());
  }, [showRawResponse]);

  // Load show raw response state on mount
  useEffect(() => {
    const saved = localStorage.getItem('showRawResponse');
    if (saved) {
      setShowRawResponse(saved === 'true');
    }
  }, []);

  // Caching logic
  const getCacheKey = async (jd: string) => {
    const hash = await hashString(jd.trim());
    return `jdAnalysis_${hash}`;
  };

  // Analyze JD with caching
  const handleAnalyze = async (force = false) => {
    if (!jobDescription.trim()) {
      setError('Job description is required.')
      return
    }
    setError(null)
    setIsAnalyzing(true)
    setRawResponse(null)
    setShowRawResponse(false)
    setIsCached(false)
    const cacheKey = await getCacheKey(jobDescription);
    setLastHash(cacheKey);
    if (!force) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setAnalysis(JSON.parse(cached));
        setIsCached(true);
        setIsAnalyzing(false);
        setRawResponse(null);
        return;
      }
    }
    try {
      const response = await fetch('/api/optimize/analyze-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription })
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to analyze job description')
      }
      setAnalysis(data.analysis)
      setRawResponse(JSON.stringify(data, null, 2))
      setIsAnalyzing(false)
      setIsCached(false)
      setChatHistory(prev => [
        ...prev,
        {
          question: jobDescription,
          answer: JSON.stringify(data, null, 2),
          timestamp: new Date().toISOString()
        }
      ])
      // Cache the result
      localStorage.setItem(cacheKey, JSON.stringify(data.analysis));
    } catch (error: any) {
      setError(error.message || 'Failed to analyze job description. Please try again.')
      setIsAnalyzing(false)
    }
  }

  const highlight = (text: string, color: string) => (
    <span className={`px-2 py-1 rounded text-white`} style={{ background: color }}>{text}</span>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Job Description</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleAnalyze(false)}
            disabled={!jobDescription.trim() || isAnalyzing}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Analyze Job Description"
            title="Analyze the job description using Gemini AI"
          >
            <Search className="h-4 w-4 inline mr-2" />
            {isAnalyzing ? 'Analyzing...' : 'Analyze JD'}
          </button>
          <button
            onClick={() => handleAnalyze(true)}
            disabled={!jobDescription.trim() || isAnalyzing}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Re-analyze Job Description"
            title="Re-analyze the job description using Gemini AI"
          >
            <RefreshCw className="h-4 w-4 inline mr-2" />
            Re-analyze
          </button>
          {isCached && <span className="text-green-700 text-sm ml-2">(cached)</span>}
        </div>
      </div>

      <div className="text-gray-600">
        Paste the job description below. The AI will extract keywords, skills, and requirements to optimize your CV.
      </div>

      <div className="space-y-4">
        <label htmlFor="jobDescription" className="block text-sm font-medium text-gray-700">
          Job Description
        </label>
        <textarea
          id="jobDescription"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job description here..."
          className="input-field h-64 resize-none"
          aria-required="true"
          aria-label="Job Description Input"
          title="Paste the job description here. Only .docx files are supported."
        />
        {error && <div className="text-red-600 text-sm mt-1">{error}</div>}
      </div>

      {isAnalyzing && (
        <div className="flex items-center space-x-2 text-primary-600">
          <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span>Analyzing job description...</span>
        </div>
      )}

      {analysis && !isAnalyzing && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Analysis Results
            </h3>
            <div className="flex space-x-2">
              <button
                className="flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                onClick={() => copyToClipboard(JSON.stringify(analysis, null, 2))}
                aria-label="Copy analysis JSON"
                title="Copy analysis JSON to clipboard"
              >
                <CopyIcon className="h-4 w-4 mr-1" /> Copy JSON
              </button>
              <button
                className="flex items-center px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200"
                onClick={() => downloadText('jd-analysis.json', JSON.stringify(analysis, null, 2))}
                aria-label="Download analysis JSON"
                title="Download analysis JSON as file"
              >
                <DownloadIcon className="h-4 w-4 mr-1" /> Download
              </button>
              <button
                className="flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                onClick={() => setShowRawResponse(r => !r)}
                aria-label="Show raw Gemini response"
                title="Show raw Gemini response"
              >
                {showRawResponse ? 'Hide Raw' : 'Show Raw'}
              </button>
              <button
                className="flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                onClick={() => setCollapsed(c => !c)}
                aria-label="Expand/collapse analysis"
                title="Expand/collapse analysis"
              >
                {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {showRawResponse && rawResponse && (
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto mb-4 whitespace-pre-wrap break-words">{rawResponse}</pre>
          )}

          {!collapsed && (
            <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto mb-4 whitespace-pre-wrap break-words">{JSON.stringify(analysis, null, 2)}</pre>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Keywords */}
            <div className="card">
              <h4 className="font-medium text-gray-900 mb-3">Keywords</h4>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(analysis.keywords) && analysis.keywords.length > 0
                  ? analysis.keywords.map((keyword: string, index: number) => (
                      <span
                        key={index}
                        className="bg-blue-200 text-blue-900 px-2 py-1 rounded text-sm font-semibold"
                        title="Keyword"
                      >
                        {keyword}
                      </span>
                    ))
                  : <span className="text-gray-400">Not available</span>}
              </div>
            </div>

            {/* Skills */}
            <div className="card">
              <h4 className="font-medium text-gray-900 mb-3">Skills</h4>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(analysis.skills) && analysis.skills.length > 0
                  ? analysis.skills.map((skill: string, index: number) => (
                      <span
                        key={index}
                        className="bg-green-200 text-green-900 px-2 py-1 rounded text-sm font-semibold"
                        title="Skill"
                      >
                        {skill}
                      </span>
                    ))
                  : <span className="text-gray-400">Not available</span>}
              </div>
            </div>

            {/* Requirements */}
            <div className="card">
              <h4 className="font-medium text-gray-900 mb-3">Requirements</h4>
              <div className="space-y-2">
                {Array.isArray(analysis.requirements) && analysis.requirements.length > 0
                  ? analysis.requirements.map((req: string, index: number) => (
                      <div key={index} className="text-sm text-gray-700 bg-yellow-100 rounded px-2 py-1 mb-1 font-semibold" title="Requirement">
                        • {req}
                      </div>
                    ))
                  : <span className="text-gray-400">Not available</span>}
              </div>
            </div>

            {/* Job Info */}
            <div className="card">
              <h4 className="font-medium text-gray-900 mb-3">Job Info</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Industry:</span> {analysis.industry || <span className="text-gray-400">Not available</span>}
                </div>
                <div>
                  <span className="font-medium">Level:</span> {analysis.level || <span className="text-gray-400">Not available</span>}
                </div>
                <div>
                  <span className="font-medium">Summary:</span> {analysis.summary || <span className="text-gray-400">Not available</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <div className="flex items-start">
              <TrendingUp className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Optimization Ready</h4>
                <p className="text-sm text-blue-700 mt-1">
                  The job description has been analyzed. You can now proceed to the Generate CV tab to optimize your resume.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 