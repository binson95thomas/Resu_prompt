import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import fs from 'fs-extra'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Import routes
import optimizeRoutes from './routes/optimize.js'
import documentRoutes from './routes/document.js'
import jobsRoutes from './routes/jobs.js'
import settingsRoutes from './routes/settings.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from project root
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads')
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
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true)
    } else {
      cb(new Error('Only .docx files are allowed'), false)
    }
  }
})

// Routes
app.use('/api/optimize', optimizeRoutes)
app.use('/api/document', documentRoutes)
app.use('/api/jobs', jobsRoutes)
app.use('/api/settings', settingsRoutes)

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'ResuPrompt Backend'
  })
})

// Open file endpoint
app.post('/api/open-file', async (req, res) => {
  try {
    const { filePath } = req.body
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' })
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' })
    }
    
    // Open file based on platform
    const platform = process.platform
    let command
    
    if (platform === 'win32') {
      command = `start "" "${filePath}"`
    } else if (platform === 'darwin') {
      command = `open "${filePath}"`
    } else {
      command = `xdg-open "${filePath}"`
    }
    
    await execAsync(command)
    res.json({ success: true, message: 'File opened successfully' })
    
  } catch (error) {
    console.error('Error opening file:', error)
    res.status(500).json({ error: 'Failed to open file', message: error.message })
  }
})

// Open folder endpoint
app.post('/api/open-folder', async (req, res) => {
  try {
    const { folderPath } = req.body
    
    if (!folderPath) {
      return res.status(400).json({ error: 'Folder path is required' })
    }
    
    // Check if folder exists
    if (!fs.existsSync(folderPath)) {
      return res.status(404).json({ error: 'Folder not found' })
    }
    
    // Open folder based on platform
    const platform = process.platform
    let command
    
    if (platform === 'win32') {
      command = `explorer "${folderPath}"`
    } else if (platform === 'darwin') {
      command = `open "${folderPath}"`
    } else {
      command = `xdg-open "${folderPath}"`
    }
    
    await execAsync(command)
    res.json({ success: true, message: 'Folder opened successfully' })
    
  } catch (error) {
    console.error('Error opening folder:', error)
    res.status(500).json({ error: 'Failed to open folder', message: error.message })
  }
})

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error)
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large. Maximum size is 10MB.'
      })
    }
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found'
  })
})

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`🌐 Network accessible on: http://0.0.0.0:${PORT}`)
  console.log(`📁 Upload directory: ${path.join(__dirname, '../uploads')}`)
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`)
  console.log(`🔗 Network health check: http://[YOUR_IP]:${PORT}/api/health`)
})

export { upload } 