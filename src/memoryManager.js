// src/memoryManager.js

// Importar el módulo completo para acceder a los modelos de forma segura.
// Esto ayuda a evitar el error de dependencia circular que rompía 'initDb'.
const models = require('./db/models'); 

const { estimateTokens } = require('./utils');
const config = require('./config');
const { v4: uuidv4 } = require('uuid');

class MemoryManager {
    constructor({ shortMemorySize = config.behavior.shortMemorySize } = {}) {
        this.shortMemorySize = shortMemorySize;
        // shortTerm almacena el contexto inmediato en RAM: Map<conversationId, [{ role, content }]>
        this.shortTerm = new Map();
    }

    _ensureConv(convId) {
        if (!this.shortTerm.has(convId)) this.shortTerm.set(convId, []);
    }

    async createConversation(title = null) {
        const conv = await models.Conversation.create({ title });
        this._ensureConv(conv.id);
        return conv;
    }

    async addMessage(conversationId, role, content) {
        if (!conversationId) throw new Error('conversationId required');
        
        // Estimar tokens
        const tokens = estimateTokens(content);
        
        // Persistir en DB (Memoria Larga)
        const message = await models.Message.create({ conversationId, role, content, tokens });
        
        // Actualizar buffer en RAM (Memoria Corta)
        this._ensureConv(conversationId);
        const arr = this.shortTerm.get(conversationId);
        
        // Añadir el nuevo mensaje
        arr.push({ id: message.id, role, content });
        
        // Recortar el buffer para mantener el tamaño máximo (FIFO)
        while (arr.length > this.shortMemorySize) arr.shift();
        
        return message;
    }

    getShortTermContext(conversationId) {
        this._ensureConv(conversationId);
        return this.shortTerm.get(conversationId).map(m => ({ role: m.role, content: m.content }));
    }

    async getLongTermHistory(conversationId, limit = 1000) {
        return await models.Message.findAll({
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
        return await models.Conversation.findAll({ order: [['updatedAt', 'DESC']] });
    }

    async getConversationById(id) {
        return await models.Conversation.findByPk(id);
    }

    async saveSummary(conversationId, summary, lastMessageId = null) {
        return await models.MemorySummary.create({ conversationId, summary, lastMessageId });
    }

    async getSummaries(conversationId) {
        return await models.MemorySummary.findAll({ where: { conversationId }, order: [['createdAt', 'ASC']] });
    }

    /**
     * Realiza una búsqueda simple de texto completo en los mensajes persistidos.
     * Corregida para usar LIMIT (compatible con SQLite).
     */
    async searchSimple(query, limit = 10) {
        if (!query) return [];
        
        const messages = await models.sequelize.query(
            // Sintaxis SQL estándar
            `SELECT id, conversationId, role, content, createdAt
             FROM Messages
             WHERE content LIKE :q
             ORDER BY createdAt DESC
             LIMIT :limit`,
            {
                replacements: { limit, q: `%${query}%` },
                type: models.sequelize.QueryTypes.SELECT,
                model: models.Message,
                mapToModel: true
            }
        );
        return messages;
    }
}

module.exports = MemoryManager;