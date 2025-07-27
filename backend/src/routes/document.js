import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs-extra'
import { generateOptimizedDocx, exportToPDF } from '../services/document.js'

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

// Generate optimized DOCX
router.post('/generate-docx', upload.single('cv'), async (req, res) => {
  // Always define resumeFolder at the top
  const resumeFolder = req.headers['x-resume-folder'] || process.env.RESUME_FOLDER || path.join(process.cwd(), 'resumes');
  try {
    const { acceptedEdits, suggestedEdits, jobDescription } = req.body
    const cvFile = req.file

    if (!cvFile) {
      return res.status(400).json({
        error: 'CV file is required'
      })
    }

    if (!acceptedEdits || !suggestedEdits) {
      return res.status(400).json({
        error: 'Accepted edits and suggested edits are required'
      })
    }

    // Parse the JSON strings from FormData
    const parsedAcceptedEdits = JSON.parse(acceptedEdits)
    const parsedSuggestedEdits = JSON.parse(suggestedEdits)
    
    // Generate optimized DOCX
    const optimizedDocxBuffer = await generateOptimizedDocx(
      cvFile.path,
      parsedAcceptedEdits,
      parsedSuggestedEdits,
      jobDescription
    )

    // Determine company name for folder
    let companyName = 'company';
    // Prefer jobDetails.company if available
    let jobDetails = {};
    try {
      jobDetails = typeof req.body.jobDetails === 'string' ? JSON.parse(req.body.jobDetails) : req.body.jobDetails;
    } catch {}
    if (jobDetails && jobDetails.company) {
      companyName = jobDetails.company.trim().replace(/\s+/g, '_');
    } else if (jobDescription) {
      // Try to extract from 'Company:'
      let match = jobDescription.match(/Company:\s*([A-Z][A-Za-z0-9& ]+)/);
      if (!match) {
        // Try to extract after 'at'
        match = jobDescription.match(/at\s+([A-Z][A-Za-z0-9& ]+)/);
      }
      if (!match) {
        // Try to extract first capitalized word/phrase at the top
        match = jobDescription.match(/^([A-Z][A-Za-z0-9& ]{2,})/m);
      }
      if (match && match[1]) {
        companyName = match[1].trim().split(' ')[0].replace(/\s+/g, '_');
      }
    }
    // Find the next serial number for the company folder
    const existingFolders = fs.existsSync(resumeFolder) ? fs.readdirSync(resumeFolder).filter(f => fs.statSync(path.join(resumeFolder, f)).isDirectory()) : [];
    let companyFolderName = '';
    let serial = 1;
    // Check if a folder for this company already exists
    for (const folder of existingFolders) {
      const match = folder.match(/^(\d+)_([\w\s&]+)/);
      if (match && match[2] && match[2].toLowerCase() === companyName.toLowerCase()) {
        companyFolderName = folder;
        serial = parseInt(match[1], 10);
        break;
      }
    }
    if (!companyFolderName) {
      // New company, assign next serial
      const serials = existingFolders.map(f => parseInt(f.split('_')[0], 10)).filter(n => !isNaN(n));
      serial = serials.length > 0 ? Math.max(...serials) + 1 : 1;
      companyFolderName = `${serial}_${companyName}`;
    }
    const companyFolder = path.join(resumeFolder, companyFolderName);
    await fs.ensureDir(companyFolder);
    // Find the next file serial number in the company folder
    const files = fs.readdirSync(companyFolder).filter(f => f.endsWith('.docx'));
    let fileSerial = 1;
    if (files.length > 0) {
      const nums = files.map(f => {
        const m = f.match(/_CV_(\d+)\.docx$/);
        return m ? parseInt(m[1], 10) : 0;
      }).filter(n => n > 0);
      fileSerial = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    }
    // Get userName from request (default to 'cv')
    let userName = req.body.userName || 'cv';
    userName = userName.trim().replace(/\s+/g, '_');
    // Build custom filename: <userName>_CV_<fileSerial>.docx
    const downloadName = `${userName}_CV_${fileSerial}.docx`;
    const savePath = path.join(companyFolder, downloadName);
    await fs.writeFile(savePath, optimizedDocxBuffer);
    
    // Save job description as text file with same naming pattern
    const jdFileName = `${userName}_JD_${fileSerial}.txt`;
    const jdSavePath = path.join(companyFolder, jdFileName);
    
    // Add model information to JD file
    const modelUsed = req.body.modelUsed || 'Unknown Model';
    const jdContent = `${jobDescription}\n\n---\nOptimization performed using: ${modelUsed}`;
    await fs.writeFile(jdSavePath, jdContent);
    
    // Return JSON with download URL, folder path, and openFolderPath (absolute)
    res.json({
      success: true,
      downloadUrl: `/api/document/download?path=${encodeURIComponent(savePath)}`,
      folderPath: companyFolder,
      openFolderPath: path.resolve(companyFolder),
      downloadName: downloadName,
      savePath: savePath,
      jdFileName: jdFileName,
      jdSavePath: jdSavePath
    })
  } catch (error) {
    console.error('DOCX generation error:', error)
    res.status(500).json({
      error: 'Failed to generate optimized DOCX',
      message: error.message || error.toString(),
      stack: error.stack
    })
  }
})

// Export to PDF
router.post('/export-pdf', upload.single('cv'), async (req, res) => {
  try {
    const { acceptedEdits, suggestedEdits, jobDescription } = req.body
    const cvFile = req.file

    if (!cvFile) {
      return res.status(400).json({
        error: 'CV file is required'
      })
    }

    if (!acceptedEdits || !suggestedEdits) {
      return res.status(400).json({
        error: 'Accepted edits and suggested edits are required'
      })
    }

    // Parse the JSON strings from FormData
    const parsedAcceptedEdits = JSON.parse(acceptedEdits)
    const parsedSuggestedEdits = JSON.parse(suggestedEdits)
    
    // Generate optimized DOCX first
    const optimizedDocxBuffer = await generateOptimizedDocx(
      cvFile.path,
      parsedAcceptedEdits,
      parsedSuggestedEdits,
      jobDescription
    )

    // Convert to PDF
    const pdfBuffer = await exportToPDF(optimizedDocxBuffer)

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="optimized-cv.pdf"')
    res.setHeader('Content-Length', pdfBuffer.length)

    res.send(pdfBuffer)
  } catch (error) {
    console.error('PDF export error:', error)
    res.status(500).json({
      error: 'Failed to export PDF',
      message: error.message
    })
  }
})

// Preview optimized CV
router.post('/preview', upload.single('cv'), async (req, res) => {
  try {
    const { acceptedEdits, suggestedEdits, jobDescription } = req.body
    const cvFile = req.file

    if (!cvFile) {
      return res.status(400).json({
        error: 'CV file is required'
      })
    }

    if (!acceptedEdits || !suggestedEdits) {
      return res.status(400).json({
        error: 'Accepted edits and suggested edits are required'
      })
    }

    // Parse the JSON strings from FormData
    const parsedAcceptedEdits = JSON.parse(acceptedEdits)
    const parsedSuggestedEdits = JSON.parse(suggestedEdits)
    
    // Generate preview (first 1000 characters of optimized text)
    const previewText = await generateOptimizedDocx(
      cvFile.path,
      parsedAcceptedEdits,
      parsedSuggestedEdits,
      jobDescription,
      true // preview mode
    )

    res.json({
      success: true,
      preview: previewText
    })
  } catch (error) {
    console.error('Preview generation error:', error)
    res.status(500).json({
      error: 'Failed to generate preview',
      message: error.message
    })
  }
})

// Download endpoint
router.get('/download', async (req, res) => {
  try {
    const filePath = req.query.path;
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found', path: filePath })
    }
    res.download(filePath)
  } catch (error) {
    res.status(500).json({ error: 'Failed to download file', message: error.message, stack: error.stack })
  }
})

export default router 