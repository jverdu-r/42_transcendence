// src/pages/chat.ts
import { getTranslation } from '../i18n';
import { getCurrentUser } from '../auth';
import { navigateTo } from '../router';

// Types
interface User {
    id: number;
    username: string;
    email: string;
}

interface ChatMessage {
    id: number;
    userId: number;
    username: string;
    content: string;
    timestamp: string;
}

// Global state
let ws: WebSocket | null = null;
let reconnectTimeout: any = null;
let currentUser: User | null = null;
let isConnecting = false;

export function renderChatPage(): void {
    const chatHtml = `
        <main class="flex-grow w-full p-4 sm:p-8 flex flex-col items-center animate__animated animate__fadeIn">
            <div class="rounded-3xl p-6 max-w-4xl w-full h-[70vh] bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl flex flex-col">
                
                <!-- Header -->
                <div class="flex items-center justify-between mb-4 pb-4 border-b border-gray-600">
                    <div class="flex items-center gap-3">
                        <span class="text-3xl">💬</span>
                        <div>
                            <h2 class="text-2xl font-bold text-[#ffc300]">Chat Global</h2>
                            <p class="text-xs text-gray-400">Todos los usuarios conectados</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 text-gray-300">
                        <span class="text-lg">👥</span>
                        <span id="online-count" class="font-medium">0</span>
                        <span class="text-sm">online</span>
                    </div>
                </div>
                
                <!-- Messages Container -->
                <div id="chat-messages" class="flex-1 overflow-y-auto mb-4 space-y-3 px-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                    <div class="text-center text-gray-400 py-8">
                        <div class="animate-spin inline-block w-8 h-8 border-4 border-[#ffc300] border-t-transparent rounded-full mb-2"></div>
                        <p>Conectando al chat...</p>
                    </div>
                </div>
                
                <!-- Input Area -->
                <div class="flex gap-2">
                    <input
                        type="text"
                        id="chat-input"
                        placeholder="Escribe un mensaje..."
                        class="flex-1 px-4 py-3 bg-gray-800 bg-opacity-50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#ffc300] transition-colors disabled:opacity-50"
                        maxlength="500"
                        disabled
                    />
                    <button
                        id="send-button"
                        class="px-6 py-3 bg-[#ffc300] hover:bg-[#ffd60a] text-black font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled
                    >
                        Enviar
                    </button>
                </div>
                
                <!-- Connection Status -->
                <div id="connection-status" class="mt-2 text-sm text-gray-400 text-center">
                    <span class="inline-block w-2 h-2 rounded-full bg-yellow-500 animate-pulse mr-2"></span>
                    Conectando...
                </div>
            </div>
            
            <style>
                /* Custom scrollbar */
                .scrollbar-thin::-webkit-scrollbar {
                    width: 6px;
                }
                .scrollbar-thin::-webkit-scrollbar-track {
                    background: transparent;
                }
                .scrollbar-thin::-webkit-scrollbar-thumb {
                    background: #4b5563;
                    border-radius: 3px;
                }
                .scrollbar-thin::-webkit-scrollbar-thumb:hover {
                    background: #6b7280;
                }
                
                /* Smooth animations */
                .animate__animated.animate__fadeIn {
                    animation-duration: 0.6s;
                }
                
                /* Message animations */
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                @keyframes slideInLeft {
                    from {
                        opacity: 0;
                        transform: translateX(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                .message-enter {
                    animation: slideInLeft 0.3s ease-out;
                }
                
                .message-enter-own {
                    animation: slideInRight 0.3s ease-out;
                }
            </style>
        </main>
    `;

    const pageContent = document.getElementById('page-content') as HTMLElement;
    if (pageContent) {
        pageContent.innerHTML = chatHtml;
        initializeChat();
    } else {
        console.error('Error: page-content element not found');
    }
}

function initializeChat(): void {
    currentUser = getCurrentUser();
    
    if (!currentUser) {
        showError('Debes iniciar sesión para usar el chat');
        setTimeout(() => navigateTo('/login'), 2000);
        return;
    }
    
    console.log('🎮 Inicializando chat para usuario:', currentUser.username);
    
    connectWebSocket();
    setupEventListeners();
}

function connectWebSocket(): void {
    if (isConnecting) {
        console.log('⏳ Ya hay una conexión en progreso...');
        return;
    }
    
    isConnecting = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/chat/ws`;
    
    console.log('🔌 Conectando a WebSocket:', wsUrl);
    updateConnectionStatus('connecting');
    
    try {
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            console.log('✅ WebSocket conectado');
            isConnecting = false;
            updateConnectionStatus('connected');
            enableInput();
            
            // Unirse al chat global
            sendMessage({
                type: 'join_global',
                data: {
                    userId: currentUser!.id,
                    username: currentUser!.username
                }
            });
        };
        
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('📨 Mensaje recibido:', message.type, message.data);
                handleServerMessage(message);
            } catch (error) {
                console.error('❌ Error parseando mensaje:', error);
            }
        };
        
        ws.onerror = (error) => {
            console.error('❌ Error WebSocket:', error);
            isConnecting = false;
            updateConnectionStatus('error');
            disableInput();
        };
        
        ws.onclose = (event) => {
            console.log('🔌 WebSocket desconectado. Code:', event.code, 'Reason:', event.reason);
            isConnecting = false;
            updateConnectionStatus('disconnected');
            disableInput();
            
            // Intentar reconectar en 3 segundos si no fue cierre intencional
            if (event.code !== 1000) {
                console.log('🔄 Intentando reconectar en 3 segundos...');
                reconnectTimeout = setTimeout(() => {
                    if (document.getElementById('chat-messages')) { // Solo si seguimos en la página
                        connectWebSocket();
                    }
                }, 3000);
            }
        };
    } catch (error) {
        console.error('❌ Error creando WebSocket:', error);
        isConnecting = false;
        updateConnectionStatus('error');
        disableInput();
    }
}

function sendMessage(data: any): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        const message = JSON.stringify(data);
        ws.send(message);
        console.log('📤 Mensaje enviado:', data.type);
    } else {
        console.error('❌ WebSocket no está conectado. ReadyState:', ws?.readyState);
        showError('No estás conectado al chat. Reconectando...');
    }
}

function handleServerMessage(message: any): void {
    switch (message.type) {
        case 'join_global':
            if (message.data.success) {
                console.log('✅ Unido al chat:', message.data.username);
                showSystemMessage(`Te has unido al chat como ${message.data.username}`, 'join');
            }
            break;
            
        case 'recent_messages':
            console.log('📋 Cargando historial:', message.data.length, 'mensajes');
            renderMessages(message.data);
            break;
            
        case 'new_message':
            console.log('💬 Nuevo mensaje de:', message.data.username);
            appendMessage(message.data);
            break;
            
        case 'user_joined':
            console.log('👋 Usuario entró:', message.data.username);
            showSystemMessage(`${message.data.username} se unió al chat`, 'join');
            break;
            
        case 'user_left':
            console.log('🚪 Usuario salió:', message.data.username);
            showSystemMessage(`${message.data.username} salió del chat`, 'leave');
            break;
            
        case 'error':
            console.error('⚠️ Error del servidor:', message.data.message);
            showError(message.data.message);
            break;
            
        default:
            console.log('❓ Mensaje desconocido:', message.type);
    }
}

function renderMessages(messages: ChatMessage[]): void {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    if (messages.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-400 py-8">
                <div class="text-5xl mb-3">💬</div>
                <p class="font-medium">No hay mensajes aún</p>
                <p class="text-sm mt-1">¡Sé el primero en escribir!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = messages.map(msg => createMessageHTML(msg)).join('');
    scrollToBottom();
}

function appendMessage(message: ChatMessage): void {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    // Eliminar mensaje "no hay mensajes" si existe
    const emptyMessage = container.querySelector('.text-center');
    if (emptyMessage && emptyMessage.textContent?.includes('No hay mensajes')) {
        emptyMessage.remove();
    }
    
    container.insertAdjacentHTML('beforeend', createMessageHTML(message));
    scrollToBottom();
}

function createMessageHTML(msg: ChatMessage): string {
    const isOwnMessage = currentUser && msg.userId === currentUser.id;
    const time = formatTimestamp(msg.timestamp);
    const animationClass = isOwnMessage ? 'message-enter-own' : 'message-enter';
    
    return `
        <div class="flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${animationClass}">
            <div class="max-w-[75%] ${isOwnMessage ? 'bg-[#ffc300] text-black' : 'bg-gray-700 text-white'} rounded-2xl px-4 py-3 shadow-lg">
                ${!isOwnMessage ? `
                    <div class="flex items-center gap-2 mb-1">
                        <span class="font-bold text-sm">${escapeHtml(msg.username)}</span>
                        <span class="text-xs opacity-70">${time}</span>
                    </div>
                ` : `
                    <div class="flex items-center justify-end gap-2 mb-1">
                        <span class="text-xs opacity-70">${time}</span>
                        <span class="font-bold text-sm">Tú</span>
                    </div>
                `}
                <p class="text-sm break-words whitespace-pre-wrap">${escapeHtml(msg.content)}</p>
            </div>
        </div>
    `;
}

function showSystemMessage(text: string, type: 'join' | 'leave'): void {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    const icon = type === 'join' ? '👋' : '🚪';
    const color = type === 'join' ? 'text-green-400' : 'text-gray-400';
    
    container.insertAdjacentHTML('beforeend', `
        <div class="text-center ${color} text-sm py-2 animate-pulse">
            <span class="inline-flex items-center gap-2 bg-gray-800 bg-opacity-50 px-3 py-1 rounded-full">
                ${icon} <span>${escapeHtml(text)}</span>
            </span>
        </div>
    `);
    
    scrollToBottom();
}

function formatTimestamp(timestamp: string): string {
    try {
        const date = new Date(timestamp);
        const now = new Date();
        
        const isToday = date.toDateString() === now.toDateString();
        
        if (isToday) {
            return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        } else {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (date.toDateString() === yesterday.toDateString()) {
                return `Ayer ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
            }
            
            return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        }
    } catch (error) {
        console.error('Error formateando timestamp:', error);
        return '';
    }
}

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom(): void {
    const container = document.getElementById('chat-messages');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

function setupEventListeners(): void {
    const input = document.getElementById('chat-input') as HTMLInputElement;
    const button = document.getElementById('send-button') as HTMLButtonElement;
    
    if (!input || !button) {
        console.error('❌ No se encontraron elementos del chat');
        return;
    }
    
    // Click en botón enviar
    button.addEventListener('click', () => {
        sendChatMessage();
    });
    
    // Enter para enviar (sin shift)
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
    
    // Limpiar al salir de la página
    const cleanup = () => {
        console.log('🧹 Limpiando chat...');
        if (ws) {
            ws.close(1000, 'User left page');
            ws = null;
        }
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
        }
    };
    
    // Cleanup en beforeunload
    window.addEventListener('beforeunload', cleanup);
    
    // Cleanup cuando se navega a otra página (SPA)
    const originalPushState = history.pushState;
    history.pushState = function(...args) {
        cleanup();
        return originalPushState.apply(this, args);
    };
}

function sendChatMessage(): void {
    const input = document.getElementById('chat-input') as HTMLInputElement;
    if (!input) return;
    
    const content = input.value.trim();
    
    if (!content) {
        showError('El mensaje no puede estar vacío');
        return;
    }
    
    if (content.length > 500) {
        showError('El mensaje es demasiado largo (máximo 500 caracteres)');
        return;
    }
    
    console.log('📤 Enviando mensaje:', content.substring(0, 50));
    
    sendMessage({
        type: 'send_message',
        data: { content }
    });
    
    input.value = '';
    input.focus();
}

function updateConnectionStatus(status: 'connecting' | 'connected' | 'disconnected' | 'error'): void {
    const statusEl = document.getElementById('connection-status');
    if (!statusEl) return;
    
    const statuses = {
        connecting: { 
            text: 'Conectando...', 
            color: 'yellow', 
            pulse: true,
            icon: '⏳'
        },
        connected: { 
            text: 'Conectado', 
            color: 'green', 
            pulse: false,
            icon: '✅'
        },
        disconnected: { 
            text: 'Desconectado. Reconectando...', 
            color: 'red', 
            pulse: true,
            icon: '🔌'
        },
        error: { 
            text: 'Error de conexión', 
            color: 'red', 
            pulse: true,
            icon: '⚠️'
        }
    };
    
    const config = statuses[status];
    
    statusEl.innerHTML = `
        <span class="inline-block w-2 h-2 rounded-full bg-${config.color}-500 ${config.pulse ? 'animate-pulse' : ''} mr-2"></span>
        ${config.icon} ${config.text}
    `;
}

function enableInput(): void {
    const input = document.getElementById('chat-input') as HTMLInputElement;
    const button = document.getElementById('send-button') as HTMLButtonElement;
    
    if (input) {
        input.disabled = false;
        input.placeholder = 'Escribe un mensaje...';
    }
    if (button) {
        button.disabled = false;
    }
}

function disableInput(): void {
    const input = document.getElementById('chat-input') as HTMLInputElement;
    const button = document.getElementById('send-button') as HTMLButtonElement;
    
    if (input) {
        input.disabled = true;
        input.placeholder = 'Conectando...';
    }
    if (button) {
        button.disabled = true;
    }
}

function showError(message: string): void {
    console.error('⚠️ Error:', message);
    
    // Crear toast de error
    const toast = document.createElement('div');
    toast.className = 'fixed top-20 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse';
    toast.innerHTML = `
        <div class="flex items-center gap-2">
            <span class="text-xl">⚠️</span>
            <span>${escapeHtml(message)}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Eliminar después de 3 segundos
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}