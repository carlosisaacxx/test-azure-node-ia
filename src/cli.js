const readline = require('readline');
const AzureOpenAIClient = require('./azureClient');
const MemoryManager = require('./memoryManager');
const config = require('./config');
const { initDb } = require('./db/models');

async function startCLI() {
    const db = await initDb();
    const client = new AzureOpenAIClient({});
    const mem = new MemoryManager({ shortMemorySize: config.behavior.shortMemorySize });

    const conv = await mem.createConversation('default');
    let currentConversationId = conv.id;

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '> ' });

    console.log('CLI Conversacional (type "help" for commands).');
    rl.prompt();

    rl.on('line', async (line) => {
        const text = line.trim();
        if (!text) { rl.prompt(); return; }

        if (text === 'exit' || text === 'quit') {
            console.log('Saliendo...');
            await rl.close();
            process.exit(0);
        }
        if (text === 'help') {
            console.log('Comandos: exit|quit, clear, history, conversations, new <title>, switch <id>, help');
            rl.prompt();
            return;
        }
        if (text === 'clear') {
            mem.clearShortTerm(currentConversationId);
            console.log('Memoria corto plazo limpiada.');
            rl.prompt();
            return;
        }
        if (text === 'history') {
            const ctx = mem.getShortTermContext(currentConversationId);
            console.log('Historial corto plazo:');
            ctx.forEach((m, i) => console.log(`${i + 1}. [${m.role}] ${m.content}`));
            rl.prompt();
            return;
        }
        if (text === 'conversations') {
            const convs = await mem.listConversations();
            convs.forEach(c => console.log(`${c.id} - ${c.title || '(no title)'} - updatedAt: ${c.updatedAt}`));
            rl.prompt();
            return;
        }
        if (text.startsWith('new ')) {
            const title = text.slice(4).trim() || 'sin titulo';
            const newConv = await mem.createConversation(title);
            console.log('Nueva conversación creada:', newConv.id);
            currentConversationId = newConv.id;
            rl.prompt();
            return;
        }
        if (text.startsWith('switch ')) {
            const id = text.slice(7).trim();
            const convObj = await mem.getConversationById(id);
            if (!convObj) console.log('Conversación no encontrada');
            else { currentConversationId = convObj.id; console.log('Cambiado a conversación', id); }
            rl.prompt();
            return;
        }

        try {
            await mem.addMessage(currentConversationId, 'user', text);

            const systemPrompt = 'You are a helpful assistant.';
            const shortContext = mem.getShortTermContext(currentConversationId);
            const messages = [{ role: 'system', content: systemPrompt }, ...shortContext, { role: 'user', content: text }];

            process.stdout.write('Pensando... ');

            const resp = await client.chat(messages, { temperature: config.behavior.temperature, max_tokens: config.behavior.maxTokens });

            if (!resp || !resp.assistantText) {
                console.log('\n[Error] Empty response from model.');
                rl.prompt();
                return;
            }

            await mem.addMessage(currentConversationId, 'assistant', resp.assistantText);

            console.log('\n' + resp.assistantText);
            rl.prompt();
        } catch (err) {
            console.error('\n[Error] ', err.message || err);
            rl.prompt();
        }
    });

    rl.on('close', () => {
        console.log('CLI cerrado.');
        process.exit(0);
    });
}

module.exports = { startCLI };