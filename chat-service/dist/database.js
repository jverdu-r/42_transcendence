// Ruta a la base de datos compartida
const DB_PATH = '/data/sqlite/app.db';
class ChatDatabase {
    constructor() {
        this.messages = [];
        this.messageIdCounter = 1;
    }
    async connect() {
        try {
            console.log('✅ Conectado a la base de datos (modo simulado)');
        }
        catch (error) {
            console.error('❌ Error conectando a la base de datos:', error);
            throw error;
        }
    }
    async saveMessage(senderId, message) {
        try {
            const newMessage = {
                id: this.messageIdCounter++,
                sender_id: senderId,
                receiver_id: null,
                message: message,
                sent_at: new Date().toISOString()
            };
            this.messages.push(newMessage);
            console.log(`📝 Mensaje guardado: ID ${newMessage.id}, sender: ${senderId}`);
            return newMessage.id;
        }
        catch (error) {
            console.error('❌ Error guardando mensaje:', error);
            throw error;
        }
    }
    async getRecentMessages(limit = 50) {
        try {
            const recentMessages = this.messages
                .slice(-limit)
                .map(msg => ({
                id: msg.id,
                userId: msg.sender_id,
                username: `Usuario${msg.sender_id}`,
                content: msg.message,
                timestamp: msg.sent_at
            }));
            return recentMessages;
        }
        catch (error) {
            console.error('❌ Error obteniendo mensajes:', error);
            return [];
        }
    }
    async getUserById(userId) {
        try {
            // Mock de usuario
            return {
                id: userId,
                username: `Usuario${userId}`,
                email: `usuario${userId}@test.com`
            };
        }
        catch (error) {
            console.error('❌ Error obteniendo usuario:', error);
            return null;
        }
    }
    async getAllUsers() {
        try {
            // Mock de usuarios
            return [
                { id: 1, username: 'Usuario1', email: 'user1@test.com' },
                { id: 2, username: 'Usuario2', email: 'user2@test.com' },
            ];
        }
        catch (error) {
            console.error('❌ Error obteniendo usuarios:', error);
            return [];
        }
    }
    async close() {
        console.log('✅ Conexión a base de datos cerrada (modo simulado)');
    }
}
export const chatDatabase = new ChatDatabase();
