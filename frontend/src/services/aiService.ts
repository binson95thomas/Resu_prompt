import { TabModelSettings } from '../types/modelSettings';

export class AIService {
  private modelSettings: TabModelSettings;

  constructor(modelSettings: TabModelSettings) {
    this.modelSettings = modelSettings;
  }

  async makeRequest(tabId: keyof TabModelSettings, prompt: string, options: any = {}) {
    const tabSettings = this.modelSettings[tabId];
    
    console.log('🔧 AIService - makeRequest called for tabId:', tabId);
    console.log('🔧 AIService - Current modelSettings:', this.modelSettings);
    console.log('🔧 AIService - tabSettings for', tabId, ':', tabSettings);
    
    if (!tabSettings) {
      throw new Error(`No model settings found for tab: ${tabId}`);
    }

    console.log('🔧 AIService - Using provider:', tabSettings.provider, 'for tab:', tabId);

    switch (tabSettings.provider) {
      case 'gemini':
        return this.callGeminiAPI(prompt, options);
      case 'gemini-vertex':
        return this.callGeminiVertexAPI(prompt, options);
      case 'openrouter':
        return this.callOpenRouterAPI(prompt, options);
      case 'local':
        return this.callLocalAPI(prompt, options);
      default:
        throw new Error(`Unknown provider: ${tabSettings.provider}`);
    }
  }

  private async callGeminiAPI(prompt: string, options: any) {
    // Use existing Gemini endpoints
    const endpoint = options.endpoint || '/api/optimize/analyze-jd';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        jobDescription: prompt,
        ...options 
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    return response.json();
  }

  private async callGeminiVertexAPI(prompt: string, options: any) {
    // Determine the appropriate Gemini Vertex endpoint based on the options
    let endpoint = '/api/optimize/gemini-vertex/analyze-jd';
    
    if (options.endpoint) {
      // Map existing endpoints to Gemini Vertex equivalents
      switch (options.endpoint) {
        case '/api/optimize/analyze-jd': endpoint = '/api/optimize/gemini-vertex/analyze-jd'; break;
        case '/api/optimize/optimize-cv': endpoint = '/api/optimize/gemini-vertex/optimize-cv'; break;
        case '/api/optimize/generate-cover-letter': endpoint = '/api/optimize/gemini-vertex/generate-cover-letter'; break;
        case '/api/optimize/search-jobs': endpoint = '/api/optimize/gemini-vertex/search-jobs'; break;
        case '/api/optimize/extract-job-from-url': endpoint = '/api/optimize/gemini-vertex/extract-job-from-url'; break;
        default: endpoint = options.endpoint.replace('/api/optimize/', '/api/optimize/gemini-vertex/');
      }
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        jobDescription: prompt,
        ...options 
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini Vertex API error: ${response.status}`);
    }

    return response.json();
  }

  private async callOpenRouterAPI(prompt: string, options: any) {
    console.log('🔧 AIService - callOpenRouterAPI called with prompt:', prompt.substring(0, 100) + '...');
    console.log('🔧 AIService - callOpenRouterAPI options:', options);
    
    // Determine the appropriate OpenRouter endpoint based on the options
    let endpoint = '/api/optimize/openrouter/analyze-jd';
    
    if (options.endpoint) {
      // Map existing endpoints to OpenRouter equivalents
      switch (options.endpoint) {
        case '/api/optimize/analyze-jd':
          endpoint = '/api/optimize/openrouter/analyze-jd';
          break;
        case '/api/optimize/optimize-cv':
          endpoint = '/api/optimize/openrouter/optimize-cv';
          break;
        case '/api/optimize/generate-cover-letter':
          endpoint = '/api/optimize/openrouter/generate-cover-letter';
          break;
        case '/api/optimize/search-jobs':
          endpoint = '/api/optimize/openrouter/search-jobs';
          break;
        case '/api/optimize/extract-job-from-url':
          endpoint = '/api/optimize/openrouter/extract-job-from-url';
          break;
        default:
          endpoint = options.endpoint.replace('/api/optimize/', '/api/optimize/openrouter/');
      }
    }
    
    console.log('🔧 AIService - callOpenRouterAPI using endpoint:', endpoint);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        jobDescription: prompt,
        ...options 
      })
    });

    if (!response.ok) {
      console.error('🔧 AIService - callOpenRouterAPI error:', response.status, response.statusText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('🔧 AIService - callOpenRouterAPI success:', result);
    return result;
  }

  private async callLocalAPI(prompt: string, options: any) {
    // Only implement job extraction for now
    let endpoint = '/api/optimize/local/extract-job-from-url';
    if (options.endpoint && options.endpoint === '/api/optimize/extract-job-from-url') {
      endpoint = '/api/optimize/local/extract-job-from-url';
    } else {
      return {
        success: false,
        message: 'Local LLM API only supports job extraction from URL at this time.',
        provider: 'Local LLM'
      };
    }
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: prompt, ...options })
    });
    if (!response.ok) {
      throw new Error(`Local LLM API error: ${response.status}`);
    }
    return response.json();
  }

  // Update model settings
  updateModelSettings(newSettings: TabModelSettings) {
    this.modelSettings = newSettings;
  }

  // Get current model settings
  getModelSettings(): TabModelSettings {
    return this.modelSettings;
  }
}

// Create a global AI service instance
let globalAIService: AIService | null = null;

export const getAIService = (): AIService => {
  if (!globalAIService) {
    // Load default settings if no service exists
    const defaultSettings = {
      jobDescription: { provider: 'gemini' },
      generateCV: { provider: 'gemini' },
      jobHunt: { provider: 'gemini' },
      jobTracker: { provider: 'gemini' }
    };
    globalAIService = new AIService(defaultSettings);
  }
  return globalAIService;
};

export const updateAIService = (modelSettings: TabModelSettings) => {
  console.log('🔧 AIService - Updating with new settings:', modelSettings);
  globalAIService = new AIService(modelSettings);
}; 