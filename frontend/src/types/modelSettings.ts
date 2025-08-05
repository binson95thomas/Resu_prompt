export interface ModelSettings {
  provider: 'gemini' | 'gemini-vertex' | 'openrouter' | 'local';
  apiKey?: string;
  baseUrl?: string;
}

export interface TabModelSettings {
  jobDescription: ModelSettings;
  generateCV: ModelSettings;
  jobHunt: ModelSettings;
  jobTracker: ModelSettings;
}

export const getDefaultModelSettings = (): TabModelSettings => ({
  jobDescription: { provider: 'gemini' },
  generateCV: { provider: 'gemini' },
  jobHunt: { provider: 'gemini' },
  jobTracker: { provider: 'gemini' }
});

export const getAvailableProviders = () => [
  { id: 'gemini', name: 'Gemini API 1.5 Flash', description: 'Google Gemini 1.5 Flash' },
  { id: 'gemini-vertex', name: 'Gemini Vertex 2.0 Flash', description: 'Google Gemini 2.0 Flash (Vertex AI)' },
  { id: 'openrouter', name: 'OpenRouter Gemini 2.5 Pro', description: 'Gemini 2.5 Pro via OpenRouter' },
  { id: 'local', name: 'Local LLM', description: 'Ollama or local models' }
]; 