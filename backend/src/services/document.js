import mammoth from 'mammoth'
import fs from 'fs-extra'
import path from 'path'
import axios from 'axios'

class DocumentService {
  constructor() {
    this.docServiceUrl = process.env.DOC_SERVICE_URL || 'http://localhost:8080'
  }

  async extractTextFromDocx(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath })
      // Split into lines to preserve bullet/list structure
      const lines = result.value.split(/\r?\n/).filter(line => line.trim() !== '')
      return lines
    } catch (error) {
      console.error('Error extracting text from DOCX:', error)
      throw new Error('Failed to extract text from DOCX file')
    }
  }

  async generateOptimizedDocx(originalFilePath, acceptedEdits, suggestedEdits, jobDescription, previewMode = false) {
    try {
      if (previewMode) {
        // For preview, return a text summary of what would be changed
        const acceptedEditsList = Array.from(acceptedEdits).map(index => suggestedEdits[index])
        return `Preview: ${acceptedEditsList.length} edits would be applied to optimize the CV for ATS compatibility.`
      }

      // Read the original file
      const originalBuffer = await fs.readFile(originalFilePath)
      
      // Call the Java document service to process the document
      const response = await axios.post(`${this.docServiceUrl}/api/document/process`, {
        originalFile: originalBuffer.toString('base64'),
        acceptedEdits: acceptedEdits,
        suggestedEdits: suggestedEdits,
        jobDescription: jobDescription
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      })

      if (response.data && response.data.document) {
        return Buffer.from(response.data.document, 'base64')
      } else {
        throw new Error('Invalid response from document service')
      }
    } catch (error) {
      console.error('Error generating optimized DOCX:', error)
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Document service is not running. Please start the Java service.')
      }
      throw new Error(`Failed to generate optimized DOCX: ${error.message}`)
    }
  }

  async exportToPDF(docxBuffer) {
    try {
      // Call the Java document service to export to PDF
      const response = await axios.post(`${this.docServiceUrl}/api/document/export`, {
        document: docxBuffer.toString('base64'),
        format: 'pdf'
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      })

      if (response.data && response.data.pdf) {
        return Buffer.from(response.data.pdf, 'base64')
      } else {
        throw new Error('Invalid response from document service')
      }
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Document service is not running. Please start the Java service.')
      }
      throw new Error(`Failed to export PDF: ${error.message}`)
    }
  }

  async applyEditsToDocument(originalBuffer, edits) {
    try {
      // This method is now handled by the Java service
      // Call the Java service to apply edits
      const response = await axios.post(`${this.docServiceUrl}/api/document/process`, {
        originalFile: originalBuffer.toString('base64'),
        edits: edits
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      })

      if (response.data && response.data.document) {
        return Buffer.from(response.data.document, 'base64')
      } else {
        throw new Error('Invalid response from document service')
      }
    } catch (error) {
      console.error('Error applying edits to document:', error)
      throw new Error(`Failed to apply edits to document: ${error.message}`)
    }
  }

  async preserveFormatting(originalBuffer, newContent) {
    try {
      // This is now handled by the Java service which uses LibreOffice
      // The Java service will preserve formatting while updating content
      const response = await axios.post(`${this.docServiceUrl}/api/document/process`, {
        originalFile: originalBuffer.toString('base64'),
        newContent: newContent
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      })

      if (response.data && response.data.document) {
        return Buffer.from(response.data.document, 'base64')
      } else {
        throw new Error('Invalid response from document service')
      }
    } catch (error) {
      console.error('Error preserving formatting:', error)
      throw new Error(`Failed to preserve document formatting: ${error.message}`)
    }
  }

  async generateCoverLetterDocx(originalFilePath, coverLetterData, jobDescription) {
    try {
      // Read the original file
      const originalBuffer = await fs.readFile(originalFilePath)
      
      // Call the Java document service to generate cover letter
      const response = await axios.post(`${this.docServiceUrl}/api/document/generate-cover-letter`, {
        originalFile: originalBuffer.toString('base64'),
        coverLetterData: coverLetterData,
        jobDescription: jobDescription
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      })

      if (response.data && response.data.document) {
        return Buffer.from(response.data.document, 'base64')
      } else {
        throw new Error('Invalid response from document service')
      }
    } catch (error) {
      console.error('Error generating cover letter DOCX:', error)
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Document service is not running. Please start the Java service.')
      }
      throw new Error(`Failed to generate cover letter DOCX: ${error.message}`)
    }
  }
}

const documentService = new DocumentService()

export const extractTextFromDocx = (filePath) => documentService.extractTextFromDocx(filePath)
export const generateOptimizedDocx = (filePath, acceptedEdits, suggestedEdits, jobDescription, previewMode) => 
  documentService.generateOptimizedDocx(filePath, acceptedEdits, suggestedEdits, jobDescription, previewMode)
export const exportToPDF = (docxBuffer) => documentService.exportToPDF(docxBuffer)
export const applyEditsToDocument = (originalBuffer, edits) => documentService.applyEditsToDocument(originalBuffer, edits)
export const preserveFormatting = (originalBuffer, newContent) => documentService.preserveFormatting(originalBuffer, newContent)
export const generateCoverLetterDocx = (filePath, coverLetterData, jobDescription) => 
  documentService.generateCoverLetterDocx(filePath, coverLetterData, jobDescription) 