const dotenv = require('dotenv');
dotenv.config();

const config = {
    azure: {
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        apiKey: process.env.AZURE_OPENAI_APIKEY,
        model: process.env.AZURE_OPENAI_MODEL || 'GTP-4o',
    },
    db:{
       host: process.env.MSSQL_HOST || 'localhost',
       port: process.env.MSSQL_PORT ? parseInt(process.env.MSSQL_PORT, 10) : undefined,
       username: process.env.MSSQL_USER || null,
       password: process.env.MSSQL_PASSWORD || null,
       database: process.env.MSSQL_DATABASE || 'az_openai_memory',
       instanceName: process.env.MSSQL_INSTANCE_NAME
    },
    behavior: {
        shortMemorySize: parseInt(process.env.SHORT_MEMORY_SIZE || '8', 10),
        temperature: parseInt(process.env.MODEL_TEMPERATURE || '7'),
        maxTokens: parseInt(process.env.MODEL_MAX_TOKENS || '1000', 10),
        timeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS  || '20000', 10),
    }
};

if(!config.azure.endpoint || !config.azure.apiKey) {
    console.warn('WARN: Missing Azure endpoint or API key — set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_APIKEY in .env');
}

module.exports = config;