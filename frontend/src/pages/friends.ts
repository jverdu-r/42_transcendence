// src/pages/friends.ts

import { getTranslation } from '../i18n';
import { getCurrentUser } from '../auth';

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
                            <button class="text-xs font-semibold py-1 px-3 rounded-xl transition-opacity duration-200 
                                    ${friend.isOnline 
                                    ? 'bg-[#ffc300] text-[#000814] hover:opacity-80' 
                                    : 'bg-gray-600 text-gray-300 cursor-not-allowed'}"
                            ${friend.isOnline ? '' : 'disabled'}
                            >
                            ${getTranslation('friends', 'challengeButton')}
                            </button>
                        </div>
                    `).join('') : `<p class="text-gray-400" text-center>${getTranslation('friends', 'noFriends')}</p>`}
                </div>

                <!-- Peticiones -->
                <div class="bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl rounded-3xl p-6 border border-[#003566] shadow-2xl min-h-[425px]">
                    <h2 class="text-2xl font-bold text-[#ffc300] mb-4 text-center">${getTranslation('friends', 'sendRequests')}</h2>
                    <input type="text" placeholder="🔍 Buscar usuarios..." class="w-full mb-4 p-2 rounded bg-[#000814] border border-[#003566] text-white placeholder-gray-400" />
                    ${availableUsers.length > 0 ? availableUsers.map(user => `
                        <div class="flex items-center justify-between p-3 bg-[#001d3d] rounded-xl border border-[#003566] mb-2">
                            <div class="font-bold text-gray-100">${user.username}</div>
                            <button class="text-xs bg-[#ffc300] text-[#000814] font-semibold py-1 px-3 rounded-xl hover:opacity-80">${getTranslation('friends', 'sendRequestButton')}</button>
                        </div>
                    `).join('') : `<p class="text-gray-400" text-center>${getTranslation('friends', 'noUsersAvailable')}</p>`}
                </div>

                <!-- Solicitudes -->
                <div class="bg-white bg-opacity-5 backdrop-filter backdrop-blur-xl rounded-3xl p-6 border border-[#003566] shadow-2xl min-h-[425px]">
                    <h2 class="text-2xl font-bold text-[#ffc300] mb-4 text-center">${getTranslation('friends', 'incomingRequests')}</h2>
                    ${pendingRequests.length > 0 ? pendingRequests.map(user => `
                        <div class="flex items-center justify-between p-3 bg-[#001d3d] rounded-xl border border-[#003566] mb-2">
                            <div class="font-bold text-gray-100">${user.username}</div>
                            <div class="flex gap-2">
                                <button class="text-xs bg-green-500 text-white font-semibold py-1 px-3 rounded-xl hover:opacity-80">✅</button>
                                <button class="text-xs bg-red-500 text-white font-semibold py-1 px-3 rounded-xl hover:opacity-80">❌</button>
                            </div>
                        </div>
                    `).join('') : `<p class="text-gray-400" text-center>${getTranslation('friends', 'noRequests')}</p>`}
                </div>

            </div>
        </main>
    `;
}