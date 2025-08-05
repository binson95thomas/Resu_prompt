import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Path to the jobs data file
const JOBS_FILE_PATH = path.join(__dirname, '../../data/jobs.json');

// Ensure data directory exists
const ensureDataDirectory = async () => {
  const dataDir = path.dirname(JOBS_FILE_PATH);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
};

// Initialize jobs file if it doesn't exist
const initializeJobsFile = async () => {
  try {
    await fs.access(JOBS_FILE_PATH);
  } catch {
    await fs.writeFile(JOBS_FILE_PATH, JSON.stringify({ jobs: [] }, null, 2));
  }
};

// Read jobs from file
const readJobs = async () => {
  try {
    await ensureDataDirectory();
    await initializeJobsFile();
    const data = await fs.readFile(JOBS_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading jobs file:', error);
    return { jobs: [] };
  }
};

// Write jobs to file
const writeJobs = async (jobsData) => {
  try {
    await ensureDataDirectory();
    await fs.writeFile(JOBS_FILE_PATH, JSON.stringify(jobsData, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing jobs file:', error);
    return false;
  }
};

// Get all jobs
router.get('/', async (req, res) => {
  try {
    const jobsData = await readJobs();
    res.json(jobsData);
  } catch (error) {
    console.error('Error getting jobs:', error);
    res.status(500).json({ error: 'Failed to get jobs' });
  }
});

// Add a new job
router.post('/', async (req, res) => {
  try {
    const { job } = req.body;
    
    if (!job || !job.title || !job.company) {
      return res.status(400).json({ error: 'Job title and company are required' });
    }

    const jobsData = await readJobs();
    
    // Generate unique ID
    const newJob = {
      ...job,
      id: job.id || `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      status: job.status || 'saved',
      appliedDate: job.status === 'applied' ? new Date().toISOString() : null
    };

    jobsData.jobs.push(newJob);
    
    const success = await writeJobs(jobsData);
    if (!success) {
      return res.status(500).json({ error: 'Failed to save job' });
    }

    res.json({ success: true, job: newJob });
  } catch (error) {
    console.error('Error adding job:', error);
    res.status(500).json({ error: 'Failed to add job' });
  }
});

// Update a job
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { job } = req.body;

    const jobsData = await readJobs();
    const jobIndex = jobsData.jobs.findIndex(j => j.id === id);

    if (jobIndex === -1) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Update job with new data
    jobsData.jobs[jobIndex] = {
      ...jobsData.jobs[jobIndex],
      ...job,
      updatedAt: new Date().toISOString(),
      appliedDate: job.status === 'applied' && !jobsData.jobs[jobIndex].appliedDate 
        ? new Date().toISOString() 
        : jobsData.jobs[jobIndex].appliedDate
    };

    const success = await writeJobs(jobsData);
    if (!success) {
      return res.status(500).json({ error: 'Failed to update job' });
    }

    res.json({ success: true, job: jobsData.jobs[jobIndex] });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// Delete a job
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const jobsData = await readJobs();
    const jobIndex = jobsData.jobs.findIndex(j => j.id === id);

    if (jobIndex === -1) {
      return res.status(404).json({ error: 'Job not found' });
    }

    jobsData.jobs.splice(jobIndex, 1);

    const success = await writeJobs(jobsData);
    if (!success) {
      return res.status(500).json({ error: 'Failed to delete job' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// Export jobs to CSV
router.get('/export/csv', async (req, res) => {
  try {
    const jobsData = await readJobs();
    
    if (jobsData.jobs.length === 0) {
      return res.status(404).json({ error: 'No jobs to export' });
    }

    // Create CSV header
    const headers = [
      'Title', 'Company', 'Location', 'Salary', 'Type', 'Status', 
      'Applied Date', 'Created Date', 'Description', 'Requirements', 
      'Benefits', 'Sponsorship', 'Job URL', 'Notes'
    ];

    // Create CSV rows
    const csvRows = jobsData.jobs.map(job => [
      `"${job.title || ''}"`,
      `"${job.company || ''}"`,
      `"${job.location || ''}"`,
      `"${job.salary || ''}"`,
      `"${job.type || ''}"`,
      `"${job.status || ''}"`,
      `"${job.appliedDate || ''}"`,
      `"${job.createdAt || ''}"`,
      `"${(job.description || '').replace(/"/g, '""')}"`,
      `"${(job.requirements || []).join(', ').replace(/"/g, '""')}"`,
      `"${(job.benefits || []).join(', ').replace(/"/g, '""')}"`,
      `"${job.sponsorship ? 'Yes' : 'No'}"`,
      `"${job.jobUrl || ''}"`,
      `"${(job.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="jobs_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting jobs:', error);
    res.status(500).json({ error: 'Failed to export jobs' });
  }
});

// Get job statistics
router.get('/stats', async (req, res) => {
  try {
    const jobsData = await readJobs();
    const jobs = jobsData.jobs;

    const stats = {
      total: jobs.length,
      byStatus: {
        saved: jobs.filter(j => j.status === 'saved').length,
        applied: jobs.filter(j => j.status === 'applied').length,
        interviewing: jobs.filter(j => j.status === 'interviewing').length,
        offered: jobs.filter(j => j.status === 'offered').length,
        rejected: jobs.filter(j => j.status === 'rejected').length
      },
      byCompany: {},
      byLocation: {},
      recentApplications: jobs
        .filter(j => j.appliedDate)
        .sort((a, b) => new Date(b.appliedDate) - new Date(a.appliedDate))
        .slice(0, 5)
    };

    // Count by company
    jobs.forEach(job => {
      const company = job.company || 'Unknown';
      stats.byCompany[company] = (stats.byCompany[company] || 0) + 1;
    });

    // Count by location
    jobs.forEach(job => {
      const location = job.location || 'Unknown';
      stats.byLocation[location] = (stats.byLocation[location] || 0) + 1;
    });

    res.json(stats);
  } catch (error) {
    console.error('Error getting job stats:', error);
    res.status(500).json({ error: 'Failed to get job statistics' });
  }
});

export default router; 