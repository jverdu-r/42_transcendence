/**
 * Game statistics and data utilities
 */
import type { IScore } from '../interfaces/index.js';

export class StatisticsUtils {
  /**
   * Generate game statistics
   */
  public static generateGameStats(gameId: string, duration: number, score: IScore) {
    return {
      gameId,
      duration,
      totalRallies: score.player1 + score.player2,
      maxRally: Math.max(score.player1, score.player2),
      winner: score.player1 > score.player2 ? 1 : score.player2 > score.player1 ? 2 : null,
      finalScore: score,
      timestamp: Date.now(),
    };
  }

  /**
   * Format game time for display
   */
  public static formatGameTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Calculate win rate for a player
   */
  public static calculateWinRate(wins: number, totalGames: number): number {
    if (totalGames === 0) return 0;
    return Math.round((wins / totalGames) * 100);
  }

  /**
   * Calculate average game duration
   */
  public static calculateAverageGameDuration(durations: number[]): number {
    if (durations.length === 0) return 0;
    const total = durations.reduce((sum, duration) => sum + duration, 0);
    return Math.round(total / durations.length);
  }

  /**
   * Get performance rating based on various metrics
   */
  public static calculatePerformanceRating(
    winRate: number,
    averageScore: number,
    totalGames: number
  ): 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' {
    const score = (winRate * 0.4) + (averageScore * 0.3) + (Math.min(totalGames, 100) * 0.3);
    
    if (score < 25) return 'Beginner';
    if (score < 50) return 'Intermediate';
    if (score < 75) return 'Advanced';
    return 'Expert';
  }

  /**
   * Create leaderboard entry
   */
  public static createLeaderboardEntry(
    playerName: string,
    wins: number,
    losses: number,
    totalScore: number,
    averageDuration: number
  ) {
    const totalGames = wins + losses;
    const winRate = this.calculateWinRate(wins, totalGames);
    const avgScore = totalGames > 0 ? Math.round(totalScore / totalGames) : 0;
    const rating = this.calculatePerformanceRating(winRate, avgScore, totalGames);
    
    return {
      playerName,
      wins,
      losses,
      totalGames,
      winRate,
      averageScore: avgScore,
      averageDuration,
      rating,
      totalScore,
    };
  }

  /**
   * Sort leaderboard entries
   */
  public static sortLeaderboard(entries: any[], sortBy: 'winRate' | 'wins' | 'totalGames' | 'averageScore' = 'winRate'): any[] {
    return entries.sort((a, b) => {
      switch (sortBy) {
        case 'winRate':
          return b.winRate - a.winRate;
        case 'wins':
          return b.wins - a.wins;
        case 'totalGames':
          return b.totalGames - a.totalGames;
        case 'averageScore':
          return b.averageScore - a.averageScore;
        default:
          return b.winRate - a.winRate;
      }
    });
  }
}
