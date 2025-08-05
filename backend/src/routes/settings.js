import express from 'express';
import fs from 'fs-extra';
import path from 'path';

const router = express.Router();

// Path for model settings file
const MODEL_SETTINGS_PATH = path.join(process.cwd(), 'data', 'model-settings.json');

// Ensure data directory exists
const ensureDataDir = async () => {
  const dataDir = path.dirname(MODEL_SETTINGS_PATH);
  await fs.ensureDir(dataDir);
};

// Get default model settings
const getDefaultModelSettings = () => ({
  jobDescription: { provider: 'gemini' },
  generateCV: { provider: 'gemini' },
  jobHunt: { provider: 'gemini' },
  jobTracker: { provider: 'gemini' }
});

// Get model settings
router.get('/model-settings', async (req, res) => {
  try {
    console.log('🔧 Backend - Loading model settings...');
    await ensureDataDir();
    
    console.log('🔧 Backend - Model settings path:', MODEL_SETTINGS_PATH);
    console.log('🔧 Backend - File exists:', await fs.pathExists(MODEL_SETTINGS_PATH));
    
    if (await fs.pathExists(MODEL_SETTINGS_PATH)) {
      const settings = await fs.readJson(MODEL_SETTINGS_PATH);
      console.log('🔧 Backend - Loaded settings from file:', JSON.stringify(settings, null, 2));
      
      // Remove old masterData field if it exists
      if (settings.masterData) {
        console.log('🔧 Backend - Removing old masterData field from loaded settings');
        delete settings.masterData;
        // Save the cleaned settings back to file
        await fs.writeJson(MODEL_SETTINGS_PATH, settings);
        console.log('🔧 Backend - Saved cleaned settings back to file');
      }
      
      res.json(settings);
    } else {
      // Return default settings if file doesn't exist
      const defaultSettings = getDefaultModelSettings();
      console.log('🔧 Backend - File not found, using defaults:', JSON.stringify(defaultSettings, null, 2));
      await fs.writeJson(MODEL_SETTINGS_PATH, defaultSettings);
      res.json(defaultSettings);
    }
  } catch (error) {
    console.error('🔧 Backend - Error loading model settings:', error);
    const defaultSettings = getDefaultModelSettings();
    res.json(defaultSettings);
  }
});

// Save model settings
router.post('/model-settings', async (req, res) => {
  try {
    console.log('🔧 Backend - Saving model settings...');
    console.log('🔧 Backend - Request body:', JSON.stringify(req.body, null, 2));
    
    await ensureDataDir();
    const settings = req.body;
    
    console.log('🔧 Backend - Data directory ensured');
    console.log('🔧 Backend - Model settings path:', MODEL_SETTINGS_PATH);
    
    // Validate settings structure and migrate old format
    const requiredTabs = ['jobDescription', 'generateCV', 'jobHunt', 'jobTracker'];
    const validProviders = ['gemini', 'gemini-vertex', 'openrouter', 'local'];
    
    // Remove old masterData field if it exists
    if (settings.masterData) {
      console.log('🔧 Backend - Removing old masterData field from settings');
      delete settings.masterData;
    }
    
    for (const tab of requiredTabs) {
      if (!settings[tab] || !settings[tab].provider) {
        console.error('🔧 Backend - Invalid settings for tab:', tab);
        return res.status(400).json({ 
          error: `Invalid settings for ${tab}. Each tab must have a provider.` 
        });
      }
      
      if (!validProviders.includes(settings[tab].provider)) {
        console.error('🔧 Backend - Invalid provider for tab:', tab, 'provider:', settings[tab].provider);
        return res.status(400).json({ 
          error: `Invalid provider for ${tab}. Must be one of: ${validProviders.join(', ')}` 
        });
      }
    }
    
    console.log('🔧 Backend - Settings validated, writing to file...');
    await fs.writeJson(MODEL_SETTINGS_PATH, settings);
    console.log('🔧 Backend - Settings saved successfully to:', MODEL_SETTINGS_PATH);
    
    // Verify the file was written
    const savedSettings = await fs.readJson(MODEL_SETTINGS_PATH);
    console.log('🔧 Backend - Verified saved settings:', JSON.stringify(savedSettings, null, 2));
    
    res.json({ success: true, message: 'Model settings saved successfully' });
  } catch (error) {
    console.error('🔧 Backend - Error saving model settings:', error);
    res.status(500).json({ error: 'Failed to save model settings', details: error.message });
  }
});

// Test provider configuration
router.post('/test-model', async (req, res) => {
  try {
    const { tabId, settings } = req.body;
    
    if (!tabId || !settings) {
      return res.status(400).json({ error: 'Tab ID and settings are required' });
    }
    
    const testPrompt = 'This is a test prompt to verify the provider configuration is working correctly. Please respond with "Test successful" if you can process this request.';
    
    let response;
    switch (settings.provider) {
      case 'gemini':
        // Use existing Gemini service
        const { analyzeJobDescription } = await import('../services/gemini.js');
        response = await analyzeJobDescription(testPrompt);
        break;
        
      case 'gemini-vertex':
        // Use Gemini Vertex service
        const { analyzeJobDescription: geminiVertexAnalyzeJobDescription } = await import('../services/gemini-vertex.js');
        response = await geminiVertexAnalyzeJobDescription(testPrompt);
        break;
        
      case 'openrouter':
        // Use OpenRouter service
        const { analyzeJobDescription: openRouterAnalyzeJobDescription } = await import('../services/openrouter.js');
        response = await openRouterAnalyzeJobDescription(testPrompt);
        break;
        
      case 'local':
        // For now, return success - Local LLM implementation will be added later
        response = { success: true, message: 'Local LLM test successful (not yet implemented)' };
        break;
        
      default:
        return res.status(400).json({ error: `Unknown provider: ${settings.provider}` });
    }
    
    res.json({ success: true, response });
  } catch (error) {
    console.error('Provider test error:', error);
    res.status(500).json({ error: 'Provider test failed', message: error.message });
  }
});

export default router; 