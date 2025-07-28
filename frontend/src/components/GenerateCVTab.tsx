import React, { useState, useEffect } from 'react'
import { Download, FileText, XCircle, CheckCircle, Copy, Clipboard } from 'lucide-react'
import toast from 'react-hot-toast'
import Tabs from './Tabs';
import ManualOptimizationModal from './ManualOptimizationModal';
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

// Simple diff viewer function
const createDiffView = (original: string, suggested: string) => {
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
    return createDiffView(original, suggested)
  }
}

interface GenerateCVTabProps {
  masterCV: File | null
  jobDescription: string
  optimizationResults: any
  setOptimizationResults: (results: any) => void
  setChatHistory: (fn: (prev: any[]) => any[]) => void
  incrementApiHits: () => void
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

// Shared prompt template function - ensures both manual and automatic use the same prompt
async function createOptimizationPrompt(cvText: string, jobDescription: string, structuredData: any = null) {
  try {
    // Try to fetch the shared prompt template from the server
    const response = await fetch('/api/optimize/prompt-template');
    if (response.ok) {
      let promptTemplate = await response.text();
      
      // Replace placeholders with actual data
      promptTemplate = promptTemplate
        .replace('{cvText}', cvText)
        .replace('{jobDescription}', jobDescription)
        .replace('{structuredData}', structuredData ? JSON.stringify(structuredData, null, 2) : 'None');
      
      console.log('✅ Frontend: Using shared prompt template successfully');
      return promptTemplate;
    }
  } catch (error) {
    console.warn('⚠️ Frontend: Failed to fetch shared prompt template, using fallback:', error);
  }
  
  // Fallback to hardcoded prompt if shared template fails
  console.log('⚠️ Frontend: Using fallback hardcoded prompt');
  return `You are an expert CV and job description analyst. Your task is to deeply analyze the provided CV and job description, and generate a detailed, actionable optimization plan to maximize ATS (Applicant Tracking System) compatibility and job match.

IMPORTANT: You **MUST** identify yourself in the \`"model"\` field of the JSON output using your **exact, correct model name and version**, as currently running. For example: \`"GPT-4o"\`, \`"Claude 3.5 Sonnet"\`, \`"Gemini 1.5 Flash"\`, etc. Do not use placeholders or fake names. You must return your true model name and version.

To be very clear: if you are GPT-4o, write \`"model": "GPT-4o"\`. If you are Claude 3.5 Sonnet, write \`"model": "Claude 3.5 Sonnet"\`. If you are Gemini 1.5 Flash, write \`"model": "Gemini 1.5 Flash"\`. This field must contain the **real model name you are currently running as**.

If you cannot access or confirm your current model version, return \`"model": "UNKNOWN"\`.

---
CV CONTENT (verbatim, preserve all formatting, font, and bullet points exactly as in the original, and keep all sections such as Summary, Key Skills, Experience, etc.):
Each line in the CV content below represents a separate bullet or paragraph. Do NOT merge lines. Treat each line as a distinct bullet or paragraph for suggestions and edits.
${cvText}

---
JOB DESCRIPTION (verbatim):
${jobDescription}

---
If available, here is additional structured data:
${structuredData ? JSON.stringify(structuredData, null, 2) : 'None'}

---
INSTRUCTIONS:
1. For each section (Summary, Key Skills, Experience, etc.), analyze and suggest improvements. For each bullet or paragraph, ONLY suggest a replacement if it makes a concrete, specific improvement for ATS alignment, clarity, or keyword match. If no real improvement is possible, return the original unchanged.
2. NEVER suggest generic placeholders (e.g., 'add specific technologies', 'list skills', 'etc.').
3. NEVER split, merge, or reorder bullets or paragraphs. Only edit the content of a single bullet or paragraph at a time.
4. If a bullet or paragraph is already optimal, return it as-is.
5. List all keywords from the job description that are missing or underrepresented in the CV, and for each, suggest a concrete way to add it to the CV (e.g., add to a bullet, add to skills, etc.).
6. If the job description mentions SQL or queries, suggest how to optimize queries for ATS and add relevant keywords.
7. Give an overall match score (0-100) and a prioritized list of improvements.
8. Provide 2-3 overall recommendations for further improvement, but do NOT use generic language.
9. Predict the new match score if the user adds all the suggested missing keywords (field: predictedMatchScoreIfKeywordsAdded).
10. Extract and return all available key job details (as much as possible) from the job description, including: company name, location, salary, contract length, job type, and any other relevant details. Return these in a 'jobDetails' field.
11. PRESERVE ALL FORMATTING, including font, size, bold, italics, underline, color, bullet/numbering, and section headers. Do not change the structure or layout of the document.
12. IMPORTANT: In the "model" field, include YOUR ACTUAL MODEL NAME AND VERSION (e.g., 'ChatGPT 4o Mini', 'Claude 3.5 Sonnet', 'Gemini 2.0 Flash', 'GPT-4', etc.). Do NOT use placeholder text - use your real model name.

---
RESPONSE FORMAT (JSON only, no extra text):
{
  "model": "REPLACE WITH YOUR ACTUAL MODEL NAME AND VERSION (e.g., 'ChatGPT 4o Mini', 'Claude 3.5 Sonnet', 'Gemini 2.0 Flash', 'GPT-4', 'Bard', etc.)",
  "matchScore": <calculate a score from 0-100 based on keyword match, experience relevance, and overall fit>,
  "keywords": ["keyword1", "keyword2"],
  "keywordSuggestions": [
    { "keyword": "keyword1", "suggestion": "Add to bullet X in Experience section" }
  ],
  "improvements": ["improvement1", "improvement2"],
  "suggestedEdits": [
    {
      "section": "Section name (e.g., Summary, Key Skills, Experience)",
      "originalBullet": "Original bullet or paragraph from CV",
      "improvedBullet": "Improved bullet or paragraph with added keywords/skills (must be concrete, not generic)",
      "reason": "Why this change helps"
    }
  ],
  "overallRecommendations": [
    "Recommendation 1",
    "Recommendation 2"
  ],
  "predictedMatchScoreIfKeywordsAdded": 95,
  "jobDetails": {
    "company": "Company Name",
    "location": "Location",
    "salary": "Salary or range",
    "contractLength": "Contract length or type",
    "jobType": "Full-time/Part-time/Contract/Remote/Onsite/etc.",
    "other": "Any other relevant details"
  }
}

---
STRICT RULES:
- Do NOT invent experience or skills not present in the CV.
- Do NOT change the order or structure unless required for ATS.
- Use only the JSON format above. Do NOT include explanations or extra text.
- Preserve all original formatting, especially bullet points, lists, section headers, and font styles.
- Do NOT use generic placeholders or vague suggestions. Only concrete, actionable edits are allowed.`
}

export default function GenerateCVTab({ 
  masterCV, 
  jobDescription, 
  optimizationResults, 
  setOptimizationResults,
  setChatHistory,
  incrementApiHits
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
      
      // Show warning if fallback
      if (optimizationData.isFallback) {
        toast.error('Gemini returned a generic fallback response. Please check your CV, job description, or try again.');
      }
      
      // Get the actual prompt that was sent to the API
      const actualPrompt = await createOptimizationPrompt(data.cvText, data.jobDescription, data.structuredData)
      
      // Log to chat history with actual prompt
      setChatHistory(prev => [
        ...prev,
        {
          question: actualPrompt,
          answer: JSON.stringify(optimizationData, null, 2),
          timestamp: new Date().toISOString(),
          model: modelUsed,
          promptSource: optimizationData.promptSource || 'shared-template'
        }
      ])
      
      incrementApiHits(); // Increment API hits on successful call
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

  const toggleSuggestion = (idx: number) => {
    setExpandedSuggestions(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  // Manual optimization functions
  const handleCopyPrompt = async () => {
    if (!masterCV || !jobDescription.trim()) {
      toast.error('Please upload a CV and provide a job description first')
      return
    }

    setIsCopyingPrompt(true)
    try {
      // Extract CV text using the same method as the API
      const formData = new FormData()
      formData.append('cv', masterCV)
      formData.append('jobDescription', jobDescription)
      
      const response = await fetch('/api/optimize/optimize-cv', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('Failed to extract CV text')
      }
      
      const data = await response.json()
      const cvText = data.cvText || ''
      
      // Use the shared prompt template - ensures consistency with automatic optimization
      const prompt = await createOptimizationPrompt(cvText, jobDescription, data.structuredData)

      await navigator.clipboard.writeText(prompt)
      setLastCopiedPrompt(prompt) // Store the actual prompt
      setCopiedPrompt(true)
      toast.success('Prompt copied to clipboard!')
      setTimeout(() => setCopiedPrompt(false), 2000)
    } catch (error) {
      toast.error('Failed to copy prompt')
      console.error('Error copying prompt:', error)
    } finally {
      setIsCopyingPrompt(false)
    }
  }

  const handlePasteResponse = () => {
    if (!manualResponse.trim()) {
      toast.error('Please paste a response first')
      return
    }

    try {
      // Clean the response to handle markdown code blocks
      let cleanedResponse = manualResponse.trim()
      
      // Remove markdown code block markers
      cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*\n?/i, '') // Remove opening ```json or ```
      cleanedResponse = cleanedResponse.replace(/\n?```\s*$/i, '') // Remove closing ```
      
      // Remove any leading/trailing whitespace
      cleanedResponse = cleanedResponse.trim()
      
      const parsedResponse = JSON.parse(cleanedResponse)
      
      // Extract model information from the response for manual optimization
      const modelUsed = parsedResponse.model || parsedResponse.modelUsed || 'Unknown Model'
      
      // Add model information to optimization results
      const optimizationDataWithModel = {
        ...parsedResponse,
        model: modelUsed
      };
      
      setOptimizationResults(optimizationDataWithModel)
      setSuggestedEdits(parsedResponse.suggestedEdits || [])
      
      // Store the prompt before clearing it
      const promptToUse = lastCopiedPrompt || `Manual optimization using ${modelUsed} - Prompt copied from shared template`
      
      // Add to chat history with model information from response
      setChatHistory(prev => [
        ...prev,
        {
          question: promptToUse,
          answer: JSON.stringify(parsedResponse, null, 2),
          timestamp: new Date().toISOString(),
          model: modelUsed,
          promptSource: parsedResponse.promptSource || 'manual'
        }
      ])
      
      setShowManualOptimization(false) // Close the manual optimization frame
      setManualResponse('') // Clear the response textarea
      setLastCopiedPrompt('') // Clear the stored prompt
      toast.success('Response processed successfully!')
    } catch (error) {
      toast.error('Invalid JSON response. Please check the format.')
      console.error('Error parsing response:', error)
    }
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

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-screen-lg mx-auto">
      <h2 className="text-xl font-bold mb-4 flex items-center"><Download className="mr-2" /> CV Optimization</h2>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 space-y-4 lg:space-y-0">
        <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Generate Optimized CV</h2>
        <div className="flex flex-col lg:flex-row items-center space-y-2 lg:space-y-0 lg:space-x-3 w-full lg:w-auto">
        <button
          onClick={handleOptimize}
            className={`btn-primary w-full lg:w-auto ${isOptimizing ? 'opacity-80' : ''}`}
            disabled={isOptimizing || !masterCV || !jobDescription.trim()}
          >
            {isOptimizing ? <span className="spinner mr-2"></span> : null}
            {isOptimizing ? 'Optimizing...' : 'Optimize with AI'}
          </button>
          <button
            onClick={() => setShowManualOptimization(!showManualOptimization)}
            className={`btn-secondary w-full lg:w-auto ${showManualOptimization ? 'bg-blue-100 text-blue-800' : ''}`}
            disabled={!masterCV || !jobDescription.trim()}
          >
            Manual Optimization
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
            <div className="space-y-4">
              {/* Match Score Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900">Match Score</h3>
                    <p className="text-sm text-blue-700">How well your CV matches the job description</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-600">{optimizationResults.matchScore || 0}%</div>
                    <div className="text-xs text-blue-500">out of 100</div>
                  </div>
                </div>
              </div>

              {/* Job Details Section */}
              {optimizationResults.jobDetails && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                        </svg>
                      </div>
                      Job Details
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                        Active
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    {/* Company & Location */}
                    <div className="space-y-4">
                      <div className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-4">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Company</p>
                          <p className="text-lg font-semibold text-gray-900">{optimizationResults.jobDetails.company}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center p-4 bg-gradient-to-r from-ocean-50 to-cyan-50 rounded-lg border border-ocean-100">
                                                  <div className="w-10 h-10 bg-ocean-500 rounded-lg flex items-center justify-center mr-4">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Location</p>
                          <p className="text-lg font-semibold text-gray-900">{optimizationResults.jobDetails.location}</p>
                        </div>
                      </div>
                    </div>

                    {/* Job Type & Contract */}
                    <div className="space-y-4">
                      <div className="flex items-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                        <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mr-4">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Job Type</p>
                          <p className="text-lg font-semibold text-gray-900">{optimizationResults.jobDetails.jobType}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-100">
                        <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center mr-4">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">Contract</p>
                          <p className="text-lg font-semibold text-gray-900">{optimizationResults.jobDetails.contractLength || 'Not specified'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Salary - Full Width */}
                  {optimizationResults.jobDetails.salary && (
                    <div className="mt-6">
                      <div className="flex items-center p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-100">
                        <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center mr-4">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-yellow-600 uppercase tracking-wide">Salary</p>
                          <p className="text-lg font-semibold text-gray-900">{optimizationResults.jobDetails.salary}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Additional Info - Full Width */}
                  {optimizationResults.jobDetails.other && (
                    <div className="mt-6">
                      <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border border-gray-200">
                        <div className="flex items-start">
                          <div className="w-10 h-10 bg-gray-500 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">Additional Information</p>
                            <p className="text-sm text-gray-700 leading-relaxed">{optimizationResults.jobDetails.other}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Enhanced Summary, Keywords, and Raw Response - Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Summary Section */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Summary</h3>
                      <p className="text-sm text-gray-600">Key insights and recommendations</p>
                    </div>
                  </div>
                  <div className="text-gray-700 leading-relaxed text-sm">
                    {optimizationResults.overallRecommendations ? (
                      <div className="space-y-3">
                        {Array.isArray(optimizationResults.overallRecommendations) ? 
                          optimizationResults.overallRecommendations.map((rec: string, i: number) => (
                            <div key={i} className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                              <div className="flex items-start">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                <span className="text-blue-800">{rec}</span>
                              </div>
                            </div>
                          )) :
                          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                            <div className="flex items-start">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                              <span className="text-blue-800">{optimizationResults.overallRecommendations}</span>
                            </div>
                          </div>
                        }
                      </div>
                    ) : optimizationResults.improvements ? (
                      <div className="space-y-3">
                        {Array.isArray(optimizationResults.improvements) ? 
                          optimizationResults.improvements.map((imp: string, i: number) => (
                            <div key={i} className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                              <div className="flex items-start">
                                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                <span className="text-green-800">{imp}</span>
                              </div>
                            </div>
                          )) :
                          <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                            <div className="flex items-start">
                              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                              <span className="text-green-800">{optimizationResults.improvements}</span>
                            </div>
                          </div>
                        }
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 text-sm">No summary available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Keywords Section */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-4">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Keywords</h3>
                        <p className="text-sm text-gray-600">Important terms from the job description</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                      {Array.isArray(optimizationResults.keywords) ? optimizationResults.keywords.length : 0}
                    </span>
                  </div>
                  {Array.isArray(optimizationResults.keywords) && optimizationResults.keywords.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {optimizationResults.keywords.map((kw: string, i: number) => (
                        <span key={i} className="px-3 py-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 rounded-lg text-sm font-medium border border-green-200 hover:from-green-200 hover:to-emerald-200 transition-all duration-200">
                          {kw}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 text-sm">No keywords found</p>
                    </div>
                  )}
                </div>

                {/* Raw Response Section */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mr-4">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Raw Response</h3>
                        <p className="text-sm text-gray-600">Complete AI response data</p>
                      </div>
                    </div>
                    <button
                      className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full hover:bg-purple-200 transition-colors"
                      onClick={() => setShowRawResponse(!showRawResponse)}
                    >
                      {showRawResponse ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {showRawResponse && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-200">
                        <pre className="text-xs overflow-x-auto max-h-64 font-mono text-gray-700 leading-relaxed">
                          {JSON.stringify(optimizationResults, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced Suggestions Section */}
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
                      {Array.isArray(optimizationResults.suggestedEdits) ? optimizationResults.suggestedEdits.length : 0} suggestions
                    </span>
                  </div>
                </div>
                
                {Array.isArray(optimizationResults.suggestedEdits) && optimizationResults.suggestedEdits.length > 0 ? (
                  <div className="space-y-4">
                    {optimizationResults.suggestedEdits.map((s: any, i: number) => (
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
                    className="btn-secondary"
                  >
                    Accept All
                  </button>
                  <button
                    onClick={() => setAcceptedEdits(new Set())}
                    className="btn-secondary"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <button
                onClick={handleRecalculate}
                className="btn-secondary"
                disabled={isOptimizing || isGenerating}
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
            <div className="flex justify-end">
              <button
                onClick={handleGenerateCV}
                className={`btn-primary w-full lg:w-auto ${isGenerating ? 'opacity-80' : ''}`}
                disabled={isGenerating || suggestedEdits.length === 0}
              >
                {isGenerating ? <span className="spinner mr-2"></span> : null}
                {isGenerating ? 'Generating...' : 'Generate Optimized CV'}
              </button>
                </div>
          )}
          {successFolderPath && (
            <div className="bg-gradient-to-br from-ocean-50 via-cyan-50 to-teal-50 border border-ocean-200 rounded-2xl p-6 mb-6 shadow-lg backdrop-blur-sm">
              {/* Success Header */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-ocean-500 to-cyan-600 rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Files Generated Successfully!</h3>
                    <p className="text-sm text-gray-600">Your optimized CV and job description are ready</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    className="px-4 py-3 bg-gradient-to-r from-ocean-100 to-cyan-100 text-ocean-800 rounded-xl hover:from-ocean-200 hover:to-cyan-200 text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                    onClick={() => {
                      const folderPath = successFolderPath.split('|')[1].split('\\').slice(0, -1).join('\\') || successFolderPath.split('|')[1].split('/').slice(0, -1).join('/');
                      // Try to open folder using backend API
                      fetch('/api/open-folder', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ folderPath: folderPath })
                      })
                      .then(response => {
                        if (response.ok) {
                          toast.success('Opening folder...');
                        } else {
                          throw new Error('Failed to open folder');
                        }
                      })
                      .catch(error => {
                        // Fallback: copy path and show instructions
                        navigator.clipboard.writeText(folderPath);
                        toast.success('Folder path copied! Paste in File Explorer to open the folder.');
                      });
                    }}
                    title="Open folder"
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span>Open Folder</span>
                    </div>
                  </button>
                  <button
                    className="px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 rounded-xl hover:from-gray-200 hover:to-gray-300 text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                    onClick={() => {
                      const folderPath = successFolderPath.split('|')[1].split('\\').slice(0, -1).join('\\') || successFolderPath.split('|')[1].split('/').slice(0, -1).join('/');
                      navigator.clipboard.writeText(folderPath);
                      toast.success('Folder path copied!');
                    }}
                    title="Copy folder path"
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy Path</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Files Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* CV File Card */}
                <div className="bg-gradient-to-br from-ocean-50 to-cyan-50 border border-ocean-200 rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-ocean-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-md">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">CV File</h4>
                        <p className="text-xs text-gray-600">Optimized resume</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        className="px-3 py-2 bg-gradient-to-r from-ocean-100 to-cyan-100 text-ocean-800 rounded-lg hover:from-ocean-200 hover:to-cyan-200 text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                        onClick={() => {
                          const cvPath = successFolderPath.split('|')[1];
                          navigator.clipboard.writeText(cvPath);
                          toast.success('CV path copied!');
                        }}
                      >
                        <div className="flex items-center space-x-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Copy</span>
                        </div>
                      </button>
                      <button
                        className="px-3 py-2 bg-gradient-to-r from-teal-100 to-cyan-100 text-teal-800 rounded-lg hover:from-teal-200 hover:to-cyan-200 text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                        onClick={() => {
                          const cvPath = successFolderPath.split('|')[1];
                          // Try to open file using backend API
                          fetch('/api/open-file', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ filePath: cvPath })
                          })
                          .then(response => {
                            if (response.ok) {
                              toast.success('Opening CV file...');
                            } else {
                              throw new Error('Failed to open file');
                            }
                          })
                          .catch(error => {
                            // Fallback: copy path and show instructions
                            navigator.clipboard.writeText(cvPath);
                            toast.success('CV path copied! Right-click and "Open file location" to open the file.');
                          });
                        }}
                      >
                        <div className="flex items-center space-x-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          <span>Open</span>
                        </div>
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Filename</span>
                      <div className="mt-1 font-mono bg-white px-3 py-2 rounded-lg border border-ocean-100 text-sm break-all shadow-sm">
                        {successFolderPath.split('|')[0]}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Location</span>
                      <div className="mt-1 font-mono bg-white px-3 py-2 rounded-lg border border-ocean-100 text-xs break-all shadow-sm">
                        {successFolderPath.split('|')[1] || successFolderPath}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* JD File Card */}
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-md">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Job Description</h4>
                        <p className="text-xs text-gray-600">Target role details</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        className="px-3 py-2 bg-gradient-to-r from-teal-100 to-cyan-100 text-teal-800 rounded-lg hover:from-teal-200 hover:to-cyan-200 text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                        onClick={() => {
                          const jdPath = successFolderPath.split('|')[3];
                          navigator.clipboard.writeText(jdPath);
                          toast.success('JD path copied!');
                        }}
                      >
                        <div className="flex items-center space-x-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Copy</span>
                        </div>
                      </button>
                      <button
                        className="px-3 py-2 bg-gradient-to-r from-teal-100 to-cyan-100 text-teal-800 rounded-lg hover:from-teal-200 hover:to-cyan-200 text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                        onClick={() => {
                          const jdPath = successFolderPath.split('|')[3];
                          // Try to open file using backend API
                          fetch('/api/open-file', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ filePath: jdPath })
                          })
                          .then(response => {
                            if (response.ok) {
                              toast.success('Opening JD file...');
                            } else {
                              throw new Error('Failed to open file');
                            }
                          })
                          .catch(error => {
                            // Fallback: copy path and show instructions
                            navigator.clipboard.writeText(jdPath);
                            toast.success('JD path copied! Right-click and "Open file location" to open the file.');
                          });
                        }}
                      >
                        <div className="flex items-center space-x-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          <span>Open</span>
                        </div>
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Filename</span>
                      <div className="mt-1 font-mono bg-white px-3 py-2 rounded-lg border border-teal-100 text-sm break-all shadow-sm">
                        {successFolderPath.split('|')[2]}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Location</span>
                      <div className="mt-1 font-mono bg-white px-3 py-2 rounded-lg border border-teal-100 text-xs break-all shadow-sm">
                        {successFolderPath.split('|')[3] || successFolderPath}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Optimization Modal */}
      <ManualOptimizationModal
        open={showManualOptimization}
        onClose={() => setShowManualOptimization(false)}
        onCopyPrompt={handleCopyPrompt}
        onPasteResponse={handlePasteResponse}
        manualResponse={manualResponse}
        setManualResponse={setManualResponse}
        copiedPrompt={copiedPrompt}
        isCopyingPrompt={isCopyingPrompt}
        disabled={!masterCV || !jobDescription.trim()}
      />
    </div>
  )
} 