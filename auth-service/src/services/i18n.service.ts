// i18n.service.ts

import * as fs from 'fs';
import * as path from 'path';

interface EmailTranslations {
  subjectIsWinner: string;
  subjectIsNotWinner: string;
  resultIsWinner: string;
  resultIsNotWinner: string;
  versus: string;
  tournament: string;
  tournamentGame: string;
  player: string;
  opponent: string;
  result: string;
  mode: string;
  AI: string;
  human: string;
  thanks: string;
  mail: string;
}

type Language = 'en' | 'es' | 'gl' | 'zh';

const translations: Record<Language, EmailTranslations> = {
  en: JSON.parse(fs.readFileSync(path.join(__dirname, '../utils/i18n/en.json'), 'utf-8')).email,
  es: JSON.parse(fs.readFileSync(path.join(__dirname, '../utils/i18n/es.json'), 'utf-8')).email,
  gl: JSON.parse(fs.readFileSync(path.join(__dirname, '../utils/i18n/gl.json'), 'utf-8')).email,
  zh: JSON.parse(fs.readFileSync(path.join(__dirname, '../utils/i18n/zh.json'), 'utf-8')).email
};

export function t(key: keyof EmailTranslations, lang: Language = 'en'): string {
  const locale = lang in translations ? lang : 'en';
  return translations[locale][key];
}