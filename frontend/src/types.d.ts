// src/types.d.ts
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: { client_id: string }) => void;
          prompt: () => void;
          renderButton: (parent: HTMLElement, options: object) => void;
        };
      };
    };
  }
}

export {};