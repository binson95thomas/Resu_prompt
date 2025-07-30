import React, { useState, useEffect } from 'react'
import { Briefcase, Search, Target, TrendingUp, Download as DownloadIcon, Copy as CopyIcon, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import Tabs from './Tabs';

interface JobDescriptionTabProps {
  jobDescription: string
  setJobDescription: (description: string) => void
  setChatHistory: (fn: (prev: any[]) => any[]) => void
  incrementApiHits: () => void
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
  setChatHistory,
  incrementApiHits
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
  const handleAnalyze = async () => {
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
    const cached = localStorage.getItem(cacheKey);
    if (cached && !isAnalyzing) {
      setAnalysis(JSON.parse(cached));
      setIsCached(true);
      setIsAnalyzing(false);
      setRawResponse(null);
      return;
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
      incrementApiHits(); // Increment API hits on successful call
      setChatHistory(prev => [
        ...prev,
        {
          question: jobDescription,
          answer: JSON.stringify(data, null, 2),
          timestamp: new Date().toISOString(),
          model: 'Gemini 1.5 Flash',
          promptSource: 'API'
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

  // UI logic for single button and message
  const [hasCached, setHasCached] = useState(false);
  useEffect(() => {
    (async () => {
      if (!jobDescription.trim()) {
        setHasCached(false);
        return;
      }
      const cacheKey = await getCacheKey(jobDescription);
      setHasCached(!!localStorage.getItem(cacheKey));
    })();
  }, [jobDescription]);

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-screen-lg mx-auto">
      <h2 className="text-xl font-bold mb-4 flex items-center text-blue-800"><Briefcase className="mr-2" /> Job Description Analysis</h2>
      <textarea
        className="w-full border rounded p-2 mb-4 h-48 lg:h-64"
        rows={8}
        value={jobDescription}
        onChange={e => setJobDescription(e.target.value)}
        placeholder="Paste the job description here..."
      />
      <div className="flex items-center space-x-2 mb-4">
        <button
          onClick={handleAnalyze}
          className={`btn-primary ${isAnalyzing ? 'opacity-80' : ''}`}
          disabled={isAnalyzing || !jobDescription.trim()}
        >
          {isAnalyzing ? <span className="spinner mr-2"></span> : null}
          {isAnalyzing ? 'Analyzing...' : hasCached ? 'Re-Analyse JD' : 'Analyze JD'}
        </button>

        {hasCached && !isAnalyzing && (
          <span className="text-green-700 text-xs ml-2">JD already analyzed. You can re-analyze if needed.</span>
        )}
      </div>
      {error && <div className="bg-red-100 text-red-800 rounded p-2 mb-2">{error}</div>}
      {analysis && (
        <div className="space-y-6 mt-6">
          <div className="bg-blue-50 border-l-4 border-blue-400 rounded p-4">
            <h3 className="font-semibold mb-2 flex items-center text-blue-800"><Briefcase className="w-5 h-5 mr-2" />Summary</h3>
            <div>{analysis.summary || 'No summary available.'}</div>
          </div>
          <div className="bg-green-50 border-l-4 border-green-400 rounded p-4">
            <h3 className="font-semibold mb-2 flex items-center text-green-800"><TrendingUp className="w-5 h-5 mr-2" />Keywords</h3>
            {Array.isArray(analysis.keywords) && analysis.keywords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {analysis.keywords.map((kw: string, i: number) => (
                  <span
                    key={i}
                    className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            ) : 'No keywords found.'}
          </div>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded p-4">
            <h3 className="font-semibold mb-2 flex items-center text-yellow-800"><Target className="w-5 h-5 mr-2" />Suggestions</h3>
            {Array.isArray(analysis.suggestions) && analysis.suggestions.length > 0 ? (
              <ul className="list-disc ml-6">
                {analysis.suggestions.map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            ) : 'No suggestions found.'}
          </div>
          <div className="bg-gray-50 border-l-4 border-gray-400 rounded p-4">
            <h3 className="font-semibold mb-2 flex items-center text-gray-800"><CopyIcon className="w-5 h-5 mr-2" />Raw Gemini Response</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto max-h-64">{rawResponse || JSON.stringify(analysis, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
