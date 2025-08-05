# OpenRouter Integration Setup

## Overview
The application now supports OpenRouter as an alternative AI provider. OpenRouter provides access to multiple AI models through a single API.

## Setup Instructions

### 1. Get OpenRouter API Key
1. Visit [OpenRouter](https://openrouter.ai/)
2. Sign up for an account
3. Navigate to your API keys section
4. Create a new API key
5. Copy the API key

### 2. Configure Environment Variables
Create a `.env` file in the `backend` directory with the following variables:

```bash
# Existing Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# New OpenRouter API
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Server Configuration
PORT=3001
CORS_ORIGIN=http://localhost:5173
MAX_FILE_SIZE=10485760
```

### 3. Restart Backend Server
After adding the OpenRouter API key, restart the backend server:

```bash
cd backend
npm start
```

## Usage

### 1. Access Settings
1. Open the application
2. Click the Settings button in the sidebar
3. Go to the "AI Model Settings" tab

### 2. Configure Provider Selection
For each tab, you can now select:
- **Gemini API** - Uses Google Gemini 1.5 Flash
- **OpenRouter API** - Uses GPT-4 via OpenRouter
- **Local LLM** - Uses local models (coming soon)

### 3. Test Configuration
1. Select "OpenRouter API" for any tab
2. Click the "Test" button next to that tab
3. Verify the test is successful

## Features Available with OpenRouter

### ✅ Implemented
- **Job Description Analysis** - Analyzes job descriptions and extracts key information
- **CV Optimization** - Optimizes CVs for ATS compatibility
- **Cover Letter Generation** - Creates professional cover letters
- **Job Search** - Searches for relevant job opportunities
- **URL Extraction** - Extracts job details from URLs

### 🔄 Coming Soon
- **Local LLM Integration** - Ollama and other local models

## API Endpoints

### OpenRouter Endpoints
- `POST /api/optimize/openrouter/analyze-jd` - Analyze job descriptions
- `POST /api/optimize/openrouter/optimize-cv` - Optimize CVs
- `POST /api/optimize/openrouter/generate-cover-letter` - Generate cover letters
- `POST /api/optimize/openrouter/search-jobs` - Search for jobs
- `POST /api/optimize/openrouter/extract-job-from-url` - Extract job details from URLs

## Benefits of OpenRouter

1. **Multiple Models** - Access to GPT-4, Claude, and other models
2. **Cost Optimization** - Choose cheaper models for different tasks
3. **Rate Limit Bypass** - Higher rate limits than individual providers
4. **Reliability** - Automatic fallback between providers
5. **Quality** - Use best models for critical features

## Troubleshooting

### "OpenRouter API key not configured"
- Ensure you've added `OPENROUTER_API_KEY` to your `.env` file
- Restart the backend server after adding the key

### "Rate limit exceeded"
- OpenRouter has higher limits, but they can still be hit
- Wait a few minutes and try again

### "Invalid API key"
- Verify your OpenRouter API key is correct
- Check that the key has sufficient credits

## Model Selection Strategy

### Recommended Settings:
- **CV Optimization & Cover Letters**: OpenRouter GPT-4 (highest quality)
- **Job Analysis**: OpenRouter GPT-3.5 (fast, cost-effective)
- **Job Search**: OpenRouter GPT-4 (better search results)
- **URL Extraction**: OpenRouter GPT-4 (better parsing)

## Cost Considerations

- **GPT-4**: ~$0.03 per 1K tokens (high quality, higher cost)
- **GPT-3.5**: ~$0.002 per 1K tokens (good quality, lower cost)
- **Claude**: ~$0.015 per 1K tokens (good quality, medium cost)

Choose models based on your budget and quality requirements. 