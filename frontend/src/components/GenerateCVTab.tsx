import React, { useState, useEffect } from 'react'
import { Download, FileText, CheckCircle, XCircle, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
// Simple diff viewer function
const createDiffView = (original: string, suggested: string) => {
  const words1 = original.split(/\s+/);
  const words2 = suggested.split(/\s+/);
  const result: JSX.Element[] = [];
  
  let i = 0, j = 0;
  while (i < words1.length || j < words2.length) {
    if (i < words1.length && j < words2.length && words1[i] === words2[j]) {
      result.push(<span key={`same-${i}`} className="text-gray-700">{words1[i]} </span>);
      i++; j++;
    } else if (j < words2.length) {
      result.push(<span key={`add-${j}`} className="bg-green-100 text-green-800 px-1 rounded">{words2[j]} </span>);
      j++;
    } else if (i < words1.length) {
      result.push(<span key={`del-${i}`} className="bg-red-100 text-red-800 px-1 rounded line-through">{words1[i]} </span>);
      i++;
    } else {
      break;
    }
  }
  
  return <div className="text-sm">{result}</div>;
};

// Enhanced diff viewer for bullets/lines
const createBulletDiffView = (original: string, suggested: string) => {
  // Split by lines
  const origLines = original.split(/\r?\n/).filter(l => l.trim() !== '')
  const suggLines = suggested.split(/\r?\n/).filter(l => l.trim() !== '')
  // Helper to check if a line is a bullet
  const isBullet = (line: string) => /^\s*([-*•]|\d+\.)\s+/.test(line)
  // Render as <ul> if all lines are bullets, else as <div>
  if (origLines.every(isBullet) && suggLines.every(isBullet)) {
    // Show removed bullets (red, strikethrough)
    const removed = origLines.filter(l => !suggLines.includes(l))
    // Show added bullets (green)
    const added = suggLines.filter(l => !origLines.includes(l))
    // Show unchanged bullets
    const unchanged = suggLines.filter(l => origLines.includes(l))
    return (
      <ul className="text-sm ml-4 list-disc space-y-1">
        {unchanged.map((line, i) => <li key={`same-${i}`} className="text-gray-700">{line}</li>)}
        {added.map((line, i) => <li key={`add-${i}`} className="bg-green-100 text-green-800 rounded px-1">{line}</li>)}
        {removed.map((line, i) => <li key={`del-${i}`} className="bg-red-100 text-red-800 rounded line-through px-1">{line}</li>)}
      </ul>
    )
  } else {
    // Fallback: word diff for non-bullet text
    return createDiffView(original, suggested)
  }
}

interface GenerateCVTabProps {
  masterCV: File | null
  jobDescription: string
  optimizationResults: any
  setOptimizationResults: (results: any) => void
  setChatHistory: (fn: (prev: any[]) => any[]) => void
}

interface SuggestedEdit {
  section?: string
  original?: string
  suggested?: string
  reason?: string
  originalBullet?: string
  improvedBullet?: string
}

// Helper to apply accepted edits to the original CV text
function applyEditsToCV(cvText: string, suggestedEdits: SuggestedEdit[], acceptedEdits: Set<number>): string {
  let lines = cvText.split(/\r?\n/);
  // Build a map from original bullet/paragraph to improved version for accepted edits
  const editMap = new Map<string, string>();
  Array.from(acceptedEdits).forEach(idx => {
    const edit = suggestedEdits[idx];
    if (edit && (edit.originalBullet || edit.original) && (edit.improvedBullet || edit.suggested)) {
      editMap.set((edit.originalBullet || edit.original)!.trim(), (edit.improvedBullet || edit.suggested)!);
    }
  });
  // Replace lines in the CV with improved versions if accepted
  lines = lines.map(line => {
    const trimmed = line.trim();
    return editMap.has(trimmed) ? editMap.get(trimmed)! : line;
  });
  return lines.join('\n');
}

export default function GenerateCVTab({ 
  masterCV, 
  jobDescription, 
  optimizationResults, 
  setOptimizationResults,
  setChatHistory
}: GenerateCVTabProps) {
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [suggestedEdits, setSuggestedEdits] = useState<SuggestedEdit[]>(() => {
    const saved = localStorage.getItem('suggestedEdits');
    return saved ? JSON.parse(saved) : [];
  })
  const [acceptedEdits, setAcceptedEdits] = useState<Set<number>>(() => {
    const saved = localStorage.getItem('acceptedEdits');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  })
  const [optimizationProgress, setOptimizationProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [successFolderPath, setSuccessFolderPath] = useState<string | null>(null);
  const [copyTooltip, setCopyTooltip] = useState<string>('Copy Path');
  const [userName, setUserName] = useState(() => localStorage.getItem('userName') || '');

  // Persist suggested edits
  useEffect(() => {
    localStorage.setItem('suggestedEdits', JSON.stringify(suggestedEdits));
  }, [suggestedEdits]);

  // Persist accepted edits
  useEffect(() => {
    localStorage.setItem('acceptedEdits', JSON.stringify(Array.from(acceptedEdits)));
  }, [acceptedEdits]);

  // 2. Accept all by default after Optimize CV
  useEffect(() => {
    if (suggestedEdits.length > 0) {
      setAcceptedEdits(new Set(suggestedEdits.map((_, idx) => idx)))
    }
  }, [suggestedEdits])

  const handleOptimize = async () => {
    if (!masterCV || !jobDescription.trim()) {
      toast.error('Please upload a CV and provide a job description first')
      return
    }

    setIsOptimizing(true)
    setError(null)
    setOptimizationProgress(0)
    
    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setOptimizationProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return prev
        }
        return prev + 10
      })
    }, 500)

    try {
      const formData = new FormData()
      if (masterCV) {
        formData.append('cv', masterCV)
      }
      formData.append('acceptedEdits', JSON.stringify(Array.from(acceptedEdits)))
      formData.append('suggestedEdits', JSON.stringify(suggestedEdits))
      formData.append('jobDescription', jobDescription)

      const response = await fetch('/api/optimize/optimize-cv', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Handle the response structure - check if it has an 'optimization' key
      const optimizationData = data.optimization || data
      
      setOptimizationResults(optimizationData)
      setSuggestedEdits(optimizationData.suggestedEdits || [])
      setOptimizationProgress(100)
      
      // Show warning if fallback
      if (optimizationData.isFallback) {
        toast.error('Gemini returned a generic fallback response. Please check your CV, job description, or try again.');
      }
      
      // Build the actual Gemini prompt
      const fullPrompt = `You are an expert CV optimizer specializing in strict ATS (Applicant Tracking System) compliance.\n\nCV Content (Master Data):\n${data.cvText}\n\nJob Description:\n${data.jobDescription}\n\nYour task is to optimize the CV to maximize ATS compatibility for the given job description, while strictly preserving the original structure, sections, and factual content of the master CV. Only make changes that:\n- Improve keyword matching for the job description\n- Enhance ATS parsing (e.g., clear section headings, reverse-chronological order, no tables or graphics)\n- Add or rephrase content for quantifiable achievements, but do NOT invent experience or skills\n- Use industry-standard terminology and action verbs\n- Maintain a professional, concise tone\n- Do NOT remove or alter any factual information from the master CV\n- Do NOT change the order or structure of sections unless required for ATS\n\nChecklist for ATS Compliance (ensure all are met):\n- All sections are clearly labeled (e.g., \"Professional Summary\", \"Experience\", \"Education\", \"Skills\")\n- No graphics, images, or tables\n- Use standard fonts and formatting\n- Use keywords from the job description naturally\n- All dates are in MM/YYYY or YYYY format\n- No spelling or grammar errors\n- No personal pronouns (I, me, my)\n- No confidential or sensitive information\n\nPlease provide a JSON response with the following structure:\n{\n  \"matchScore\": 85,\n  \"keywords\": [\"keyword1\", \"keyword2\"],\n  \"improvements\": [\"improvement1\", \"improvement2\"],\n  \"suggestedEdits\": [\n    {\n      \"section\": \"Professional Summary\",\n      \"original\": \"Original text\",\n      \"suggested\": \"Improved text with keywords\",\n      \"reason\": \"Why this change improves ATS compatibility\"\n    }\n  ],\n  \"overallRecommendations\": [\n    \"Add more quantifiable achievements\",\n    \"Include specific technologies mentioned in JD\",\n    \"Use action verbs consistently\"\n  ]\n}\n\nGuidelines:\n- Strictly preserve the original structure and factual content\n- Only make changes for ATS and job description alignment\n- Add relevant keywords naturally\n- Include quantifiable achievements where possible\n- Use industry-standard terminology\n- Maintain professional tone\n- Focus on ATS-friendly language\n\nReturn only the JSON object, no additional text.`
      
      // Log to chat history with full prompt
      setChatHistory(prev => [
        ...prev,
        {
          question: fullPrompt,
          answer: JSON.stringify(optimizationData, null, 2),
          timestamp: new Date().toISOString()
        }
      ])
      
      setIsOptimizing(false)
      toast.success('CV optimization completed!')
    } catch (error: any) {
      console.error('Optimization failed:', error)
      setError(error.message || 'Optimization failed. Please try again.')
      setIsOptimizing(false)
      setOptimizationProgress(0)
      toast.error(error.message || 'Optimization failed. Please try again.')
    }
  }

  // Toggle accept/reject for an edit
  const handleToggleEdit = (index: number) => {
    setAcceptedEdits(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
        toast('Edit unaccepted', { icon: '↩️' })
      } else {
        newSet.add(index)
        toast.success(`Edit "${suggestedEdits[index]?.section}" accepted`)
      }
      return newSet
    })
  }

  // 4. Fix recalculate score button
  const handleRecalculate = async () => {
    try {
      // Use the original CV text from optimizationResults.cvText, apply accepted edits
      const originalCVText = optimizationResults.cvText || '';
      const updatedCVText = applyEditsToCV(originalCVText, suggestedEdits, acceptedEdits);
      const response = await fetch('/api/optimize/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvText: updatedCVText,
          jobDescription,
          structuredData: null,
          acceptedEdits: Array.from(acceptedEdits),
        })
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || 'Failed to recalculate')
      }
      const data = await response.json()
      setOptimizationResults(data.suggestions || data)
      setSuggestedEdits((data.suggestions || data).suggestedEdits || [])
      if ((data.suggestions || data).predictedMatchScoreIfKeywordsAdded) {
        toast.success(`Predicted match score if keywords added: ${(data.suggestions || data).predictedMatchScoreIfKeywordsAdded}%`)
      }
      toast.success('Match score and suggestions updated!')
    } catch (error: any) {
      setError(error.message || 'Failed to recalculate match score.')
      toast.error(error.message || 'Failed to recalculate match score.')
    }
  }

  // 1. Use backend-provided filename for download
  const getFilenameFromHeader = (headers: Headers) => {
    const disposition = headers.get('Content-Disposition');
    if (!disposition) return 'optimized-cv.docx';
    const match = disposition.match(/filename="?([^";]+)"?/);
    return match ? match[1] : 'optimized-cv.docx';
  };

  const handleGenerateCV = async () => {
    if (suggestedEdits.length === 0) {
      toast.error('Please optimize your CV first')
      return
    }

    if (!masterCV) {
      toast.error('CV file is required')
      return
    }

    setIsGenerating(true)
    setSuccessFolderPath(null)
    try {
      const formData = new FormData()
      formData.append('cv', masterCV)
      formData.append('acceptedEdits', JSON.stringify(Array.from(acceptedEdits)))
      formData.append('suggestedEdits', JSON.stringify(suggestedEdits))
      formData.append('jobDescription', jobDescription)
      formData.append('userName', userName);
      // Send jobDetails if available
      if (optimizationResults && optimizationResults.jobDetails) {
        formData.append('jobDetails', JSON.stringify(optimizationResults.jobDetails));
      }
      const resumeFolder = localStorage.getItem('resumeFolder') || ''
      const response = await fetch('/api/document/generate-docx', {
        method: 'POST',
        body: formData,
        headers: { 'x-resume-folder': resumeFolder }
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error((data.error || data.message || 'Failed to generate CV') + (data.stack ? '\n' + data.stack : ''))
      }
      // Do NOT trigger browser download. Only show folder path.
      setSuccessFolderPath(data.folderPath)
      toast.success('CV generated and saved!')
      setIsGenerating(false)
    } catch (error: any) {
      setIsGenerating(false)
      setError(error.message || 'Generation failed. Please try again.')
      toast.error(error.message || 'Generation failed. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Generate Optimized CV</h2>
        <button
          onClick={handleOptimize}
          disabled={!masterCV || !jobDescription.trim() || isOptimizing}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="h-4 w-4 inline mr-2" />
          {isOptimizing ? 'Optimizing...' : 'Optimize CV'}
        </button>
      </div>

      {!masterCV || !jobDescription.trim() ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Missing Requirements</h3>
          <p className="text-gray-600">
            Please upload a CV and provide a job description to start optimization.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Progress Bar */}
          {isOptimizing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Optimizing CV...</span>
                <span>{optimizationProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${optimizationProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <XCircle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {optimizationResults && !isOptimizing && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card text-center">
                <div className="text-2xl font-bold text-primary-600">{optimizationResults.matchScore || 0}%</div>
                <div className="text-sm text-gray-600">Match Score</div>
              </div>
              <div className="card">
                <h4 className="font-medium text-gray-900 mb-2">Key Improvements</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  {Array.isArray(optimizationResults.improvements) && optimizationResults.improvements.map((improvement: string, index: number) => (
                    <li key={index}>• {improvement}</li>
                  ))}
                </ul>
              </div>
              <div className="card">
                <h4 className="font-medium text-gray-900 mb-2">Keywords Added</h4>
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(optimizationResults.keywords) && optimizationResults.keywords.map((keyword: string, index: number) => (
                    <span
                      key={index}
                      className="bg-primary-100 text-primary-800 px-2 py-1 rounded text-xs"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {optimizationResults && optimizationResults.predictedMatchScoreIfKeywordsAdded && (
            <div className="card text-center bg-blue-50 border border-blue-200 p-2 mt-2">
              <div className="text-lg font-bold text-blue-700">Predicted Match Score if Keywords Added: {optimizationResults.predictedMatchScoreIfKeywordsAdded}%</div>
            </div>
          )}

          {optimizationResults && optimizationResults.isFallback && (
            <div className="bg-red-100 border border-red-400 text-red-800 rounded p-3 mb-4">
              <strong>Warning:</strong> Gemini returned a fallback or static response. The match score and suggestions may not be accurate. Please try again later or check your Gemini API quota.
            </div>
          )}

          {optimizationResults && optimizationResults.jobDetails && (
            <div className="card bg-yellow-50 border border-yellow-300 p-4 mb-4 shadow-sm">
              <h4 className="font-bold text-yellow-900 mb-3 flex items-center"><span className="mr-2">🏢</span> Job Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div><span className="font-semibold">Company:</span> {optimizationResults.jobDetails.company || <span className="text-gray-400">N/A</span>}</div>
                <div><span className="font-semibold">Location:</span> {optimizationResults.jobDetails.location || <span className="text-gray-400">N/A</span>}</div>
                <div><span className="font-semibold">Salary:</span> {optimizationResults.jobDetails.salary || <span className="text-gray-400">N/A</span>}</div>
                <div><span className="font-semibold">Contract Length:</span> {optimizationResults.jobDetails.contractLength || <span className="text-gray-400">N/A</span>}</div>
                <div><span className="font-semibold">Job Type:</span> {optimizationResults.jobDetails.jobType || <span className="text-gray-400">N/A</span>}</div>
                <div><span className="font-semibold">Other:</span> {optimizationResults.jobDetails.other || <span className="text-gray-400">N/A</span>}</div>
              </div>
            </div>
          )}

          {Array.isArray(suggestedEdits) && suggestedEdits.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Suggested Edits</h3>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-600">
                    Accepted: {acceptedEdits.size} of {suggestedEdits.length}
                  </div>
                  <button
                    onClick={() => setAcceptedEdits(new Set(suggestedEdits.map((_, index) => index)))}
                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    Accept All
                  </button>
                  <button
                    onClick={() => setAcceptedEdits(new Set())}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <button
                onClick={handleRecalculate}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm mb-2"
              >
                Recalculate Match Score
              </button>
              <div className="space-y-4">
                {suggestedEdits.map((edit, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">{edit.section || 'General'}</h4>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleToggleEdit(index)}
                          className={`px-3 py-1 rounded text-sm ${acceptedEdits.has(index) ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                          {acceptedEdits.has(index) ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="text-gray-800">
                      <p>Original:</p>
                      {edit.originalBullet ? (
                        <div className="bg-red-100 text-red-800 rounded line-through px-1 mb-2">
                          {edit.originalBullet}
                        </div>
                      ) : (
                        <div className="bg-red-100 text-red-800 rounded line-through px-1 mb-2">
                          {edit.original}
                        </div>
                      )}
                      <p>Suggested:</p>
                      {edit.improvedBullet ? (
                        <div className="bg-green-100 text-green-800 rounded px-1 mb-2">
                          {edit.improvedBullet}
                        </div>
                      ) : (
                        <div className="bg-green-100 text-green-800 rounded px-1 mb-2">
                          {edit.suggested}
                        </div>
                      )}
                      <p>Reason:</p>
                      <div className="bg-yellow-100 text-yellow-800 rounded px-1 mb-2">
                        {edit.reason}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {suggestedEdits.length === 0 && optimizationResults && optimizationResults.suggestedEdits && optimizationResults.suggestedEdits.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">No suggested edits found.</h4>
              <p className="text-blue-800">
                The optimization results indicate that the CV is already highly optimized for the job description.
                No specific edits are recommended for this job.
              </p>
            </div>
          )}

          {suggestedEdits.length > 0 && (
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleGenerateCV}
                disabled={isGenerating}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4 inline mr-2" />
                {isGenerating ? 'Generating CV...' : 'Generate Optimized CV'}
              </button>
            </div>
          )}
          {successFolderPath && (
            <div className="bg-green-50 border border-green-300 text-green-900 rounded p-3 mb-4 flex items-center justify-between">
              <span><strong>Resume saved in:</strong> {successFolderPath}</span>
              <button
                className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-sm"
                onClick={() => {
                  navigator.clipboard.writeText(successFolderPath);
                  setCopyTooltip('Copied!');
                  setTimeout(() => setCopyTooltip('Copy Path'), 2000);
                }}
                title={copyTooltip}
              >
                {copyTooltip}
              </button>
            </div>
          )}
        </div>
      )}
      {/* Add a field for user name */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Your Name (for file naming)</label>
        <input
          type="text"
          className="input-field w-full"
          value={userName}
          onChange={e => {
            setUserName(e.target.value);
            localStorage.setItem('userName', e.target.value);
          }}
          placeholder="e.g. Binson Sam Thomas"
        />
      </div>
    </div>
  )
}