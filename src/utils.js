function estimateTokens(text) {
    if (!text) return 0;

    return Math.max(1, Math.ceil(text.length / 4));
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithBackoff(fn, attempts  = 4, baseDelay = 500) {
    let lastError;
    for (let i = 0; i <= attempts ; i++) {
        try {
            return await fn();
        }
        catch (err) {
            lastError = err;
            const delay = baseDelay * Math.pow(2, i);
            await sleep(delay);
        }
    }
    throw lastError;
};

module.exports = { estimateTokens, sleep, retryWithBackoff };