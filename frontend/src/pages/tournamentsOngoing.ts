import { renderNavbar } from '../components/navbar';
import { getTranslation } from '../i18n';

export function renderTournamentsOngoingPage() {
    renderNavbar('/tournamentsOnGoing');
    const pageContent = document.getElementById('page-content');
    if (pageContent) {
        pageContent.innerHTML = `
            <section class="bg-[#001d3d] rounded-xl shadow-lg p-8 w-full max-w-xl mx-auto">
                <h2 class="text-3xl font-extrabold text-[#ffc300] mb-6 text-center">${getTranslation('tournaments', 'ongoingTournamentsTitle') || 'Torneos en curso'}</h2>
                <div class="flex gap-4 justify-center mb-6">
                    <a href="/tournaments" class="px-4 py-2 rounded bg-gradient-to-r from-[#003566] to-[#001d3d] text-[#ffc300] font-bold hover:from-[#ffc300] hover:to-[#ffd60a] hover:text-[#003566] transition border-2 border-[#ffc300]">${getTranslation('navbar', 'tournaments')}</a>
                    <a href="/tournamentsFinished" class="px-4 py-2 rounded bg-gradient-to-r from-[#003566] to-[#001d3d] text-[#ffc300] font-bold hover:from-[#ffc300] hover:to-[#ffd60a] hover:text-[#003566] transition border-2 border-[#ffc300]">${getTranslation('tournaments', 'finishedTournamentsTitle') || 'Torneos finalizados'}</a>
                </div>
                <div id="started-tournaments-list"></div>
            </section>
        `;
        fetch('/api/tournaments?status=started')
            .then(res => res.json())
            .then(tournaments => {
                // Filtrar explícitamente por status 'started' por si el backend devuelve incorrectos
                const filtered = Array.isArray(tournaments)
                    ? tournaments.filter((t:any) => t.status === 'started')
                    : [];
                const list = document.getElementById('started-tournaments-list');
                if (list) {
                    if (filtered.length > 0) {
                        list.innerHTML = `<ul class="space-y-4">${filtered.map((t:any) => `<li class="border border-[#ffc300] rounded-lg p-4 bg-[#003566] flex justify-between items-center"><span>${t.name} (Created by: ${t.creator_username || t.created_by})</span><button class="ver-btn px-3 py-1 rounded bg-[#ffc300] text-[#003566] font-bold hover:bg-[#003566] hover:text-[#ffc300] transition" data-id="${t.id}">Ver</button></li>`).join('')}</ul>`;
                    } else {
                        list.innerHTML = `<div class="text-gray-400 flex justify-center items-center h-32 text-xl">${getTranslation('tournaments', 'noOngoingTournaments') || 'No hay torneos en curso.'}</div>`;
                    }
                }
                attachVerHandlers();
            });
    }

    function attachVerHandlers() {
        document.querySelectorAll('.ver-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const tournamentId = btn.getAttribute('data-id');
                let modal = document.createElement('div');
                modal.innerHTML = `
                    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" id="eliminatorias-modal">
                        <div class="bg-[#001d3d] p-8 rounded-xl border-2 border-[#ffc300] flex flex-col gap-4 text-center w-full max-w-4xl">
                            <div class="text-[#ffc300] text-xl font-bold mb-4">Cuadro de Eliminatorias</div>
                            <div id="eliminatorias-content" class="overflow-x-auto"></div>
                            <button id="close-eliminatorias" class="mt-4 px-4 py-2 rounded bg-[#ffc300] text-[#003566] font-bold hover:bg-[#003566] hover:text-[#ffc300]">Cerrar</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
                document.getElementById('close-eliminatorias')?.addEventListener('click', () => {
                    modal.remove();
                });
                // Cargar partidos y participantes
                const [matchesRes, playersRes] = await Promise.all([
                    fetch(`/api/tournaments/${tournamentId}/matches`),
                    fetch(`/api/tournaments/${tournamentId}/players`)
                ]);
                const matches = matchesRes.ok ? await matchesRes.json() : [];
                const players = playersRes.ok ? await playersRes.json() : [];
                // Construir rondas para el bracket
                const rounds = buildRounds(matches, players);
                // Renderizar el bracket
                import('../components/tournamentBracket').then(mod => {
                    mod.renderTournamentBracket(rounds, 'eliminatorias-content');
                });
            });
        });

        // Función para construir el array de rondas a partir de los partidos y jugadores
        function buildRounds(matches: any[], players: any[]) {
            // Agrupar partidos por el campo 'match' (ej: 'Final', 'Semifinal', '1/2(1)')
            const roundsMap: {[key:string]: any[]} = {};
            matches.forEach(m => {
                const roundKey = m.match;
                if (!roundsMap[roundKey]) roundsMap[roundKey] = [];
                roundsMap[roundKey].push(m);
            });
            // Ordenar rondas por importancia: Final, Semifinal, 1/2, 1/4, 1/8, etc.
            const roundOrder = [
                'Final',
                'Semifinal',
                '1/2(1)', '1/2(2)',
                '1/4(1)', '1/4(2)', '1/4(3)', '1/4(4)',
                '1/8(1)', '1/8(2)', '1/8(3)', '1/8(4)', '1/8(5)', '1/8(6)', '1/8(7)', '1/8(8)'
            ];
            let keys = Object.keys(roundsMap);
            keys.sort((a, b) => {
                const ia = roundOrder.indexOf(a);
                const ib = roundOrder.indexOf(b);
                if (ia !== -1 && ib !== -1) return ia - ib;
                if (ia !== -1) return -1;
                if (ib !== -1) return 1;
                return a.localeCompare(b);
            });
            // Mapear partidos a formato del bracket
            return keys.map(k => roundsMap[k].map(match => ({
                player1: getPlayerName(match.player1, players),
                player2: getPlayerName(match.player2, players),
                score1: match.score1,
                score2: match.score2,
                status: match.status,
                winner: match.winner === match.player1 ? 1 : match.winner === match.player2 ? 2 : null,
                round: k
            })));
        }
        function getPlayerName(id: any, players: any[]) {
            let p = players.find(p => p.id === id);
            return p ? (p.username || p.name || p.id) : null;
        }
    }
}
