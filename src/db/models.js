const { Sequelize, DataTypes } = require("sequelize");
const config = require("../config");
require('msnodesqlv8');

//#region  Initialize Sequelize connection to SQL Server
const sequelize = new Sequelize(
    config.db.database,
    null,
    null,
    {
        host: config.db.host,
        dialect: 'mssql',
        dialectModulePath: 'msnodesqlv8',

        dialectOptions: {
            instanceName: config.db.instanceName,
            trustedConnection: true,
            trustServerCertificate: true,
        },
        logging: false,
    }
);
//#endregion

//#region Define models and relationships
const Conversation = sequelize.define("Conversation", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    }
});

const Message = sequelize.define("Message", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    conversationId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    role: {
        type: DataTypes.ENUM('user', 'assistant', 'system'),
        allowNull: false,
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    tokens: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
});

const MemorySummary = sequelize.define("MemorySummary", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    conversationId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    summary: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    lastMessageId: {
        type: DataTypes.UUID,
        allowNull: false,
    }
});

Conversation.hasMany(Message, { foreignKey: 'conversationId', onDelete: 'CASCADE' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });

Conversation.hasOne(MemorySummary, { foreignKey: 'conversationId', onDelete: 'CASCADE' });
//#endregion

//#region Sync models with database
async function initDb() {
    try {
        await sequelize.authenticate();
        await sequelize.sync();
        console.log('Database connection and schema synchronization successful.');
        return {
            sequelize, Conversation, Message, MemorySummary
        };
    } catch (error) {
        console.error('Unable to connect to the database:', error.message || error);
        throw error;
    }
}
//#endregion

module.exports = { sequelize, initDb, Conversation, Message, MemorySummary };