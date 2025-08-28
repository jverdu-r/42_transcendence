// game-service/src/tournament/tournament-manager.ts

import { v4 as uuidv4 } from 'uuid';
import redisClient from '../redis-client.js';

interface TournamentPlayer {
    id: string;
    username: string;
    isBot?: boolean;
    difficulty?: 'easy' | 'medium' | 'hard';
}

export interface Tournament {
    id: string;
    name: string;
    created_by: string;
    status: 'pending' | 'started' | 'finished';
    max_players: 4 | 8 | 16;
    allow_early_start: boolean;
    bot_difficulty: 'easy' | 'medium' | 'hard' | null;
    players: TournamentPlayer[];
}

// ✅ Interfaz para los datos de entrada
interface CreateTournamentData {
    name: string;
    created_by: string;
    max_players: 4 | 8 | 16;
    allow_early_start: boolean;
    bot_difficulty: 'easy' | 'medium' | 'hard' | null;
}

class TournamentManager {
    private readonly tournamentPrefix = 'tournament:';

    // ✅ Parámetro tipado correctamente
    async createTournament(data: CreateTournamentData): Promise<Tournament> {
        const tournament: Tournament = {
            id: uuidv4(),
            name: data.name,
            created_by: data.created_by,
            status: 'pending',
            max_players: data.max_players,
            allow_early_start: data.allow_early_start,
            bot_difficulty: data.allow_early_start ? data.bot_difficulty : null,
            players: []
        };

        await redisClient.set(`${this.tournamentPrefix}${tournament.id}`, JSON.stringify(tournament));
        return tournament;
    }

    async getTournament(id: string): Promise<Tournament | null> {
        const data = await redisClient.get(`${this.tournamentPrefix}${id}`);
        return data ? JSON.parse(data) : null;
    }

    async getAllTournaments(): Promise<Tournament[]> {
        const keys = await redisClient.keys(`${this.tournamentPrefix}*`);
        const tournaments = await Promise.all(
            keys.map(async (key) => {
                const data = await redisClient.get(key);
                return data ? JSON.parse(data) : null;
            })
        );
        return tournaments.filter(Boolean) as Tournament[];
    }

    async joinTournament(id: string, player: { id: string; username: string }): Promise<Tournament | null> {
        const tournament = await this.getTournament(id);
        if (!tournament || tournament.status !== 'pending') return null;
        if (tournament.players.some(p => p.id === player.id)) return tournament;
        if (tournament.players.length >= tournament.max_players) return null;

        tournament.players.push({ ...player });
        await redisClient.set(`${this.tournamentPrefix}${id}`, JSON.stringify(tournament));
        return tournament;
    }

    async startTournament(id: string, creatorId: string): Promise<Tournament | null> {
        const tournament = await this.getTournament(id);
        if (!tournament || tournament.created_by !== creatorId || tournament.status !== 'pending') return null;
        if (tournament.players.length < 2) return null;

        if (tournament.allow_early_start && tournament.players.length < tournament.max_players) {
            const botsNeeded = tournament.max_players - tournament.players.length;
            for (let i = 0; i < botsNeeded; i++) {
                tournament.players.push({
                    id: `bot-${uuidv4().slice(0,6)}`,
                    username: `Bot-${i + 1}`,
                    isBot: true,
                    difficulty: tournament.bot_difficulty || 'medium'
                });
            }
        }

        if (tournament.players.length < tournament.max_players) return null;

        tournament.status = 'started';
        await redisClient.set(`${this.tournamentPrefix}${id}`, JSON.stringify(tournament));
        return tournament;
    }

    async deleteTournament(id: string, userId: string): Promise<boolean> {
        const tournament = await this.getTournament(id);
        if (!tournament || tournament.created_by !== userId) return false;

        await redisClient.del(`${this.tournamentPrefix}${id}`);
        return true;
    }

    async getPlayers(id: string): Promise<TournamentPlayer[]> {
        const tournament = await this.getTournament(id);
        return tournament ? tournament.players : [];
    }
}

export const tournamentManager = new TournamentManager();