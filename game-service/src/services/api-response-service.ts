/**
 * API response formatting service
 */
import type { IGameApiResponse, IApiResponse, IPlayer, GameStatus } from '../interfaces/index.js';

export class ApiResponseService {
  public formatGameForApi(game: any): IGameApiResponse {
    return {
      id: game.getId(),
      nombre: game.getName(),
      jugadores: game.getPlayers().map((p: IPlayer) => ({
        nombre: p.name || 'Unknown',
        numero: p.number,
      })),
      jugadoresConectados: game.getPlayers().length,
      capacidadMaxima: 2,
      estado: game.getStatus(),
      tipoJuego: 'pong',
    };
  }

  public formatGamesListForApi(games: any[]): IGameApiResponse[] {
    return games.map(game => this.formatGameForApi(game));
  }

  public createSuccessResponse<T>(data: T): IApiResponse<T> {
    return {
      success: true,
      data,
    };
  }

  public createErrorResponse(errorMessage: string): IApiResponse {
    return {
      success: false,
      error: errorMessage,
    };
  }

  public createGameResponse(game: any): IApiResponse<IGameApiResponse> {
    return this.createSuccessResponse(this.formatGameForApi(game));
  }

  public createGamesListResponse(games: any[]): IApiResponse<{ games: IGameApiResponse[] }> {
    return this.createSuccessResponse({
      games: this.formatGamesListForApi(games),
    });
  }
}
