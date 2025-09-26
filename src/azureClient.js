const axios = require('axios');
const config = require('./config');
const { retryWithBackoff } = require('./utils');

class AzureOpenAIClient {
    constructor({ endpoint = config.azure.endpoint, apiKey = config.azure.apiKey, timeout = config.behavior.timeoutMs } = {}) {
        if (!endpoint || !apiKey) throw new Error('Azure endpoint or API key missing');
        this.endpoint = `${endpoint}openai/deployments/${model}/chat/completions?api-version=2025-01-01-preview`;
        this.apiKey = apiKey;
        this.timeout = timeout;
    }

    async chat(messages = [], { temperature = config.behavior.temperature, max_tokens = config.behavior.maxTokens } = {}) {
        const payload = {
            messages,
            temperature,
            max_tokens
        };

        const headers = {
            'Content-Type': 'application/json',
            'api-key': this.apiKey
        };

        const makeRequest = async () => {
            const resp = await axios.post(this.endpoint, payload, {
                headers,
                timeout: this.timeout,
                validateStatus: status => true
            });

            if (resp.status === 401 || resp.status === 403) {
                const e = new Error('Authentication failed: invalid API key or insufficient permissions');
                e.code = 'AUTH_ERROR';
                throw e;
            }
            if (resp.status === 429) {
                const e = new Error('Rate limited by Azure OpenAI (429)');
                e.code = 'RATE_LIMIT';
                throw e;
            }
            if (resp.status >= 500) {
                const e = new Error(`Server error from Azure: ${resp.status}`);
                e.code = 'SERVER_ERROR';
                throw e;
            }
            if (resp.status >= 400) {
                const e = new Error(`Request failed: ${resp.status} ${JSON.stringify(resp.data)}`);
                e.code = 'BAD_REQUEST';
                throw e;
            }

            const body = resp.data;
            const assistantText = body?.choices?.[0]?.message?.content ?? null;
            const tokensUsage = body?.usage ?? null;
            return { assistantText, raw: body, tokensUsage };
        };

        try {
            return await retryWithBackoff(makeRequest, 5, 500);
        } catch (err) {
            throw err;
        }
    }

    async embed(text) {
        throw new Error('Embedding not implemented in this template — implement if needed');
    }
}

module.exports = AzureOpenAIClient;