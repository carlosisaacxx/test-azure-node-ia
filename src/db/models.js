const { Message, Conversation, MemorySummary } = require('./db/models');
const { estimateTokens } = require('./utils');
const config = require('./config');
const { v4: uuidv4 } = require('uuid');

class MemoryManager {
    constructor({ shortMemorySize = config.behavior.shortMemorySize } = {}) {
        this.shortMemorySize = shortMemorySize;
        this.shortTerm = new Map();
    }

    _ensureConv(convId) {
        if (!this.shortTerm.has(convId)) this.shortTerm.set(convId, []);
    }

    /**
     * Crea una nueva conversación en la DB e inicializa el buffer en RAM.
     * @param {string} [title=null]
     * @returns {Promise<Conversation>}
     */
    async createConversation(title = null) {
        const conv = await Conversation.create({ title });
        this._ensureConv(conv.id);
        return conv;
    }

    /**
     * Añade un mensaje al buffer de corto plazo (RAM) y lo persiste en la DB (Memoria Larga).
     * @param {string} conversationId
     * @param {('user'|'assistant'|'system')} role
     * @param {string} content
     * @returns {Promise<Message>}
     */
    async addMessage(conversationId, role, content) {
        if (!conversationId) throw new Error('conversationId required');
        const tokens = estimateTokens(content);
        const message = await Message.create({ conversationId, role, content, tokens });
        this._ensureConv(conversationId);
        const arr = this.shortTerm.get(conversationId);
        arr.push({ id: message.id, role, content });
        while (arr.length > this.shortMemorySize) arr.shift();
        
        return message;
    }

    /**
     * Obtiene el contexto de memoria corta (buffer de RAM) listo para la API de Azure.
     * @param {string} conversationId
     * @returns {{ role: string, content: string }[]}
     */
    getShortTermContext(conversationId) {
        this._ensureConv(conversationId);

        return this.shortTerm.get(conversationId).map(m => ({ role: m.role, content: m.content }));
    }

    /**
     * Recupera todo el historial (Memoria Larga) de una conversación.
     * @param {string} conversationId
     * @param {number} [limit=1000]
     * @returns {Promise<Message[]>}
     */
    async getLongTermHistory(conversationId, limit = 1000) {
        return await Message.findAll({
            where: { conversationId },
            order: [['createdAt', 'ASC']],
            limit
        });
    }

    /**
     * Limpia el buffer de corto plazo (RAM) de una conversación.
     * @param {string} conversationId
     */
    clearShortTerm(conversationId) {
        if (!conversationId) return;
        this.shortTerm.set(conversationId, []);
    }

    async listConversations() {
        return await Conversation.findAll({ order: [['updatedAt', 'DESC']] });
    }

    async getConversationById(id) {
        return await Conversation.findByPk(id);
    }

    async saveSummary(conversationId, summary, lastMessageId = null) {
        return await MemorySummary.create({ conversationId, summary, lastMessageId });
    }

    async getSummaries(conversationId) {
        return await MemorySummary.findAll({ where: { conversationId }, order: [['createdAt', 'ASC']] });
    }

    /**
     * Realiza una búsqueda simple de texto completo en los mensajes persistidos.
     * @param {string} query
     * @param {number} [limit=10]
     * @returns {Promise<Message[]>}
     */
    async searchSimple(query, limit = 10) {
        if (!query) return [];
        const { sequelize } = require('./db/models');
        
        const messages = await sequelize.query(
            `SELECT id, conversationId, role, content, createdAt
             FROM Messages
             WHERE content LIKE :q
             ORDER BY createdAt DESC
             LIMIT :limit`,
            {
                replacements: { limit, q: `%${query}%` },
                type: sequelize.QueryTypes.SELECT,
                model: Message,
                mapToModel: true
            }
        );
        return messages;
    }
}

module.exports = MemoryManager;