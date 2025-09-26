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

    async createConversation(title = null) {
        const conv = await Conversation.create({ title });
        this._ensureConv(conv.id);
        return conv;
    }

    async addMessage(conversationId, role, content) {
        if (!conversationId) throw new Error('conversationId required');
        // tokens estimate
        const tokens = estimateTokens(content);
        const message = await Message.create({ conversationId, role, content, tokens });
        // update short term
        this._ensureConv(conversationId);
        const arr = this.shortTerm.get(conversationId);
        arr.push({ id: message.id, role, content });
        // trim buffer
        while (arr.length > this.shortMemorySize) arr.shift();
        return message;
    }

    getShortTermContext(conversationId) {
        this._ensureConv(conversationId);
        return this.shortTerm.get(conversationId).map(m => ({ role: m.role, content: m.content }));
    }

    async getLongTermHistory(conversationId, limit = 1000) {
        return await Message.findAll({
            where: { conversationId },
            order: [['createdAt', 'ASC']],
            limit
        });
    }

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

    async searchSimple(query, limit = 10) {
        if (!query) return [];
        const { sequelize } = require('./db/models');
        const messages = await sequelize.query(
            `SELECT TOP (:limit) id, conversationId, role, content, createdAt
       FROM Messages
       WHERE content LIKE :q
       ORDER BY createdAt DESC`,
            {
                replacements: { limit, q: `%${query}%` },
                type: sequelize.QueryTypes.SELECT
            }
        );
        return messages;
    }
}

module.exports = MemoryManager;