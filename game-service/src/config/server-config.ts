/**
 * Server configuration management
 */
import type { IServerConfig } from '../interfaces/index.js';
import { SERVER_CONFIG } from '../constants/index.js';

export class ServerConfig {
  private static instance: ServerConfig;
  private config: IServerConfig;

  private constructor() {
    this.config = {
      port: Number(process.env.PORT) || SERVER_CONFIG.DEFAULT_PORT,
      host: process.env.HOST || SERVER_CONFIG.DEFAULT_HOST,
      maxPayload: SERVER_CONFIG.MAX_PAYLOAD,
    };
  }

  public static getInstance(): ServerConfig {
    if (!ServerConfig.instance) {
      ServerConfig.instance = new ServerConfig();
    }
    return ServerConfig.instance;
  }

  public getConfig(): IServerConfig {
    return { ...this.config };
  }

  public getPort(): number {
    return this.config.port;
  }

  public getHost(): string {
    return this.config.host;
  }

  public getMaxPayload(): number {
    return this.config.maxPayload;
  }
}
