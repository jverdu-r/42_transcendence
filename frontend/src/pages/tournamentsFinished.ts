import { renderNavbar } from '../components/navbar';
import { getTranslation } from '../i18n';
import { renderTournamentBracket, BracketMatch } from '../components/tournamentBracket';

export function renderTournamentsFinishedPage() {
  renderNavbar('/tournamentsFinished');
  const pageContent = document.getElementById('page-content');
  if (!pageContent) return;

  pageContent.innerHTML = `
    <section class="bg-[#001d3d] rounded-xl shadow-lg p-8 w-full max-w-3xl mx-auto">
      <h2 class="text-3xl font-extrabold text-[#ffc300] mb-6">
        ${getTranslation('tournaments', 'finishedTournamentsTitle') || 'Campeonatos rematados'}
      </h2>
      <div class="flex gap-4 justify-center mb-6">
        <a href="/tournaments" class="px-4 py-2 rounded-lg border border-[#ffc300] text-[#ffc300] hover:bg-[#ffc300] hover:text-[#001d3d] transition">${getTranslation('navbar', 'tournaments')}</a>
        <a href="/tournamentsOngoing" class="px-4 py-2 rounded-lg border border-[#ffc300] text-[#ffc300] hover:bg-[#ffc300] hover:text-[#001d3d] transition">${getTranslation('tournaments', 'ongoingTournamentsTitle') || 'Torneos en curso'}</a>
      </div>
      <div id="finished-tournaments-list" class="grid gap-4"></div>
    </section>
  `;

  loadFinishedTournaments();
}

async function loadFinishedTournaments() {
  const container = document.getElementById('finished-tournaments-list');
  if (!container) return;

  try {
    const res = await fetch('/api/tournaments?status=finished');
    const tournaments = await res.json();
    if (!Array.isArray(tournaments) || tournaments.length === 0) {
      container.innerHTML = `<p class="text-[#ffc300] opacity-80 text-center">${getTranslation('tournaments', 'noFinished') || 'Non hai torneos finalizados'}</p>`;
      return;
    }

    // (1) players: usa la columna tournaments.players (consistente y correcto para finalizados)
    container.innerHTML = tournaments.map((t: any) => `
      <div class="border border-[#ffc300] rounded-lg p-4 bg-[#003566] flex items-center justify-between">
        <div>
          <div class="text-lg font-semibold text-[#ffc300]">${t.name}</div>
          <div class="text-sm text-[#ffc300]/70">${getTranslation('tournaments','players') || 'Players'}: ${t.players ?? '-'}</div>
        </div>
        <div>
          <button class="px-3 py-2 rounded-lg border border-[#ffc300] text-[#ffc300] hover:bg-[#ffc300] hover:text-[#001d3d]" data-action="open-bracket" data-tid="${t.id}">
            ${getTranslation('tournaments','viewBracket') || 'Ver cuadro'}
          </button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll<HTMLButtonElement>('button[data-action="open-bracket"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tid = Number(btn.dataset.tid);
        await openBracketModal(tid);
      });
    });
  } catch (e) {
    container.innerHTML = `<p class="text-red-400">Erro cargando torneos: ${(e as Error)?.message || e}</p>`;
  }
}

async function openBracketModal(tournamentId: number) {
  const modal = document.createElement('div');
  modal.innerHTML = `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" id="eliminatorias-modal">
      + <div class="bg-[#001d3d] p-8 rounded-xl shadow-xl w-fit max-w-[95vw] mx-auto">
        <div class="text-[#ffc300] text-xl font-bold mb-4">${getTranslation('tournaments','eliminationBracketTitle') || 'Cadro de eliminatorias'}</div>
        <div id="eliminatorias-content" class="overflow-x-auto"></div>
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

    // En finalizados no queremos estado “finished”
    renderTournamentBracket(rounds, 'eliminatorias-content', { showStatus: false, roundTitles: titles });
  } catch (e) {
    const content = document.getElementById('eliminatorias-content');
    if (content) content.innerHTML = `<p class="text-red-400">Erro cargando cadro: ${(e as Error)?.message || e}</p>`;
  }
}

/* ===== Helpers: normalización + títulos de ronda correctos ===== */

function normalizeRoundsAndTitles(input: any): { rounds: BracketMatch[][]; titles: string[] } {
  // Puede venir agrupado por rondas o plano
  let rounds: BracketMatch[][];

  if (Array.isArray(input) && Array.isArray(input[0])) {
    // Agrupado
    rounds = (input as any[][]).map((round) => round.map(toBracketMatch));
  } else {
    // Plano -> agrupar por fase según 'match'
    const buckets: Record<string, any[]> = { '1/8': [], '1/4': [], '1/2': [], 'Final': [] };
    for (const m of input as any[]) {
      const label = String(m.match || '');
      if (/^1\/8/i.test(label)) buckets['1/8'].push(m);
      else if (/^1\/4/i.test(label)) buckets['1/4'].push(m);
      else if (/^1\/2/i.test(label)) buckets['1/2'].push(m);
      else buckets['Final'].push(m);
    }
    const order = ['1/8', '1/4', '1/2', 'Final'] as const;
    const present = order.filter(k => buckets[k].length);
    rounds = present.map(k =>
      buckets[k].sort((a,b) => {
        const ai = Number(String(a.match).match(/\((\d+)\)/)?.[1] || 0);
        const bi = Number(String(b.match).match(/\((\d+)\)/)?.[1] || 0);
        return ai - bi;
      }).map(toBracketMatch)
    );
  }

  // Títulos robustos: detecta por 'match' en TODOS los partidos; si no hay, infiere por nº de rondas.
  const titles = deriveTitlesFromAny(input, rounds.length);
  return { rounds, titles };
}

function deriveTitlesFromAny(raw: any, totalRounds: number): string[] {
  const labels: string[] = (Array.isArray(raw) ? raw.flat(Infinity) : [])
    .map((m: any) => String(m?.match || ''))
    .filter(Boolean);

  const has18 = labels.some(l => /^1\/8/i.test(l) || /octavos/i.test(l));
  const has14 = labels.some(l => /^1\/4/i.test(l) || /cuartos/i.test(l));
  const has12 = labels.some(l => /^1\/2/i.test(l) || /semi/i.test(l));
  const hasF  = labels.some(l => /final/i.test(l));

  const order: string[] = [];
  if (has18) order.push('Octavos de final');
  if (has14) order.push('Cuartos de final');
  if (has12) order.push('Semifinales');
  if (hasF)  order.push('Final');

  if (order.length === totalRounds) return order;
  // Fallback por número de rondas
  if (totalRounds === 4) return ['Octavos de final', 'Cuartos de final', 'Semifinales', 'Final'];
  if (totalRounds === 3) return ['Cuartos de final', 'Semifinales', 'Final'];
  if (totalRounds === 2) return ['Semifinales', 'Final'];
  if (totalRounds === 1) return ['Final'];
  return Array.from({ length: totalRounds }, (_, i) => `Ronda ${i + 1}`);
}

function toBracketMatch(m: any): BracketMatch {
  const s1 = typeof m.score1 === 'number' ? m.score1 : null;
  const s2 = typeof m.score2 === 'number' ? m.score2 : null;
  let winner: 1 | 2 | null = null;
  if (s1 != null && s2 != null) winner = s1 > s2 ? 1 : (s2 > s1 ? 2 : null);

  return {
    player1: m.player1 ?? m.team1 ?? null,
    player2: m.player2 ?? m.team2 ?? null,
    team1: m.team1 ?? null,
    team2: m.team2 ?? null,
    score1: s1,
    score2: s2,
    status: m.status ?? 'finished',
    winner
  };
}
