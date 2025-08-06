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