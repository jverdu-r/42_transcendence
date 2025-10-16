// Global Chat WebSocket Connection Manager
// Mantiene la conexión activa incluso fuera de la página de chat

let ws: WebSocket | null = null;
let currentUserId: number | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

// Callbacks para diferentes eventos
const eventHandlers: Map<string, Set<Function>> = new Map();

export function initGlobalChatConnection(userId: number): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        console.log('⚠️ Chat WebSocket ya está conectado');
        return;
    }

    currentUserId = userId;
    connectWebSocket();
}

function connectWebSocket(): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/chat/ws`;

    console.log('🔌 [Global Chat] Conectando a WebSocket:', wsUrl);

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('✅ [Global Chat] WebSocket conectado');
        reconnectAttempts = 0;
        
        // Enviar autenticación
        if (currentUserId) {
            ws?.send(JSON.stringify({
                type: 'join',
                data: { userId: currentUserId }
            }));
        }

        // Notificar a los listeners
        triggerEvent('connected', {});
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            console.log('📨 [Global Chat] Mensaje recibido:', message.type);
            
            // Disparar eventos a los listeners
            triggerEvent(message.type, message.data);
        } catch (error) {
            console.error('❌ [Global Chat] Error procesando mensaje:', error);
        }
    };

    ws.onerror = (error) => {
        console.error('❌ [Global Chat] WebSocket error:', error);
        triggerEvent('error', error);
    };

    ws.onclose = () => {
        console.log('🔌 [Global Chat] WebSocket desconectado');
        triggerEvent('disconnected', {});
        
        // Intentar reconectar
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            console.log(`🔄 [Global Chat] Reintentando conexión (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
            setTimeout(connectWebSocket, RECONNECT_DELAY);
        } else {
            console.error('❌ [Global Chat] Máximo de reintentos alcanzado');
        }
    };
}

export function sendChatMessage(type: string, data: any): void {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.error('❌ [Global Chat] WebSocket no está conectado');
        return;
    }

    ws.send(JSON.stringify({ type, data }));
    console.log('📤 [Global Chat] Mensaje enviado:', type);
}

export function addEventListener(eventType: string, handler: Function): void {
    if (!eventHandlers.has(eventType)) {
        eventHandlers.set(eventType, new Set());
    }
    eventHandlers.get(eventType)?.add(handler);
}

export function removeEventListener(eventType: string, handler: Function): void {
    eventHandlers.get(eventType)?.delete(handler);
}

function triggerEvent(eventType: string, data: any): void {
    const handlers = eventHandlers.get(eventType);
    if (handlers) {
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`❌ [Global Chat] Error en handler de ${eventType}:`, error);
            }
        });
    }
}

export function disconnectChat(): void {
    if (ws) {
        console.log('🔌 [Global Chat] Desconectando...');
        ws.close();
        ws = null;
    }
    currentUserId = null;
    reconnectAttempts = 0;
    eventHandlers.clear();
}

export function isConnected(): boolean {
    return ws !== null && ws.readyState === WebSocket.OPEN;
}

export function getWebSocket(): WebSocket | null {
    return ws;
}
