import { renderNavbar } from '../components/navbar';

const API_BASE = 'http://localhost:9000';

export function renderTournamentsPage() {
    // Render navbar at the top
    renderNavbar('/tournaments');

    // Main content HTML
    const tournamentsHtml = `
        <section class="bg-[#001d3d] rounded-xl shadow-lg p-8 w-full max-w-xl mx-auto">
            <h2 class="text-3xl font-extrabold text-[#ffc300] mb-6 text-center">Tournaments</h2>
            <div class="flex gap-4 justify-center mb-8">
                <button id="create-tab" class="px-4 py-2 rounded bg-[#003566] text-[#ffc300] font-bold hover:bg-[#ffc300] hover:text-[#003566] transition">Create Tournament</button>
                <button id="join-tab" class="px-4 py-2 rounded bg-[#003566] text-[#ffc300] font-bold hover:bg-[#ffc300] hover:text-[#003566] transition">Join Tournament</button>
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
fetch(`${API_BASE}/api/tournaments`)
                    .then(res => res.json())
                    .then((tournaments) => {
                        content.innerHTML = `
                            <h3 class="text-xl font-bold text-[#ffc300] mb-4">Available Tournaments</h3>
                            <ul class="space-y-4">
                                ${tournaments.map((t: any) => `
                                    <li class="border border-[#ffc300] rounded-lg p-4 flex items-center justify-between bg-[#003566]">
                                        <span class="font-semibold text-[#ffc300]">${t.name}</span>
                                        <span class="text-[#ffd60a]">Status: ${t.status}</span>
                                        <button data-id="${t.id}" class="ml-4 px-3 py-1 rounded bg-[#ffc300] text-[#003566] font-bold hover:bg-[#003566] hover:text-[#ffc300] transition">Join</button>
                                    </li>
                                `).join('')}
                            </ul>
                        `;
                        content.querySelectorAll('button[data-id]').forEach(btn => {
                            btn.addEventListener('click', async () => {
                                const tournamentId = btn.getAttribute('data-id');
                                // Use real user id from authentication (window.getCurrentUser, localStorage, sessionStorage, log for debug)
                                let user_id;
                                try {
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
                                    if (!user || !user.id) {
                                        alert('You must be logged in to join a tournament.');
                                        return;
                                    }
                                    user_id = user.id;
const res = await fetch(`${API_BASE}/api/tournaments/${tournamentId}/join`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ user_id })
                                    });
                                    if (!res.ok) throw new Error(await res.text());
                                    showJoinList();
                                } catch (err) {
                                    alert('Error joining tournament: ' + err);
                                }
                            });
                        });
                    })
                    .catch(() => {
                        content.innerHTML = '<p class="text-red-400">Error loading tournaments.</p>';
                    });
            }
        }

        if (createTab && joinTab) {
            createTab.addEventListener('click', showCreateForm);
            joinTab.addEventListener('click', showJoinList);
            // Show create form by default
            showCreateForm();
        }
    } else {
        console.error('No se encontró el contenedor #page-content para renderizar torneos.');
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
}