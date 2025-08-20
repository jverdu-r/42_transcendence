// src/types.d.ts

declare global {
  interface Window {
    // Google OAuth
    google: {
      accounts: {
        id: {
          initialize: (config: { client_id: string }) => void;
          prompt: () => void;
          renderButton: (parent: HTMLElement, options: object) => void;
        };
      };
    };

    // Funciones globales del juego
    showNotification: (message: string, type?: 'toast' | 'snackbar', duration?: number) => void;
    checkRankingChange: () => void;
  }
}

export {};