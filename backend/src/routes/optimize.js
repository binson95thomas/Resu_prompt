import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs-extra'
import mammoth from 'mammoth'
import { analyzeJobDescription, optimizeCV, generateCoverLetter } from '../services/gemini.js'
import { analyzeJobDescription as openRouterAnalyzeJobDescription, optimizeCV as openRouterOptimizeCV, generateCoverLetter as openRouterGenerateCoverLetter, searchJobs as openRouterSearchJobs, extractJobFromUrl as openRouterExtractJobFromUrl } from '../services/openrouter.js'
import { analyzeJobDescription as geminiVertexAnalyzeJobDescription, optimizeCV as geminiVertexOptimizeCV, generateCoverLetter as geminiVertexGenerateCoverLetter, searchJobs as geminiVertexSearchJobs, extractJobFromUrl as geminiVertexExtractJobFromUrl } from '../services/gemini-vertex.js'
import { extractTextFromDocx } from '../services/document.js'
import { extractJobFromUrl as localExtractJobFromUrl } from '../services/local.js';

const router = express.Router()

// File upload configuration (moved here to avoid circular dependency)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads')
    fs.ensureDirSync(uploadDir)
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true)
    } else {
      cb(new Error('Only .docx files are allowed'), false)
    }
  }
})

// Serve shared prompt template
router.get('/prompt-template', async (req, res) => {
  try {
    const promptTemplatePath = path.join(process.cwd(), '..', 'prompts', 'cv-optimization-shared.txt');
    const promptTemplate = await fs.readFile(promptTemplatePath, 'utf8');
    
    res.setHeader('Content-Type', 'text/plain');
    res.send(promptTemplate);
  } catch (error) {
    console.error('Failed to serve prompt template:', error);
    res.status(500).json({
      error: 'Failed to serve prompt template',
      message: error.message
    });
  }
});

// Extract CV text for preview
router.post('/extract-cv-text', upload.single('cv'), async (req, res) => {
  try {
    const cvFile = req.file;

    if (!cvFile) {
      return res.status(400).json({
        error: 'CV file is required'
      });
    }

    // Extract text from CV
    const cvLines = await extractTextFromDocx(cvFile.path);
    const cvText = cvLines.join('\n');
    
    // Also try to extract HTML for formatted preview
    let cvHtml = '';
    try {
      const buffer = await fs.readFile(cvFile.path);
      const result = await mammoth.convertToHtml({ buffer });
      cvHtml = result.value;
    } catch (htmlError) {
      console.warn('HTML extraction failed, using text only:', htmlError.message);
    }
    
    res.json({
      success: true,
      cvText,
      cvLines,
      cvHtml
    });
  } catch (error) {
    console.error('CV text extraction error:', error);
    res.status(500).json({
      error: 'Failed to extract CV text',
      message: error.message
    });
  }
});

// Analyze job description
router.post('/analyze-jd', async (req, res) => {
  try {
    const { jobDescription } = req.body

    if (!jobDescription || !jobDescription.trim()) {
      return res.status(400).json({
        error: 'Job description is required'
      })
    }

    const analysis = await analyzeJobDescription(jobDescription)
    
    res.json({
      success: true,
      analysis
    })
  } catch (error) {
    console.error('Job description analysis error:', error)
    res.status(500).json({
      error: 'Failed to analyze job description',
      message: error.message
    })
  }
})

// Optimize CV against job description
router.post('/optimize-cv', upload.single('cv'), async (req, res) => {
  try {
    const { jobDescription } = req.body
    const cvFile = req.file

    if (!cvFile) {
      return res.status(400).json({
        error: 'CV file is required'
      })
    }

    if (!jobDescription || !jobDescription.trim()) {
      return res.status(400).json({
        error: 'Job description is required'
      })
    }

    // Extract text from CV (returns array of lines/bullets)
    const cvLines = await extractTextFromDocx(cvFile.path)
    // Join lines for Gemini prompt, but also pass array as structuredData
    const cvText = cvLines.join('\n')
    // Optimize CV using Gemini, passing both text and structuredData
    const optimization = await optimizeCV(cvText, jobDescription, { lines: cvLines })
    res.json({
      success: true,
      optimization,
      cvText,
      cvLines,
      jobDescription
    })
  } catch (error) {
    console.error('CV optimization error:', error)
    res.status(500).json({
      error: 'Failed to optimize CV',
      message: error.message
    })
  }
})

// Get optimization suggestions
router.post('/suggestions', async (req, res) => {
  try {
    const { cvText, jobDescription, structuredData } = req.body

    if (!cvText || !jobDescription) {
      return res.status(400).json({
        error: 'CV text and job description are required'
      })
    }

    // Generate suggestions using Gemini
    const suggestions = await optimizeCV(cvText, jobDescription, structuredData)
    
    res.json({
      success: true,
      suggestions
    })
  } catch (error) {
    console.error('Suggestion generation error:', error)
    res.status(500).json({
      error: 'Failed to generate suggestions',
      message: error.message
    })
  }
})

// Generate cover letter
router.post('/generate-cover-letter', upload.single('cv'), async (req, res) => {
  try {
    console.log('Cover letter generation request received')
    console.log('Request body:', req.body)
    console.log('Request file:', req.file)
    
    const { 
      jobDescription, 
      style = 'traditional', 
      tone = 'professional', 
      focusAreas = ['results', 'technical-skills'],
      hiringManager = '',
      companyName = '',
      useTemplate = false
    } = req.body
    const cvFile = req.file

    if (!cvFile) {
      console.error('No CV file provided')
      return res.status(400).json({
        error: 'CV file is required'
      })
    }

    if (!jobDescription || !jobDescription.trim()) {
      console.error('No job description provided')
      return res.status(400).json({
        error: 'Job description is required'
      })
    }

    console.log('Extracting CV text...')
    // Extract text from CV
    const cvLines = await extractTextFromDocx(cvFile.path)
    const cvText = cvLines.join('\n')
    console.log('CV text extracted, length:', cvText.length)

    console.log('Generating cover letter with options:', {
      style,
      tone,
      focusAreas: Array.isArray(focusAreas) ? focusAreas : [focusAreas],
      hiringManager,
      companyName,
      jobSource: req.body.jobSource || 'company website',
      useTemplate: req.body.useTemplate === 'true'
    })

    // Generate cover letter using Gemini
    const coverLetterData = await generateCoverLetter(cvText, jobDescription, {
      style,
      tone,
      focusAreas: Array.isArray(focusAreas) ? focusAreas : [focusAreas],
      hiringManager,
      companyName,
      jobSource: req.body.jobSource || 'company website',
      useTemplate: req.body.useTemplate === 'true'
    })
    
    console.log('Cover letter generated successfully')
    res.json({
      success: true,
      coverLetter: coverLetterData
    })
  } catch (error) {
    console.error('Cover letter generation error:', error)
    res.status(500).json({
      error: 'Failed to generate cover letter',
      message: error.message
    })
  }
})

// Job search endpoint
router.post('/job-search', async (req, res) => {
  try {
    console.log('Job search request received')
    console.log('Request body:', req.body)
    
    const { prompt } = req.body
    
    if (!prompt || !prompt.trim()) {
      console.error('No prompt provided for job search')
      return res.status(400).json({
        error: 'Prompt is required for job search'
      })
    }

    // Use Gemini for job search
    const jobSearchResponse = await generateCoverLetter('', '', { 
      customPrompt: prompt,
      isJobSearch: true 
    })
    
    console.log('Job search completed successfully')
    res.json({
      success: true,
      response: jobSearchResponse
    })
  } catch (error) {
    console.error('Job search error:', error)
    res.status(500).json({
      error: 'Failed to search jobs',
      message: error.message
    })
  }
})

// Get prompt template for manual optimization
router.get('/prompt-template', async (req, res) => {
  try {
    // Read the shared prompt template
    const promptTemplatePath = path.join(process.cwd(), '..', 'prompts', 'cv-optimization-shared.txt')
    const promptTemplate = await fs.readFile(promptTemplatePath, 'utf8')
    
    res.json({
      success: true,
      promptTemplate
    })
  } catch (error) {
    console.error('Get prompt template error:', error)
    res.status(500).json({
      error: 'Failed to get prompt template',
      message: error.message
    })
  }
})

// Get cover letter prompt template for manual generation
router.get('/cover-letter-prompt-template', async (req, res) => {
  try {
    // Read the shared cover letter prompt template
    const promptTemplatePath = path.join(process.cwd(), '..', 'prompts', 'cover-letter-generation-shared.txt')
    const promptTemplate = await fs.readFile(promptTemplatePath, 'utf8')
    
    res.setHeader('Content-Type', 'text/plain')
    res.send(promptTemplate)
  } catch (error) {
    console.error('Get cover letter prompt template error:', error)
    res.status(500).json({
      error: 'Failed to get cover letter prompt template',
      message: error.message
    })
  }
})

// Get prompt for manual optimization
router.post('/get-prompt', upload.single('cv'), async (req, res) => {
  try {
    const { jobDescription } = req.body
    const cvFile = req.file

    if (!cvFile) {
      return res.status(400).json({
        error: 'CV file is required'
      })
    }

    if (!jobDescription || !jobDescription.trim()) {
      return res.status(400).json({
        error: 'Job description is required'
      })
    }

    // Extract text from CV
    const cvLines = await extractTextFromDocx(cvFile.path)
    const cvText = cvLines.join('\n')

    // Read the prompt template
    const promptTemplatePath = path.join(process.cwd(), '..', 'prompts', 'cv-optimization.txt')
    const promptTemplate = await fs.readFile(promptTemplatePath, 'utf8')

    // Replace placeholders in the prompt template
    const prompt = promptTemplate
      .replace('{cvText}', cvText)
      .replace('{jobDescription}', jobDescription)

    res.json({
      success: true,
      prompt
    })
  } catch (error) {
    console.error('Get prompt error:', error)
    res.status(500).json({
      error: 'Failed to get prompt',
      message: error.message
    })
  }
})

// Extract job details from URL
router.post('/extract-job-from-url', async (req, res) => {
  try {
    const { url } = req.body

    if (!url || !url.trim()) {
      return res.status(400).json({
        error: 'URL is required'
      })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch (urlError) {
      return res.status(400).json({
        error: 'Invalid URL format'
      })
    }

    console.log('Extracting job details from URL:', url)

    // Create prompt for URL extraction
    const extractionPrompt = `You are a job details extraction assistant. I will provide you with a job posting URL, and you need to extract all relevant job details from the content.

URL: ${url}

Please extract the following information from the job posting and return it in JSON format:

{
  "title": "Job Title",
  "company": "Company Name", 
  "location": "Location (City, State/Country)",
  "salary": "Salary range if mentioned",
  "type": "Full-time/Part-time/Contract/Remote/Onsite/Hybrid",
  "description": "Brief job description (2-3 sentences)",
  "requirements": ["requirement1", "requirement2", "requirement3"],
  "benefits": ["benefit1", "benefit2", "benefit3"],
  "sponsorship": true/false,
  "postedDate": "YYYY-MM-DD",
  "applicationDeadline": "YYYY-MM-DD (if mentioned)",
  "jobUrl": "${url}"
}

Important guidelines:
1. Extract only information that is clearly stated in the job posting
2. If a field is not mentioned, use null or an empty array
3. For requirements, focus on technical skills, experience, and qualifications
4. For benefits, include perks, insurance, time-off, etc.
5. For sponsorship, indicate if the company mentions visa sponsorship for international candidates
6. Use today's date for postedDate if not specified
7. Return only valid JSON, no additional text

Please analyze the job posting content and extract the details in the specified JSON format.`

    // Call Gemini API for extraction
    const extractionResponse = await analyzeJobDescription(extractionPrompt)
    
    console.log('URL extraction completed successfully')
    res.json({
      success: true,
      job: extractionResponse,
      model: 'Gemini 2.0 Flash'
    })
  } catch (error) {
    console.error('URL extraction error:', error)
    res.status(500).json({
      error: 'Failed to extract job details from URL',
      message: error.message
    })
  }
})

// OpenRouter endpoints
router.post('/openrouter/analyze-jd', async (req, res) => {
  try {
    const { jobDescription } = req.body

    if (!jobDescription || !jobDescription.trim()) {
      return res.status(400).json({
        error: 'Job description is required'
      })
    }

    console.log('Analyzing job description with OpenRouter...')
    const analysis = await openRouterAnalyzeJobDescription(jobDescription)
    
    res.json({
      success: true,
      analysis,
      model: 'OpenRouter GPT-4'
    })
  } catch (error) {
    console.error('OpenRouter job analysis error:', error)
    res.status(500).json({
      error: 'Failed to analyze job description',
      message: error.message
    })
  }
})

router.post('/openrouter/optimize-cv', async (req, res) => {
  try {
    const { cvText, jobDescription, structuredData } = req.body

    if (!cvText || !jobDescription) {
      return res.status(400).json({
        error: 'CV text and job description are required'
      })
    }

    console.log('Optimizing CV with OpenRouter...')
    const optimization = await openRouterOptimizeCV(cvText, jobDescription, structuredData)
    
    res.json({
      success: true,
      optimization,
      model: 'OpenRouter GPT-4'
    })
  } catch (error) {
    console.error('OpenRouter CV optimization error:', error)
    res.status(500).json({
      error: 'Failed to optimize CV',
      message: error.message
    })
  }
})

router.post('/openrouter/generate-cover-letter', async (req, res) => {
  try {
    const { cvText, jobDescription, style, tone } = req.body

    if (!cvText || !jobDescription) {
      return res.status(400).json({
        error: 'CV text and job description are required'
      })
    }

    console.log('Generating cover letter with OpenRouter...')
    const coverLetter = await openRouterGenerateCoverLetter(cvText, jobDescription, { style, tone })
    
    res.json({
      success: true,
      coverLetter,
      model: 'OpenRouter GPT-4'
    })
  } catch (error) {
    console.error('OpenRouter cover letter generation error:', error)
    res.status(500).json({
      error: 'Failed to generate cover letter',
      message: error.message
    })
  }
})

router.post('/openrouter/search-jobs', async (req, res) => {
  try {
    const { searchCriteria } = req.body

    if (!searchCriteria || !searchCriteria.trim()) {
      return res.status(400).json({
        error: 'Search criteria is required'
      })
    }

    console.log('Searching jobs with OpenRouter...')
    const jobs = await openRouterSearchJobs(searchCriteria)
    
    res.json({
      success: true,
      jobs: jobs.jobs || [],
      model: 'OpenRouter GPT-4'
    })
  } catch (error) {
    console.error('OpenRouter job search error:', error)
    res.status(500).json({
      error: 'Failed to search jobs',
      message: error.message
    })
  }
})

router.post('/openrouter/extract-job-from-url', async (req, res) => {
  try {
    const { url } = req.body

    if (!url || !url.trim()) {
      return res.status(400).json({
        error: 'URL is required'
      })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch (urlError) {
      return res.status(400).json({
        error: 'Invalid URL format'
      })
    }

    console.log('Extracting job details from URL with OpenRouter:', url)
    const jobData = await openRouterExtractJobFromUrl(url)
    
    res.json({
      success: true,
      job: jobData,
      model: 'OpenRouter GPT-4'
    })
  } catch (error) {
    console.error('OpenRouter URL extraction error:', error)
    res.status(500).json({
      error: 'Failed to extract job details from URL',
      message: error.message
    })
  }
})

// Gemini Vertex endpoints
router.post('/gemini-vertex/analyze-jd', async (req, res) => {
  try {
    const { jobDescription } = req.body

    if (!jobDescription || !jobDescription.trim()) {
      return res.status(400).json({
        error: 'Job description is required'
      })
    }

    console.log('Analyzing job description with Gemini Vertex...')
    const analysis = await geminiVertexAnalyzeJobDescription(jobDescription)
    
    res.json({
      success: true,
      analysis,
      model: 'Gemini 2.0 Flash'
    })
  } catch (error) {
    console.error('Gemini Vertex job analysis error:', error)
    res.status(500).json({
      error: 'Failed to analyze job description',
      message: error.message
    })
  }
})

router.post('/gemini-vertex/optimize-cv', async (req, res) => {
  try {
    const { cvText, jobDescription, structuredData } = req.body

    if (!cvText || !jobDescription) {
      return res.status(400).json({
        error: 'CV text and job description are required'
      })
    }

    console.log('Optimizing CV with Gemini Vertex...')
    const optimization = await geminiVertexOptimizeCV(cvText, jobDescription, structuredData)
    
    res.json({
      success: true,
      optimization,
      model: 'Gemini 2.0 Flash'
    })
  } catch (error) {
    console.error('Gemini Vertex CV optimization error:', error)
    res.status(500).json({
      error: 'Failed to optimize CV',
      message: error.message
    })
  }
})

router.post('/gemini-vertex/generate-cover-letter', async (req, res) => {
  try {
    const { cvText, jobDescription, style, tone } = req.body

    if (!cvText || !jobDescription) {
      return res.status(400).json({
        error: 'CV text and job description are required'
      })
    }

    console.log('Generating cover letter with Gemini Vertex...')
    const coverLetter = await geminiVertexGenerateCoverLetter(cvText, jobDescription, { style, tone })
    
    res.json({
      success: true,
      coverLetter,
      model: 'Gemini 2.0 Flash'
    })
  } catch (error) {
    console.error('Gemini Vertex cover letter generation error:', error)
    res.status(500).json({
      error: 'Failed to generate cover letter',
      message: error.message
    })
  }
})

router.post('/gemini-vertex/search-jobs', async (req, res) => {
  try {
    const { searchCriteria } = req.body

    if (!searchCriteria || !searchCriteria.trim()) {
      return res.status(400).json({
        error: 'Search criteria is required'
      })
    }

    console.log('Searching jobs with Gemini Vertex...')
    const jobs = await geminiVertexSearchJobs(searchCriteria)
    
    res.json({
      success: true,
      jobs: jobs.jobs || [],
      model: 'Gemini 2.0 Flash'
    })
  } catch (error) {
    console.error('Gemini Vertex job search error:', error)
    res.status(500).json({
      error: 'Failed to search jobs',
      message: error.message
    })
  }
})

router.post('/gemini-vertex/extract-job-from-url', async (req, res) => {
  try {
    const { url } = req.body

    if (!url || !url.trim()) {
      return res.status(400).json({
        error: 'URL is required'
      })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch (urlError) {
      return res.status(400).json({
        error: 'Invalid URL format'
      })
    }

    console.log('Extracting job details from URL with Gemini Vertex:', url)
    const jobData = await geminiVertexExtractJobFromUrl(url)
    
    res.json({
      success: true,
      job: jobData,
      model: 'Gemini 2.0 Flash'
    })
  } catch (error) {
    console.error('Gemini Vertex URL extraction error:', error)
    res.status(500).json({
      error: 'Failed to extract job details from URL',
      message: error.message
    })
  }
})

// Local LLM endpoint for extracting job details from URL
router.post('/local/extract-job-from-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !url.trim()) {
      return res.status(400).json({ error: 'URL is required' });
    }
    // Validate URL format
    try {
      new URL(url);
    } catch (urlError) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    console.log('Extracting job details from URL with Local LLM:', url);
    const jobData = await localExtractJobFromUrl(url);
    res.json({
      success: true,
      job: jobData,
      model: 'Local LLM (Ollama)'
    });
  } catch (error) {
    console.error('Local LLM URL extraction error:', error);
    res.status(500).json({
      error: 'Failed to extract job details from URL (Local LLM)',
      message: error.message
    });
  }
});

export default router 