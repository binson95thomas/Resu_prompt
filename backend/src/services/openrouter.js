import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_DEFAULT_MODEL = 'google/gemini-2.5-pro-preview';

if (!OPENROUTER_API_KEY) {
  console.warn('⚠️  OPENROUTER_API_KEY not found in environment variables');
}

class OpenRouterService {
  constructor() {
    this.apiKey = OPENROUTER_API_KEY;
    this.baseURL = OPENROUTER_BASE_URL;
  }

  async makeRequest(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    // Default model for different tasks - Using Gemini 2.5 Pro Preview via OpenRouter
    const defaultModel = options.model || OPENROUTER_DEFAULT_MODEL;
    
    // Prepare request data
    const requestData = {
      model: defaultModel,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2048,
      top_p: options.topP || 0.95,
      frequency_penalty: options.frequencyPenalty || 0,
      presence_penalty: options.presencePenalty || 0
    };

    const requestConfig = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://resuprompt.com',
        'X-Title': 'ResuPrompt ATS Optimizer'
      }
    };

    // Log API Request
    console.log('\n' + '='.repeat(80));
    console.log('🚀 OPENROUTER API REQUEST');
    console.log('='.repeat(80));
    console.log('📡 URL:', `${this.baseURL}/chat/completions`);
    console.log('🔑 API Key:', this.apiKey ? `${this.apiKey.substring(0, 3)}...` : 'NOT SET');
    console.log('🤖 Model:', defaultModel);
    console.log('📤 Request Body:');
    console.log(JSON.stringify(requestData, null, 2));
    console.log('📋 Request Headers:');
    console.log(JSON.stringify(requestConfig, null, 2));
    console.log('='.repeat(80));

    try {
          const response = await axios.post(
      `${this.baseURL}/chat/completions`,
      requestData,
      requestConfig
    );

    const responseText = response.data.choices[0].message.content;
    
         // Add model information to the response
     const modelInfo = {
       provider: 'OpenRouter Gemini 2.5 Pro',
       model: OPENROUTER_DEFAULT_MODEL,
       usage: response.data.usage
     };
      
      // Log API Response
      console.log('\n' + '='.repeat(80));
      console.log('📥 OPENROUTER API RESPONSE');
      console.log('='.repeat(80));
      console.log('📊 Status:', response.status);
      console.log('📊 Status Text:', response.statusText);
      console.log('📋 Response Headers:');
      console.log(JSON.stringify(response.headers, null, 2));
      console.log('📄 Full Response Data:');
      console.log(JSON.stringify(response.data, null, 2));
      console.log('📝 Response Text (first 500 chars):');
      console.log(responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));
      console.log('='.repeat(80) + '\n');
      
      return responseText;
    } catch (error) {
      console.error('OpenRouter API error:', error.response?.data || error.message);
      
      // Handle specific error cases
      if (error.response?.status === 503) {
        throw new Error('OpenRouter API is temporarily overloaded. Please try again in a few minutes.');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
      } else if (error.response?.status === 401) {
        throw new Error('Invalid API key. Please check your OpenRouter API configuration.');
      } else if (error.response?.status === 400) {
        throw new Error('Invalid request to OpenRouter API. Please check your input data.');
      } else {
        throw new Error(`OpenRouter API request failed: ${error.message}`);
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
`;

    const response = await this.makeRequest(prompt);
    console.log('Raw OpenRouter response:', response);
    
    try {
      // Extract JSON from response - handle multiple JSON objects
      const jsonMatches = response.match(/\{[\s\S]*?\}/g);
      if (jsonMatches && jsonMatches.length > 0) {
        // Try to parse each JSON object and return the first valid one
        for (const jsonMatch of jsonMatches) {
          try {
            const analysis = JSON.parse(jsonMatch);
            // Check if this looks like a job analysis response
            if (analysis.keywords || analysis.skills || analysis.requirements) {
              return {
                ...analysis,
                                 modelInfo: {
                   provider: 'OpenRouter Gemini 2.5 Pro',
                   model: OPENROUTER_DEFAULT_MODEL,
                   usage: null // We don't have usage info in this context
                 }
              };
            }
          } catch (e) {
            // Continue to next match
            continue;
          }
        }
        // If no valid job analysis found, return the first valid JSON
        const analysis = JSON.parse(jsonMatches[0]);
        return {
          ...analysis,
          modelInfo: {
            provider: 'OpenRouter Gemini 2.5 Pro',
            model: OPENROUTER_DEFAULT_MODEL,
            usage: null
          }
        };
      }
      throw new Error('No valid JSON found in response');
    } catch (parseError) {
      console.error('Failed to parse OpenRouter response:', parseError);
      // Return fallback analysis
      return {
        keywords: ['technology', 'development', 'experience'],
        skills: ['Technical Skills', 'Communication', 'Problem Solving'],
        requirements: ['Bachelor\'s degree', 'Experience in field'],
        industry: 'Technology',
        level: 'Mid',
        summary: 'Technical role requiring relevant experience',
        modelInfo: {
          provider: 'OpenRouter Gemini 2.5 Pro',
          model: OPENROUTER_DEFAULT_MODEL,
          usage: null
        }
      };
    }
  }

  async optimizeCV(cvText, jobDescription, structuredData = null) {
    const prompt = `
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
Analyze the CV against the job description and provide specific, actionable optimization recommendations.

Return a JSON response with this structure:
{
  "model": "YOUR_ACTUAL_MODEL_NAME",
  "analysis": {
    "overallMatch": "percentage (e.g., 75%)",
    "strengths": ["strength1", "strength2", "strength3"],
    "weaknesses": ["weakness1", "weakness2", "weakness3"],
    "missingKeywords": ["keyword1", "keyword2", "keyword3"],
    "atsCompatibility": "High/Medium/Low"
  },
  "recommendations": {
    "summary": "Specific summary optimization",
    "skills": ["skill1", "skill2", "skill3"],
    "experience": ["experience1", "experience2", "experience3"],
    "education": ["education1", "education2"],
    "formatting": ["formatting1", "formatting2"]
  },
  "suggestedEdits": [
    {
      "section": "section_name",
      "currentText": "current text",
      "suggestedText": "optimized text",
      "reason": "why this change improves ATS compatibility"
    }
  ],
  "keywords": {
    "jobKeywords": ["keyword1", "keyword2", "keyword3"],
    "cvKeywords": ["keyword1", "keyword2", "keyword3"],
    "missingKeywords": ["keyword1", "keyword2", "keyword3"]
  }
}

Focus on:
1. ATS keyword optimization
2. Quantifiable achievements
3. Relevant experience alignment
4. Professional formatting
5. Industry-specific terminology
`;

    const response = await this.makeRequest(prompt, { model: OPENROUTER_DEFAULT_MODEL });
    
    try {
      // Extract JSON from response - handle multiple JSON objects
      const jsonMatches = response.match(/\{[\s\S]*?\}/g);
      if (jsonMatches && jsonMatches.length > 0) {
        // Try to parse each JSON object and return the first valid one
        for (const jsonMatch of jsonMatches) {
          try {
            const optimization = JSON.parse(jsonMatch);
            // Check if this looks like a CV optimization response
            if (optimization.analysis || optimization.recommendations) {
              return {
                ...optimization,
                                 modelInfo: {
                   provider: 'OpenRouter Gemini 2.5 Pro',
                   model: OPENROUTER_DEFAULT_MODEL,
                   usage: null
                 }
              };
            }
          } catch (e) {
            // Continue to next match
            continue;
          }
        }
        // If no valid optimization found, return the first valid JSON
        const optimization = JSON.parse(jsonMatches[0]);
        return {
          ...optimization,
          modelInfo: {
            provider: 'OpenRouter Gemini 2.5 Pro',
            model: OPENROUTER_DEFAULT_MODEL,
            usage: null
          }
        };
      }
      throw new Error('No valid JSON found in response');
    } catch (parseError) {
      console.error('Failed to parse OpenRouter CV optimization response:', parseError);
      throw new Error('Failed to parse optimization response');
    }
  }

  async generateCoverLetter(cvText, jobDescription, options = {}) {
    const prompt = `
You are an expert cover letter writer. Create a compelling, professional cover letter based on the CV and job description provided.

CV Content:
${cvText}

Job Description:
${jobDescription}

Requirements:
- Write a professional cover letter
- Include proper salutation (Dear Hiring Manager or specific name if provided)
- Highlight relevant skills and experience from the CV
- Address key requirements from the job description
- Keep it concise but impactful (2-3 paragraphs)
- End with a professional closing
- Use formal business language
- Include a call to action

Style: ${options.style || 'professional'}
Tone: ${options.tone || 'confident and enthusiastic'}

Please write the complete cover letter without any additional text or formatting instructions.
`;

    const response = await this.makeRequest(prompt, { model: OPENROUTER_DEFAULT_MODEL });
    return response;
  }

  async searchJobs(searchCriteria) {
    const prompt = `
You are a job search assistant. I need you to find current job opportunities with the most up-to-date information.

Search Criteria:
${searchCriteria}

IMPORTANT: Use deep web search to find the most recent job postings. Do not use outdated information. Search for jobs posted within the last 30 days.

For each job found, provide the following information in JSON format:
{
  "jobs": [
    {
      "id": "unique_id",
      "title": "Job Title",
      "company": "Company Name",
      "location": "Location",
      "salary": "Salary range if available",
      "type": "Full-time/Part-time/Contract",
      "description": "Brief job description",
      "requirements": ["requirement1", "requirement2"],
      "benefits": ["benefit1", "benefit2"],
      "sponsorship": true/false,
      "postedDate": "YYYY-MM-DD",
      "jobUrl": "Direct application URL if available"
    }
  ]
}

Focus on:
1. UK-based tech companies that offer sponsorship for international candidates
2. Recent job postings (within last 30 days)
3. Companies like Google, Microsoft, Amazon, Meta, Apple, Netflix, Spotify, etc.
4. Include direct application links when available
5. Verify sponsorship information from official company career pages

Return only valid JSON with real, current job opportunities.
`;

    const response = await this.makeRequest(prompt, { model: OPENROUTER_DEFAULT_MODEL });
    
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in response');
    } catch (parseError) {
      console.error('Failed to parse OpenRouter job search response:', parseError);
      return { jobs: [] };
    }
  }

  async extractJobFromUrl(url) {
    const prompt = `
You are a job details extraction assistant. I will provide you with a job posting URL, and you need to extract all relevant job details from the content.

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

Please analyze the job posting content and extract the details in the specified JSON format.
`;

    const response = await this.makeRequest(prompt, { model: OPENROUTER_DEFAULT_MODEL });
    
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in response');
    } catch (parseError) {
      console.error('Failed to parse OpenRouter URL extraction response:', parseError);
      throw new Error('Failed to extract job details from URL');
    }
  }
}

const openRouterService = new OpenRouterService();

export const analyzeJobDescription = (jobDescription) => openRouterService.analyzeJobDescription(jobDescription);
export const optimizeCV = (cvText, jobDescription, structuredData) => openRouterService.optimizeCV(cvText, jobDescription, structuredData);
export const generateCoverLetter = (cvText, jobDescription, options) => openRouterService.generateCoverLetter(cvText, jobDescription, options);
export const searchJobs = (searchCriteria) => openRouterService.searchJobs(searchCriteria);
export const extractJobFromUrl = (url) => openRouterService.extractJobFromUrl(url); 