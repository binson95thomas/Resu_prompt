import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs-extra'
import mammoth from 'mammoth'
import { analyzeJobDescription, optimizeCV, generateCoverLetter } from '../services/gemini.js'
import { extractTextFromDocx } from '../services/document.js'

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

export default router 