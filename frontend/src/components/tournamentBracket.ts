import { getTranslation } from '../i18n';
// Componente para dibujar el cuadro de eliminatorias de un torneo
// Recibe rounds: array de rondas, cada ronda es array de partidos
// Cada partido: { player1, player2, score1, score2, status, winner }
// Si un jugador es null, se deja en blanco

export function renderTournamentBracket(rounds: any[], containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) return;
    // Estilos base
    // Bracket visual tipo árbol, alineado y con líneas
    let html = `<div style="max-width:1200px; min-width:400px; max-height:90vh; overflow-x:auto; overflow-y:auto;" class="flex flex-row gap-12 justify-center items-center bracket-scroll rounded-lg border border-[#ffc300] bg-[#001d3d]">
        ${rounds.map((round: any[], i: number) => `
            <div class="flex flex-col gap-8 items-center justify-center" style="min-width:220px; min-height:0; height:auto; display:flex; justify-content:center;">
                <div class="text-base font-bold text-[#ffc300] mb-2 text-center">${getTranslation('tournaments', getRoundName(rounds.length, i)) || getRoundName(rounds.length, i)}</div>
                ${round.map((match: any, idx: number) => renderMatchBox(match, i, idx, rounds.length, round.length, rounds)).join('')}
            </div>
        `).join('')}
    </div>`;
    container.innerHTML = html;

}

function renderMatchBox(match: any, roundIdx: number, matchIdx: number, totalRounds: number, matchesInRound: number, rounds: any[]) {
    // Sin centrado: cada partido ocupa su espacio en la columna, uno debajo de otro
    let marginTop = 0;
    const { player1, player2, team1, team2, score1, score2, status, winner } = match;
    let p1Name = player1 || team1 || '?';
    let p2Name = player2 || team2 || '?';
    let p1 = `<span class="${winner===1?'font-bold text-green-400':'text-[#ffc300]'}">${p1Name}</span>`;
    let p2 = `<span class="${winner===2?'font-bold text-green-400':'text-[#ffc300]'}">${p2Name}</span>`;
    let score = (score1!=null && score2!=null) ? `<span class="mx-2 text-[#ffd60a] font-bold">${score1} - ${score2}</span>` : '';
    let statusText = status==='started' ? '<span class="text-blue-400">En juego</span>' : '';
    return `<div class="flex flex-col items-center mb-2" style="margin-top:${marginTop}px;">
        <div class="flex flex-row items-center gap-2 border border-[#ffc300] rounded-lg p-1 bg-[#003566] min-w-[250px] text-sm justify-center text-center">
            ${p1} ${score} ${p2}
        </div>
        ${statusText}
    </div>`;
}
// Renderiza un partido en formato árbol clásico vertical
function renderMatchTree(match: any, roundIdx: number, matchIdx: number, totalRounds: number, matchesInRound: number) {
    const { player1, player2, team1, team2, score1, score2, status, winner } = match;
    let p1Name = player1 || team1 || '?';
    let p2Name = player2 || team2 || '?';
    let p1 = `<span class="${winner===1?'font-bold text-green-400':'text-[#ffc300]'}">${p1Name}</span>`;
    let p2 = `<span class="${winner===2?'font-bold text-green-400':'text-[#ffc300]'}">${p2Name}</span>`;
    let score = (score1!=null && score2!=null) ? `<span class="mx-2 text-[#ffd60a] font-bold">${score1} - ${score2}</span>` : '';
    let statusText = status==='started' ? '<span class="text-blue-400">En juego</span>' : '';
    // Líneas para conectar partidos (solo si no es la última ronda)
    let connector = '';
    if (roundIdx < totalRounds - 1) {
        connector = `<div class="absolute left-1/2 -translate-x-1/2 w-0 h-12 border-l-2 border-[#ffc300]" style="top:100%;"></div>`;
    }
    return `<div class="relative flex flex-col items-center mb-2">
        <div class="flex flex-col items-center">
            <div class="flex flex-row items-center gap-2 border border-[#ffc300] rounded-lg p-2 bg-[#003566] min-w-[180px]">
                ${p1} ${score} ${p2}
            </div>
            ${statusText}
        </div>
        ${connector}
    </div>`;
}

function getRoundName(totalRounds: number, roundIdx: number) {
    // Solo hasta 16 participantes: Octavos, Cuartos, Semifinales, Final
    const roundLabels = [
        "Octavos de final",
        "Cuartos de final",
        "Semifinales",
        "Final"
    ];
    // Si hay menos rondas, usar solo las necesarias
    if (totalRounds <= 4) {
        return roundLabels[4 - totalRounds + roundIdx];
    }
    return `Ronda ${roundIdx + 1}`;
}

function renderMatch(match: any, roundIdx: number, matchIdx: number, totalRounds: number) {
    const { player1, player2, score1, score2, status, winner } = match;
    let p1 = player1 ? `<span class="${winner===1?'font-bold text-green-400':'text-[#ffc300]'}">${player1}</span>` : '<span class="text-gray-400">?</span>';
    let p2 = player2 ? `<span class="${winner===2?'font-bold text-green-400':'text-[#ffc300]'}">${player2}</span>` : '<span class="text-gray-400">?</span>';
    let score = (score1!=null && score2!=null) ? `<span class="mx-2 text-[#ffd60a] font-bold">${score1} - ${score2}</span>` : '';
    let statusText = status==='started' ? '<span class="text-blue-400">En juego</span>' : '';
    // Estructura visual tipo árbol, con líneas laterales
    return `<div class="relative flex flex-col items-center">
        <div class="flex flex-col items-center">
            <div class="flex flex-row items-center gap-2 border border-[#ffc300] rounded-lg p-2 bg-[#003566] min-w-[180px]">
                ${p1} ${score} ${p2}
            </div>
            ${statusText}
        </div>
        ${renderLines(roundIdx, matchIdx, totalRounds)}
    </div>`;
}

function renderLines(roundIdx: number, matchIdx: number, totalRounds: number) {
    // Solo para visual, líneas entre partidos
    if (roundIdx === totalRounds - 1) return '';
    // Alternar líneas arriba/abajo para conectar partidos
    return `<div class="w-0 h-8 border-l-2 border-[#ffc300] mx-auto"></div>`;
}
