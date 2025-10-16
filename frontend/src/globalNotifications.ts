import { getCurrentUser } from './auth';
import { navigateTo } from './router';

let globalWs: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Initialize global WebSocket for notifications
export function initGlobalNotifications(): void {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        console.log('👤 No user logged in, skipping global notifications');
        return;
    }

    connectGlobalWebSocket();
}

function connectGlobalWebSocket(): void {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // Close existing connection if any
    if (globalWs) {
        globalWs.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/chat/ws?userId=${currentUser.id}&username=${encodeURIComponent(currentUser.username)}`;

    console.log('🌐 Connecting global notification WebSocket:', wsUrl);

    try {
        globalWs = new WebSocket(wsUrl);

        globalWs.onopen = () => {
            console.log('✅ Global notifications WebSocket connected');
            reconnectAttempts = 0;
        };

        globalWs.onmessage = (event) => {
            handleGlobalMessage(event);
        };

        globalWs.onerror = (error) => {
            console.error('❌ Global WebSocket error:', error);
        };

        globalWs.onclose = () => {
            console.log('🔌 Global WebSocket disconnected');
            
            // Try to reconnect
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++;
                const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
                console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
                setTimeout(() => connectGlobalWebSocket(), delay);
            }
        };
    } catch (error) {
        console.error('❌ Error creating global WebSocket:', error);
    }
}

function handleGlobalMessage(event: MessageEvent): void {
    try {
        const message = JSON.parse(event.data);
        console.log('📨 Global notification received:', message.type);

        switch (message.type) {
            case 'game_invitation':
                showGameInvitationNotification(message.data);
                break;

            case 'challenge_accepted':
                showChallengeAcceptedNotification(message.data);
                break;

            case 'challenge_start':
                showChallengeStartNotification(message.data);
                break;

            case 'challenge_declined':
                showChallengeDeclinedNotification(message.data);
                break;

            case 'new_message':
                // Only show if not in chat page
                if (!window.location.pathname.includes('/chat')) {
                    showNewMessageNotification(message.data);
                }
                break;

            case 'friend_request':
                showFriendRequestNotification(message.data);
                break;

            case 'friend_request_accepted':
                showFriendAcceptedNotification(message.data);
                break;

            // Don't handle other events globally (let chat page handle them)
            default:
                break;
        }
    } catch (error) {
        console.error('❌ Error handling global message:', error);
    }
}

function showGameInvitationNotification(data: any): void {
    const notification = createNotificationElement(
        '🎮 Game Invitation',
        `${data.inviterUsername} te ha desafiado a una partida!`,
        'info',
        () => {
            navigateTo('/chat');
        }
    );
    showNotificationElement(notification);

    // Browser notification if supported
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🎮 Desafío de Juego', {
            body: `${data.inviterUsername} te ha desafiado a una partida!`,
            icon: '/favicon.ico'
        });
    }
}

function showChallengeAcceptedNotification(data: any): void {
    const notification = createNotificationElement(
        '✅ Desafío Aceptado',
        `${data.opponentUsername} aceptó tu desafío! Redirigiendo al juego...`,
        'success',
        () => {
            navigateTo(`/unified-game-online?gameId=${data.gameId}&mode=challenge`);
        }
    );
    showNotificationElement(notification);

    // Auto-redirect after 1.5 seconds
    setTimeout(() => {
        navigateTo(`/unified-game-online?gameId=${data.gameId}&mode=challenge`);
    }, 1500);
}

function showChallengeStartNotification(data: any): void {
    const notification = createNotificationElement(
        '🎮 Comenzando Partida',
        `Tu desafío contra ${data.opponentUsername} está listo! Redirigiendo...`,
        'success',
        () => {
            navigateTo(`/unified-game-online?gameId=${data.gameId}&mode=challenge`);
        }
    );
    showNotificationElement(notification);

    // Auto-redirect immediately
    setTimeout(() => {
        navigateTo(`/unified-game-online?gameId=${data.gameId}&mode=challenge`);
    }, 800);
}

function showChallengeDeclinedNotification(data: any): void {
    const notification = createNotificationElement(
        '❌ Desafío Rechazado',
        `${data.declinedBy} rechazó tu desafío`,
        'error'
    );
    showNotificationElement(notification);
}

function showNewMessageNotification(data: any): void {
    const notification = createNotificationElement(
        '💬 Nuevo Mensaje',
        `${data.senderUsername}: ${data.message.substring(0, 50)}${data.message.length > 50 ? '...' : ''}`,
        'info',
        () => {
            navigateTo('/chat');
        }
    );
    showNotificationElement(notification);
}

function showFriendRequestNotification(data: any): void {
    const notification = createNotificationElement(
        '👥 Solicitud de Amistad',
        `${data.requesterUsername} quiere ser tu amigo`,
        'info',
        () => {
            navigateTo('/chat');
        }
    );
    showNotificationElement(notification);
}

function showFriendAcceptedNotification(data: any): void {
    const notification = createNotificationElement(
        '✅ Solicitud Aceptada',
        `${data.approverUsername} aceptó tu solicitud de amistad`,
        'success',
        () => {
            navigateTo('/chat');
        }
    );
    showNotificationElement(notification);
}

function createNotificationElement(
    title: string,
    message: string,
    type: 'success' | 'error' | 'info',
    onClick?: () => void
): HTMLDivElement {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-[9999] p-4 rounded-lg shadow-2xl transform transition-all duration-300 max-w-md cursor-pointer border-2`;

    let bgColor = '';
    let borderColor = '';
    let icon = '';

    switch (type) {
        case 'success':
            bgColor = 'bg-green-600';
            borderColor = 'border-green-400';
            icon = '✅';
            break;
        case 'error':
            bgColor = 'bg-red-600';
            borderColor = 'border-red-400';
            icon = '❌';
            break;
        case 'info':
            bgColor = 'bg-blue-600';
            borderColor = 'border-blue-400';
            icon = '📢';
            break;
    }

    notification.className += ` ${bgColor} ${borderColor} text-white`;

    notification.innerHTML = `
        <div class="flex items-start">
            <span class="text-2xl mr-3">${icon}</span>
            <div class="flex-1">
                <div class="font-bold text-lg mb-1">${title}</div>
                <div class="text-sm opacity-90">${message}</div>
            </div>
            <button class="ml-2 text-white hover:text-gray-200 text-xl leading-none" onclick="this.parentElement.parentElement.remove()">
                ×
            </button>
        </div>
    `;

    if (onClick) {
        notification.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).tagName !== 'BUTTON') {
                onClick();
                notification.remove();
            }
        });
    }

    return notification;
}

function showNotificationElement(notification: HTMLDivElement): void {
    // Remove old notifications
    document.querySelectorAll('.fixed.top-4.right-4').forEach(el => {
        if (el !== notification) {
            el.remove();
        }
    });

    document.body.appendChild(notification);

    // Auto-remove after 8 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => notification.remove(), 300);
    }, 8000);

    // Play sound if available
    playNotificationSound();
}

function playNotificationSound(): void {
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjGH0O6wbSIFHnDE6+OWQQ8SV6zg6KdaFQg+luTpuWglBjCC0O+tbCEFHGq+6OOYQxETVqvf6KdZFQlAl+XqvWgmBjSE0e6qayEFHWq+6OSYQxITVqvf6KlZFQlBl+XqvWcmBjWF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQlBmOXpvmcmBjaF0u+pbCEFHWq+5+SYQxITVavf6KpZFQ==');
        audio.volume = 0.3;
        audio.play().catch(() => {
            // Ignore errors if sound cannot be played
        });
    } catch (error) {
        // Ignore audio errors
    }
}

// Request browser notification permission
export function requestNotificationPermission(): void {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Cleanup function
export function disconnectGlobalNotifications(): void {
    if (globalWs) {
        globalWs.close();
        globalWs = null;
    }
}
