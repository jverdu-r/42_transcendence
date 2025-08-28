// auth-service/src/utils/email-notifier.ts

import { sendEmail } from './email-client';
import { t } from '../services/i18n.service';
import { getUserProfile } from '../database';
import { getUserById } from '../database';

interface SendGameResultEmailParams {
  userId: string; // ← Necesitamos el userId, no el "to"
  username: string;
  opponent: string;
  score: string;
  isWinner: boolean;
  isVsAI: boolean;
  isTournamentGame: boolean;
  match?: string | null;
}

export async function sendGameResultEmail({
  userId,
  username,
  opponent,
  score,
  isWinner,
  isVsAI,
  isTournamentGame,
  match
}: SendGameResultEmailParams): Promise<void> {
  // 1. Obtener idioma del usuario
  const profile = await getUserProfile(userId);
  const lang = (profile?.language as 'en' | 'es' | 'gl' | 'zh') || 'es';

  // 2. Traducir
  const subject = isWinner
    ? t('subjectIsWinner', lang)
    : t('subjectIsNotWinner', lang);

  const resultText = isWinner
    ? t('resultIsWinner', lang)
    : t('resultIsNotWinner', lang);

  const playerLabel = t('player', lang);
  const opponentLabel = t('opponent', lang);
  const resultLabel = t('result', lang);
  const modeLabel = t('mode', lang);
  const tournamentLabel = t('tournament', lang);
  const versusText = t('versus', lang);
  const aiText = t('AI', lang);
  const humanText = t('human', lang);
  const thanks = t('thanks', lang);
  const mailNote = t('mail', lang);

  // 3. HTML del correo
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #404040; border: 1px solid #e0e0e0; border-radius: 10px;">
      <div style="text-align: center; padding: 20px 0;">
        <h1 style="color: #4f46e5;">Transcendence</h1>
        <h2 style="color: ${isWinner ? '#10b981' : '#ef4444'};">${resultText}</h2>
      </div>
      
      <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>${playerLabel}</strong> ${username}</p>
        <p><strong>${opponentLabel}</strong> ${versusText} ${opponent}</p>
        <p><strong>${resultLabel}</strong> ${score}</p>
        <p><strong>${modeLabel}</strong> ${isVsAI ? aiText : humanText}</p>
        ${isTournamentGame ? `<p><strong>${tournamentLabel}:</strong> ${match || t('tournamentGame', lang)}</p>` : ''}
      </div>

      <div style="text-align: center; margin: 20px 0; color: #6b7280;">
        <p>${thanks}</p>
        <p><small>${mailNote}</small></p>
      </div>
    </div>
  `;

  // 4. Obtener email del usuario
  const user = await getUserById(userId);
  const to = user?.email;
  if (!to) {
    console.warn(`❌ No se puede enviar correo: usuario ${userId} no tiene email`);
    return;
  }

  // 5. Enviar correo
  try {
    await sendEmail({ to, subject, html });
    console.log(`✅ Correo enviado a ${to} en ${lang}`);
  } catch (error) {
    console.error(`❌ Error al enviar correo a ${to}:`, error instanceof Error ? error.message : error);
  }
}