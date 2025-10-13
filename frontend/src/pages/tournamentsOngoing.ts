import { renderNavbar } from '../components/navbar';
import { getTranslation } from '../i18n';
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
};

export function renderTournamentsOngoingPage() {
  // Usa la ruta que tengas en el router
  renderNavbar('/tournamentsOnGoing');

  const pageContent = document.getElementById('page-content');
  if (!pageContent) return;

  pageContent.innerHTML = `
    <section class="bg-[#001d3d] rounded-xl shadow-lg p-8 w-full max-w-xl mx-auto">
      <h2 class="text-3xl font-extrabold text-[#ffc300] mb-6">
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
      container.innerHTML = `<p class="text-[#ffc300] opacity-80 text-center">${getTranslation('tournaments', 'noOngoing') || 'No hay torneos en curso'}</p>`;
      return;
    }

    container.innerHTML = `
      <div class="grid gap-4">
        ${tournaments.map((t: any) => `
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
        `).join('')}
      </div>
    `;

    container.querySelectorAll<HTMLButtonElement>('button[data-action="open-bracket"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tid = Number(btn.dataset.tid);
        await openBracketModal(tid);
      });
    });
  } catch (e) {
    container.innerHTML = `<p class="text-red-400">Error cargando torneos: ${(e as Error)?.message || e}</p>`;
  }
}

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
    if (content) content.innerHTML = `<p class="text-red-400">Error cargando cuadro: ${(e as Error)?.message || e}</p>`;
  }
}

/* ========= Helpers: normalización + títulos de ronda EXACTOS ========= */

/** Regla solicitada:
 * - Si la ronda tiene algún match con '1/8' o length == 8  → "Octavos de Final"
 * - Si tiene '1/4' o length == 4                        → "Cuartos de Final"
 * - Si tiene '1/2' o length == 2                        → "Semifinales"
 * - Si tiene 'Final' o length == 1                      → "Final"
 * - Si nada coincide, devuelve "Ronda"
 */
function titleForRound(round: any[]): string {
  const n = round?.length ?? 0;
  const labels = (round || []).map(m => String(m?.match ?? ''));

  if (labels.some(l => /^1\/8/i.test(l)) || n === 8) return 'Octavos de Final';
  if (labels.some(l => /^1\/4/i.test(l)) || n === 4) return 'Cuartos de Final';
  if (labels.some(l => /^1\/2/i.test(l)) || n === 2) return 'Semifinales';
  if (labels.some(l => /final/i.test(l))  || n === 1) return 'Final';

  return 'Ronda';
}

function normalizeRoundsAndTitles(input: any): { rounds: BracketMatch[][]; titles: string[] } {
  // Puede venir agrupado por rondas ([[...],[...],...]) o plano (array de partidos).
  if (Array.isArray(input) && Array.isArray((input as any[])[0])) {
    const grouped = input as any[][];
    const rounds: BracketMatch[][] = grouped.map((r) => r.map(toBracketMatch));
    const titles = grouped.map((r) => titleForRound(r));
    return { rounds, titles };
  }

  // Plano: agrupar en buckets por 'match'
  const flat = (input as any[]) || [];
  const buckets: Record<string, any[]> = { '1/8': [], '1/4': [], '1/2': [], 'Final': [] };
  for (const m of flat) {
    const label = String(m?.match ?? '');
    if (/^1\/8/i.test(label)) buckets['1/8'].push(m);
    else if (/^1\/4/i.test(label)) buckets['1/4'].push(m);
    else if (/^1\/2/i.test(label)) buckets['1/2'].push(m);
    else buckets['Final'].push(m);
  }

  const order = ['1/8', '1/4', '1/2', 'Final'] as const;
  const present = order.filter(k => buckets[k].length);

  // Si solo detectamos una ronda (o ninguna etiqueta clara), dedúcela por cantidad:
  if (present.length <= 1) {
    const only = present[0] ? buckets[present[0]] : flat;
    const rounds: BracketMatch[][] = [only.map(toBracketMatch)];
    const titles = [titleForRound(only)];
    return { rounds, titles };
  }

  // Varias rondas detectadas: ordenadas y tituladas
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

function toBracketMatch(m: MatchDto): BracketMatch {
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
    status:
      (m.status === 'pending' || m.status === 'scheduled' || m.status === 'started' || m.status === 'finished')
        ? m.status
        : 'pending',
    winner
  };
}
