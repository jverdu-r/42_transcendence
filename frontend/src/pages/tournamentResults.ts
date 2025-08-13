import { renderNavbar } from '../components/navbar';

const API_BASE = 'http://localhost:9000';

export function renderTournamentResultsPage(tournamentId: string) {
    renderNavbar(`/tournaments/results/${tournamentId}`);

    const pageContent = document.getElementById('page-content');
    if (!pageContent) return;

    pageContent.innerHTML = '<div class="text-center text-[#ffc300]">Loading tournament results...</div>';

    fetch(`${API_BASE}/api/tournaments/${tournamentId}`)
        .then(res => res.json())
        .then(async (tournament) => {
            if (tournament.status !== 'finished') {
                pageContent.innerHTML = '<p class="text-red-400">This tournament is not finished yet.</p>';
                return;
            }

            // Simulamos resultados (backend debería dar esto)
            // En tu backend, al terminar el torneo, guarda el bracket
            const mockResults = {
                'Round of 16': [],
                'Quarterfinals': [
                    { player1: 'Alice', player2: 'Bot-1', score: '3-1', winner: 'Alice' },
                    { player1: 'Bob', player2: 'Charlie', score: '3-2', winner: 'Bob' },
                ],
                'Semifinals': [
                    { player1: 'Alice', player2: 'Bob', score: '3-0', winner: 'Alice' },
                ],
                'Final': [
                    { player1: 'Alice', player2: 'David', score: '3-2', winner: 'Alice' },
                ]
            };

            let html = `
                <section class="bg-[#001d3d] rounded-xl shadow-lg p-8 max-w-3xl mx-auto">
                    <h2 class="text-3xl font-extrabold text-[#ffc300] mb-6 text-center">${tournament.name} - Results</h2>
                    <div class="space-y-6">
            `;

            Object.entries(mockResults).forEach(([round, matches]) => {
                if (matches.length === 0) return;
                html += `<h3 class="text-xl text-[#ffd60a] border-b border-[#ffc300] pb-2">${round}</h3>`;
                html += `<ul class="space-y-2 mb-4">`;
                (matches as any[]).forEach(m => {
                    html += `
                        <li class="bg-[#003566] p-3 rounded">
                            ${m.player1} vs ${m.player2} → <b>${m.score}</b> → Winner: <span class="text-green-300">${m.winner}</span>
                        </li>
                    `;
                });
                html += `</ul>`;
            });

            html += `
                    </div>
                    <div class="text-center mt-6">
                        <button onclick="window.history.back()" class="px-4 py-2 rounded bg-[#ffc300] text-[#003566] font-bold">← Back</button>
                    </div>
                </section>
            `;

            pageContent.innerHTML = html;
        })
        .catch(() => {
            pageContent.innerHTML = '<p class="text-red-400">Error loading results.</p>';
        });
}
