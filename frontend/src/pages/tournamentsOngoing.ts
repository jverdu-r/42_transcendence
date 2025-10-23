import { renderNavbar } from '../components/navbar';
import { getTranslation } from '../i18n';
import { getCurrentUser } from '../auth';
import { renderTournamentBracket, BracketMatch } from '../components/tournamentBracket';

type MatchDto = {
  id: number;
  match: string;
  status: 'pending' | 'scheduled' | 'started' | 'finished' | string;
  player1?: any;
  player2?: any;
  team1?: string | null;
  team2?: string | null;
  score1?: number | null;
  score2?: number | null;
  winner?: any;
  external_game_id?: string;
};

async function ensurePveLobby(tournamentId: number | string, rounds: any[][]): Promise<boolean> {
  // Obtén el usuario actual de tu helper si existe; si no, intenta localStorage.
  const currentUser =
    (typeof (globalThis as any).getCurrentUser === 'function'
      ? (globalThis as any).getCurrentUser()
      : null) ||
    (() => {
      try {
        return JSON.parse(localStorage.getItem('user') || 'null');
      } catch {
        return null;
      }
    })();

  // Si no hay sesión, no hacemos nada.
  if (!currentUser || !currentUser.id) return false;

  // Recorremos rondas y partidos con nombres locales que NO colisionen.
  for (const r of rounds || []) {
    for (const m of r || []) {
      const userIsInMatch =
        (m?.player1?.user_id == currentUser.id) || (m?.player2?.user_id == currentUser.id);

      // Detecta bot por flag o por nombre
      const involvesBot =
        m?.player1?.is_bot === true ||
        m?.player2?.is_bot === true ||
        (typeof m?.team1 === 'string' && /bot/i.test(m.team1)) ||
        (typeof m?.team2 === 'string' && /bot/i.test(m.team2));

      if (!userIsInMatch || !involvesBot) continue;

      // 1) Si hay external_game_id, valida que la sala exista en el game-service
      let validExternalId: string | null = null;
      if (m?.external_game_id) {
        try {
          const check = await fetch(`/api/games/${encodeURIComponent(String(m.external_game_id))}`);
          if (check.ok) validExternalId = String(m.external_game_id);
        } catch {
          // ignoramos errores de red, seguiremos creando la sala si hace falta
        }
      }

      if (validExternalId) {
        // Sala viva → ve directo al lobby
        sessionStorage.setItem('currentGameId', validExternalId);
        window.location.href = `/game-lobby?gameId=${encodeURIComponent(validExternalId)}`;
        return true;
      }

      // 2) No hay sala válida → crea la PvE con la dificultad del torneo
      let aiDifficulty = 'medium';
      try {
        const tRes = await fetch(`/api/tournaments/${encodeURIComponent(String(tournamentId))}`);
        if (tRes.ok) {
          const t = await tRes.json();
          if (t?.bots_difficulty) aiDifficulty = String(t.bots_difficulty).toLowerCase();
        }
      } catch {
        // fallback medium
      }

      // Crea la sala PvE en tu game-service
      let playerName = currentUser?.username || currentUser?.name || 'Jugador';
      try {
        const createRes = await fetch('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerName,
            gameMode: 'pve',
            aiDifficulty,
          }),
        });

        if (!createRes.ok) {
          console.error('No se pudo crear la partida PvE');
          continue; // intenta con otros m si los hubiera
        }

        const game = await createRes.json();
        const newId = game?.id || game?.gameId || game?.game_id;
        if (newId) {
          // Opcional: aquí deberíamos persistir el external_game_id en el match (UPDATE en backend)
          // Cuando me pases el endpoint de torneos, te doy ese patch exacto.
          sessionStorage.setItem('currentGameId', String(newId));
          window.location.href = `/game-lobby?gameId=${encodeURIComponent(String(newId))}`;
          return true;
        }
      } catch (e) {
        console.error('Error creando PvE:', e);
      }
    }
  }

  // No se redirigió
  return false;
}

export function renderTournamentsOngoingPage() {
  renderNavbar('/tournamentsOnGoing');

  const pageContent = document.getElementById('page-content');
  if (!pageContent) return;

  pageContent.innerHTML = `
    <section class="bg-[#001d3d] rounded-xl shadow-lg p-8 w-full max-w-xl mx-auto">
      <h2 class="text-3xl font-extrabold text-[#ffc300] justify-center mb-6 text-center">
        ${getTranslation('tournaments', 'ongoingTournamentsTitle') || 'Torneos en curso'}
      </h2>
      <div class="flex gap-4 justify-center mb-6">
        <a href="/tournaments" class="px-4 py-2 rounded-lg border border-[#ffc300] text-[#ffc300] hover:bg-[#ffc300] hover:text-[#001d3d] transition">${getTranslation('navbar', 'tournaments')}</a>
        <a href="/tournamentsFinished" class="px-4 py-2 rounded-lg border border-[#ffc300] text-[#ffc300] hover:bg-[#ffc300] hover:text-[#001d3d] transition">${getTranslation('tournaments', 'finishedTournamentsTitle') || 'Torneos finalizados'}</a>
      </div>
      <div id="started-tournaments-list"></div>
    </section>
  `;

  loadStartedTournaments();
}

async function loadStartedTournaments() {
  const container = document.getElementById('started-tournaments-list');
  if (!container) return;

  try {
    const res = await fetch('/api/tournaments?status=started');
    const tournaments = await res.json();

    if (!Array.isArray(tournaments) || tournaments.length === 0) {
      container.innerHTML = `<p class="text-[#ffc300] opacity-80 text-center">${getTranslation('tournaments', 'noOngoingTournaments') || 'No hay torneos en curso'}</p>`;
      return;
    }

    container.innerHTML = `<div class="grid gap-4">${tournaments.map((t: any) => `
      <div class="border border-[#ffc300] rounded-lg p-4 bg-[#003566] flex items-center justify-between">
        <div>
          <div class="text-lg font-semibold text-[#ffc300]">${t.name}</div>
          <div class="text-sm text-[#ffc300]/70">${getTranslation('tournaments','players') || 'Players'}: ${t.players ?? '-'}</div>
        </div>
        <div class="flex gap-2">
          <button class="px-3 py-2 rounded-lg border border-[#ffc300] text-[#ffc300] hover:bg-[#ffc300] hover:text-[#001d3d]" data-action="open-bracket" data-tid="${t.id}">
            ${getTranslation('tournaments','viewBracket') || 'Ver cuadro'}
          </button>
        </div>
      </div>
    `).join('')}</div>`;

    container.querySelectorAll<HTMLButtonElement>('button[data-action="open-bracket"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tid = Number(btn.dataset.tid);
        const bracketContainer = document.createElement('div');
        bracketContainer.id = 'tournament-bracket-modal';
        bracketContainer.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
        bracketContainer.innerHTML = `<div class="bg-[#001d3d] rounded-xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-auto relative">
          <button id="close-bracket" class="absolute top-4 right-4 text-white hover:text-[#ffc300] text-2xl">&times;</button>
          <h3 class="text-2xl font-bold text-[#ffc300] mb-4">${getTranslation('tournaments', 'eliminationBracketTitle') || 'Cuadro de eliminatorias'}</h3>
          <div id="eliminatorias-content" class="space-y-6"></div>
        </div>`;
        document.body.appendChild(bracketContainer);

        document.getElementById('close-bracket')?.addEventListener('click', () => {
          document.body.removeChild(bracketContainer);
        });

        try {
          const matchesRes = await fetch(`/api/tournaments/${tid}/matches`);
          const rounds = await matchesRes.json(); // ← El backend devuelve directamente las rondas

          // Intentar auto-crear/validar PvE si el cruce es humano vs bot.
          // Si devuelve true, ya se ha redirigido al lobby y debemos salir de la función/handler.
          if (await ensurePveLobby(tid, rounds)) {
            return;
          }

          const currentUser = getCurrentUser();
          if (currentUser && currentUser.id) {
            for (const round of rounds) {
              for (const match of round) {
                // Verificar si el usuario participa en este partido
                const userPlaysInMatch = (match.player1_user_id == currentUser.id) || (match.player2_user_id == currentUser.id);
                
                if (userPlaysInMatch && (match.status === 'started' || match.status === 'pending')) {
                  let gameId = match.external_game_id;
                  
                  // Si no hay external_game_id, crear el juego ahora
                  if (!gameId) {
                    console.log('🎮 Creando juego para el partido del torneo...');
                    try {
                      // Determinar gameMode y playerName
                      const isPlayer1 = match.player1_user_id == currentUser.id;
                      const opponentIsBot = isPlayer1 ? !match.player2_user_id : !match.player1_user_id;
                      const gameMode = opponentIsBot ? 'pve' : 'pvp';
                      
                      // IMPORTANTE: Pasar información de ambos jugadores para mantener el orden correcto
                      const createRes = await fetch('/api/games', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          nombre: `Torneo ${tid} - Partido ${match.match}`,
                          gameMode: gameMode,
                          maxPlayers: 2,
                          playerName: currentUser.username,
                          aiDifficulty: 'medium',
                          tournamentId: tid,
                          // Pasar el orden de los equipos según la BD
                          player1_id: match.player1_user_id,
                          player2_id: match.player2_user_id,
                          player1_name: match.player1,
                          player2_name: match.player2
                        })
                      });
                      
                      if (createRes.ok) {
                        const gameData = await createRes.json();
                        gameId = gameData.id || gameData.gameId;
                        
                        // Actualizar external_game_id en la base de datos
                        await fetch(`/api/tournaments/${tid}/matches/${match.id}/set-game`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ external_game_id: gameId })
                        });
                        
                        console.log('✅ Juego creado:', gameId);
                      } else {
                        console.error('❌ Error al crear el juego');
                        continue;
                      }
                    } catch (err) {
                      console.error('❌ Error creando juego:', err);
                      continue;
                    }
                  }
                  
                  sessionStorage.setItem('currentGameId', gameId);

                  console.log('🔍 Partida detectada en el cuadro:');
                  console.log('   external_game_id:', gameId);
                  console.log('   status:', match.status);
                  console.log('   jugador 1:', match.player1, '(ID:', match.player1_user_id, ')');
                  console.log('   jugador 2:', match.player2, '(ID:', match.player2_user_id, ')');
                  console.log('   redirigiendo a:', `/game-lobby?gameId=${gameId}`);
                  
                  // Redirigir a la partida
                  window.location.href = `/game-lobby?gameId=${gameId}`;
                  return;
                }
              }
            }
          }

          // Renderizar bracket
          renderTournamentBracket(rounds, 'eliminatorias-content', {
            showStatus: true,
            roundTitles: [] // tu backend no envía títulos, así que déjalo vacío
          });
        } catch (e) {
          const content = document.getElementById('eliminatorias-content');
          if (content) content.innerHTML = `<p class="text-red-400">${getTranslation('tournaments', 'errorLoadingBracket')}: ${(e as Error)?.message || e}</p>`;
        }
      });
    });
  } catch (error) {
    console.error('Error loading started tournaments:', error);
    container.innerHTML = `<p class="text-red-400 text-center">${getTranslation('tournaments', 'errorLoading') || 'Error al cargar torneos.'}</p>`;
  }
}

// Las funciones auxiliares se mantienen igual (no se usan en el flujo principal de loadStartedTournaments)
// Pero se incluyen por coherencia del archivo

async function openBracketModal(tournamentId: number) {
  const modal = document.createElement('div');
  modal.innerHTML = `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" id="eliminatorias-modal">
      <div class="bg-[#001d3d] p-8 rounded-xl shadow-xl w-fit max-w-[95vw] mx-auto">
        <div class="text-[#ffc300] text-xl font-bold mb-4">${getTranslation('tournaments','eliminationBracketTitle') || 'Cuadro de eliminatorias'}</div>
        <div id="eliminatorias-content"></div>
        <div class="mt-6 flex justify-end">
          <button id="close-eliminatorias" class="px-4 py-2 rounded-lg border border-[#ffc300] text-[#ffc300] hover:bg-[#ffc300] hover:text-[#001d3d]">
            ${getTranslation('common', 'okButton') || 'Entendido'}
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('close-eliminatorias')?.addEventListener('click', () => modal.remove());

  try {
    const res = await fetch(`/api/tournaments/${tournamentId}/matches`);
    const data = await res.json();
    const { rounds, titles } = normalizeRoundsAndTitles(data);
    renderTournamentBracket(rounds, 'eliminatorias-content', { showStatus: true, roundTitles: titles });
  } catch (e) {
    const content = document.getElementById('eliminatorias-content');
    if (content) content.innerHTML = `<p class="text-red-400">${getTranslation('tournaments', 'errorLoadingBracket')}: ${(e as Error)?.message || e}</p>`;
  }
}

function titleForRound(round: any[]): string {
  const n = round?.length ?? 0;
  const labels = (round || []).map(m => {
    const match = m?.match;
    return typeof match === 'string' ? match : '';
  });
  if (labels.some(l => /^1\/8/i.test(l)) || n === 8) return getTranslation('tournaments', 'octavos') || 'Octavos de Final';
  if (labels.some(l => /^1\/4/i.test(l)) || n === 4) return getTranslation('tournaments', 'cuartos') || 'Cuartos de Final';
  if (labels.some(l => /^1\/2/i.test(l)) || n === 2) return getTranslation('tournaments', 'semifinales') || 'Semifinales';
  if (labels.some(l => /final/i.test(l))  || n === 1) return getTranslation('tournaments', 'final') || 'Final';
  return getTranslation('tournaments', 'roundLabel') || 'Ronda';
}

function normalizeRoundsAndTitles(input: any): { rounds: BracketMatch[][]; titles: string[] } {
  if (Array.isArray(input) && Array.isArray((input as any[])[0])) {
    const grouped = input as any[][];
    const rounds: BracketMatch[][] = grouped.map((r) => r.map(toBracketMatch));
    const titles = grouped.map((r) => titleForRound(r));
    return { rounds, titles };
  }
  const flat = (input as any[]) || [];
  const buckets: Record<string, any[]> = { '1/8': [], '1/4': [], '1/2': [], 'Final': [] };
  for (const m of flat) {
    const label = String(m?.match || '');
    if (/^1\/8/i.test(label)) buckets['1/8'].push(m);
    else if (/^1\/4/i.test(label)) buckets['1/4'].push(m);
    else if (/^1\/2/i.test(label)) buckets['1/2'].push(m);
    else buckets['Final'].push(m);
  }
  const order = ['1/8', '1/4', '1/2', 'Final'] as const;
  const present = order.filter(k => buckets[k].length);
  if (present.length <= 1) {
    const only = present[0] ? buckets[present[0]] : flat;
    const rounds: BracketMatch[][] = [only.map(toBracketMatch)];
    const titles = [titleForRound(only)];
    return { rounds, titles };
  }
  const rounds: BracketMatch[][] = present.map(k =>
    buckets[k]
      .sort((a, b) => {
        const ai = Number(String(a.match).match(/\((\d+)\)/)?.[1] || 0);
        const bi = Number(String(b.match).match(/\((\d+)\)/)?.[1] || 0);
        return ai - bi;
      })
      .map(toBracketMatch)
  );
  const titles = present.map(k => titleForRound(buckets[k]));
  return { rounds, titles };
}

function toBracketMatch(m: any): BracketMatch {
  const s1 = typeof m.score1 === 'number' ? m.score1 : null;
  const s2 = typeof m.score2 === 'number' ? m.score2 : null;
  let winner: 1 | 2 | null = null;
  if (s1 != null && s2 != null) winner = s1 > s2 ? 1 : (s2 > s1 ? 2 : null);

  const pickName = (p: any) => {
    if (p == null) return null;
    if (typeof p === 'string') return p;
    if (typeof p === 'object') return p.username ?? p.name ?? p.nick ?? null;
    return String(p);
  };

  const player1Name = pickName(m.player1) ?? m.team1 ?? null;
  const player2Name = pickName(m.player2) ?? m.team2 ?? null;

  return {
    player1: player1Name,
    player2: player2Name,
    team1: m.team1 ?? null,
    team2: m.team2 ?? null,
    score1: s1,
    score2: s2,
    status: m.status ?? 'finished',
    winner
  };
}