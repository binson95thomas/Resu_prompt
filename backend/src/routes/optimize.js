import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs-extra'
import mammoth from 'mammoth'
import { analyzeJobDescription, optimizeCV } from '../services/gemini.js'
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

export default router 