import React, { useState, useEffect } from 'react'
import { useCallback } from 'react'
import { Upload, FileText, User, GraduationCap, Briefcase } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import FilePreview from './FilePreview';

interface MasterDataTabProps {
  masterCV: File | null
  setMasterCV: (file: File | null) => void
  structuredData: any
  setStructuredData: (data: any) => void
  masterCVName: string | null
  masterCVSize: string | null
  onClearMasterData: () => void
  coverLetterTemplate: File | null
  setCoverLetterTemplate: (file: File | null) => void
  setChatHistory: (fn: (prev: any[]) => any[]) => void
  incrementApiHits: (provider?: string) => void
}

export default function MasterDataTab({ 
  masterCV, 
  setMasterCV, 
  structuredData, 
  setStructuredData,
  masterCVName,
  masterCVSize,
  onClearMasterData,
  coverLetterTemplate,
  setCoverLetterTemplate,
  setChatHistory,
  incrementApiHits
}: MasterDataTabProps) {
  const [activeSection, setActiveSection] = React.useState<'cv' | 'structured'>('cv')
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRawResponse, setShowRawResponse] = useState(() => {
    const saved = localStorage.getItem('masterShowRawResponse');
    return saved === 'true';
  });
  const [rawResponse, setRawResponse] = useState<string | null>(() => {
    const saved = localStorage.getItem('masterRawResponse');
    return saved || null;
  });
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('masterCollapsed');
    return saved === 'true';
  });

  // Persist show raw response state
  useEffect(() => {
    localStorage.setItem('masterShowRawResponse', showRawResponse.toString());
  }, [showRawResponse]);

  // Persist raw response
  useEffect(() => {
    if (rawResponse) {
      localStorage.setItem('masterRawResponse', rawResponse);
    } else {
      localStorage.removeItem('masterRawResponse');
    }
  }, [rawResponse]);

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem('masterCollapsed', collapsed.toString());
  }, [collapsed]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file && file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      setMasterCV(file)
      toast.success('CV uploaded successfully!')
    } else {
      toast.error('Please upload a .docx file')
    }
  }, [setMasterCV])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: false
  })

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setMasterCV(file);
      setError(null);
      setRawResponse(null);
      setShowRawResponse(false);
    }
  };

  const handleProcessCV = async () => {
    if (!masterCV) {
      setError('Please upload a CV first.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setRawResponse(null);
    setShowRawResponse(false);

    try {
      const formData = new FormData();
      formData.append('cv', masterCV);

      const response = await fetch('/api/optimize/optimize-cv', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStructuredData(data);
      setRawResponse(JSON.stringify(data, null, 2));
      
      // Save to chat history with CV processing
      setChatHistory(prev => [
        ...prev,
        {
          question: `Process CV file: ${masterCV?.name || 'Unknown file'}`,
          answer: JSON.stringify(data, null, 2),
          timestamp: new Date().toISOString(),
          model: 'Gemini 2.0 Flash',
          promptSource: 'cv-processing'
        }
      ]);
      
      incrementApiHits('gemini'); // Master data processing uses Gemini by default
    } catch (error: any) {
      setError('Failed to process CV. Please try again.');
      console.error('Error processing CV:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const addSkill = () => {
    const skill = prompt('Enter a skill:')
    if (skill && !structuredData.skills.includes(skill)) {
      setStructuredData({
        ...structuredData,
        skills: [...structuredData.skills, skill]
      })
    }
  }

  const addExperience = () => {
    const title = prompt('Job title:')
    const company = prompt('Company:')
    const duration = prompt('Duration (e.g., 2020-2023):')
    const description = prompt('Description:')
    
    if (title && company && duration && description) {
      setStructuredData({
        ...structuredData,
        experience: [...structuredData.experience, { title, company, duration, description }]
      })
    }
  }

  const addEducation = () => {
    const degree = prompt('Degree:')
    const institution = prompt('Institution:')
    const year = prompt('Year:')
    
    if (degree && institution && year) {
      setStructuredData({
        ...structuredData,
        education: [...structuredData.education, { degree, institution, year }]
      })
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Master CV Upload</h2>
        <p className="text-gray-600 text-sm">
          Upload your master CV in .docx format. This will be used as the base template for optimization.
        </p>
      </div>
      
      <div className="space-y-4">
        {/* File upload area */}
        <div className="flex flex-col lg:flex-row items-center space-y-4 lg:space-y-0 lg:space-x-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-4 lg:p-6 text-center cursor-pointer transition-all duration-200 flex-1 w-full ${
              isDragActive 
                ? 'border-blue-500 bg-blue-50 shadow-md' 
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Upload className="h-6 w-6 text-blue-600" />
              </div>
              
              {masterCV || masterCVName ? (
                <div className="text-left">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">CV Uploaded</p>
                  </div>
                  <p className="text-xs text-gray-600 font-mono truncate">{masterCV ? masterCV.name : masterCVName}</p>
                  {masterCVSize && (
                    <p className="text-xs text-gray-500">Size: {Math.round(Number(masterCVSize) / 1024)} KB</p>
                  )}
                </div>
              ) : (
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">
                    {isDragActive ? 'Drop your CV here' : 'Drag & drop your CV here'}
                  </p>
                  <p className="text-xs text-gray-500">or click to browse files</p>
                </div>
              )}
            </div>
          </div>
          
          {(masterCV || masterCVName) && (
            <button
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-sm transition-colors duration-200 flex items-center space-x-2 text-sm w-full lg:w-auto"
              onClick={onClearMasterData}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Clear</span>
            </button>
          )}
        </div>
        
        {/* Preview area */}
        <div className="min-h-[400px]">
          <FilePreview file={masterCV} />
        </div>
      </div>

      {/* Cover Letter Template Upload Section */}
      <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Cover Letter Template (Optional)</h2>
          <p className="text-gray-600 text-sm">
            Upload a cover letter template in .docx format. This is optional and will be used as a reference for cover letter generation.
          </p>
        </div>
        
        <div className="space-y-4">
          {/* Cover Letter Template upload area */}
          <div className="flex flex-col lg:flex-row items-center space-y-4 lg:space-y-0 lg:space-x-4">
            <div
              className={`border-2 border-dashed rounded-lg p-4 lg:p-6 text-center cursor-pointer transition-all duration-200 flex-1 w-full ${
                coverLetterTemplate 
                  ? 'border-green-500 bg-green-50 shadow-md' 
                  : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'
              }`}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.docx';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file && file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                    setCoverLetterTemplate(file);
                    toast.success('Cover letter template uploaded successfully!');
                  } else {
                    toast.error('Please upload a .docx file');
                  }
                };
                input.click();
              }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                
                {coverLetterTemplate ? (
                  <div className="text-left">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">Template Uploaded</p>
                    </div>
                    <p className="text-xs text-gray-600 font-mono truncate">{coverLetterTemplate.name}</p>
                    <p className="text-xs text-gray-500">Size: {Math.round(coverLetterTemplate.size / 1024)} KB</p>
                  </div>
                ) : (
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">Upload Cover Letter Template</p>
                    <p className="text-xs text-gray-500">Click to browse files (.docx)</p>
                  </div>
                )}
              </div>
            </div>
            
            {coverLetterTemplate && (
              <button
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-sm transition-colors duration-200 flex items-center space-x-2 text-sm w-full lg:w-auto"
                onClick={() => setCoverLetterTemplate(null)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Remove</span>
              </button>
            )}
          </div>
          
          {/* Cover Letter Template Preview */}
          {coverLetterTemplate && (
            <div className="min-h-[200px]">
              <FilePreview file={coverLetterTemplate} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 