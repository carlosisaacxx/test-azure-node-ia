const dotenv = require('dotenv');
dotenv.config();

const config = {
    azure: {
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        // CORRECCIÓN: Usamos AZURE_OPENAI_APIKEY
        apiKey: process.env.AZURE_OPENAI_APIKEY, 
        model: process.env.AZURE_OPENAI_MODEL || 'GTP-4o',
    },
    db:{
       dialect: 'sqlite', 
       storage: process.env.SQLITE_STORAGE || './data/memory.sqlite', 
    },
    behavior: {
        shortMemorySize: parseInt(process.env.SHORT_MEMORY_SIZE || '8', 10),
        temperature: parseFloat(process.env.MODEL_TEMPERATURE || '0.7'), // Usar parseFloat
        maxTokens: parseInt(process.env.MODEL_MAX_TOKENS || '1000', 10),
        timeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS  || '20000', 10),
    }
};

if(!config.azure.endpoint || !config.azure.apiKey) {
    console.warn('WARN: Missing Azure endpoint or API key — set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_APIKEY in .env');
}

module.exports = config;