// src/pages/chat-enhanced.ts
import { getTranslation } from '../i18n';
import { getCurrentUser } from '../auth';
import { navigateTo } from '../router';

// Types
interface User {
    id: number;
    username: string;
    email?: string;
    avatarUrl?: string;
}

interface ChatMessage {
    id: number;
    userId?: number;
    senderId?: number;
    receiverId?: number;
    username: string;
    content: string;
    messageType: string;
    timestamp: string;
    read?: boolean;
}

interface GameInvitation {
    id: number;
    inviterId: number;
    inviterUsername: string;
    timestamp: string;
}

// Global state
let ws: WebSocket | null = null;
let currentUser: User | null = null;
let onlineUsers: User[] = [];
let globalMessages: ChatMessage[] = [];
let directMessages: Map<number, ChatMessage[]> = new Map();
let blockedUsers: Set<number> = new Set();
let pendingInvitations: GameInvitation[] = [];
let currentView: 'global' | 'direct' = 'global';
let currentChatUserId: number | null = null;

export function renderEnhancedChatPage(): void {
    currentUser = getCurrentUser();
    if (!currentUser) {
        navigateTo('/login');
        return;
    }

    const chatHtml = `
        <main class="flex-grow w-full p-4 sm:p-8 flex flex-col items-center animate__animated animate__fadeIn">
            <div class="rounded-3xl p-6 max-w-6xl w-full h-[80vh] bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl border border-[#003566] shadow-2xl flex">
                
                <!-- Sidebar -->
                <div class="w-80 border-r border-gray-600 pr-4 flex flex-col">
                    <!-- Tabs -->
                    <div class="flex gap-2 mb-4">
                        <button id="tab-global" class="flex-1 px-4 py-2 bg-[#ffc300] text-black font-bold rounded-lg">
                            💬 Global
                        </button>
                        <button id="tab-users" class="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                            👥 Users
                        </button>
                    </div>

                    <!-- Online Users List -->
                    <div id="sidebar-content" class="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-600">
                        <div class="text-center text-gray-400 py-4">Cargando...</div>
                    </div>

                    <!-- User Actions -->
                    <div class="mt-4 space-y-2">
                        <button id="show-blocked-btn" class="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm">
                            🚫 Bloqueados
                        </button>
                        <button id="show-invitations-btn" class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm relative">
                            🎮 Invitaciones
                            <span id="invitations-badge" class="hidden absolute top-0 right-0 -mt-1 -mr-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full"></span>
                        </button>
                    </div>
                </div>

                <!-- Main Chat Area -->
                <div class="flex-1 pl-6 flex flex-col">
                    <!-- Chat Header -->
                    <div class="flex items-center justify-between mb-4 pb-4 border-b border-gray-600">
                        <div class="flex items-center gap-3">
                            <span id="chat-icon" class="text-3xl">💬</span>
                            <div>
                                <h2 id="chat-title" class="text-2xl font-bold text-[#ffc300]">Chat Global</h2>
                                <p id="chat-subtitle" class="text-xs text-gray-400">Todos los usuarios</p>
                            </div>
                        </div>
                        <button id="back-to-global" class="hidden px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                            ← Volver
                        </button>
                    </div>

                    <!-- Messages Container -->
                    <div id="chat-messages" class="flex-1 overflow-y-auto mb-4 space-y-3 px-2 scrollbar-thin scrollbar-thumb-gray-600">
                        <div class="text-center text-gray-400 py-8">
                            <div class="animate-spin inline-block w-8 h-8 border-4 border-[#ffc300] border-t-transparent rounded-full mb-2"></div>
                            <p>Conectando...</p>
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
                            class="px-6 py-3 bg-[#ffc300] hover:bg-[#ffd60a] text-black font-bold rounded-lg transition-colors disabled:opacity-50"
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
            </div>

            <!-- Modal para perfil de usuario -->
            <div id="profile-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                    <div class="flex justify-between items-start mb-4">
                        <h3 class="text-2xl font-bold text-[#ffc300]">Perfil de Usuario</h3>
                        <button id="close-profile-modal" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                    </div>
                    <div id="profile-content" class="space-y-4"></div>
                </div>
            </div>

            <!-- Modal para bloqueados -->
            <div id="blocked-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                    <div class="flex justify-between items-start mb-4">
                        <h3 class="text-2xl font-bold text-[#ffc300]">Usuarios Bloqueados</h3>
                        <button id="close-blocked-modal" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                    </div>
                    <div id="blocked-content" class="space-y-2 max-h-96 overflow-y-auto"></div>
                </div>
            </div>

            <!-- Modal para invitaciones -->
            <div id="invitations-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                    <div class="flex justify-between items-start mb-4">
                        <h3 class="text-2xl font-bold text-[#ffc300]">Invitaciones a Juegos</h3>
                        <button id="close-invitations-modal" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                    </div>
                    <div id="invitations-content" class="space-y-2 max-h-96 overflow-y-auto"></div>
                </div>
            </div>
        </main>
    `;

    const appContainer = document.getElementById('app');
    if (appContainer) {
        appContainer.innerHTML = chatHtml;
        initializeChat();
    }
}

function initializeChat(): void {
    connectWebSocket();
    setupEventListeners();
}

function connectWebSocket(): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/chat/ws`;

    console.log('🔌 Conectando a WebSocket:', wsUrl);

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('✅ WebSocket conectado');
        updateConnectionStatus('Conectado', 'green');
        
        // Enviar autenticación
        if (currentUser) {
            ws?.send(JSON.stringify({
                type: 'join',
                data: { userId: currentUser.id }
            }));
        }
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            handleWebSocketMessage(message);
        } catch (error) {
            console.error('❌ Error parseando mensaje:', error);
        }
    };

    ws.onerror = (error) => {
        console.error('❌ Error en WebSocket:', error);
        updateConnectionStatus('Error', 'red');
    };

    ws.onclose = () => {
        console.log('🔌 WebSocket desconectado');
        updateConnectionStatus('Desconectado', 'red');
        // Intentar reconectar
        setTimeout(() => connectWebSocket(), 3000);
    };
}

function handleWebSocketMessage(message: any): void {
    console.log('📨 Mensaje recibido:', message.type);

    switch (message.type) {
        case 'joined':
            onlineUsers = message.data.onlineUsers || [];
            updateOnlineUsersList();
            enableChatInput();
            break;

        case 'global_history':
            globalMessages = message.data || [];
            if (currentView === 'global') {
                renderMessages(globalMessages);
            }
            break;

        case 'new_global_message':
            globalMessages.push(message.data);
            if (currentView === 'global') {
                appendMessage(message.data);
            }
            break;

        case 'conversation_history':
            const userId = message.data.userId;
            directMessages.set(userId, message.data.messages || []);
            if (currentView === 'direct' && currentChatUserId === userId) {
                renderMessages(message.data.messages);
            }
            break;

        case 'new_direct_message':
        case 'direct_message_sent':
            const dm = message.data;
            const otherUserId = dm.senderId === currentUser?.id ? dm.receiverId : dm.senderId;
            
            if (!directMessages.has(otherUserId)) {
                directMessages.set(otherUserId, []);
            }
            directMessages.get(otherUserId)?.push(dm);

            if (currentView === 'direct' && currentChatUserId === otherUserId) {
                appendMessage(dm, true);
            }
            break;

        case 'user_joined':
            const joinedUser = message.data;
            if (!onlineUsers.find(u => u.id === joinedUser.userId)) {
                onlineUsers.push({
                    id: joinedUser.userId,
                    username: joinedUser.username
                });
                updateOnlineUsersList();
            }
            break;

        case 'user_left':
            const leftUser = message.data;
            onlineUsers = onlineUsers.filter(u => u.id !== leftUser.userId);
            updateOnlineUsersList();
            break;

        case 'user_blocked':
            if (message.data.success) {
                blockedUsers.add(message.data.userId);
                showNotification('Usuario bloqueado correctamente', 'success');
            }
            break;

        case 'user_unblocked':
            if (message.data.success) {
                blockedUsers.delete(message.data.userId);
                showNotification('Usuario desbloqueado correctamente', 'success');
            }
            break;

        case 'game_invitation':
            pendingInvitations.push(message.data);
            updateInvitationsBadge();
            showNotification(`${message.data.inviterUsername} te invitó a jugar!`, 'info');
            break;

        case 'invitation_sent':
            showNotification('Invitación enviada', 'success');
            break;

        case 'user_profile':
            showProfileModal(message.data);
            break;

        case 'pending_invitations':
            pendingInvitations = message.data || [];
            updateInvitationsBadge();
            break;

        case 'error':
            showNotification(message.data.message, 'error');
            break;
    }
}

function setupEventListeners(): void {
    // Tabs
    document.getElementById('tab-global')?.addEventListener('click', () => switchToGlobal());
    document.getElementById('tab-users')?.addEventListener('click', () => showUsersList());

    // Send message
    const sendBtn = document.getElementById('send-button');
    const input = document.getElementById('chat-input') as HTMLInputElement;

    sendBtn?.addEventListener('click', () => sendMessage());
    input?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Back to global
    document.getElementById('back-to-global')?.addEventListener('click', () => switchToGlobal());

    // Modals
    document.getElementById('show-blocked-btn')?.addEventListener('click', () => showBlockedUsersModal());
    document.getElementById('show-invitations-btn')?.addEventListener('click', () => showInvitationsModal());
    
    document.getElementById('close-profile-modal')?.addEventListener('click', () => hideModal('profile-modal'));
    document.getElementById('close-blocked-modal')?.addEventListener('click', () => hideModal('blocked-modal'));
    document.getElementById('close-invitations-modal')?.addEventListener('click', () => hideModal('invitations-modal'));
}

function switchToGlobal(): void {
    currentView = 'global';
    currentChatUserId = null;

    document.getElementById('chat-icon')!.textContent = '💬';
    document.getElementById('chat-title')!.textContent = 'Chat Global';
    document.getElementById('chat-subtitle')!.textContent = 'Todos los usuarios';
    document.getElementById('back-to-global')?.classList.add('hidden');

    // Update tabs
    document.getElementById('tab-global')?.classList.add('bg-[#ffc300]', 'text-black');
    document.getElementById('tab-global')?.classList.remove('bg-gray-700', 'text-white');
    document.getElementById('tab-users')?.classList.remove('bg-[#ffc300]', 'text-black');
    document.getElementById('tab-users')?.classList.add('bg-gray-700', 'text-white');

    renderMessages(globalMessages);
}

function showUsersList(): void {
    document.getElementById('tab-global')?.classList.remove('bg-[#ffc300]', 'text-black');
    document.getElementById('tab-global')?.classList.add('bg-gray-700', 'text-white');
    document.getElementById('tab-users')?.classList.add('bg-[#ffc300]', 'text-black');
    document.getElementById('tab-users')?.classList.remove('bg-gray-700', 'text-white');

    updateOnlineUsersList();
}

function updateOnlineUsersList(): void {
    const container = document.getElementById('sidebar-content');
    if (!container) return;

    if (onlineUsers.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-400 py-4">No hay usuarios online</div>';
        return;
    }

    container.innerHTML = onlineUsers
        .filter(u => u.id !== currentUser?.id) // No mostrar al usuario actual
        .map(user => `
            <div class="bg-gray-700 bg-opacity-50 rounded-lg p-3 hover:bg-gray-600 cursor-pointer transition-colors"
                 onclick="window.openUserChat(${user.id}, '${user.username.replace(/'/g, "\\'")}')">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="w-3 h-3 bg-green-500 rounded-full"></span>
                        <span class="font-medium text-white">${escapeHtml(user.username)}</span>
                    </div>
                    <div class="flex gap-1">
                        <button onclick="event.stopPropagation(); window.viewProfile(${user.id})"
                                class="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                                title="Ver perfil">
                            👤
                        </button>
                        <button onclick="event.stopPropagation(); window.inviteToGame(${user.id})"
                                class="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
                                title="Invitar a jugar">
                            🎮
                        </button>
                        <button onclick="event.stopPropagation(); window.blockUser(${user.id})"
                                class="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                                title="Bloquear">
                            🚫
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
}

function sendMessage(): void {
    const input = document.getElementById('chat-input') as HTMLInputElement;
    const content = input.value.trim();

    if (!content || !ws || ws.readyState !== WebSocket.OPEN) return;

    const messageType = currentView === 'global' ? 'global_message' : 'direct_message';
    const messageData: any = { content };

    if (currentView === 'direct' && currentChatUserId) {
        messageData.receiverId = currentChatUserId;
    }

    ws.send(JSON.stringify({
        type: messageType,
        data: messageData
    }));

    input.value = '';
}

function renderMessages(messages: ChatMessage[]): void {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    container.innerHTML = '';
    messages.forEach(msg => appendMessage(msg, currentView === 'direct'));
    scrollToBottom();
}

function appendMessage(message: ChatMessage, isDirect: boolean = false): void {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const isOwnMessage = (isDirect && message.senderId === currentUser?.id) || 
                        (!isDirect && message.userId === currentUser?.id);
    
    const messageEl = document.createElement('div');
    messageEl.className = `flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`;
    
    const time = new Date(message.timestamp).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    });

    messageEl.innerHTML = `
        <div class="max-w-[70%] ${isOwnMessage ? 'bg-[#ffc300] text-black' : 'bg-gray-700 text-white'} 
                    rounded-lg px-4 py-2 shadow-lg">
            ${!isOwnMessage ? `<div class="font-bold text-sm mb-1">${escapeHtml(message.username)}</div>` : ''}
            <div class="break-words">${escapeHtml(message.content)}</div>
            <div class="text-xs mt-1 ${isOwnMessage ? 'text-gray-700' : 'text-gray-400'}">${time}</div>
        </div>
    `;

    container.appendChild(messageEl);
    scrollToBottom();
}

function scrollToBottom(): void {
    const container = document.getElementById('chat-messages');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

function enableChatInput(): void {
    const input = document.getElementById('chat-input') as HTMLInputElement;
    const button = document.getElementById('send-button') as HTMLButtonElement;
    
    if (input) input.disabled = false;
    if (button) button.disabled = false;
}

function updateConnectionStatus(status: string, color: string): void {
    const statusEl = document.getElementById('connection-status');
    if (statusEl) {
        const colorClass = color === 'green' ? 'bg-green-500' : color === 'red' ? 'bg-red-500' : 'bg-yellow-500';
        statusEl.innerHTML = `
            <span class="inline-block w-2 h-2 rounded-full ${colorClass} mr-2"></span>
            ${status}
        `;
    }
}

function updateInvitationsBadge(): void {
    const badge = document.getElementById('invitations-badge');
    if (badge) {
        if (pendingInvitations.length > 0) {
            badge.textContent = pendingInvitations.length.toString();
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

function showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    const colors = {
        success: 'bg-green-600',
        error: 'bg-red-600',
        info: 'bg-blue-600'
    };

    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate__animated animate__fadeInRight`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('animate__fadeOutRight');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

function showModal(modalId: string): void {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function hideModal(modalId: string): void {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
}

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// FUNCIONES GLOBALES (llamadas desde HTML)
// ============================================

(window as any).openUserChat = (userId: number, username: string) => {
    currentView = 'direct';
    currentChatUserId = userId;

    document.getElementById('chat-icon')!.textContent = '💬';
    document.getElementById('chat-title')!.textContent = username;
    document.getElementById('chat-subtitle')!.textContent = 'Mensaje directo';
    document.getElementById('back-to-global')?.classList.remove('hidden');

    // Solicitar historial
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'get_conversation',
            data: { userId }
        }));
    }
};

(window as any).viewProfile = (userId: number) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'get_user_profile',
            data: { userId }
        }));
    }
};

(window as any).inviteToGame = (userId: number) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'invite_to_game',
            data: { userId }
        }));
    }
};

(window as any).blockUser = (userId: number) => {
    if (confirm('¿Estás seguro de que quieres bloquear a este usuario?')) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'block_user',
                data: { userId }
            }));
        }
    }
};

(window as any).unblockUser = (userId: number) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'unblock_user',
            data: { userId }
        }));
    }
};

function showProfileModal(profile: any): void {
    const content = document.getElementById('profile-content');
    if (!content || !profile) return;

    content.innerHTML = `
        <div class="flex flex-col items-center">
            <div class="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center text-4xl mb-4">
                ${profile.avatar_url ? `<img src="${profile.avatar_url}" class="w-full h-full rounded-full object-cover" />` : '👤'}
            </div>
            <h4 class="text-2xl font-bold text-white mb-2">${escapeHtml(profile.username)}</h4>
            <p class="text-gray-400 text-sm mb-4">${escapeHtml(profile.email || '')}</p>
            <div class="w-full space-y-2 text-sm">
                <div class="flex justify-between"><span class="text-gray-400">ID:</span><span class="text-white">${profile.id}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">Idioma:</span><span class="text-white">${profile.language || 'N/A'}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">Dificultad:</span><span class="text-white">${profile.difficulty || 'N/A'}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">Miembro desde:</span><span class="text-white">${new Date(profile.created_at).toLocaleDateString()}</span></div>
            </div>
            <div class="flex gap-2 mt-6 w-full">
                <button onclick="window.openUserChat(${profile.id}, '${profile.username.replace(/'/g, "\\'")}'); window.hideModal('profile-modal')"
                        class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
                    💬 Mensaje
                </button>
                <button onclick="window.inviteToGame(${profile.id}); window.hideModal('profile-modal')"
                        class="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg">
                    🎮 Invitar
                </button>
            </div>
        </div>
    `;

    showModal('profile-modal');
}

function showBlockedUsersModal(): void {
    // TODO: Cargar lista de usuarios bloqueados del servidor
    const content = document.getElementById('blocked-content');
    if (!content) return;

    if (blockedUsers.size === 0) {
        content.innerHTML = '<div class="text-center text-gray-400 py-4">No tienes usuarios bloqueados</div>';
    } else {
        content.innerHTML = Array.from(blockedUsers).map(userId => `
            <div class="bg-gray-700 rounded-lg p-3 flex items-center justify-between">
                <span class="text-white">Usuario ${userId}</span>
                <button onclick="window.unblockUser(${userId})"
                        class="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm">
                    Desbloquear
                </button>
            </div>
        `).join('');
    }

    showModal('blocked-modal');
}

function showInvitationsModal(): void {
    const content = document.getElementById('invitations-content');
    if (!content) return;

    if (pendingInvitations.length === 0) {
        content.innerHTML = '<div class="text-center text-gray-400 py-4">No tienes invitaciones pendientes</div>';
    } else {
        content.innerHTML = pendingInvitations.map(inv => `
            <div class="bg-gray-700 rounded-lg p-4">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-white font-bold">${escapeHtml(inv.inviterUsername)}</span>
                    <span class="text-gray-400 text-xs">${new Date(inv.timestamp).toLocaleTimeString()}</span>
                </div>
                <p class="text-gray-300 text-sm mb-3">Te invitó a jugar Pong</p>
                <div class="flex gap-2">
                    <button onclick="window.respondInvitation(${inv.id}, true)"
                            class="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded">
                        ✓ Aceptar
                    </button>
                    <button onclick="window.respondInvitation(${inv.id}, false)"
                            class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded">
                        ✗ Rechazar
                    </button>
                </div>
            </div>
        `).join('');
    }

    showModal('invitations-modal');
}

(window as any).respondInvitation = (invitationId: number, accepted: boolean) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'respond_invitation',
            data: { invitationId, accepted }
        }));

        // Remover de la lista
        pendingInvitations = pendingInvitations.filter(inv => inv.id !== invitationId);
        updateInvitationsBadge();
        
        if (accepted) {
            showNotification('Invitación aceptada! Redirigiendo al juego...', 'success');
            // TODO: Redirigir al juego cuando se cree
        } else {
            showNotification('Invitación rechazada', 'info');
        }
        
        hideModal('invitations-modal');
    }
};

(window as any).hideModal = hideModal;
