// types.d.ts

declare module 'speakeasy' {
  export function generateSecret(options?: {
    name?: string;
    issuer?: string;
    length?: number;
  }): {
    ascii: string;
    hex: string;
    base32: string;
    otpauth_url: string;
  };

  export function totp(options: {
    secret: string;
    encoding: 'base32' | 'ascii' | 'hex';
    token: string;
    window?: number;
  }): boolean;
}

declare module 'qrcode' {
  export function toDataURL(text: string): Promise<string>;
  export function toDataURL(text: string, options: any): Promise<string>;
}

declare namespace DbService {
  interface User {
    id: number;
    username: string;
    email: string;
    password_hash?: string;
  }

  interface UserProfile {
    avatar_url: string | null;
    language: string;
    notifications: string;
    doubleFactor: string | number | null;
    difficulty: string | null;
    doubleFactorSecret?: string | null;
  }

  interface UserStats {
    totalGames: number;
    wins: number;
    losses: number;
    win_rate: number;
    elo: number;
    ranking: number;
    matchHistory: Array<{
      id: number;
      result: string;
      opponent: string;
      score: string;
      date: string;
    }>;
  }

  interface GameLive {
    id: number;
    player1: { username: string };
    player2: { username: string };
    score1: number;
    score2: number;
  }

  interface RankingEntry {
    id: number;
    username: string;
    wins: number;
    losses: number;
    total_games: number;
    win_rate: number;
    elo: number;
    rank: number;
    points: number;
  }
}