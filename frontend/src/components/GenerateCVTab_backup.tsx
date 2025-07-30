import React, { useState, useEffect } from 'react'
import { Download, FileText, XCircle, CheckCircle, Copy, Clipboard, ChevronUp, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

// Simplified diff algorithm to prevent freezing
const createEnhancedDiffView = (original: string, suggested: string) => {
  // Simple word-by-word comparison
  const originalWords = original.split(/\s+/)
  const suggestedWords = suggested.split(/\s+/)
  
  const result: { text: string; type: 'unchanged' | 'added' | 'removed' }[] = []
  
  let i = 0, j = 0
  
  while (i < originalWords.length || j < suggestedWords.length) {
    if (i < originalWords.length && j < suggestedWords.length && originalWords[i] === suggestedWords[j]) {
      // Same word - unchanged
      result.push({ text: originalWords[i] + ' ', type: 'unchanged' })
      i++
      j++
    } else if (j < suggestedWords.length) {
      // Word added in suggested
      result.push({ text: suggestedWords[j] + ' ', type: 'added' })
      j++
    } else if (i < originalWords.length) {
      // Word removed from original
      result.push({ text: originalWords[i] + ' ', type: 'removed' })
      i++
    } else {
      break
    }
  }
  
  return result
}

// Create a diff view that shows the suggested text with inline changes
const createInlineDiffView = (original: string, suggested: string) => {
  const diffResult = createEnhancedDiffView(original, suggested)
  const result: JSX.Element[] = []
  
  diffResult.forEach((item, index) => {
    if (item.type === 'unchanged') {
      result.push(<span key={`same-${index}`} className="text-gray-700">{item.text}</span>)
    } else if (item.type === 'added') {
      result.push(<span key={`add-${index}`} className="bg-green-100 text-green-800 px-1 rounded font-medium">{item.text}</span>)
    } else if (item.type === 'removed') {
      result.push(<span key={`del-${index}`} className="bg-red-100 text-red-800 px-1 rounded line-through">{item.text}</span>)
    }
  })
  
  return <div className="text-sm leading-relaxed">{result}</div>
}

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
    return createInlineDiffView(original, suggested)
  }
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

interface GenerateCVTabProps {
  masterCV: File | null
  jobDescription: string
  optimizationResults: any
  setOptimizationResults: (results: any) => void
  setChatHistory: (fn: (prev: any[]) => any[]) => void
  incrementApiHits: () => void
  coverLetterTemplate: File | null
  setActiveTab: (tab: 'master' | 'job' | 'generate') => void
}

export default function GenerateCVTab({ 
  masterCV, 
  jobDescription, 
  optimizationResults, 
  setOptimizationResults,
  setChatHistory,
  incrementApiHits,
  coverLetterTemplate,
  setActiveTab
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
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<number>>(new Set());
  const [showManualOptimization, setShowManualOptimization] = useState(false)
  const [manualResponse, setManualResponse] = useState('')
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [showRawResponse, setShowRawResponse] = useState(false)
  const [isCopyingPrompt, setIsCopyingPrompt] = useState(false)
  const [lastCopiedPrompt, setLastCopiedPrompt] = useState('')

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
  
  // Cover letter states
  const [coverLetterData, setCoverLetterData] = useState<any>(null)
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false)
  const [coverLetterStyle, setCoverLetterStyle] = useState('professional')
  const [coverLetterTone, setCoverLetterTone] = useState('confident')
  const [coverLetterFocusAreas, setCoverLetterFocusAreas] = useState<string[]>([])
  const [hiringManager, setHiringManager] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [useCoverLetterTemplate, setUseCoverLetterTemplate] = useState(false)
  const [showCoverLetterEditor, setShowCoverLetterEditor] = useState(false)
  const [editedCoverLetter, setEditedCoverLetter] = useState('')
  const [jobSource, setJobSource] = useState('company website')
  const [coverLetterExpanded, setCoverLetterExpanded] = useState(false)
  const [coverLetterMode, setCoverLetterMode] = useState<'auto' | 'manual'>('auto')
  const [manualCoverLetterResponse, setManualCoverLetterResponse] = useState('')
  
  // Add state for managing accepted edits
  const [showDiffPane, setShowDiffPane] = useState(false)
  const [selectedEditIndex, setSelectedEditIndex] = useState<number | null>(null)

  const handleOptimize = async () => {
    if (!masterCV || !jobDescription.trim()) {
      toast.error('Please upload a CV and provide a job description.')
      return
    }

    setIsOptimizing(true)
    setError('')
    setOptimizationProgress(0)

    try {
      const formData = new FormData()
      formData.append('cv', masterCV)
      formData.append('jobDescription', jobDescription)

      const response = await fetch('/api/optimize/optimize-cv', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      const optimizationData = data.optimization || data
      
      // Hardcode model for automatic optimization
      const modelUsed = 'Gemini 1.5 Flash'
      
      // Add model information to optimization results
      const optimizationDataWithModel = {
        ...optimizationData,
        model: modelUsed
      };
      setOptimizationResults(optimizationDataWithModel)
      setSuggestedEdits(optimizationData.suggestedEdits || [])
      setOptimizationProgress(100)
      
      // Add to chat history with proper data structure
      setChatHistory(prev => [...prev, {
        question: `CV Optimization Request`,
        answer: `CV optimization completed! Match score: ${optimizationData.matchScore || 0}%`,
        timestamp: new Date().toISOString(),
        model: modelUsed,
        promptSource: 'auto-optimization'
      }])

      incrementApiHits(); // Increment API hits on successful call
      setIsOptimizing(false)
      toast.success('CV optimization completed!')
    } catch (error: any) {
      setError(error.message || 'Failed to optimize CV')
      toast.error('Failed to optimize CV')
    } finally {
      setIsOptimizing(false)
      setOptimizationProgress(0)
    }
  }

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
      // Send model information
      formData.append('modelUsed', optimizationResults?.model || 'Gemini 2.0 Flash');
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
      // Show the filename and full path separately
      const fileName = data.downloadName || 'optimized-cv.docx'
      const fullFilePath = data.savePath || data.folderPath
      const jdFileName = data.jdFileName || 'job-description.txt'
      const jdFilePath = data.jdSavePath || data.folderPath
      setSuccessFolderPath(`${fileName}|${fullFilePath}|${jdFileName}|${jdFilePath}`)
      toast.success(`CV and JD generated and saved!`)
        setIsGenerating(false)
    } catch (error: any) {
      setIsGenerating(false)
      setError(error.message || 'Generation failed. Please try again.')
      toast.error(error.message || 'Generation failed. Please try again.')
    }
  }

  const handleGenerateCoverLetter = async () => {
    if (!masterCV || !jobDescription.trim()) {
      toast.error('Please upload a CV and provide a job description.')
      return
    }

    setIsGeneratingCoverLetter(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('cv', masterCV)
      formData.append('jobDescription', jobDescription)
      formData.append('style', coverLetterStyle)
      formData.append('tone', coverLetterTone)
      formData.append('focusAreas', coverLetterFocusAreas.join(', '))
      formData.append('hiringManager', hiringManager)
      formData.append('companyName', companyName)
      formData.append('useTemplate', useCoverLetterTemplate.toString())
      formData.append('jobSource', jobSource)

      const response = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setCoverLetterData(data)
      setEditedCoverLetter(data.coverLetter?.body?.opening + '\n\n' + 
                          data.coverLetter?.body?.mainContent?.join('\n\n') + '\n\n' + 
                          data.coverLetter?.body?.closing + '\n\n' + 
                          data.coverLetter?.signature)
      setShowCoverLetterEditor(true)
      toast.success('Cover letter generated successfully!')
    } catch (error: any) {
      setError(error.message || 'Failed to generate cover letter')
      toast.error('Failed to generate cover letter')
    } finally {
      setIsGeneratingCoverLetter(false)
    }
  }

  const handleSaveCoverLetter = async () => {
    if (!editedCoverLetter.trim()) {
      toast.error('Please enter cover letter content.')
      return
    }

    try {
      const response = await fetch('/api/generate-cover-letter-docx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coverLetterData: {
            ...coverLetterData,
            coverLetter: {
              body: {
                opening: editedCoverLetter.split('\n\n')[0] || '',
                mainContent: editedCoverLetter.split('\n\n').slice(1, -2) || [],
                closing: editedCoverLetter.split('\n\n').slice(-2)[0] || ''
              },
              signature: editedCoverLetter.split('\n\n').slice(-1)[0] || ''
            }
          },
          jobDescription
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      // Download the file
      const link = document.createElement('a')
      link.href = data.downloadUrl
      link.download = data.downloadName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('Cover letter saved successfully!')
      setShowCoverLetterEditor(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to save cover letter.')
    }
  }

  // Function to handle accepting an edit
  const handleAcceptEdit = (index: number) => {
    setAcceptedEdits(prev => new Set([...prev, index]))
    toast.success('Edit accepted!')
  }

  // Function to handle rejecting an edit
  const handleRejectEdit = (index: number) => {
    setAcceptedEdits(prev => {
      const newSet = new Set(prev)
      newSet.delete(index)
      return newSet
    })
    toast.success('Edit rejected!')
  }

  // Function to toggle diff pane for a specific edit
  const handleToggleDiff = (index: number) => {
    if (selectedEditIndex === index) {
      setSelectedEditIndex(null)
      setShowDiffPane(false)
    } else {
      setSelectedEditIndex(index)
      setShowDiffPane(true)
    }
  }

  // Function to create a simple diff view
  const createDiffView = (original: string, suggested: string) => {
    return (
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <div>
          <h4 className="font-medium text-red-600 mb-2">Original:</h4>
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
            {original}
          </div>
        </div>
        <div>
          <h4 className="font-medium text-green-600 mb-2">Suggested:</h4>
          <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
            {suggested}
          </div>
        </div>
      </div>
    )
  }

  // Toggle accept/reject for an edit
  const handleToggleEdit = (index: number) => {
    const newAcceptedEdits = new Set(acceptedEdits)
    if (newAcceptedEdits.has(index)) {
      newAcceptedEdits.delete(index)
    } else {
      newAcceptedEdits.add(index)
    }
    setAcceptedEdits(newAcceptedEdits)
    
    // Automatically apply the edit when accepted
    if (newAcceptedEdits.has(index)) {
      // The edit is now accepted, so it will be applied automatically when generating CV
      toast.success('Edit accepted and will be applied automatically')
    } else {
      toast('Edit rejected')
    }
  }

  const toggleSuggestion = (idx: number) => {
    setExpandedSuggestions(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

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
      incrementApiHits(); // Increment API hits for recalculate
      if ((data.suggestions || data).predictedMatchScoreIfKeywordsAdded) {
        toast.success(`Predicted match score if keywords added: ${(data.suggestions || data).predictedMatchScoreIfKeywordsAdded}%`)
      }
      toast.success('Match score and suggestions updated!')
    } catch (error: any) {
      setError(error.message || 'Failed to recalculate match score.')
      toast.error(error.message || 'Failed to recalculate match score.')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-screen-lg mx-auto">
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <Download className="mr-2" /> CV Optimization
      </h2>
      
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 space-y-4 lg:space-y-0 border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h2 className="text-xl lg:text-2xl font-bold text-gray-900 flex-1">CV Optimization</h2>
        <div className="flex flex-col lg:flex-row items-center space-y-2 lg:space-y-0 lg:space-x-3 w-full lg:w-auto">
          <button
            onClick={handleOptimize}
            className={`bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 w-full lg:w-auto ${isOptimizing ? 'opacity-80' : ''}`}
            disabled={isOptimizing || !masterCV || !jobDescription.trim()}
          >
            {isOptimizing ? <span className="spinner mr-2"></span> : null}
            {isOptimizing ? 'Optimising...' : 'Auto Optimise'}
          </button>
          <button
            onClick={() => setShowManualOptimization(!showManualOptimization)}
            className={`bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 w-full lg:w-auto ${showManualOptimization ? 'ring-2 ring-blue-300' : ''}`}
            disabled={!masterCV || !jobDescription.trim()}
          >
            Manual Optimise
          </button>
        </div>
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

          {optimizationResults && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-purple-900">Job Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {optimizationResults.optimization.jobDetails.company && (
                  <div className="bg-white rounded-lg p-3 border border-purple-200">
                    <span className="text-sm font-medium text-purple-700">Company:</span>
                    <p className="text-gray-900">{optimizationResults.optimization.jobDetails.company}</p>
                  </div>
                )}
                {optimizationResults.optimization.jobDetails.location && (
                  <div className="bg-white rounded-lg p-3 border border-purple-200">
                    <span className="text-sm font-medium text-purple-700">Location:</span>
                    <p className="text-gray-900">{optimizationResults.optimization.jobDetails.location}</p>
                  </div>
                )}
                {optimizationResults.optimization.jobDetails.salary && (
                  <div className="bg-white rounded-lg p-3 border border-purple-200">
                    <span className="text-sm font-medium text-purple-700">Salary:</span>
                    <p className="text-gray-900">{optimizationResults.optimization.jobDetails.salary}</p>
                  </div>
                )}
                {optimizationResults.optimization.jobDetails.jobType && (
                  <div className="bg-white rounded-lg p-3 border border-purple-200">
                    <span className="text-sm font-medium text-purple-700">Job Type:</span>
                    <p className="text-gray-900">{optimizationResults.optimization.jobDetails.jobType}</p>
                  </div>
                )}
                {optimizationResults.optimization.jobDetails.contractLength && (
                  <div className="bg-white rounded-lg p-3 border border-purple-200">
                    <span className="text-sm font-medium text-purple-700">Contract:</span>
                    <p className="text-gray-900">{optimizationResults.optimization.jobDetails.contractLength}</p>
                  </div>
                )}
                {optimizationResults.optimization.jobDetails.other && (
                  <div className="bg-white rounded-lg p-3 border border-purple-200 md:col-span-2">
                    <span className="text-sm font-medium text-purple-700">Additional Details:</span>
                    <p className="text-gray-900">{optimizationResults.optimization.jobDetails.other}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. Enhanced Summary, Keywords, and Raw Response - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-blue-900">Summary</h3>
              </div>
              <div className="space-y-3">
                {Array.isArray(optimizationResults.optimization?.improvements) && optimizationResults.optimization.improvements.length > 0 ? (
                  optimizationResults.optimization.improvements.map((improvement: string, index: number) => (
                    <div key={index} className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="flex items-start">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <p className="text-gray-800 text-sm">{improvement}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600 text-sm">No specific improvements suggested.</p>
                )}
              </div>
            </div>

            {/* Keywords */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-green-900">Keywords</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(optimizationResults.optimization?.keywords) && optimizationResults.optimization.keywords.length > 0 ? (
                  optimizationResults.optimization.keywords.map((keyword: string, index: number) => (
                    <span
                      key={index}
                      className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow"
                    >
                      {keyword}
                    </span>
                  ))
                ) : (
                  <p className="text-gray-600 text-sm">No keywords identified.</p>
                )}
              </div>
            </div>

            {/* Raw Response */}
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Raw Response</h3>
                </div>
                <button
                  onClick={() => setShowRawResponse(!showRawResponse)}
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  {showRawResponse ? 'Hide' : 'Show'}
                </button>
              </div>
              {showRawResponse && (
                <div className="bg-gray-100 p-3 rounded text-xs overflow-x-auto max-h-64">
                  <pre className="whitespace-pre-wrap break-words">{JSON.stringify(optimizationResults, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>

          {/* 3. AI Suggestions Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">AI Suggestions</h3>
                  <p className="text-sm text-gray-600">Improve your CV with these targeted recommendations</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                  {suggestedEdits.length} suggestions
                </span>
              </div>
            </div>
            
            {suggestedEdits.length > 0 ? (
              <div className="space-y-4">
                {suggestedEdits.map((s: any, i: number) => (
                  <div key={i} className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                    <button
                      className="w-full text-left"
                      onClick={() => toggleSuggestion(i)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <span className="text-white text-sm font-bold">{i + 1}</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-left">
                              {s.improvedBullet || s.suggested}
                            </h4>
                            <p className="text-sm text-gray-500 mt-1">Click to see details</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                            Suggestion
                          </span>
                          <svg 
                            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${expandedSuggestions.has(i) ? 'rotate-180' : ''}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </button>
                    
                    {expandedSuggestions.has(i) && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                        {/* Original Text */}
                        <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg p-4">
                          <div className="flex items-center mb-2">
                            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-3">
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </div>
                            <span className="font-semibold text-red-800 text-sm">Original Text</span>
                          </div>
                          <div className="text-red-700 text-sm leading-relaxed bg-white p-3 rounded border border-red-100">
                            {s.originalBullet || s.original}
                          </div>
                        </div>
                        
                        {/* Improved Text */}
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center mb-2">
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <span className="font-semibold text-green-800 text-sm">Improved Version</span>
                          </div>
                          <div className="text-green-700 text-sm leading-relaxed bg-white p-3 rounded border border-green-100">
                            {s.improvedBullet || s.suggested}
                          </div>
                        </div>
                        
                        {/* Reason */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center mb-2">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <span className="font-semibold text-blue-800 text-sm">Why This Change?</span>
                          </div>
                          <div className="text-blue-700 text-sm leading-relaxed bg-white p-3 rounded border border-blue-100">
                            {s.reason}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Great Job!</h4>
                <p className="text-gray-600">Your CV is already well-optimized for this position. No specific suggestions needed.</p>
              </div>
            )}
          </div>

          {/* 4. Suggested Edits Section with Accept/Reject */}
          {suggestedEdits.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Suggested Edits</h3>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-600">
                    Accepted: {acceptedEdits.size} of {suggestedEdits.length}
                  </div>
                  <button
                    onClick={() => setAcceptedEdits(new Set(suggestedEdits.map((_, index: number) => index)))}
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Accept All
                  </button>
                  <button
                    onClick={() => setAcceptedEdits(new Set())}
                    className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <button
                onClick={handleRecalculate}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                disabled={isOptimizing || isGenerating}
              >
                Recalculate Match Score
              </button>
              <div className="space-y-4">
                {suggestedEdits.map((edit: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">{edit.section || 'General'}</h4>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleToggleEdit(index)}
                          className={`px-3 py-1 rounded text-sm ${acceptedEdits.has(index) ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700' : 'bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700 hover:from-gray-300 hover:to-gray-400'} transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105`}
                        >
                          {acceptedEdits.has(index) ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="text-gray-800 space-y-3">
                      <div>
                        <p className="font-medium text-gray-900 mb-2">Original:</p>
                        <div className="bg-gray-50 text-gray-700 rounded-lg px-3 py-2 border border-gray-200">
                          {edit.originalBullet || edit.original}
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 mb-2">Suggested (with changes highlighted):</p>
                        <div className="bg-white rounded-lg px-3 py-2 border border-gray-200">
                          {createInlineDiffView(edit.originalBullet || edit.original || '', edit.improvedBullet || edit.suggested || '')}
                        </div>
                        <div className="mt-2 flex items-center space-x-4 text-xs">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-100 border border-green-300 rounded mr-2"></div>
                            <span className="text-green-700">Added</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-red-100 border border-red-300 rounded mr-2 line-through"></div>
                            <span className="text-red-700">Removed</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded mr-2"></div>
                            <span className="text-gray-700">Unchanged</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 mb-2">Reason:</p>
                        <div className="bg-yellow-50 text-yellow-800 rounded-lg px-3 py-2 border border-yellow-200">
                          {edit.reason}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Cover Letter Generation Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Generate Cover Letter (optional)</h3>
                  <p className="text-sm text-gray-600">Create a personalized cover letter for this position</p>
                </div>
              </div>
              <button
                onClick={() => setCoverLetterExpanded(!coverLetterExpanded)}
                className={`px-3 py-1 rounded text-sm ${coverLetterExpanded ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700'} transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105`}
              >
                {coverLetterExpanded ? 'Collapse' : 'Expand'}
              </button>
            </div>

            {coverLetterExpanded && (
              <div className="space-y-4">
                {/* Source Data Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Source Data</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-blue-700">CV:</span>
                      <p className="text-blue-800">{masterCV?.name || 'Not uploaded'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700">Job Description:</span>
                      <p className="text-blue-800">{jobDescription.substring(0, 50)}...</p>
                    </div>
                  </div>
                </div>

                {/* Cover Letter Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Style</label>
                    <select
                      value={coverLetterStyle}
                      onChange={(e) => setCoverLetterStyle(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="traditional">Traditional</option>
                      <option value="modern">Modern</option>
                      <option value="creative">Creative</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tone</label>
                    <select
                      value={coverLetterTone}
                      onChange={(e) => setCoverLetterTone(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="professional">Professional</option>
                      <option value="enthusiastic">Enthusiastic</option>
                      <option value="confident">Confident</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hiring Manager</label>
                    <input
                      type="text"
                      value={hiringManager}
                      onChange={(e) => setHiringManager(e.target.value)}
                      placeholder="Hiring Manager Name"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Company Name"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Where did you find this job?</label>
                  <select
                    value={jobSource}
                    onChange={(e) => setJobSource(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="company website">Company website</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="indeed">Indeed</option>
                    <option value="glassdoor">Glassdoor</option>
                    <option value="referral">Referral</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleGenerateCoverLetter}
                    disabled={isGeneratingCoverLetter || !masterCV || !jobDescription.trim()}
                    className={`bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex-1 ${isGeneratingCoverLetter ? 'opacity-80' : ''}`}
                  >
                    {isGeneratingCoverLetter ? <span className="spinner mr-2"></span> : null}
                    {isGeneratingCoverLetter ? 'Generating...' : 'Auto Generate'}
                  </button>
                  <button
                    onClick={() => setShowManualOptimization(!showManualOptimization)}
                    className={`bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex-1 ${showManualOptimization ? 'ring-2 ring-blue-300' : ''}`}
                  >
                    Manual Generate
                  </button>
                </div>

                {/* Cover Letter Editor */}
                {showCoverLetterEditor && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Edit Cover Letter</label>
                      <textarea
                        value={editedCoverLetter}
                        onChange={(e) => setEditedCoverLetter(e.target.value)}
                        rows={15}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Paste your cover letter content here..."
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveCoverLetter}
                        disabled={isGeneratingCoverLetter}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        Save Your Edits
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Final Generate Button */}
          <div className="flex justify-end">
            <button
              onClick={handleGenerateCV}
              className={`bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-4 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 w-full lg:w-auto ${isGenerating ? 'opacity-80' : ''}`}
              disabled={isGenerating || suggestedEdits.length === 0}
            >
              {isGenerating ? <span className="spinner mr-2"></span> : null}
              {isGenerating ? 'Generating...' : coverLetterExpanded ? 'Save Your CV and Cover' : 'Save Your CV'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}