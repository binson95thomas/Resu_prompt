import axios from 'axios'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from project root
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') })

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent'

if (!GEMINI_API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY not found in environment variables')
}

class GeminiService {
  constructor() {
    this.apiKey = GEMINI_API_KEY
    this.baseURL = GEMINI_API_URL
  }

  async makeRequest(prompt) {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured')
    }

    // Prepare request data
    const requestData = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    }

    const requestConfig = {
      headers: {
        'Content-Type': 'application/json'
      }
    }

    // Log API Request
    console.log('\n' + '='.repeat(80))
    console.log('🚀 GEMINI API REQUEST')
    console.log('='.repeat(80))
    console.log('📡 URL:', this.baseURL)
    console.log('🔑 API Key:', this.apiKey ? `${this.apiKey.substring(0, 3)}...` : 'NOT SET')
    console.log('📤 Request Body:')
    console.log(JSON.stringify(requestData, null, 2))
    console.log('📋 Request Headers:')
    console.log(JSON.stringify(requestConfig, null, 2))
    console.log('='.repeat(80))

    try {
      const response = await axios.post(
        `${this.baseURL}?key=${this.apiKey}`,
        requestData,
        requestConfig
      )

      const responseText = response.data.candidates[0].content.parts[0].text
      
      // Log API Response
      console.log('\n' + '='.repeat(80))
      console.log('📥 GEMINI API RESPONSE')
      console.log('='.repeat(80))
      console.log('📊 Status:', response.status)
      console.log('📊 Status Text:', response.statusText)
      console.log('📋 Response Headers:')
      console.log(JSON.stringify(response.headers, null, 2))
      console.log('📄 Full Response Data:')
      console.log(JSON.stringify(response.data, null, 2))
      console.log('📝 Response Text (first 500 chars):')
      console.log(responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''))
      console.log('='.repeat(80) + '\n')
      
      return responseText
    } catch (error) {
      console.error('Gemini API error:', error.response?.data || error.message)
      
      // Handle specific error cases
      if (error.response?.status === 503) {
        throw new Error('Gemini API is temporarily overloaded. Please try again in a few minutes.')
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment before trying again.')
      } else if (error.response?.status === 401) {
        throw new Error('Invalid API key. Please check your Gemini API configuration.')
      } else if (error.response?.status === 400) {
        throw new Error('Invalid request to Gemini API. Please check your input data.')
      } else {
        throw new Error(`Gemini API request failed: ${error.message}`)
      }
    }
  }

  async analyzeJobDescription(jobDescription) {
    const prompt = `
You are an expert HR analyst. Analyze the following job description and extract key information.

Job Description:
${jobDescription}

Please provide a JSON response with the following structure:
{
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "skills": ["skill1", "skill2", "skill3"],
  "requirements": ["requirement1", "requirement2", "requirement3"],
  "industry": "industry_name",
  "level": "entry/mid/senior/executive",
  "summary": "Brief summary of the role"
}

Focus on:
- Technical skills and technologies
- Soft skills and competencies
- Experience requirements
- Industry-specific terms
- Action verbs and keywords that ATS systems look for

Return only the JSON object, no additional text.
`

    const response = await this.makeRequest(prompt)
    console.log('Raw Gemini response:', response)
    
    try {
      // Extract JSON from response - handle multiple JSON objects
      const jsonMatches = response.match(/\{[\s\S]*?\}/g)
      if (jsonMatches && jsonMatches.length > 0) {
        // Try to parse each JSON object and return the first valid one
        for (const jsonMatch of jsonMatches) {
          try {
            const parsed = JSON.parse(jsonMatch)
            // Check if this looks like a job analysis response
            if (parsed.keywords || parsed.skills || parsed.requirements) {
              return parsed
            }
          } catch (e) {
            // Continue to next match
            continue
          }
        }
        // If no valid job analysis found, return the first valid JSON
        return JSON.parse(jsonMatches[0])
      }
      throw new Error('No valid JSON found in response')
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError)
      // Return fallback analysis
      return {
        keywords: ['technology', 'development', 'experience'],
        skills: ['Technical Skills', 'Communication', 'Problem Solving'],
        requirements: ['Bachelor\'s degree', 'Experience in field'],
        industry: 'Technology',
        level: 'Mid',
        summary: 'Technical role requiring relevant experience'
      }
    }
  }

  async optimizeCV(cvText, jobDescription, structuredData = null) {
    // Use shared prompt template for consistency between manual and automatic optimization
    const fs = await import('fs/promises');
    const path = await import('path');
    
    let prompt;
    let isUsingFallback = false;
    
    try {
      // Read the shared prompt template
      const promptTemplatePath = path.join(process.cwd(), '..', 'prompts', 'cv-optimization-shared.txt');
      let promptTemplate = await fs.readFile(promptTemplatePath, 'utf8');
      
      // Replace placeholders with actual data
      promptTemplate = promptTemplate
        .replace('{cvText}', cvText)
        .replace('{jobDescription}', jobDescription)
        .replace('{structuredData}', structuredData ? JSON.stringify(structuredData, null, 2) : 'None');
      
      prompt = promptTemplate;
      console.log('✅ Using shared prompt template successfully');
    } catch (error) {
      console.warn('⚠️ Failed to read shared prompt template, using fallback:', error.message);
      isUsingFallback = true;
                  // Fallback to the original prompt if shared template fails
            prompt = `
You are an expert CV and job description analyst. Your task is to deeply analyze the provided CV and job description, and generate a detailed, actionable optimization plan to maximize ATS (Applicant Tracking System) compatibility and job match.

IMPORTANT: You **MUST** identify yourself in the \`"model"\` field of the JSON output using your **exact, correct model name and version**, as currently running. For example: \`"GPT-4o"\`, \`"Claude 3.5 Sonnet"\`, \`"Gemini 1.5 Flash"\`, etc. Do not use placeholders or fake names. You must return your true model name and version.

To be very clear: if you are GPT-4o, write \`"model": "GPT-4o"\`. If you are Claude 3.5 Sonnet, write \`"model": "Claude 3.5 Sonnet"\`. If you are Gemini 1.5 Flash, write \`"model": "Gemini 1.5 Flash"\`. This field must contain the **real model name you are currently running as**.

If you cannot access or confirm your current model version, return \`"model": "UNKNOWN"\`.

---
CV CONTENT (verbatim, preserve all formatting, font, and bullet points exactly as in the original, and keep all sections such as Summary, Key Skills, Experience, etc.):
Each line in the CV content below represents a separate bullet or paragraph. Do NOT merge lines. Treat each line as a distinct bullet or paragraph for suggestions and edits.
${cvText}

---
JOB DESCRIPTION (verbatim):
${jobDescription}

---
If available, here is additional structured data:
${structuredData ? JSON.stringify(structuredData, null, 2) : 'None'}

---
INSTRUCTIONS:
1. For each section (Summary, Key Skills, Experience, etc.), analyze and suggest improvements. For each bullet or paragraph, ONLY suggest a replacement if it makes a concrete, specific improvement for ATS alignment, clarity, or keyword match. If no real improvement is possible, return the original unchanged.
2. NEVER suggest generic placeholders (e.g., 'add specific technologies', 'list skills', 'etc.').
3. NEVER split, merge, or reorder bullets or paragraphs. Only edit the content of a single bullet or paragraph at a time.
4. If a bullet or paragraph is already optimal, return it as-is.
5. List all keywords from the job description that are missing or underrepresented in the CV, and for each, suggest a concrete way to add it to the CV (e.g., add to a bullet, add to skills, etc.).
6. If the job description mentions SQL or queries, suggest how to optimize queries for ATS and add relevant keywords.
7. Give an overall match score (0-100) and a prioritized list of improvements.
8. Provide 2-3 overall recommendations for further improvement, but do NOT use generic language.
9. Predict the new match score if the user adds all the suggested missing keywords (field: predictedMatchScoreIfKeywordsAdded).
10. Extract and return all available key job details (as much as possible) from the job description, including: company name, location, salary, contract length, job type, and any other relevant details. Return these in a 'jobDetails' field.
11. PRESERVE ALL FORMATTING, including font, size, bold, italics, underline, color, bullet/numbering, and section headers. Do not change the structure or layout of the document.
12. IMPORTANT: In the "model" field, include YOUR ACTUAL MODEL NAME AND VERSION (e.g., 'ChatGPT 4o Mini', 'Claude 3.5 Sonnet', 'Gemini 2.0 Flash', 'GPT-4', etc.). Do NOT use placeholder text - use your real model name.

---
RESPONSE FORMAT (JSON only, no extra text):
{
  "model": "REPLACE WITH YOUR ACTUAL MODEL NAME AND VERSION (e.g., 'ChatGPT 4o Mini', 'Claude 3.5 Sonnet', 'Gemini 2.0 Flash', 'GPT-4', 'Bard', etc.)",
  "matchScore": <calculate a score from 0-100 based on keyword match, experience relevance, and overall fit>,
  "keywords": ["keyword1", "keyword2"],
  "keywordSuggestions": [
    { "keyword": "keyword1", "suggestion": "Add to bullet X in Experience section" }
  ],
  "improvements": ["improvement1", "improvement2"],
  "suggestedEdits": [
    {
      "section": "Section name (e.g., Summary, Key Skills, Experience)",
      "originalBullet": "Original bullet or paragraph from CV",
      "improvedBullet": "Improved bullet or paragraph with added keywords/skills (must be concrete, not generic)",
      "reason": "Why this change helps"
    }
  ],
  "overallRecommendations": [
    "Recommendation 1",
    "Recommendation 2"
  ],
  "predictedMatchScoreIfKeywordsAdded": 95,
  "jobDetails": {
    "company": "Company Name",
    "location": "Location",
    "salary": "Salary or range",
    "contractLength": "Contract length or type",
    "jobType": "Full-time/Part-time/Contract/Remote/Onsite/etc.",
    "other": "Any other relevant details"
  }
}

---
STRICT RULES:
- Do NOT invent experience or skills not present in the CV.
- Do NOT change the order or structure unless required for ATS.
- Use only the JSON format above. Do NOT include explanations or extra text.
- Preserve all original formatting, especially bullet points, lists, section headers, and font styles.
- Do NOT use generic placeholders or vague suggestions. Only concrete, actionable edits are allowed.
`;
    }

    const response = await this.makeRequest(prompt)
    console.log('Raw Gemini response:', response)
    
    try {
      // Extract JSON from response - handle markdown code blocks
      let jsonText = response;
      
      // Remove markdown code block markers if present
      if (jsonText.includes('```json')) {
        jsonText = jsonText.replace(/```json\s*/, '').replace(/\s*```$/, '');
        console.log('🔧 Removed ```json markers');
      } else if (jsonText.includes('```')) {
        jsonText = jsonText.replace(/```\s*/, '').replace(/\s*```$/, '');
        console.log('🔧 Removed ``` markers');
      }
      
      console.log('🔧 JSON text after cleanup (first 200 chars):', jsonText.substring(0, 200) + '...');
      
      // Try to find JSON object
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        let parsed = JSON.parse(jsonMatch[0])
        parsed.isFallback = isUsingFallback
        parsed.promptSource = isUsingFallback ? 'fallback' : 'shared-template'
        
        // Add model information if not present
        if (!parsed.model) {
          parsed.model = 'Gemini 1.5 Flash'
        }
        // Filter out generic or trivial suggestions
        if (parsed.suggestedEdits && Array.isArray(parsed.suggestedEdits)) {
          parsed.suggestedEdits = parsed.suggestedEdits.filter(edit => {
            if (!edit.originalBullet || !edit.improvedBullet) return false;
            const orig = edit.originalBullet.trim().toLowerCase();
            const imp = edit.improvedBullet.trim().toLowerCase();
            // Remove if nearly identical or contains generic placeholders
            if (orig === imp) return false;
            if (imp.includes('add specific') || imp.includes('list') || imp.includes('etc.') || imp.includes('generic')) return false;
            // Remove if improvement is too short or vague
            if (imp.length < 10) return false;
            return true;
          })
        }
        return parsed
      }
      throw new Error('No valid JSON found in response')
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError)
      console.error('Response that failed to parse:', response)
      console.error('JSON text after cleanup:', jsonText)
      // Return fallback optimization
      return {
        model: 'Gemini 1.5 Flash',
        matchScore: 60,
        keywords: ['technology', 'development'],
        improvements: ['Add specific technologies', 'Include quantifiable achievements'],
        suggestedEdits: [
          {
            originalBullet: 'Experienced developer',
            improvedBullet: 'Experienced software developer with expertise in modern technologies',
            reason: 'Added specific role and technology focus'
          }
        ],
        overallRecommendations: [
          'Add more specific technologies',
          'Include quantifiable achievements',
          'Use action verbs consistently'
        ],
        isFallback: true,
        promptSource: 'fallback'
      }
    }
  }

  async generateSectionContent(section, jobDescription, context = '') {
    const prompt = `
You are an expert CV writer. Generate content for the "${section}" section of a CV that matches the following job description.

Job Description:
${jobDescription}

${context ? `Context: ${context}` : ''}

Please provide content that:
- Is relevant to the job requirements
- Uses appropriate keywords naturally
- Demonstrates relevant skills and experience
- Is professional and concise
- Is optimized for ATS systems

Return only the content for this section, no additional formatting or explanations.
`

    return await this.makeRequest(prompt)
  }

  async generateCoverLetter(cvText, jobDescription, options = {}) {
    const {
      style = 'traditional',
      tone = 'professional',
      focusAreas = ['results', 'technical-skills'],
      hiringManager = '',
      companyName = '',
      coverLetterTemplate = null,
      jobSource = 'company website',
      useTemplate = false,
      customPrompt = null,
      isJobSearch = false
    } = options;

    // Handle job search requests
    if (isJobSearch && customPrompt) {
      console.log('🔍 Processing job search request with custom prompt');
      return await this.makeRequest(customPrompt);
    }

    // Use shared prompt template for consistency
    const fs = await import('fs/promises');
    const path = await import('path');
    
    let prompt;
    let isUsingFallback = false;
    
    try {
      // Read the shared prompt template
      const promptTemplatePath = path.join(process.cwd(), '..', 'prompts', 'cover-letter-generation-shared.txt');
      let promptTemplate = await fs.readFile(promptTemplatePath, 'utf8');
      
      // Replace placeholders with actual data
      promptTemplate = promptTemplate
        .replace('{cvText}', cvText)
        .replace('{jobDescription}', jobDescription)
        .replace('{coverLetterStyle}', style)
        .replace('{tone}', tone)
        .replace('{focusAreas}', focusAreas.join(', '))
        .replace('{hiringManager}', hiringManager || 'Hiring Manager')
        .replace('{companyName}', companyName || 'Company')
        .replace('{jobSource}', jobSource)
        .replace('{useTemplate}', useTemplate ? 'Yes' : 'No');
      
      prompt = promptTemplate;
      console.log('✅ Using shared cover letter prompt template successfully');
    } catch (error) {
      console.warn('⚠️ Failed to read shared cover letter prompt template, using fallback:', error.message);
      isUsingFallback = true;
      
      // Fallback prompt
      prompt = `
You are an expert cover letter writer specializing in ATS optimization and compelling storytelling.

CV Content:
${cvText}

Job Description:
${jobDescription}

Cover Letter Style: ${style}
Tone: ${tone}
Focus Areas: ${focusAreas.join(', ')}
Hiring Manager: ${hiringManager || 'Hiring Manager'}
Company Name: ${companyName || 'Company'}
Job Source: ${jobSource}
Use Template: ${useTemplate ? 'Yes' : 'No'}

Your task is to create a compelling cover letter that personalizes the candidate's story, demonstrates cultural fit, highlights relevant achievements, addresses specific job requirements, uses ATS-friendly language, and maintains professional tone.

Please provide a JSON response with the following structure:

{
  "model": "YOUR_ACTUAL_MODEL_NAME_AND_VERSION",
  "coverLetter": {
    "header": {
      "candidateName": "Full Name",
      "candidateEmail": "email@example.com",
      "candidatePhone": "phone number",
      "date": "Current date",
      "companyName": "Company Name",
      "companyAddress": "Company address if available",
      "hiringManagerName": "Hiring manager name if available"
    },
    "body": {
      "opening": "Compelling opening paragraph that hooks the reader",
      "mainContent": [
        "First main paragraph focusing on key achievements and relevant experience",
        "Second main paragraph addressing specific job requirements and cultural fit",
        "Third main paragraph showing enthusiasm and future potential"
      ],
      "closing": "Strong closing paragraph with call to action"
    },
    "signature": "Professional signature"
  },
  "analysis": {
    "keyThemes": ["theme1", "theme2", "theme3"],
    "achievementsHighlighted": ["achievement1", "achievement2"],
    "keywordsIncluded": ["keyword1", "keyword2"],
    "culturalFitElements": ["element1", "element2"],
    "atsOptimizationScore": 85
  },
  "customization": {
    "personalizedElements": ["element1", "element2"],
    "companySpecificReferences": ["reference1", "reference2"],
    "roleSpecificConnections": ["connection1", "connection2"]
  },
  "recommendations": [
    "Consider adding specific project examples",
    "Include metrics from your most relevant experience",
    "Mention any industry certifications or training"
  ]
}

Return only the JSON object, no additional text or explanations.
`;
    }

    const response = await this.makeRequest(prompt)
    console.log('Raw Gemini cover letter response:', response)
    
    try {
      // Extract JSON from response - handle markdown code blocks
      let jsonText = response;
      
      // Remove markdown code block markers if present
      if (jsonText.includes('```json')) {
        jsonText = jsonText.replace(/```json\s*/, '').replace(/\s*```$/, '');
        console.log('🔧 Removed ```json markers');
      } else if (jsonText.includes('```')) {
        jsonText = jsonText.replace(/```\s*/, '').replace(/\s*```$/, '');
        console.log('🔧 Removed ``` markers');
      }
      
      console.log('🔧 JSON text after cleanup (first 200 chars):', jsonText.substring(0, 200) + '...');
      
      // Try to find JSON object
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        let parsed = JSON.parse(jsonMatch[0])
        parsed.isFallback = isUsingFallback
        parsed.promptSource = isUsingFallback ? 'fallback' : 'shared-template'
        
        // Add model information if not present
        if (!parsed.model) {
          parsed.model = 'Gemini 1.5 Flash'
        }
        
        return parsed
      }
      throw new Error('No valid JSON found in response')
    } catch (parseError) {
      console.error('Failed to parse Gemini cover letter response:', parseError)
      console.error('Response that failed to parse:', response)
      // Return fallback cover letter
      return {
        model: 'Gemini 1.5 Flash',
        coverLetter: {
          header: {
            candidateName: 'Your Name',
            candidateEmail: 'your.email@example.com',
            candidatePhone: 'Your Phone',
            date: new Date().toISOString().split('T')[0],
            companyName: companyName || 'Company',
            companyAddress: 'Company Address',
            hiringManagerName: hiringManager || 'Hiring Manager'
          },
          body: {
            opening: 'I am writing to express my strong interest in the position at your company.',
            mainContent: [
              'Based on my experience and the requirements of this role, I believe I would be an excellent fit for your team.',
              'I am particularly excited about the opportunity to contribute to your company\'s mission and values.',
              'I look forward to discussing how my background and skills align with your needs.'
            ],
            closing: 'Thank you for considering my application. I look forward to hearing from you.'
          },
          signature: 'Sincerely,\nYour Name'
        },
        analysis: {
          keyThemes: ['professional', 'enthusiastic', 'qualified'],
          achievementsHighlighted: ['experience', 'skills'],
          keywordsIncluded: ['position', 'company', 'team'],
          culturalFitElements: ['mission', 'values'],
          atsOptimizationScore: 75
        },
        isFallback: true,
        promptSource: 'fallback'
      }
    }
  }
}

const geminiService = new GeminiService()

export const analyzeJobDescription = (jobDescription) => geminiService.analyzeJobDescription(jobDescription)
export const optimizeCV = (cvText, jobDescription, structuredData) => geminiService.optimizeCV(cvText, jobDescription, structuredData)
export const generateSectionContent = (section, jobDescription, context) => geminiService.generateSectionContent(section, jobDescription, context)
export const generateCoverLetter = (cvText, jobDescription, options) => geminiService.generateCoverLetter(cvText, jobDescription, options) 