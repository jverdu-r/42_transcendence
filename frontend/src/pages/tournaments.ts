import { renderNavbar } from '../components/navbar';

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
                        <label class="font-semibold text-[#ffc300]">
                            Max Players:<br>
                            <input type="number" name="maxPlayers" min="2" max="64" required class="mt-1 p-2 rounded w-full bg-[#003566] text-[#ffc300] border border-[#ffc300]" />
                        </label>
                        <label class="font-semibold text-[#ffc300]">
                            Description:<br>
                            <textarea name="description" rows="3" class="mt-1 p-2 rounded w-full bg-[#003566] text-[#ffc300] border border-[#ffc300]"></textarea>
                        </label>
                        <button type="submit" class="px-4 py-2 rounded bg-[#ffc300] text-[#003566] font-bold hover:bg-[#003566] hover:text-[#ffc300] transition">Create</button>
                    </form>
                `;
                const form = document.getElementById('create-tournament-form');
                if (form) {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        // TODO: Add API call to create tournament
                        alert('Tournament created (mock)!');
                    });
                }
            }
        }

        function showJoinList() {
            if (content) {
                // Mock tournaments data
                const tournaments = [
                    { id: 1, name: 'Spring Cup', players: 8 },
                    { id: 2, name: 'Summer Showdown', players: 16 },
                    { id: 3, name: 'Autumn Arena', players: 4 },
                ];
                content.innerHTML = `
                    <h3 class="text-xl font-bold text-[#ffc300] mb-4">Available Tournaments</h3>
                    <ul class="space-y-4">
                        ${tournaments.map(t => `
                            <li class="border border-[#ffc300] rounded-lg p-4 flex items-center justify-between bg-[#003566]">
                                <span class="font-semibold text-[#ffc300]">${t.name}</span>
                                <span class="text-[#ffd60a]">(${t.players} players)</span>
                                <button data-id="${t.id}" class="ml-4 px-3 py-1 rounded bg-[#ffc300] text-[#003566] font-bold hover:bg-[#003566] hover:text-[#ffc300] transition">Join</button>
                            </li>
                        `).join('')}
                    </ul>
                `;
                content.querySelectorAll('button[data-id]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        // TODO: Add API call to join tournament
                        alert('Joined tournament (mock)!');
                    });
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