/**
 * WebSocket connection management service
 */
import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type { IGameMessage, IClientConnection, IPlayerMapping } from '../interfaces/index.js';

export class ConnectionService {
  private connections: Map<string, WebSocket> = new Map();
  private playerToClient: Map<string, string> = new Map();
  private clientToPlayer: Map<string, string> = new Map();

  public addConnection(socket: WebSocket): string {
    const clientId = uuidv4();
    this.connections.set(clientId, socket);
    return clientId;
  }

  public removeConnection(clientId: string): void {
    this.connections.delete(clientId);
    
    const playerId = this.clientToPlayer.get(clientId);
    if (playerId) {
      this.playerToClient.delete(playerId);
      this.clientToPlayer.delete(clientId);
    }
  }

  public getConnection(clientId: string): WebSocket | undefined {
    return this.connections.get(clientId);
  }

  public mapPlayerToClient(playerId: string, clientId: string): void {
    this.playerToClient.set(playerId, clientId);
    this.clientToPlayer.set(clientId, playerId);
  }

  public getClientByPlayerId(playerId: string): string | undefined {
    return this.playerToClient.get(playerId);
  }

  public getPlayerByClientId(clientId: string): string | undefined {
    return this.clientToPlayer.get(clientId);
  }

  public sendToClient(clientId: string, message: IGameMessage): void {
    const connection = this.connections.get(clientId);
    if (connection && connection.readyState === WebSocket.OPEN) {
      connection.send(JSON.stringify(message));
    }
  }

  public sendToPlayer(playerId: string, message: IGameMessage): void {
    const clientId = this.playerToClient.get(playerId);
    if (clientId) {
      this.sendToClient(clientId, message);
    }
  }

  public getConnectionCount(): number {
    return this.connections.size;
  }

  public getAllConnections(): IClientConnection[] {
    return Array.from(this.connections.entries()).map(([clientId, socket]) => ({
      clientId,
      socket,
    }));
  }

  public getPlayerMappings(): IPlayerMapping[] {
    return Array.from(this.playerToClient.entries()).map(([playerId, clientId]) => ({
      playerId,
      clientId,
    }));
  }

  public cleanup(): void {
    this.connections.clear();
    this.playerToClient.clear();
    this.clientToPlayer.clear();
  }
}
