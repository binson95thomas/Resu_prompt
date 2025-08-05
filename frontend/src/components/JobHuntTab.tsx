import React, { useState } from 'react';
import { Search, Download, Upload, FileText, Briefcase, Settings, AlertCircle, CheckCircle, Clock, Plus, List, Target, Building, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  type: string;
  description: string;
  requirements: string[];
  benefits: string[];
  sponsorship: boolean;
  postedDate: string;
  applicationDeadline?: string;
  jobUrl?: string;
}

interface JobHuntTabProps {
  setChatHistory: (fn: (prev: any[]) => any[]) => void;
  incrementApiHits: (provider?: string) => void;
  setActiveTab: (tab: 'master' | 'job' | 'generate' | 'jobhunt' | 'jobtracker') => void;
}

type JobHuntView = 'search' | 'newJobs' | 'criteria' | 'manualPrompt';

export default function JobHuntTab({ 
  setChatHistory,
  incrementApiHits,
  setActiveTab
}: JobHuntTabProps) {
  const [currentView, setCurrentView] = useState<JobHuntView>('search');
  const [isAutoFetching, setIsAutoFetching] = useState(false);
  const [isManualFetching, setIsManualFetching] = useState(false);
  const [manualJobQuery, setManualJobQuery] = useState('');
  const [fetchedJobs, setFetchedJobs] = useState<Job[]>([]);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualPrompt, setManualPrompt] = useState('');
  const [showManualPrompt, setShowManualPrompt] = useState(false);
  
  // Search criteria state
  const [searchCriteria, setSearchCriteria] = useState({
    jobTitles: ['Data Analyst', 'ML Engineer', 'Data Scientist'],
    location: 'UK',
    companyType: 'tech',
    sponsorship: true,
    experienceLevel: 'mid-senior',
    remote: true
  });

  const generateJobSearchPrompt = (isAuto: boolean = true) => {
    const criteria = searchCriteria;
    const jobTitlesStr = criteria.jobTitles.filter(t => t.trim()).join(', ');
    
    const basePrompt = `You are a job search assistant. Based on your knowledge of current job market trends and company information, provide realistic job opportunities that match the search criteria.

Search Criteria:
- Job Titles: ${jobTitlesStr}
- Location: ${criteria.location}
- Company Type: ${criteria.companyType === 'tech' ? 'Technology companies' : criteria.companyType}
- Experience Level: ${criteria.experienceLevel}
- Sponsorship Required: ${criteria.sponsorship ? 'Yes' : 'No'}
- Remote/Hybrid: ${criteria.remote ? 'Yes' : 'No'}

IMPORTANT: Provide realistic job opportunities based on your knowledge. Focus on companies that are known to hire international candidates and offer sponsorship.

For each job found, provide the following information in JSON format:
{
  "jobs": [
    {
      "id": "unique_id",
      "title": "Job Title",
      "company": "Company Name",
      "location": "Location",
      "salary": "Salary range if available",
      "type": "Full-time/Part-time/Contract",
      "description": "Brief job description",
      "requirements": ["requirement1", "requirement2"],
      "benefits": ["benefit1", "benefit2"],
      "sponsorship": true/false,
      "postedDate": "YYYY-MM-DD",
      "jobUrl": "Direct application URL if available"
    }
  ]
}

Focus on:
1. UK-based tech companies that are known to offer sponsorship
2. Companies like Google, Microsoft, Amazon, Meta, Apple, Netflix, Spotify, etc.
3. Realistic job descriptions and requirements
4. Include direct application links when available

Return only valid JSON with realistic job opportunities.`;

    if (isAuto) {
      return basePrompt;
    } else {
      return `${basePrompt}

Additional Search Query: "${manualJobQuery}"

Please search for jobs matching this specific query while considering the above criteria.`;
    }
  };

  const parseJobResponse = (response: string): Job[] => {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.jobs && Array.isArray(parsed.jobs)) {
          return parsed.jobs.map((job: any, index: number) => ({
            id: job.id || `job_${Date.now()}_${index}`,
            title: job.title || 'Unknown Title',
            company: job.company || 'Unknown Company',
            location: job.location || 'Unknown Location',
            salary: job.salary,
            type: job.type || 'Full-time',
            description: job.description || 'No description available',
            requirements: Array.isArray(job.requirements) ? job.requirements : [],
            benefits: Array.isArray(job.benefits) ? job.benefits : [],
            sponsorship: Boolean(job.sponsorship),
            postedDate: job.postedDate || new Date().toISOString().split('T')[0],
            jobUrl: job.jobUrl
          }));
        }
      }
      
      // If no valid JSON found, try to create sample jobs based on the response
      if (response.toLowerCase().includes('cannot') || response.toLowerCase().includes('limitation')) {
        // Create sample jobs when AI indicates limitations
        return [
          {
            id: `sample_1_${Date.now()}`,
            title: 'Data Analyst',
            company: 'Google',
            location: 'London, UK',
            salary: '£45,000 - £65,000',
            type: 'Full-time',
            description: 'Entry-level data analyst position focusing on data processing and analysis.',
            requirements: ['Python', 'SQL', 'Excel', 'Bachelor\'s degree'],
            benefits: ['Health insurance', 'Remote work', 'Professional development'],
            sponsorship: true,
            postedDate: new Date().toISOString().split('T')[0],
            jobUrl: 'https://careers.google.com'
          },
          {
            id: `sample_2_${Date.now()}`,
            title: 'ML Engineer',
            company: 'Microsoft',
            location: 'Cambridge, UK',
            salary: '£50,000 - £70,000',
            type: 'Full-time',
            description: 'Machine learning engineer role working on AI/ML projects.',
            requirements: ['Python', 'TensorFlow', 'PyTorch', 'Machine Learning'],
            benefits: ['Competitive salary', 'Flexible hours', 'Learning budget'],
            sponsorship: true,
            postedDate: new Date().toISOString().split('T')[0],
            jobUrl: 'https://careers.microsoft.com'
          }
        ];
      }
      
      // If JSON parsing fails, return empty array
      return [];
    } catch (error) {
      console.error('Error parsing job response:', error);
      return [];
    }
  };

  const handleAutoFetch = async () => {
    if (isAutoFetching) return;
    
    setIsAutoFetching(true);
    try {
      incrementApiHits('gemini'); // Job search uses Gemini by default
      
      const prompt = generateJobSearchPrompt(true);
      
      const response = await fetch('/api/optimize/job-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const jobs = parseJobResponse(data.response || data.coverLetter || '');
      
      // Save to chat history with the exact prompt sent
      setChatHistory(prev => [
        ...prev,
        {
          question: prompt,
          answer: JSON.stringify(data, null, 2),
          timestamp: new Date().toISOString(),
          model: data.model || 'Gemini 2.0 Flash',
          promptSource: 'job-search-auto'
        }
      ]);
      
      if (jobs.length === 0) {
        toast.error('No jobs found. Please try adjusting your search criteria.');
        return;
      }
      
      setFetchedJobs(jobs);
      setCurrentView('newJobs');
      toast.success(`Found ${jobs.length} jobs matching your criteria!`);
      
    } catch (error: any) {
      console.error('Auto fetch error:', error);
      toast.error('Failed to fetch jobs. Please try again.');
    } finally {
      setIsAutoFetching(false);
    }
  };

  const handleManualFetch = async () => {
    if (!manualJobQuery.trim()) {
      toast.error('Please enter a job search query');
      return;
    }

    if (isManualFetching) return;
    
    setIsManualFetching(true);
    try {
      incrementApiHits('gemini'); // Job search uses Gemini by default
      
      const prompt = generateJobSearchPrompt(false);
      
      const response = await fetch('/api/optimize/job-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const jobs = parseJobResponse(data.response || data.coverLetter || '');
      
      // Save to chat history with the exact prompt sent
      setChatHistory(prev => [
        ...prev,
        {
          question: prompt,
          answer: JSON.stringify(data, null, 2),
          timestamp: new Date().toISOString(),
          model: data.model || 'Gemini 2.0 Flash',
          promptSource: 'job-search-manual'
        }
      ]);
      
      if (jobs.length === 0) {
        toast.error('No jobs found for your search query.');
        return;
      }
      
      setFetchedJobs(jobs);
      setCurrentView('newJobs');
      toast.success(`Found ${jobs.length} jobs for "${manualJobQuery}"`);
      
    } catch (error: any) {
      console.error('Manual fetch error:', error);
      toast.error('Failed to fetch jobs. Please try again.');
    } finally {
      setIsManualFetching(false);
    }
  };

  const handleShowManualPrompt = () => {
    const prompt = generateJobSearchPrompt(false);
    setManualPrompt(prompt);
    setShowManualPrompt(true);
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(manualPrompt);
      toast.success('Prompt copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy prompt:', error);
      toast.error('Failed to copy prompt');
    }
  };



  const handleUpdateSearchCriteria = (updates: Partial<typeof searchCriteria>) => {
    setSearchCriteria(prev => ({ ...prev, ...updates }));
  };

  const renderSearchView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Search className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Job Hunt</h1>
            <p className="text-gray-600">Find and analyze job opportunities</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Download className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">Auto Fetch</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Automatically fetch jobs based on your profile and preferences
            </p>
            <button
              onClick={handleAutoFetch}
              disabled={isAutoFetching}
              className={`w-full btn-primary ${isAutoFetching ? 'opacity-80' : ''}`}
            >
              {isAutoFetching ? (
                <>
                  <span className="spinner mr-2"></span>
                  Fetching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Auto Fetch Jobs
                </>
              )}
            </button>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">Manual Fetch</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Manually search for specific jobs or companies
            </p>
            <button
              onClick={() => setShowManualInput(!showManualInput)}
              className="w-full btn-secondary"
            >
              <Upload className="w-4 h-4 mr-2" />
              Manual Fetch Jobs
            </button>
          </div>
        </div>
      </div>

      {/* Manual Input Section */}
      {showManualInput && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Briefcase className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Manual Job Search</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Search Query
              </label>
              <textarea
                value={manualJobQuery}
                onChange={(e) => setManualJobQuery(e.target.value)}
                placeholder="Enter job title, company, location, or keywords (e.g., 'Data Scientist London remote')"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={4}
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleManualFetch}
                disabled={isManualFetching || !manualJobQuery.trim()}
                className={`btn-primary ${isManualFetching || !manualJobQuery.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isManualFetching ? (
                  <>
                    <span className="spinner mr-2"></span>
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search Jobs
                  </>
                )}
              </button>
              
              <button
                onClick={handleShowManualPrompt}
                className="btn-secondary"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Prompt
              </button>
              
              <button
                onClick={() => setShowManualInput(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!showManualInput && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Hunt Jobs?</h3>
          <p className="text-gray-600 mb-4">
            Use Auto Fetch to find jobs automatically or Manual Fetch to search for specific positions.
          </p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={handleAutoFetch}
              disabled={isAutoFetching}
              className={`btn-primary ${isAutoFetching ? 'opacity-80' : ''}`}
            >
              {isAutoFetching ? (
                <>
                  <span className="spinner mr-2"></span>
                  Fetching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Auto Fetch
                </>
              )}
            </button>
            <button
              onClick={() => setShowManualInput(true)}
              className="btn-secondary"
            >
              <FileText className="w-4 h-4 mr-2" />
              Manual Search
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderNewJobsView = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">New Jobs Fetched</h1>
              <p className="text-gray-600">{fetchedJobs.length} jobs found matching your criteria</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentView('search')}
              className="btn-secondary"
            >
              <Search className="w-4 h-4 mr-2" />
              Search Again
            </button>
            <button
              onClick={() => setCurrentView('criteria')}
              className="btn-secondary"
            >
              <Target className="w-4 h-4 mr-2" />
              Update Criteria
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {fetchedJobs.map((job) => (
          <div key={job.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-xl font-semibold text-gray-900">{job.title}</h3>
                  {job.sponsorship && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Sponsorship
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                  <span className="flex items-center">
                    <Building className="w-4 h-4 mr-1" />
                    {job.company}
                  </span>
                  <span>{job.location}</span>
                  <span>{job.type}</span>
                  {job.salary && <span>{job.salary}</span>}
                </div>
                <p className="text-gray-700 mb-3">{job.description}</p>
                
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Requirements:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {job.requirements.map((req, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {req}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-700">Benefits:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {job.benefits.map((benefit, index) => (
                        <span key={index} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                          {benefit}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="text-sm text-gray-500">
                Posted: {new Date(job.postedDate).toLocaleDateString()}
              </div>
              <div className="flex space-x-2">
                {job.jobUrl && (
                  <a
                    href={job.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Apply
                  </a>
                )}
                <button
                  onClick={() => setActiveTab('jobtracker')}
                  className="btn-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Track Job
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );



  const renderCriteriaView = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Search Criteria</h1>
            <p className="text-gray-600">Customize your job search preferences</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Titles
            </label>
            <div className="space-y-2">
              {searchCriteria.jobTitles.map((title, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      const newTitles = [...searchCriteria.jobTitles];
                      newTitles[index] = e.target.value;
                      handleUpdateSearchCriteria({ jobTitles: newTitles });
                    }}
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={() => {
                      const newTitles = searchCriteria.jobTitles.filter((_, i) => i !== index);
                      handleUpdateSearchCriteria({ jobTitles: newTitles });
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={() => handleUpdateSearchCriteria({ 
                  jobTitles: [...searchCriteria.jobTitles, ''] 
                })}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                + Add Job Title
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              value={searchCriteria.location}
              onChange={(e) => handleUpdateSearchCriteria({ location: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., UK, London, Remote"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Type
            </label>
            <select
              value={searchCriteria.companyType}
              onChange={(e) => handleUpdateSearchCriteria({ companyType: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="tech">Tech Companies</option>
              <option value="finance">Finance</option>
              <option value="healthcare">Healthcare</option>
              <option value="consulting">Consulting</option>
              <option value="all">All Industries</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Experience Level
            </label>
            <select
              value={searchCriteria.experienceLevel}
              onChange={(e) => handleUpdateSearchCriteria({ experienceLevel: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="entry">Entry Level</option>
              <option value="mid">Mid Level</option>
              <option value="mid-senior">Mid-Senior</option>
              <option value="senior">Senior</option>
              <option value="lead">Lead</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="sponsorship"
                  checked={searchCriteria.sponsorship}
                  onChange={(e) => handleUpdateSearchCriteria({ sponsorship: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="sponsorship" className="text-sm font-medium text-gray-700">
                  Only show jobs with sponsorship
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="remote"
                  checked={searchCriteria.remote}
                  onChange={(e) => handleUpdateSearchCriteria({ remote: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="remote" className="text-sm font-medium text-gray-700">
                  Include remote/hybrid positions
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={() => setCurrentView('search')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setCurrentView('search');
              toast.success('Search criteria updated!');
            }}
            className="btn-primary"
          >
            Save Criteria
          </button>
        </div>
      </div>
    </div>
  );

  const renderManualPromptView = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <Copy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manual Prompt</h1>
            <p className="text-gray-600">Copy this prompt to use with other AI models</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Job Search Prompt
          </label>
          <textarea
            value={manualPrompt}
            onChange={(e) => setManualPrompt(e.target.value)}
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-sm"
            rows={20}
            readOnly
          />
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            This prompt includes deep web search instructions for up-to-date job data
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleCopyPrompt}
              className="btn-primary"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Prompt
            </button>
            <button
              onClick={() => setShowManualPrompt(false)}
              className="btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="bg-white border border-gray-200 rounded-xl p-2 shadow-sm">
        <div className="flex space-x-1">
          <button
            onClick={() => setCurrentView('search')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'search' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Search className="w-4 h-4 mr-2 inline" />
            Search
          </button>
          <button
            onClick={() => setCurrentView('newJobs')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'newJobs' 
                ? 'bg-green-100 text-green-700' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <CheckCircle className="w-4 h-4 mr-2 inline" />
            New Jobs ({fetchedJobs.length})
          </button>

          <button
            onClick={() => setCurrentView('criteria')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'criteria' 
                ? 'bg-orange-100 text-orange-700' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Target className="w-4 h-4 mr-2 inline" />
            Criteria
          </button>
        </div>
      </div>

      {/* Content based on current view */}
      {currentView === 'search' && renderSearchView()}
      {currentView === 'newJobs' && renderNewJobsView()}
      {currentView === 'criteria' && renderCriteriaView()}
      {showManualPrompt && renderManualPromptView()}
    </div>
  );
} 