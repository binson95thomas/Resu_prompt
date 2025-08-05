import axios from 'axios';

export async function extractJobFromUrl(url) {
  const prompt = `
Extract job details from this URL: ${url}

Return JSON format:
{
  "title": "Job Title",
  "company": "Company Name",
  "location": "Location",
  "salary": "Salary range",
  "type": "Full-time/Part-time/Contract",
  "description": "Brief description",
  "requirements": ["req1", "req2"],
  "benefits": ["benefit1", "benefit2"],
  "sponsorship": true/false,
  "postedDate": "YYYY-MM-DD"
}
`;

  const response = await axios.post('http://localhost:11434/api/generate', {
    model: 'llama3.2:3b-instruct',
    prompt,
    stream: false
  });

  try {
    const jsonMatch = response.data.response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No valid JSON found in response');
  } catch (e) {
    throw new Error('Failed to parse LLM response');
  }
}