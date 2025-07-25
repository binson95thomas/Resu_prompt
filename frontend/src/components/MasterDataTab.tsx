import React, { useState, useEffect } from 'react'
import { useCallback } from 'react'
import { Upload, FileText, User, GraduationCap, Briefcase } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'

interface MasterDataTabProps {
  masterCV: File | null
  setMasterCV: (file: File | null) => void
  structuredData: any
  setStructuredData: (data: any) => void
  masterCVName: string | null
  masterCVSize: string | null
  onClearMasterData: () => void
}

export default function MasterDataTab({ 
  masterCV, 
  setMasterCV, 
  structuredData, 
  setStructuredData,
  masterCVName,
  masterCVSize,
  onClearMasterData
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Master Data</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveSection('cv')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeSection === 'cv' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            CV Upload
          </button>
          <button
            onClick={() => setActiveSection('structured')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeSection === 'structured' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            <User className="h-4 w-4 inline mr-2" />
            Structured Data
          </button>
        </div>
      </div>

      {activeSection === 'cv' && (
        <div className="space-y-4">
          <div className="text-gray-600">
            Upload your master CV in .docx format. This will be used as the base template for optimization.
          </div>
          <div className="flex items-center space-x-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'
              }`}
              style={{ minWidth: 280 }}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              {masterCV || masterCVName ? (
                <div>
                  <p className="text-lg font-medium text-gray-900">CV Uploaded</p>
                  <p className="text-sm text-gray-500">{masterCV ? masterCV.name : masterCVName}</p>
                  {masterCVSize && (
                    <p className="text-xs text-gray-400">Size: {Math.round(Number(masterCVSize) / 1024)} KB</p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    {isDragActive ? 'Drop the CV here' : 'Drag & drop your CV here'}
                  </p>
                  <p className="text-sm text-gray-500">or click to browse</p>
                </div>
              )}
            </div>
            {(masterCV || masterCVName) && (
              <button
                className="ml-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow"
                onClick={onClearMasterData}
              >
                Clear Master Data
              </button>
            )}
          </div>
        </div>
      )}

      {activeSection === 'structured' && (
        <div className="space-y-6">
          <div className="text-gray-600">
            Add structured data to enhance your CV optimization. This data will be used alongside your uploaded CV.
          </div>

          {/* Skills Section */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Briefcase className="h-5 w-5 mr-2" />
                Skills
              </h3>
              <button onClick={addSkill} className="btn-primary text-sm">
                Add Skill
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {structuredData.skills.map((skill: string, index: number) => (
                <span
                  key={index}
                  className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Experience Section */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Briefcase className="h-5 w-5 mr-2" />
                Experience
              </h3>
              <button onClick={addExperience} className="btn-primary text-sm">
                Add Experience
              </button>
            </div>
            <div className="space-y-3">
              {structuredData.experience.map((exp: any, index: number) => (
                <div key={index} className="bg-gray-50 p-3 rounded-lg">
                  <div className="font-medium">{exp.title}</div>
                  <div className="text-sm text-gray-600">{exp.company} • {exp.duration}</div>
                  <div className="text-sm text-gray-700 mt-1">{exp.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Education Section */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <GraduationCap className="h-5 w-5 mr-2" />
                Education
              </h3>
              <button onClick={addEducation} className="btn-primary text-sm">
                Add Education
              </button>
            </div>
            <div className="space-y-3">
              {structuredData.education.map((edu: any, index: number) => (
                <div key={index} className="bg-gray-50 p-3 rounded-lg">
                  <div className="font-medium">{edu.degree}</div>
                  <div className="text-sm text-gray-600">{edu.institution} • {edu.year}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 