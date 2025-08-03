import { renderNavbar } from '../components/navbar';
import { getCurrentUser } from '../auth';

const API_BASE = 'http://localhost:9000';

export function renderTournamentsPage() {
    // Render navbar at the top
    renderNavbar('/tournaments');

    // Main content HTML
    const tournamentsHtml = `
        <section class="bg-[#001d3d] rounded-xl shadow-lg p-8 w-full max-w-xl mx-auto">
            <h2 class="text-3xl font-extrabold text-[#ffc300] mb-6 text-center">Tournaments</h2>
            <div class="flex gap-4 justify-center mb-8">
                <button id="join-tab" class="px-4 py-2 rounded bg-[#003566] text-[#ffc300] font-bold hover:bg-[#ffc300] hover:text-[#003566] transition">Join Tournament</button>
                <button id="create-tab" class="px-4 py-2 rounded bg-[#003566] text-[#ffc300] font-bold hover:bg-[#ffc300] hover:text-[#003566] transition">Create Tournament</button>
            </div>
            <div id="tournament-content"></div>
        </section>
    `;

    const pageContent = document.getElementById('page-content');
    if (pageContent) {
        pageContent.innerHTML = tournamentsHtml;

        const content = document.getElementById('tournament-content');
        const createTab = document.getElementById('create-tab');
        const joinTab = document.getElementById('join-tab');

        function showCreateForm() {
            if (content) {
                content.innerHTML = `
                    <form id="create-tournament-form" class="flex flex-col gap-4">
                        <label class="font-semibold text-[#ffc300]">
                            Tournament Name:<br>
                            <input type="text" name="name" required class="mt-1 p-2 rounded w-full bg-[#003566] text-[#ffc300] border border-[#ffc300]" />
                        </label>
                        <button type="submit" class="px-4 py-2 rounded bg-[#ffc300] text-[#003566] font-bold hover:bg-[#003566] hover:text-[#ffc300] transition">Create</button>
                    </form>
                `;
                const form = document.getElementById('create-tournament-form') as HTMLFormElement | null;
                if (form) {
                    form.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const formData = new FormData(form);
                        const name = formData.get('name');
                        // Get authenticated user (window.getCurrentUser, localStorage, sessionStorage, log for debug)
                        let user = (window as any).getCurrentUser ? (window as any).getCurrentUser() : null;
                        if (!user || !user.id) {
                            try {
                                user = JSON.parse(localStorage.getItem('user') || 'null');
                            } catch {}
                        }
                        if (!user || !user.id) {
                            try {
                                user = JSON.parse(localStorage.getItem('currentUser') || 'null');
                            } catch {}
                        }
                        if (!user || !user.id) {
                            try {
                                user = JSON.parse(sessionStorage.getItem('user') || 'null');
                            } catch {}
                        }
                        if (!user || !user.id) {
                            try {
                                user = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
                            } catch {}
                        }
                        console.log('[Tournaments] Detected user:', user);
                        if (!name) return;
                        if (!user || !user.id) {
                            alert('You must be logged in to create a tournament.');
                            return;
                        }
                        try {
const res = await fetch(`${API_BASE}/api/tournaments`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ name, created_by: user.id })
                            });
                            if (!res.ok) throw new Error(await res.text());
                            // Refresh the join list after creation
                            showJoinList();
                        } catch (err) {
                            alert('Error creating tournament: ' + err);
                        }
                    });
                }
            }
        }


        function showJoinList() {
            if (content) {
                // Use reliable JWT/session-based user
                let currentUser: any = getCurrentUser();
                // Now get tournaments
                fetch(`${API_BASE}/api/tournaments`)
                    .then(res => res.json())
                    .then((tournaments) => {
                        // Fetch joined players for all tournaments (to check if current user already joined)
                        Promise.all(
                            tournaments.map((t: any) =>
                                fetch(`${API_BASE}/api/tournaments/${t.id}/players`).then(r => r.json()).catch(() => [])
                            )
                        ).then(allPlayersArr => {
                            content.innerHTML = `
                                <h3 class="text-xl font-bold text-[#ffc300] mb-4">Available Tournaments</h3>
                                <ul class="space-y-4">
                                ${tournaments.map((t: any, i:number) => {
const players = Array.isArray(allPlayersArr[i]) ? allPlayersArr[i] : [];
const joined = !!(currentUser && currentUser.id && players.find((p:any) => p.id==currentUser.id));
                                    if (currentUser && currentUser.id && t.created_by === currentUser.id) {
                                        return `
                                            <li class="border border-[#ffc300] rounded-lg p-4 flex items-center justify-between bg-[#003566]">
                                                <span class="font-semibold text-[#ffc300]">${t.name}</span>
                                                <span class="text-[#ffd60a]">Status: ${t.status}</span>
                                                <button data-manage-id="${t.id}" class="ml-4 px-3 py-1 rounded bg-green-400 text-[#003566] font-bold hover:bg-green-600 hover:text-white transition">Manage</button>
                                            </li>
                                        `;
                                    } else {
                                        return `
                                            <li class="border border-[#ffc300] rounded-lg p-4 flex items-center justify-between bg-[#003566]">
                                                <span class="font-semibold text-[#ffc300]">${t.name}</span>
                                                <span class="text-[#ffd60a]">Status: ${t.status}</span>
                                                <button data-id="${t.id}" class="ml-4 px-3 py-1 rounded bg-[#ffc300] text-[#003566] font-bold hover:bg-[#003566] hover:text-[#ffc300] transition" ${joined ? 'disabled style="opacity:0.7;cursor:not-allowed"' : ''}>${joined ? 'Joined' : 'Join'}</button>
                                            </li>
                                        `;
                                    }
                                }).join('')}
                                </ul>
                            `;
                            attachJoinHandlers();
                            attachManageHandlers();
                        });

                        // Refactored event handlers:
                        function attachJoinHandlers() {
                            (content as HTMLElement).querySelectorAll('button[data-id]').forEach(btn => {
                                btn.addEventListener('click', async () => {
                                    const tournamentId = btn.getAttribute('data-id');
                                    let user = getCurrentUser();
                                    if (!user || !user.id) {
                                        alert('You must be logged in to join a tournament.');
                                        return;
                                    }
                                    try {
                                        const res = await fetch(`${API_BASE}/api/tournaments/${tournamentId}/join`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ user_id: user.id })
                                        });
                                        if (!res.ok) throw new Error(await res.text());
                                        showJoinList();
                                    } catch (err) {
                                        alert('Error joining tournament: ' + err);
                                    }
                                });
                            });
                        }

                        function attachManageHandlers() {
                            if (!content) return;
                            (content as HTMLElement).querySelectorAll('button[data-manage-id]').forEach(btn => {
                                btn.addEventListener('click', async () => {
                                    const tournamentId = btn.getAttribute('data-manage-id');
                                    // Toggle management panel
                                    let li = btn.closest('li');
                                    let existingPanel = li?.querySelector('.manage-panel');
                                    if (existingPanel) {
                                        existingPanel.remove();
                                        return;
                                    }
                                    // Fetch players
                                    let nPlayers = 0;
                                    let playersList: any[] = [];
                                    try {
                                        const res = await fetch(`${API_BASE}/api/tournaments/${tournamentId}/players`);
                                        if (res.ok) {
                                            playersList = await res.json();
                                            nPlayers = Array.isArray(playersList) ? playersList.length : 0;
                                        }
                                    } catch (e) {}
                                    // Render player names if available
                                    let playerListHtml = '';
                                    if (playersList && playersList.length > 0) {
                                        playerListHtml = `<ul class="mb-2 ml-4 list-disc">${playersList.map((p: any) => `<li>${p.username || p.name || p.id}</li>`).join('')}</ul>`;
                                    } else {
                                        playerListHtml = '<div class="mb-2 ml-4 text-gray-400">No players joined yet.</div>';
                                    }
                                    // Panel HTML
                                    const panel = document.createElement('div');
                                    panel.className = 'manage-panel mt-4 p-4 rounded border border-green-400 bg-[#001d3d] text-[#ffc300] flex flex-col gap-2 text-sm';
                                    panel.innerHTML = `
                                        <div><b>Players joined:</b> ${nPlayers}</div>
                                        ${playerListHtml}
                                        <div class="flex gap-4">
                                            <button class="start-btn px-3 py-1 rounded bg-blue-400 text-white font-bold hover:bg-blue-700 transition" data-tournament-id="${tournamentId}">Start Tournament</button>
                                            <button class="delete-btn px-3 py-1 rounded bg-red-400 text-white font-bold hover:bg-red-700 transition" data-tournament-id="${tournamentId}">Delete Tournament</button>
                                        </div>
                                    `;
                                    (li as HTMLElement | null)?.appendChild(panel);

                                    // Start Tournament handler
                                    panel.querySelector('.start-btn')?.addEventListener('click', async () => {
                                        try {
                                            const res = await fetch(`${API_BASE}/api/tournaments/${tournamentId}/start`, {
                                                method: 'POST',
                                            });
                                            if (!res.ok) throw new Error(await res.text());
                                            alert('Tournament started!');
                                            showJoinList();
                                        } catch (err) {
                                            alert('Error starting tournament: ' + err);
                                        }
                                    });
                                    // Delete Tournament handler
                                    panel.querySelector('.delete-btn')?.addEventListener('click', async () => {
                                        // Display modal for confirmation
                                        let modal = document.createElement('div');
                                        modal.innerHTML = `
                                            <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" id="delete-modal">
                                                <div class="bg-[#001d3d] p-8 rounded-xl border-2 border-red-500 flex flex-col gap-4 text-center w-full max-w-xs">
                                                    <div class="text-[#ffc300]">Are you sure you want to delete this tournament?<br><b>This action cannot be undone.</b></div>
                                                    <div class="flex gap-4 justify-center mt-4">
                                                        <button id="confirm-delete" class="px-4 py-2 rounded bg-red-600 text-white font-bold hover:bg-red-800">Delete</button>
                                                        <button id="cancel-delete" class="px-4 py-2 rounded bg-gray-300 text-gray-900 font-bold hover:bg-gray-400">Cancel</button>
                                                    </div>
                                                </div>
                                            </div>
                                        `;
                                        document.body.appendChild(modal);
                                        // Cancel button handler
                                        document.getElementById('cancel-delete')?.addEventListener('click', () => {
                                            modal.remove();
                                        });
                                        // Confirm delete handler
                                        document.getElementById('confirm-delete')?.addEventListener('click', async () => {
                                            try {
                                                const res = await fetch(`${API_BASE}/api/tournaments/${tournamentId}`, {
                                                    method: 'DELETE',
                                                });
                                                if (!res.ok) throw new Error(await res.text());
                                                modal.remove();
                                                alert('Tournament deleted');
                                                showJoinList();
                                            } catch (err) {
                                                alert('Error deleting tournament: ' + err);
                                            }
                                        });
                                    });
                                });
                            });
                        }
                    })
                    .catch(() => {
                        if (content)
                            content.innerHTML = '<p class="text-red-400">Error loading tournaments.</p>';
                    });
            }
        }

        if (createTab && joinTab) {
            createTab.addEventListener('click', showCreateForm);
            joinTab.addEventListener('click', showJoinList);
            // Show create form by default
            showJoinList();
        }

        // Render footer
        let footer = document.getElementById('main-footer');
        if (!footer) {
            footer = document.createElement('footer');
            footer.id = 'main-footer';
            footer.className = 'w-full bg-[#000814] text-[#ffc300] text-center py-4 border-t border-[#003566] fixed bottom-0 left-0 z-10';
            footer.innerHTML = '<span class="font-bold">© 2025 PONG Tournament Platform</span>';
            document.body.appendChild(footer);
        }
    } else {
        console.error('No se encontró el contenedor #page-content para renderizar torneos.');
    }
}
