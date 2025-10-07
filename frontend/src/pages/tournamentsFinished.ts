import { renderNavbar } from '../components/navbar';
import { getTranslation } from '../i18n';

export function renderTournamentsFinishedPage() {
    renderNavbar('/tournamentsFinished');
    const pageContent = document.getElementById('page-content');
    if (pageContent) {
        pageContent.innerHTML = `
            <section class="bg-[#001d3d] rounded-xl shadow-lg p-8 w-full max-w-xl mx-auto">
                <h2 class="text-3xl font-extrabold text-[#ffc300] mb-6 text-center">${getTranslation('tournaments', 'finishedTournamentsTitle') || 'Torneos finalizados'}</h2>
                <div class="flex gap-4 justify-center mb-6">
                    <a href="/tournaments" class="px-4 py-2 rounded bg-gradient-to-r from-[#003566] to-[#001d3d] text-[#ffc300] font-bold hover:from-[#ffc300] hover:to-[#ffd60a] hover:text-[#003566] transition border-2 border-[#ffc300]">${getTranslation('navbar', 'tournaments')}</a>
                    <a href="/tournamentsOngoing" class="px-4 py-2 rounded bg-gradient-to-r from-[#003566] to-[#001d3d] text-[#ffc300] font-bold hover:from-[#ffc300] hover:to-[#ffd60a] hover:text-[#003566] transition border-2 border-[#ffc300]">${getTranslation('tournaments', 'ongoingTournamentsTitle') || 'Torneos en curso'}</a>
                </div>
                <div id="finished-tournaments-list"></div>
            </section>
        `;
        fetch('/api/tournaments?status=finished')
            .then(res => res.json())
            .then(tournaments => {
                const list = document.getElementById('finished-tournaments-list');
                if (list) {
                    if (Array.isArray(tournaments) && tournaments.length > 0) {
                        list.innerHTML = `<ul class="space-y-4">${tournaments.map((t:any) => `<li class="border border-[#ffc300] rounded-lg p-4 bg-[#003566] flex justify-between items-center"><span>${t.name} (${getTranslation('tournaments', 'createdBy') || 'Creador'}: ${t.creator_username || t.created_by})</span><button class="ver-btn px-3 py-1 rounded bg-[#ffc300] text-[#003566] font-bold hover:bg-[#003566] hover:text-[#ffc300] transition" data-id="${t.id}">${getTranslation('tournaments', 'viewButton') || 'Ver'}</button></li>`).join('')}</ul>`;
                    } else {
                        list.innerHTML = `<div class="text-gray-400">${getTranslation('tournaments', 'noFinishedTournaments') || 'No hay torneos finalizados.'}</div>`;
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
                        <div class="bg-[#001d3d] p-8 rounded-xl border-2 border-[#ffc300] flex flex-col gap-4 text-center w-full" style="max-width:1300px; min-width:500px;">
                            <div class="text-[#ffc300] text-xl font-bold mb-4">${getTranslation('tournaments', 'eliminationBracketTitle') || 'Cuadro de eliminatorias'}</div>
                            <div id="eliminatorias-content" class="overflow-x-auto"></div>
                            <button id="close-eliminatorias" class="mt-4 px-4 py-2 rounded bg-[#ffc300] text-[#003566] font-bold hover:bg-[#003566] hover:text-[#ffc300]">${getTranslation('common', 'okButton') || 'Cerrar'}</button>
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
            return matches.map((roundMatches: any[], roundIdx: number) => {
                return roundMatches.map((match: {
                    player1: string;
                    player2: string;
                    score1: number;
                    score2: number;
                    status: string;
                    winner: number | null;
                }) => ({
                    player1: match.player1,
                    player2: match.player2,
                    score1: match.score1,
                    score2: match.score2,
                    status: match.status,
                    winner: match.winner,
                    round: `Ronda ${roundIdx + 1}`
                }));
            });

        // Devuelve el nombre del participante: username si es humano, team_name/bot_name si es bot
        function getParticipantDisplay(p: any) {
            if (!p) return '?';
            if (p.is_bot) return p.team_name || p.bot_name || 'Bot';
            // Buscar username en players si no está en el objeto
            if (p.username) return p.username;
            let user = players.find(u => u.user_id === p.user_id || u.id === p.user_id);
            return user ? user.username : p.user_id;
        }
        }
        function getPlayerName(id: any, players: any[]) {
            // Buscar por user_id si existe, si no por id (para compatibilidad)
            let p = players.find(p => p.user_id === id || p.id === id);
            return p ? (p.username || p.name || p.user_id || p.id) : null;
        }
    }
}
