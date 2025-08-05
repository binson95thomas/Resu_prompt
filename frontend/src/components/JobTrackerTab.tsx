import React, { useState, useEffect } from 'react';
import { List, Building, ExternalLink, Trash2, Edit, Calendar, MapPin, DollarSign, Clock, CheckCircle, AlertCircle, Plus, Search, Filter, Download, Upload, FileText } from 'lucide-react';
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
  status?: 'saved' | 'applied' | 'interviewing' | 'offered' | 'rejected';
  notes?: string;
  appliedDate?: string;
}

interface JobTrackerTabProps {
  setChatHistory: (fn: (prev: any[]) => any[]) => void;
  incrementApiHits: (provider?: string) => void;
  setActiveTab: (tab: 'master' | 'job' | 'generate' | 'jobhunt' | 'jobtracker') => void;
  initialJobs?: Job[];
}

export default function JobTrackerTab({ 
  setChatHistory,
  incrementApiHits,
  setActiveTab,
  initialJobs = []
}: JobTrackerTabProps) {
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [jobUrl, setJobUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedJobData, setExtractedJobData] = useState<Partial<Job> | null>(null);

  // Load jobs from server
  const loadJobs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/jobs');
      if (response.ok) {
        const data = await response.json();
        setMyJobs(data.jobs || []);
      } else {
        toast.error('Failed to load jobs');
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setIsLoading(false);
    }
  };

  // Load statistics
  const loadStats = async () => {
    try {
      const response = await fetch('/api/jobs/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadJobs();
    loadStats();
  }, []);

  const handleRemoveFromList = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setMyJobs(prev => prev.filter(job => job.id !== jobId));
        toast.success('Job removed from your list');
        loadStats(); // Refresh stats
      } else {
        toast.error('Failed to remove job');
      }
    } catch (error) {
      console.error('Error removing job:', error);
      toast.error('Failed to remove job');
    }
  };



  const handleUpdateJobStatus = async (jobId: string, status: Job['status']) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ job: { status } })
      });
      
      if (response.ok) {
        const data = await response.json();
        setMyJobs(prev => prev.map(job => 
          job.id === jobId ? data.job : job
        ));
        toast.success(`Job status updated to ${status}`);
        loadStats(); // Refresh stats
      } else {
        toast.error('Failed to update job status');
      }
    } catch (error) {
      console.error('Error updating job status:', error);
      toast.error('Failed to update job status');
    }
  };

  const handleUpdateJobNotes = async (jobId: string, notes: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ job: { notes } })
      });
      
      if (response.ok) {
        const data = await response.json();
        setMyJobs(prev => prev.map(job => 
          job.id === jobId ? data.job : job
        ));
        toast.success('Notes updated');
      } else {
        toast.error('Failed to update notes');
      }
    } catch (error) {
      console.error('Error updating notes:', error);
      toast.error('Failed to update notes');
    }
  };

  const handleAddJob = async (jobData: Partial<Job>) => {
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ job: jobData })
      });
      
      if (response.ok) {
        const data = await response.json();
        setMyJobs(prev => [...prev, data.job]);
        toast.success(`Added ${jobData.title} at ${jobData.company} to your tracker`);
        loadStats(); // Refresh stats
        setShowAddJobModal(false);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to add job');
      }
    } catch (error) {
      console.error('Error adding job:', error);
      toast.error('Failed to add job');
    }
  };

  const handleExportJobs = async () => {
    try {
      const response = await fetch('/api/jobs/export/csv');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jobs_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Jobs exported successfully!');
      } else {
        toast.error('Failed to export jobs');
      }
    } catch (error) {
      console.error('Error exporting jobs:', error);
      toast.error('Failed to export jobs');
    }
  };

  const handleExtractFromUrl = async () => {
    if (!jobUrl.trim()) {
      toast.error('Please enter a job URL');
      return;
    }

    setIsExtracting(true);
    try {
              incrementApiHits('gemini'); // Job extraction uses Gemini by default
      
      const response = await fetch('/api/optimize/extract-job-from-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: jobUrl.trim()
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Save to chat history
      setChatHistory(prev => [
        ...prev,
        {
          question: `Extract job details from URL: ${jobUrl}`,
          answer: JSON.stringify(data, null, 2),
          timestamp: new Date().toISOString(),
          model: data.model || 'Gemini 2.0 Flash',
          promptSource: 'job-url-extraction'
        }
      ]);

      if (data.success && data.job) {
        // Open the Add Job modal with the extracted data
        setShowAddJobModal(true);
        // We'll need to pass the extracted data to the modal
        // For now, we'll show a success message
        toast.success('Job details extracted successfully! Please review and save.');
        setJobUrl(''); // Clear the URL input
      } else {
        toast.error('Failed to extract job details from URL');
      }
    } catch (error: any) {
      console.error('URL extraction error:', error);
      toast.error('Failed to extract job details. Please check the URL and try again.');
    } finally {
      setIsExtracting(false);
    }
  };

  const filteredJobs = myJobs.filter(job => {
    const matchesStatus = filterStatus === 'all' || job.status === filterStatus;
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'applied': return 'bg-blue-100 text-blue-800';
      case 'interviewing': return 'bg-yellow-100 text-yellow-800';
      case 'offered': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'applied': return <Clock className="w-4 h-4" />;
      case 'interviewing': return <AlertCircle className="w-4 h-4" />;
      case 'offered': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-xl font-bold flex items-center">
          <List className="mr-2" /> Job Tracker
        </h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setShowAddJobModal(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Job
          </button>
          <button
            onClick={handleExportJobs}
            className="btn-secondary"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

             {/* Header Stats */}
       <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
              <List className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm text-blue-600">Total Jobs</p>
              <p className="text-xl font-bold text-blue-900">{myJobs.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm text-green-600">Applied</p>
              <p className="text-xl font-bold text-green-900">
                {myJobs.filter(job => job.status === 'applied').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center mr-3">
              <AlertCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm text-yellow-600">Interviewing</p>
              <p className="text-xl font-bold text-yellow-900">
                {myJobs.filter(job => job.status === 'interviewing').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm text-purple-600">Offers</p>
              <p className="text-xl font-bold text-purple-900">
                {myJobs.filter(job => job.status === 'offered').length}
              </p>
            </div>
          </div>
        </div>
      </div>

             {/* URL Extraction */}
       <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
         <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
           <ExternalLink className="w-5 h-5 mr-2" />
           Extract Job from URL
         </h3>
         <div className="flex flex-col sm:flex-row gap-3">
           <div className="flex-1">
             <input
               type="url"
               placeholder="Paste job posting URL here..."
               value={jobUrl}
               onChange={(e) => setJobUrl(e.target.value)}
               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
             />
           </div>
           <button
             onClick={handleExtractFromUrl}
             disabled={isExtracting || !jobUrl.trim()}
             className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {isExtracting ? (
               <>
                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                 Extracting...
               </>
             ) : (
               <>
                 <FileText className="w-4 h-4 mr-2" />
                 Extract with AI
               </>
             )}
           </button>
         </div>
         <p className="text-sm text-blue-600 mt-2">
           Paste a job posting URL and let AI extract all the details for you
         </p>
       </div>

             {/* Filters and Search */}
       <div className="flex flex-col lg:flex-row gap-4 mb-6">
         <div className="flex-1">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
             <input
               type="text"
               placeholder="Search jobs by title, company, or location..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
             />
           </div>
         </div>
         <div className="flex flex-col sm:flex-row gap-2">
           <select
             value={filterStatus}
             onChange={(e) => setFilterStatus(e.target.value)}
             className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
           >
             <option value="all">All Jobs</option>
             <option value="saved">Saved</option>
             <option value="applied">Applied</option>
             <option value="interviewing">Interviewing</option>
             <option value="offered">Offered</option>
             <option value="rejected">Rejected</option>
           </select>
           <button
             onClick={() => setActiveTab('jobhunt')}
             className="btn-primary"
           >
             <Plus className="w-4 h-4 mr-2" />
             Add Jobs
           </button>
         </div>
       </div>

      {/* Jobs List */}
      {isLoading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="spinner w-8 h-8"></div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Jobs...</h3>
          <p className="text-gray-600">Please wait while we load your job tracker data.</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <List className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {myJobs.length === 0 ? 'No Jobs in Your Tracker' : 'No Jobs Match Your Filters'}
          </h3>
          <p className="text-gray-600 mb-4">
            {myJobs.length === 0 
              ? 'Start by adding jobs manually or search for jobs to track your applications.'
              : 'Try adjusting your search terms or filters.'
            }
          </p>
                     <div className="flex flex-col sm:flex-row justify-center gap-3">
             <button
               onClick={() => setShowAddJobModal(true)}
               className="btn-primary"
             >
               <Plus className="w-4 h-4 mr-2" />
               Add Job
             </button>
             <button
               onClick={() => setActiveTab('jobhunt')}
               className="btn-secondary"
             >
               <Search className="w-4 h-4 mr-2" />
               Search Jobs
             </button>
           </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <div key={job.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{job.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                      {job.status || 'Saved'}
                    </span>
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
                    <span className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {job.location}
                    </span>
                    <span>{job.type}</span>
                    {job.salary && (
                      <span className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-1" />
                        {job.salary}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 mb-3">{job.description}</p>
                  {job.notes && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                      <p className="text-sm text-yellow-800">{job.notes}</p>
                    </div>
                  )}
                </div>
              </div>
              
                             <div className="flex flex-col lg:flex-row lg:items-center justify-between pt-4 border-t border-gray-100 gap-3">
                 <div className="text-sm text-gray-500">
                   {job.appliedDate ? (
                     <span>Applied: {new Date(job.appliedDate).toLocaleDateString()}</span>
                   ) : (
                     <span>Added: {new Date().toLocaleDateString()}</span>
                   )}
                 </div>
                 <div className="flex flex-wrap gap-2">
                   <select
                     value={job.status || 'saved'}
                     onChange={(e) => handleUpdateJobStatus(job.id, e.target.value as Job['status'])}
                     className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   >
                     <option value="saved">Saved</option>
                     <option value="applied">Applied</option>
                     <option value="interviewing">Interviewing</option>
                     <option value="offered">Offered</option>
                     <option value="rejected">Rejected</option>
                   </select>
                   {job.jobUrl && (
                     <a
                       href={job.jobUrl}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="btn-primary"
                     >
                       <ExternalLink className="w-4 h-4 mr-2" />
                       Apply
                     </a>
                   )}
                   <button
                     onClick={() => {
                       setSelectedJob(job);
                       setShowJobModal(true);
                     }}
                     className="btn-secondary"
                   >
                     <Edit className="w-4 h-4 mr-2" />
                     Notes
                   </button>
                   <button
                     onClick={() => handleRemoveFromList(job.id)}
                     className="btn-secondary text-red-600 hover:text-red-700"
                   >
                     <Trash2 className="w-4 h-4 mr-2" />
                     Remove
                   </button>
                 </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Job Notes Modal */}
      {showJobModal && selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Notes for {selectedJob.title}</h3>
            <textarea
              value={selectedJob.notes || ''}
              onChange={(e) => setSelectedJob({ ...selectedJob, notes: e.target.value })}
              placeholder="Add your notes about this job application..."
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            <div className="flex space-x-3 mt-4">
              <button
                onClick={() => {
                  handleUpdateJobNotes(selectedJob.id, selectedJob.notes || '');
                  setShowJobModal(false);
                  setSelectedJob(null);
                }}
                className="btn-primary flex-1"
              >
                Save Notes
              </button>
              <button
                onClick={() => {
                  setShowJobModal(false);
                  setSelectedJob(null);
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
             )}

       {/* Add Job Modal */}
       {showAddJobModal && (
         <AddJobModal
           onClose={() => setShowAddJobModal(false)}
           onAddJob={handleAddJob}
         />
       )}
     </div>
   );
 }

// Add Job Modal Component
function AddJobModal({ onClose, onAddJob }: { onClose: () => void; onAddJob: (job: Partial<Job>) => void }) {
  const [jobData, setJobData] = useState({
    title: '',
    company: '',
    location: '',
    salary: '',
    type: 'Full-time',
    description: '',
    requirements: [''],
    benefits: [''],
    sponsorship: false,
    jobUrl: '',
    notes: '',
    status: 'saved' as Job['status']
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobData.title || !jobData.company) {
      toast.error('Job title and company are required');
      return;
    }

    const jobToAdd = {
      ...jobData,
      requirements: jobData.requirements.filter(req => req.trim()),
      benefits: jobData.benefits.filter(benefit => benefit.trim())
    };

    onAddJob(jobToAdd);
  };

  const addRequirement = () => {
    setJobData(prev => ({
      ...prev,
      requirements: [...prev.requirements, '']
    }));
  };

  const removeRequirement = (index: number) => {
    setJobData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }));
  };

  const updateRequirement = (index: number, value: string) => {
    setJobData(prev => ({
      ...prev,
      requirements: prev.requirements.map((req, i) => i === index ? value : req)
    }));
  };

  const addBenefit = () => {
    setJobData(prev => ({
      ...prev,
      benefits: [...prev.benefits, '']
    }));
  };

  const removeBenefit = (index: number) => {
    setJobData(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index)
    }));
  };

  const updateBenefit = (index: number, value: string) => {
    setJobData(prev => ({
      ...prev,
      benefits: prev.benefits.map((benefit, i) => i === index ? value : benefit)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Add New Job</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

                 <form onSubmit={handleSubmit} className="space-y-4">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
              <input
                type="text"
                value={jobData.title}
                onChange={(e) => setJobData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Data Analyst"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
              <input
                type="text"
                value={jobData.company}
                onChange={(e) => setJobData(prev => ({ ...prev, company: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Google"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={jobData.location}
                onChange={(e) => setJobData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., London, UK"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
              <input
                type="text"
                value={jobData.salary}
                onChange={(e) => setJobData(prev => ({ ...prev, salary: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., £45,000 - £65,000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
              <select
                value={jobData.type}
                onChange={(e) => setJobData(prev => ({ ...prev, type: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={jobData.status}
                onChange={(e) => setJobData(prev => ({ ...prev, status: e.target.value as Job['status'] }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="saved">Saved</option>
                <option value="applied">Applied</option>
                <option value="interviewing">Interviewing</option>
                <option value="offered">Offered</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job URL</label>
            <input
              type="url"
              value={jobData.jobUrl}
              onChange={(e) => setJobData(prev => ({ ...prev, jobUrl: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://company.com/careers/job"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={jobData.description}
              onChange={(e) => setJobData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
              placeholder="Brief job description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Requirements</label>
            {jobData.requirements.map((req, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={req}
                  onChange={(e) => updateRequirement(index, e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Python, SQL"
                />
                <button
                  type="button"
                  onClick={() => removeRequirement(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addRequirement}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + Add Requirement
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Benefits</label>
            {jobData.benefits.map((benefit, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={benefit}
                  onChange={(e) => updateBenefit(index, e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Health insurance, Remote work"
                />
                <button
                  type="button"
                  onClick={() => removeBenefit(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addBenefit}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + Add Benefit
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={jobData.notes}
              onChange={(e) => setJobData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
              placeholder="Any additional notes about this job..."
            />
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="sponsorship"
              checked={jobData.sponsorship}
              onChange={(e) => setJobData(prev => ({ ...prev, sponsorship: e.target.checked }))}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="sponsorship" className="text-sm font-medium text-gray-700">
              Offers sponsorship
            </label>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="btn-primary flex-1"
            >
              Add Job
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
 } 