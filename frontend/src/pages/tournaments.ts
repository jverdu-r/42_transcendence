import { renderNavbar } from '../components/navbar';
import { getTranslation } from '../i18n';
import { getCurrentUser } from '../auth';

export function renderTournamentsPage() {
    // Render navbar at the top
    renderNavbar('/tournaments');

    // Main content HTML
    let user = getCurrentUser();
    let tournamentsHtml = `
        <section class="bg-[#001d3d] rounded-xl shadow-lg p-8 w-full max-w-xl mx-auto">
            <h2 class="text-3xl font-extrabold text-[#ffc300] mb-6 text-center">${getTranslation('tournaments', 'mainTitle') || 'Torneos'}</h2>
            <div class="flex justify-center mb-8">
                <button id="create-tab" class="px-6 py-3 rounded bg-[#ffc300] text-[#003566] font-bold text-xl shadow-lg ${user && user.id ? '' : 'opacity-50 cursor-not-allowed'}">${getTranslation('tournaments', 'createTournamentButton') || 'Crear torneo'}</button>
            </div>
            <div class="flex gap-4 justify-center mb-6">
                <a href="/tournamentsFinished" class="px-4 py-2 rounded bg-gradient-to-r from-[#003566] to-[#001d3d] text-[#ffc300] font-bold hover:from-[#ffc300] hover:to-[#ffd60a] hover:text-[#003566] transition border-2 border-[#ffc300]">${getTranslation('tournaments', 'finishedTournamentsTitle') || 'Torneos finalizados'}</a>
                <a href="/tournamentsOngoing" class="px-4 py-2 rounded bg-gradient-to-r from-[#003566] to-[#001d3d] text-[#ffc300] font-bold hover:from-[#ffc300] hover:to-[#ffd60a] hover:text-[#003566] transition border-2 border-[#ffc300]">${getTranslation('tournaments', 'ongoingTournamentsTitle') || 'Torneos en curso'}</a>
            </div>
            <div id="tournament-content"></div>
        </section>
    `;

    const pageContent = document.getElementById('page-content');
    if (pageContent) {
        pageContent.innerHTML = tournamentsHtml;

        const content = document.getElementById('tournament-content');
        const createTab = document.getElementById('create-tab');

        function showCreateForm() {
            if (content) {
                content.innerHTML = `
                    <form id="create-tournament-form" class="flex flex-col gap-4">
                        <label class="font-semibold text-[#ffc300]">
                            ${getTranslation('tournaments', 'tournamentNameLabel') || 'Nombre del torneo'}:<br>
                            <input type="text" name="name" required class="mt-1 p-2 rounded w-full bg-[#003566] text-[#ffc300] border border-[#ffc300]" />
                        </label>
                        <label class="font-semibold text-[#ffc300]">
                            ${getTranslation('tournaments', 'numPlayersLabel') || 'Número de jugadores'}:<br>
                            <select name="numPlayers" required class="mt-1 p-2 rounded w-full bg-[#003566] text-[#ffc300] border border-[#ffc300]">
                                <option value="4">4</option>
                                <option value="8">8</option>
                                <option value="16">16</option>
                            </select>
                        </label>
                        <button type="submit" class="px-4 py-2 rounded bg-[#ffc300] text-[#003566] font-bold hover:bg-[#003566] hover:text-[#ffc300] transition">${getTranslation('tournaments', 'createTournamentButton') || 'Crear torneo'}</button>
                    </form>
                `;

                const form = document.getElementById('create-tournament-form') as HTMLFormElement | null;
                if (form) {
                    form.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const formData = new FormData(form);
                        const name = formData.get('name');
                        const numPlayers = Number(formData.get('numPlayers'));
                        let user = getCurrentUser();
                        if (!user || !user.id) {
                            alert(getTranslation('tournaments', 'mustBeLoggedInCreate') || 'You must be logged in to create a tournament.');
                            return;
                        }
                        // Verificar si el usuario ya ha creado un torneo pendiente
                        const tournamentsRes = await fetch(`/api/tournaments?created_by=${user.id}`);
                        const userTournaments = tournamentsRes.ok ? await tournamentsRes.json() : [];
                        const hasPending = userTournaments.some((t:any) => t.status === 'pending');
                        if (hasPending) {
                            alert(getTranslation('tournaments', 'alreadyHasPending') || 'You have already created a pending tournament. You must start or delete it before creating another.');
                            return;
                        }
                        try {
                            const res = await fetch(`/api/tournaments`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    name,
                                    created_by: user.id,
                                    players: numPlayers,
                                    bots: 0,
                                    bots_difficulty: "-"
                                })
                            });
                            if (!res.ok) throw new Error(await res.text());
                            showTournamentsList();
                        } catch (err) {
                            alert((getTranslation('tournaments', 'errorCreating') || 'Error creating tournament') + ': ' + err);
                        }
                    });
                }
            }
        }

        function showTournamentsList() {
            if (content) {
                let currentUser: any = getCurrentUser();
                        if ((window as any)._tournamentListInterval) {
                            clearInterval((window as any)._tournamentListInterval);
                        }
                        (window as any)._tournamentListInterval = setInterval(() => {
                            // Solo refresca si la sección sigue visible
                            if (document.body.contains(content)) {
                                showTournamentsList();
                            } else {
                                clearInterval((window as any)._tournamentListInterval);
                            }
                        }, 10000);
                fetch(`/api/tournaments`)
                    .then(res => res.json())
                    .then((tournaments) => {
                        tournaments = tournaments.filter((t:any) => t.status === 'pending');
                        Promise.all(
                            tournaments.map((t: any) =>
                                fetch(`/api/tournaments/${t.id}/participants`).then(r => r.json()).catch(() => [])
                            )
                        ).then(allParticipantsArr => {
                            const joinedTournamentIds = allParticipantsArr.map((participants, idx) => {
                                if (Array.isArray(participants) && currentUser && currentUser.id) {
                                    return participants.find((p:any) => p.user_id == currentUser.id) ? tournaments[idx].id : null;
                                }
                                return null;
                            }).filter(Boolean);
                            content.innerHTML = `
                                <h3 class="text-xl font-bold text-[#ffc300] mb-4 text-center">${getTranslation('tournaments', 'disponibles')}</h3>
                                <ul class="space-y-4">
                                ${tournaments.map((t: any, i:number) => {
                                    const participants = Array.isArray(allParticipantsArr[i]) ? allParticipantsArr[i] : [];
                                    const joined = !!(currentUser && currentUser.id && participants.find((p:any) => p.user_id==currentUser.id));
                                    const playerCount = `${participants.length} / ${t.players || 'N/A'}`;
                                    const statusText = t.status === 'pending' ? getTranslation('tournaments', 'statusPending') : 
                                                      t.status === 'started' ? getTranslation('tournaments', 'statusStarted') : 
                                                      t.status === 'finished' ? getTranslation('tournaments', 'statusFinished') : t.status;
                                    if (currentUser && currentUser.id && t.created_by === currentUser.id) {
                                        // Lógica para activar el botón Start
                                        const canStart = participants.length === t.players;
                                        return `
                                            <li class="border border-[#ffc300] rounded-lg p-4 flex flex-col gap-2 bg-[#003566]">
                                                <div class="flex justify-between items-center">
                                                    <span class="font-semibold text-[#ffc300]">${t.name}</span>
                                                    <span class="text-[#ffd60a]">${getTranslation('tournaments', 'status')}: ${statusText}</span>
                                                </div>
                                                <div class="flex justify-between items-center text-sm">
                                                    <span class="text-[#ffc300]">${getTranslation('tournaments', 'players')}: ${playerCount}</span>
                                                </div>
                                                <div class="flex gap-2 mt-2">
                                                    <button data-start-id="${t.id}" class="px-3 py-1 rounded bg-green-400 text-[#003566] font-bold hover:bg-green-600 hover:text-white transition" ${canStart ? '' : 'disabled style="opacity:0.5;cursor:not-allowed"'}>${getTranslation('tournaments', 'startButton')}</button>
                                                    <button data-delete-id="${t.id}" class="px-3 py-1 rounded bg-red-400 text-[#003566] font-bold hover:bg-red-600 hover:text-white transition">${getTranslation('tournaments', 'deleteButton')}</button>
                                                </div>
                                            </li>
                                        `;
                                    } else {
                                        const alreadyJoinedOther = joinedTournamentIds.length > 0 && !joined;
                                        const isFull = participants.length >= t.players;
                                        const buttonText = joined ? getTranslation('tournaments', 'joinedButton') : isFull ? getTranslation('tournaments', 'fullButton') : getTranslation('tournaments', 'signUpButton');
                                        return `
                                            <li class="border border-[#ffc300] rounded-lg p-4 flex flex-col gap-2 bg-[#003566]">
                                                <div class="flex justify-between items-center">
                                                    <span class="font-semibold text-[#ffc300]">${t.name}</span>
                                                    <span class="text-[#ffd60a]">${getTranslation('tournaments', 'status')}: ${statusText}</span>
                                                </div>
                                                <div class="flex justify-between items-center text-sm">
                                                    <span class="text-[#ffc300]">${getTranslation('tournaments', 'players')}: ${playerCount}</span>
                                                </div>
                                                <button data-id="${t.id}" class="mt-2 px-3 py-1 rounded bg-[#ffc300] text-[#003566] font-bold hover:bg-[#003566] hover:text-[#ffc300] transition" ${joined ? 'disabled style="opacity:0.7;cursor:not-allowed"' : alreadyJoinedOther || isFull ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>${buttonText}</button>
                                            </li>
                                        `;
                                    }
                                }).join('')}
                                </ul>
                            `;
                            attachJoinHandlers();
                            attachManageHandlers();
                        });

                        function attachJoinHandlers() {
                            (content as HTMLElement).querySelectorAll('button[data-id]').forEach(btn => {
                                btn.addEventListener('click', async () => {
                                    const tournamentId = btn.getAttribute('data-id');
                                    let currentUser: any = getCurrentUser();
                                    if (!currentUser || !currentUser.id) {
                                        alert(getTranslation('tournaments', 'mustBeLoggedInJoin') || 'You must be logged in to join a tournament.');
                                        return;
                                    }
                                    // comprobación adicional en cliente para evitar race condition:
                                    // obtener participantes y detalles del torneo y comparar con players
                                    const [resCheck, resTourn] = await Promise.all([
                                    fetch(`/api/tournaments/${tournamentId}/participants`),
                                    fetch(`/api/tournaments/${tournamentId}`)
                                    ]);
                                    const parts = resCheck.ok ? await resCheck.json() : [];
                                    const tourn = resTourn.ok ? await resTourn.json() : null;
                                    if (tourn && Array.isArray(parts) && parts.length >= Number(tourn.players)) {
                                        alert(getTranslation('tournaments', 'tournamentFull') || 'Tournament is full.');
                                        return;
                                    }
                                    try {
                                        const res = await fetch(`/api/tournaments/${tournamentId}/join`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ user_id: currentUser.id })
                                        });
                                        if (!res.ok) throw new Error(await res.text());
                                        showTournamentsList();
                                    } catch (err) {
                                        alert((getTranslation('tournaments', 'errorJoining') || 'Error joining tournament') + ': ' + err);
                                    }
                                });
                            });
                        }

                        function attachManageHandlers() {
                            // Comenzar torneo
                            (content as HTMLElement).querySelectorAll('button[data-start-id]').forEach(btn => {
                                btn.addEventListener('click', async () => {
                                    const tournamentId = btn.getAttribute('data-start-id');
                                    try {
                                        const res = await fetch(`/api/tournaments/${tournamentId}/start`, {
                                            method: 'POST'
                                        });
                                        if (!res.ok) throw new Error(await res.text());
                                        showTournamentsList();
                                    } catch (err) {
                                        alert((getTranslation('tournaments', 'errorStarting') || 'Error starting tournament') + ': ' + err);
                                    }
                                });
                            });
                            // Borrar torneo
                            (content as HTMLElement).querySelectorAll('button[data-delete-id]').forEach(btn => {
                                btn.addEventListener('click', async () => {
                                    const tournamentId = btn.getAttribute('data-delete-id');
                                    if (!confirm(getTranslation('tournaments', 'confirmDelete') || '¿Seguro que quieres borrar este torneo?')) return;
                                    try {
                                        const res = await fetch(`/api/tournaments/${tournamentId}`, {
                                            method: 'DELETE',
                                            headers: { 'Content-Type': 'application/json' }
                                        });
                                        if (!res.ok) throw new Error(await res.text());
                                        showTournamentsList();
                                    } catch (err) {
                                        alert((getTranslation('tournaments', 'errorDeleting') || 'Error deleting tournament') + ': ' + err);
                                    }
                                });
                            });
                        }
                    })
                    .catch(() => {
                        if (content)
                            content.innerHTML = `<p class="text-red-400">${getTranslation('tournaments', 'errorLoading') || 'Error loading tournaments.'}</p>`;
                    });
            }
        }

        if (createTab) {
            createTab.addEventListener('click', showCreateForm);
            showTournamentsList();
        }

    } else {
    }
}
