import { renderNavbar } from '../components/navbar';
import { navigateTo } from '../router';

const API_BASE = 'http://localhost:9000';

export function renderTournamentsHistoryPage() {
    renderNavbar('/tournaments/history');

    const pageContent = document.getElementById('page-content');
    if (!pageContent) return;

    pageContent.innerHTML = `
        <section class="bg-[#001d3d] rounded-xl shadow-lg p-8 w-full max-w-2xl mx-auto">
            <h2 class="text-3xl font-extrabold text-[#ffc300] mb-6 text-center">Tournament History</h2>
            <div class="mb-6">
                <input 
                    type="text" 
                    id="search-tournament" 
                    placeholder="Search by name..." 
                    class="w-full p-3 rounded bg-[#003566] text-[#ffc300] border border-[#ffc300] focus:outline-none"
                />
            </div>
            <div id="tournaments-list" class="space-y-4"></div>
        </section>
    `;

    const searchInput = document.getElementById('search-tournament') as HTMLInputElement;
    const listEl = document.getElementById('tournaments-list');

    function renderList(filteredName = '') {
        fetch(`${API_BASE}/api/tournaments`)
            .then(res => res.json())
            .then((tournaments: any[]) => {
                const finished = tournaments.filter(t => t.status === 'finished');
                const filtered = finished.filter(t => t.name.toLowerCase().includes(filteredName.toLowerCase()));

                if (filtered.length === 0) {
                    listEl!.innerHTML = '<p class="text-gray-400 text-center">No completed tournaments found.</p>';
                    return;
                }

                listEl!.innerHTML = filtered.map(t => `
                    <div class="border border-[#ffc300] rounded-lg p-4 bg-[#003566] cursor-pointer hover:bg-[#002a50]" onclick="window.viewTournamentResults('${t.id}')">
                        <h3 class="font-bold text-[#ffc300]">${t.name}</h3>
                        <p class="text-sm text-gray-300">Players: ${t.max_players} | Ended</p>
                    </div>
                `).join('');
            })
            .catch(() => {
                listEl!.innerHTML = '<p class="text-red-400">Error loading history.</p>';
            });
    }

    searchInput.addEventListener('input', () => {
        renderList(searchInput.value);
    });

    // Simular función global para ver resultados
    (window as any).viewTournamentResults = (id: string) => {
        navigateTo(`/tournaments/results/${id}`);
    };

    renderList();
}