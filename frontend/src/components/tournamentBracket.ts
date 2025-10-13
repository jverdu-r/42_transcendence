import { getTranslation } from '../i18n';

export type BracketMatch = {
  player1?: string | null;
  player2?: string | null;
  team1?: string | null;
  team2?: string | null;
  score1?: number | null;
  score2?: number | null;
  status?: 'pending' | 'scheduled' | 'started' | 'finished';
  winner?: 1 | 2 | null;
  round?: string;
};

export function renderTournamentBracket(
  rounds: BracketMatch[][],
  containerId: string,
  opts: { showStatus?: boolean; roundTitles?: string[] } = {}
) {
  const { showStatus = true, roundTitles } = opts;
  const container = document.getElementById(containerId);
  if (!container) return;

  const titles = (roundTitles && roundTitles.length ? roundTitles : inferRoundTitles(rounds.length));

  const html = `
    <div class="w-fit">
    <!-- Ancho intrínseco: mide lo justo que necesitan las rondas -->
    <div class="inline-flex gap-8 rounded-xl border border-[#ffc300] bg-[#001d3d] p-6 items-stretch">
        ${rounds.map((round, idx) => `
          <div class="flex flex-col justify-center items-center gap-6">
            <div class="text-base font-bold text-[#ffc300] mb-1">${titles[idx]}</div>
            ${round.map((m) => renderMatchBox(m, { showStatus })).join('')}
          </div>
        `).join('')}
      </div>
    </div>
  `;
  container.innerHTML = html;
}

function renderMatchBox(match: BracketMatch, opts: { showStatus: boolean }) {
  const { showStatus } = opts;
  const p1Name = (match.player1 ?? match.team1 ?? '?') || '?';
  const p2Name = (match.player2 ?? match.team2 ?? '?') || '?';

  const p1 = `<span class="${match.winner === 1 ? 'font-bold text-green-400' : 'text-[#ffc300]'}">${escapeHtml(p1Name)}</span>`;
  const p2 = `<span class="${match.winner === 2 ? 'font-bold text-green-400' : 'text-[#ffc300]'}">${escapeHtml(p2Name)}</span>`;

  const hasScores = typeof match.score1 === 'number' && typeof match.score2 === 'number';
  const scoreHtml = hasScores
    ? `<span class="font-semibold text-[#ffc300]">${match.score1} : ${match.score2}</span>`
    : `<span class="text-[#ffc300]">-</span>`;

  const status = match.status || 'pending';
  const statusHtml = !showStatus ? '' :
    status === 'finished'
      ? `<div class="text-xs text-green-400 mt-1">✔ ${getTranslation('tournaments','finished') || 'Finalizado'}</div>`
      : `<div class="text-xs text-[#ffc300]/70 mt-1">${getTranslation('tournaments','inProgress') || 'En juego / pendiente'}</div>`;

  return `
    <div class="flex flex-col items-center">
      <!-- min-w ajustada para que quepan dos bots -->
      <div class="flex flex-row items-center gap-2 border border-[#ffc300] rounded-lg px-3 py-2 bg-[#003566] min-w-[300px] whitespace-nowrap justify-between">
        <div class="truncate max-w-[12rem]">${p1}</div>
        ${scoreHtml}
        <div class="truncate max-w-[12rem] text-right">${p2}</div>
      </div>
      ${statusHtml}
    </div>
  `;
}

function inferRoundTitles(total: number): string[] {
  if (total === 4) return ['Octavos de final', 'Cuartos de final', 'Semifinales', 'Final'];
  if (total === 3) return ['Cuartos de final', 'Semifinales', 'Final'];
  if (total === 2) return ['Semifinales', 'Final'];
  if (total === 1) return ['Final'];
  return Array.from({ length: total }, (_, i) => `Ronda ${i + 1}`);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c] as string)
  );
}
