import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

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

    try {
      const response = await axios.post(
        `${this.baseURL}?key=${this.apiKey}`,
        {
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
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      return response.data.candidates[0].content.parts[0].text
    } catch (error) {
      console.error('Gemini API error:', error.response?.data || error.message)
      throw new Error(`Gemini API request failed: ${error.message}`)
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
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
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
    const prompt = `
You are an expert CV and job description analyst. Your task is to deeply analyze the provided CV and job description, and generate a detailed, actionable optimization plan to maximize ATS (Applicant Tracking System) compatibility and job match.

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

---
RESPONSE FORMAT (JSON only, no extra text):
{
  "matchScore": 85,
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

    const response = await this.makeRequest(prompt)
    console.log('Raw Gemini response:', response)
    
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        let parsed = JSON.parse(jsonMatch[0])
        parsed.isFallback = false
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
      // Return fallback optimization
      return {
        matchScore: 75,
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
        isFallback: true
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
}

const geminiService = new GeminiService()

export const analyzeJobDescription = (jobDescription) => geminiService.analyzeJobDescription(jobDescription)
export const optimizeCV = (cvText, jobDescription, structuredData) => geminiService.optimizeCV(cvText, jobDescription, structuredData)
export const generateSectionContent = (section, jobDescription, context) => geminiService.generateSectionContent(section, jobDescription, context) 