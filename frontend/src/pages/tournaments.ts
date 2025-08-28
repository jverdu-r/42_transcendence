import { renderNavbar } from '../components/navbar';
import { getCurrentUser } from '../auth';
import { navigateTo } from '../router';

const API_BASE = 'http://localhost:9000';

export function renderTournamentsPage() {
    // Render navbar
    renderNavbar('/tournaments');

    const tournamentsHtml = `
        <section class="bg-[#001d3d] rounded-xl shadow-lg p-8 w-full max-w-xl mx-auto">
            <h2 class="text-3xl font-extrabold text-[#ffc300] mb-6 text-center">Tournaments</h2>
            <div class="flex gap-4 justify-center mb-8">
                <button id="join-tab" class="px-4 py-2 rounded bg-[#003566] text-[#ffc300] font-bold hover:bg-[#ffc300] hover:text-[#003566] transition">Join Tournament</button>
                <button id="create-tab" class="px-4 py-2 rounded bg-[#003566] text-[#ffc300] font-bold hover:bg-[#ffc300] hover:text-[#003566] transition">Create Tournament</button>
            </div>
            <div id="tournament-content"></div>
            <div class="text-center mt-6">
                <a href="/tournaments/history" class="text-[#ffd60a] hover:underline text-sm font-medium">View completed tournaments</a>
            </div>
        </section>
    `;

    const pageContent = document.getElementById('page-content');
    if (!pageContent) {
        console.error('No se encontró el contenedor #page-content para renderizar torneos.');
        return;
    }

    pageContent.innerHTML = tournamentsHtml;

    const content = document.getElementById('tournament-content');
    const createTab = document.getElementById('create-tab');
    const joinTab = document.getElementById('join-tab');

    function showCreateForm() {
        if (!content) return;
        content.innerHTML = `
            <form id="create-tournament-form" class="flex flex-col gap-4">
                <label class="font-semibold text-[#ffc300]">
                    Tournament Name:<br>
                    <input type="text" name="name" required class="mt-1 p-2 rounded w-full bg-[#003566] text-[#ffc300] border border-[#ffc300]" />
                </label>
                <label class="font-semibold text-[#ffc300]">
                    Max Players:<br>
                    <select name="maxPlayers" required class="mt-1 p-2 rounded w-full bg-[#003566] text-[#ffc300] border border-[#ffc300]">
                        <option value="4">4 Players</option>
                        <option value="8">8 Players</option>
                        <option value="16">16 Players</option>
                    </select>
                </label>
                <label class="font-semibold text-[#ffc300] flex items-center gap-2 mt-2">
                    <input type="checkbox" name="allowEarlyStart" class="w-5 h-5 accent-[#ffc300]" />
                    Allow early start with AI bots
                </label>
                <div id="bot-options" class="hidden pl-4 border-l-2 border-[#003566] pt-2">
                    <label class="font-semibold text-[#ffc300] block mb-2">
                        Bot Difficulty:<br>
                        <select name="botDifficulty" class="mt-1 p-2 rounded w-full bg-[#003566] text-[#ffc300] border border-[#ffc300]">
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                        </select>
                    </label>
                </div>
                <button type="submit" class="px-4 py-2 rounded bg-[#ffc300] text-[#003566] font-bold hover:bg-[#003566] hover:text-[#ffc300] transition mt-4">
                    Create Tournament
                </button>
            </form>
        `;

        const form = document.getElementById('create-tournament-form') as HTMLFormElement | null;
        const allowEarlyStart = form?.querySelector('input[name="allowEarlyStart"]') as HTMLInputElement;
        const botOptions = document.getElementById('bot-options');

        if (allowEarlyStart && botOptions) {
            allowEarlyStart.addEventListener('change', () => {
                botOptions.style.display = allowEarlyStart.checked ? 'block' : 'none';
            });
        }

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const name = formData.get('name') as string;
            const maxPlayers = parseInt(formData.get('maxPlayers') as string, 10);
            const allowEarlyStart = formData.get('allowEarlyStart') !== null;
            const botDifficulty = allowEarlyStart ? (formData.get('botDifficulty') as string) : undefined;

            const user = getCurrentUser();
            if (!user || !user.id) {
                alert('You must be logged in to create a tournament.');
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/api/tournaments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        created_by: user.id,
                        max_players: maxPlayers,
                        allow_early_start: allowEarlyStart,
                        bot_difficulty: botDifficulty
                    })
                });

                if (!res.ok) throw new Error(await res.text());
                showJoinList();
            } catch (err) {
                alert('Error creating tournament: ' + err);
            }
        });
    }

    function showJoinList() {
        if (!content) return;

        const currentUser = getCurrentUser();

        fetch(`${API_BASE}/api/tournaments`)
            .then(res => res.json())
            .then((tournaments: any[]) => {
                // Filtrar solo torneos NO finalizados
                const activeTournaments = tournaments.filter(t => t.status !== 'finished');

                if (activeTournaments.length === 0) {
                    content.innerHTML = '<p class="text-gray-400 text-center">No active tournaments available.</p>';
                    return;
                }

                // Obtener jugadores de cada torneo
                Promise.all(
                    activeTournaments.map(t =>
                        fetch(`${API_BASE}/api/tournaments/${t.id}/players`)
                            .then(r => r.json())
                            .catch(() => [])
                    )
                ).then(allPlayersArr => {
                    content.innerHTML = `
                        <h3 class="text-xl font-bold text-[#ffc300] mb-4">Active Tournaments</h3>
                        <ul class="space-y-4">
                        ${activeTournaments.map((t, i) => {
                            const players = Array.isArray(allPlayersArr[i]) ? allPlayersArr[i] : [];
                            const nPlayers = players.length;
                            const joined = !!(currentUser && currentUser.id && players.find((p: any) => p.id === currentUser.id));
                            const allowsBots = t.allow_early_start;
                            const botDiff = t.bot_difficulty
                                ? t.bot_difficulty.charAt(0).toUpperCase() + t.bot_difficulty.slice(1)
                                : 'N/A';

                            const isStarted = t.status === 'started';
                            const statusColor = isStarted ? 'text-red-400' : 'text-yellow-400';

                            // Si es el creador
                            if (currentUser && currentUser.id === t.created_by) {
                                return `
                                    <li class="border border-[#ffc300] rounded-lg p-4 bg-[#003566] ${isStarted ? 'opacity-70' : ''}">
                                        <div class="flex items-center justify-between mb-2">
                                            <span class="font-semibold text-[#ffc300]">${t.name}</span>
                                            <span class="text-sm ${statusColor}">Status: ${t.status}</span>
                                        </div>
                                        <div class="text-xs text-gray-300 space-y-1 mb-3">
                                            <div>Players: ${nPlayers}/${t.max_players}</div>
                                            <div>Bots: ${allowsBots ? `<span class="text-green-300">Allowed (${botDiff})</span>` : 'Not allowed'}</div>
                                        </div>
                                        <button ${isStarted ? 'disabled class="opacity-50 cursor-not-allowed"' : 'data-manage-id="' + t.id + '"'} class="w-full px-3 py-1 rounded bg-green-400 text-[#003566] font-bold hover:bg-green-600 hover:text-white transition">
                                            ${isStarted ? 'In Progress' : 'Manage'}
                                        </button>
                                    </li>
                                `;
                            }

                            // Si es jugador normal
                            return `
                                <li class="border border-[#ffc300] rounded-lg p-4 bg-[#003566] ${isStarted ? 'opacity-70' : ''}">
                                    <div class="flex items-center justify-between mb-2">
                                        <span class="font-semibold text-[#ffc300]">${t.name}</span>
                                        <span class="text-sm ${statusColor}">Status: ${t.status}</span>
                                    </div>
                                    <div class="text-xs text-gray-300 space-y-1 mb-3">
                                        <div>Players: ${nPlayers}/${t.max_players}</div>
                                        <div>Bots: ${allowsBots ? `<span class="text-green-300">Allowed (${botDiff})</span>` : 'Not allowed'}</div>
                                    </div>
                                    <button ${isStarted ? 'disabled class="opacity-50 cursor-not-allowed w-full"' : `data-id="${t.id}" class="w-full px-3 py-1 rounded bg-[#ffc300] text-[#003566] font-bold hover:bg-[#003566] hover:text-[#ffc300] transition ${joined ? 'opacity-70 cursor-not-allowed' : ''}" ${joined ? 'disabled' : ''}`}>
                                        ${isStarted ? 'Started' : (joined ? 'Joined' : 'Join')}
                                    </button>
                                </li>
                            `;
                        }).join('')}
                        </ul>
                    `;

                    attachJoinHandlers();
                    attachManageHandlers();
                });
            })
            .catch(() => {
                content.innerHTML = '<p class="text-red-400">Error loading tournaments.</p>';
            });
    }

    function attachJoinHandlers() {
        document.querySelectorAll('#tournament-content button[data-id]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const tournamentId = btn.getAttribute('data-id');
                const user = getCurrentUser();
                if (!user || !user.id) return alert('You must be logged in.');

                try {
                    const res = await fetch(`${API_BASE}/api/tournaments/${tournamentId}/join`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: user.id })
                    });
                    if (!res.ok) throw new Error(await res.text());
                    showJoinList();
                } catch (err) {
                    alert('Error joining: ' + err);
                }
            });
        });
    }

    function attachManageHandlers() {
        document.querySelectorAll('#tournament-content button[data-manage-id]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const tournamentId = btn.getAttribute('data-manage-id');
                const li = btn.closest('li');
                const existingPanel = li?.querySelector('.manage-panel');
                if (existingPanel) {
                    existingPanel.remove();
                    return;
                }
                renderManagementPanel(tournamentId!, li!);
            });
        });
    }

    async function renderManagementPanel(tournamentId: string, li: Element) {
        let playersList: any[] = [];
        try {
            const res = await fetch(`${API_BASE}/api/tournaments/${tournamentId}/players`);
            if (res.ok) playersList = await res.json();
        } catch (e) {}

        const playerListHtml = playersList.length > 0
            ? `<ul class="mb-2 ml-4 list-disc text-sm">${playersList.map(p => `<li>${p.username || p.id}</li>`).join('')}</ul>`
            : '<div class="mb-2 ml-4 text-gray-400 text-sm">No players joined.</div>';

        const panel = document.createElement('div');
        panel.className = 'manage-panel mt-4 p-4 rounded border border-green-400 bg-[#001d3d] text-[#ffc300] flex flex-col gap-2 text-sm';
        panel.innerHTML = `
            <div><b>Players:</b> ${playersList.length}</div>
            ${playerListHtml}
            <div class="flex gap-4">
                <button class="start-btn px-3 py-1 rounded bg-blue-400 text-white font-bold hover:bg-blue-700 transition" data-id="${tournamentId}">Start</button>
                <button class="delete-btn px-3 py-1 rounded bg-red-400 text-white font-bold hover:bg-red-700 transition" data-id="${tournamentId}">Delete</button>
            </div>
        `;

        li.appendChild(panel);

        panel.querySelector('.start-btn')?.addEventListener('click', async () => {
            try {
                const res = await fetch(`${API_BASE}/api/tournaments/${tournamentId}/start`, { method: 'POST' });
                if (!res.ok) throw new Error(await res.text());
                alert('Tournament started!');
                showJoinList();
            } catch (err) {
                alert('Error: ' + err);
            }
        });

        panel.querySelector('.delete-btn')?.addEventListener('click', () => {
            const modal = document.createElement('div');
            modal.innerHTML = `
                <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div class="bg-[#001d3d] p-8 rounded-xl border-2 border-red-500 text-center">
                        <div class="text-[#ffc300]">Delete this tournament? <b>This cannot be undone.</b></div>
                        <div class="flex gap-4 justify-center mt-4">
                            <button id="confirm-delete" class="px-4 py-2 rounded bg-red-600 text-white">Delete</button>
                            <button id="cancel-delete" class="px-4 py-2 rounded bg-gray-300 text-gray-900">Cancel</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            document.getElementById('cancel-delete')?.addEventListener('click', () => modal.remove());
            document.getElementById('confirm-delete')?.addEventListener('click', async () => {
                try {
                    await fetch(`${API_BASE}/api/tournaments/${tournamentId}`, { method: 'DELETE' });
                    modal.remove();
                    showJoinList();
                } catch (err) {
                    alert('Error deleting.');
                }
            });
        });
    }

    // Tabs
    createTab?.addEventListener('click', showCreateForm);
    joinTab?.addEventListener('click', showJoinList);
    showJoinList(); // default

    // Footer
    let footer = document.getElementById('main-footer');
    if (!footer) {
        footer = document.createElement('footer');
        footer.id = 'main-footer';
        footer.className = 'w-full bg-[#000814] text-[#ffc300] text-center py-4 border-t border-[#003566] fixed bottom-0 left-0 z-10';
        footer.innerHTML = '<span class="font-bold">© 2025 PONG Tournament Platform</span>';
        document.body.appendChild(footer);
    }
}