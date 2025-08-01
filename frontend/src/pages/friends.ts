// src/pages/friends.ts

import { getTranslation } from '../i18n';
import { getCurrentUser } from '../auth';

declare global {
    interface Window {
        handleChallenge: (userId: number, username: string) => void;
        handleAcceptRequest: (senderId: number, rowElement: HTMLElement) => void;
        handleRejectRequest: (senderId: number, rowElement: HTMLElement) => void;
    }
}

interface Friend {
    id: number;
    username: string;
    isOnline: boolean;
    elo: number;
}

interface User {
    id: number;
    username: string;
}

async function fetchWithToken<T>(url: string): Promise<T> {
    const token = localStorage.getItem('jwt');
    if (!token) throw new Error('No JWT token found');
    
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        console.error(`Error fetching ${url}:`, response.status);
        return [] as any;
    }

    return await response.json();
}

async function getFriends(): Promise<Friend[]> {
    return await fetchWithToken<Friend[]>('/api/auth/friends');
}

async function getPendingRequests(): Promise<User[]> {
    return await fetchWithToken<User[]>('/api/auth/friends/requests');
}

async function getAvailableUsers(): Promise<User[]> {
    return await fetchWithToken<User[]>('/api/auth/friends/available');
}

let cachedAvailableUsers: User[] = []; // Variable para almacenar usuarios disponibles

// Función auxiliar para renderizar la lista de usuarios disponibles
function renderAvailableUsersList(users: User[]): string {
    return users.length > 0 
        ? users.map(user => `
            <div class="flex items-center justify-between p-3 bg-[#001d3d] rounded-xl border border-[#003566] mb-2">
                <div class="font-bold text-gray-100">${user.username}</div>
                <button class="text-xs bg-[#ffc300] text-[#000814] font-semibold py-1 px-3 rounded-xl hover:opacity-80"
                        onclick="handleSendRequest(${user.id}, '${user.username}', this)">
                    ${getTranslation('friends', 'sendRequestButton')}
                </button>
            </div>
        `).join('') 
        : `<p class="text-gray-400 text-center">${getTranslation('friends', 'noUsersAvailable')}</p>`;
}

export async function renderFriendsPage(): Promise<void> {
    const currentUser = getCurrentUser();
    const pageContent = document.getElementById('page-content') as HTMLElement;
    if (!pageContent) {
        console.error('Elemento con id "page-content" no encontrado para renderizar la página de amigos.');
        return;
    }

    const [friends, pendingRequests, availableUsers] = await Promise.all([
        getFriends(),
        getPendingRequests(),
        getAvailableUsers()
    ]);

    // Guardar usuarios disponibles para usar en el filtro
    cachedAvailableUsers = [...availableUsers];

    pageContent.innerHTML = `
        <main class="flex-grow w-full p-4 sm:p-8 flex flex-col items-center text-gray-100">
            <div class="max-w-6xl w-full grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <!-- Título y subtítulo -->
                <div class="col-span-1 md:col-span-3 text-center mb-4">
                    <h1 class="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold mb-4 text-[#ffc300] drop-shadow-md leading-tight">
                        ${getTranslation('friends', 'friends')}
                    </h1>
                    <p class="text-base sm:text-lg md:text-xl text-gray-300">
                        ${getTranslation('friends', 'friendsManagement')}
                    </p>
                </div>

                <!-- Amigos -->
                <div class="bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl rounded-3xl p-6 border border-[#003566] shadow-2xl min-h-[425px]">
                    <h2 class="text-2xl font-bold text-[#ffc300] mb-4 text-center">${getTranslation('friends', 'yourFriends')}</h2>
                    ${friends.length > 0 ? friends.map(friend => `
                        <div class="flex items-center justify-between p-3 bg-[#001d3d] rounded-xl border border-[#003566] mb-2">
                            <div class="flex items-center gap-3">
                                <div class="w-3 h-3 rounded-full ${friend.isOnline ? 'bg-green-400' : 'bg-gray-400'}"></div>
                                <div>
                                    <div class="font-bold text-gray-100">${friend.username}</div>
                                    <div class="text-sm text-gray-300">ELO: ${friend.elo}</div>
                                </div>
                            </div>
                            <button class="text-xs font-semibold py-1 px-3 rounded-xl transition-all duration-200 
                                    ${friend.isOnline 
                                        ? 'bg-[#ffc300] text-[#000814] hover:opacity-80 cursor-pointer' 
                                        : 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-60'}"
                                ${friend.isOnline ? '' : 'disabled'}
                                onclick="${friend.isOnline ? `handleChallenge(${friend.id}, '${friend.username}')` : ''}"
                            >
                                ${getTranslation('friends', 'challengeButton')}
                            </button>
                        </div>
                    `).join('') : `<p class="text-gray-400 text-center">${getTranslation('friends', 'noFriends')}</p>`}
                </div>

                <!-- Peticiones -->
                <div class="bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl rounded-3xl p-6 border border-[#003566] shadow-2xl min-h-[425px]">
                    <h2 class="text-2xl font-bold text-[#ffc300] mb-4 text-center">${getTranslation('friends', 'sendRequests')}</h2>
                    <input type="text" id="search-available-users" placeholder="🔍 ${getTranslation('friends', 'searchPlaceholder')}" 
                           class="w-full mb-4 p-2 rounded bg-[#000814] border border-[#003566] text-white placeholder-gray-400" />
                    <div id="available-users-list-container">
                        ${renderAvailableUsersList(availableUsers)}
                    </div>
                </div>

                <!-- Solicitudes -->
                <div class="bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl rounded-3xl p-6 border border-[#003566] shadow-2xl min-h-[425px]">
                    <h2 class="text-2xl font-bold text-[#ffc300] mb-4 text-center">${getTranslation('friends', 'incomingRequests')}</h2>
                    ${pendingRequests.length > 0 ? pendingRequests.map(user => `
                        <div class="flex items-center justify-between p-3 bg-[#001d3d] rounded-xl border border-[#003566] mb-2">
                            <div class="font-bold text-gray-100">${user.username}</div>
                            <div class="flex gap-2">
                                <button class="text-xs bg-green-500 text-white font-semibold py-1 px-3 rounded-xl hover:opacity-80"
                                        onclick="handleAcceptRequest(${user.id}, this.parentElement.parentElement)">
                                    ✅
                                </button>
                                <button class="text-xs bg-red-500 text-white font-semibold py-1 px-3 rounded-xl hover:opacity-80"
                                        onclick="handleRejectRequest(${user.id}, this.parentElement.parentElement)">
                                    ❌
                                </button>
                            </div>          
                        </div>
                    `).join('') : `<p class="text-gray-400 text-center">${getTranslation('friends', 'noRequests')}</p>`}
                </div>

            </div>
        </main>
    `;

    // Configurar el buscador de usuarios disponibles
    const searchInput = document.getElementById('search-available-users') as HTMLInputElement;
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const filteredUsers = cachedAvailableUsers.filter(user => 
                user.username.toLowerCase().includes(searchTerm)
            );
            
            const container = document.getElementById('available-users-list-container');
            if (container) {
                container.innerHTML = renderAvailableUsersList(filteredUsers);
            }
        });
    }

    // Añadir funcionalidad al botón de desafío (opcional)
    window.handleChallenge = (userId: number, username: string) => {
        console.log(`Desafiando a ${username} (ID: ${userId})`);
        // Aquí puedes abrir un modal, redirigir, etc.
        alert(`${getTranslation('friends', 'challenging')} ${username}!`);
    };

    // Aceptar solicitud de amistad
    window.handleAcceptRequest = async (senderId: number, rowElement: HTMLElement) => {
        if (!confirm('¿Aceptar solicitud de amistad?')) return;

        try {
            const token = localStorage.getItem('jwt');
            const response = await fetch('/api/auth/friends/requests/accept', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ senderId })
            });

            if (response.ok) {
                // Eliminar la fila de la UI
                rowElement.remove();
                await renderFriendsPage();
                alert(getTranslation('friends', 'requestAccepted'));
            } else {
                const error = await response.json();
                alert(`Error: ${error.message || getTranslation('alerts', 'noAccept')}`);
            }
        } catch (err) {
            console.error('Error aceptando solicitud:', err);
            alert(getTranslation('alerts', 'network'));
        }
    };

    //Rechazar solicitud de amistad
    window.handleRejectRequest = async (senderId: number, rowElement: HTMLElement) => {
        if (!confirm('¿Rechazar solicitud de amistad?')) return;

        try {
            const token = localStorage.getItem('jwt');
            const response = await fetch('/api/auth/friends/requests/reject', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ senderId })
            });

            if (response.ok) {
                // Eliminar la fila de la UI
                rowElement.remove();
                await renderFriendsPage();
                alert(`${getTranslation('friends', 'requestRejected')}`);
            } else {
                const error = await response.json();
                alert(`Error: ${error.message || 'No se pudo rechazar'}`);
            }
        } catch (err) {
            console.error(getTranslation('alerts', 'failRequest'), err);
            alert(getTranslation('alerts', 'network'));
        }
    };

    // Enviar solicitud de amistad
    (window as any).handleSendRequest = async (targetId: number, username: string, buttonElement: HTMLElement) => {
        if (typeof targetId !== 'number' || isNaN(targetId) || targetId <= 0) {
            console.error('Invalid targetId:', targetId);
            alert(getTranslation('friends', 'sentError'));
            return;
        }

        if (!confirm(`${getTranslation('friends', 'confirmSendRequest')} ${username}?`)) {
            return;
        }

        const token = localStorage.getItem('jwt');
        if (!token) {
            alert(getTranslation('friends', 'sessionExpired'));
            window.location.href = '/login';
            return;
        }

        try {
            const response = await fetch('/api/auth/friends/request', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ targetId })
            });

            // ✅ Si el servidor no responde con JSON, manejarlo
            let data;
            try {
                data = await response.json();
            } catch (e) {
                const text = await response.text();
                console.error('Response is not JSON:', text);
                throw new Error('Invalid response from server');
            }

            if (response.ok && data.success) {
                if (buttonElement instanceof HTMLButtonElement || 
                    buttonElement instanceof HTMLInputElement) {
                        buttonElement.disabled = true;
                    }
                buttonElement.innerText = getTranslation('friends', 'requestSent');
                buttonElement.classList.remove('bg-[#ffc300]', 'hover:opacity-80');
                buttonElement.classList.add('bg-gray-500', 'cursor-not-allowed');
                buttonElement.removeAttribute('onclick');

                alert(getTranslation('friends', 'requestSentSuccessfully'));
            } else {
                throw new Error(data.error || 'Request failed');
            }
        } catch (err: any) {
            console.error('Error enviando solicitud de amistad:', err);
            alert(`${getTranslation('alerts', 'failRequest')} ${err.message || ''}`);
        }
    };
}