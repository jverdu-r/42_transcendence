// auth-service/src/utils/email-notifier.ts

import { sendEmail } from './email-client';

interface SendGameResultEmailParams {
  to: string;
  username: string;
  opponent: string;
  score: string;
  isWinner: boolean;
  isVsAI: boolean;
  isTournamentGame: boolean;
  tournamentId?: number | null;
  match?: string | null;
}

export async function sendGameResultEmail({
  to,
  username,
  opponent,
  score,
  isWinner,
  isVsAI,
  isTournamentGame,
  tournamentId,
  match
}: SendGameResultEmailParams): Promise<void> {
  const subject = isWinner ? '🎉 ¡Has ganado una partida!' : '😢 Has perdido una partida';
  
  const resultText = isWinner ? '¡Felicidades!' : '¡Buena lucha!';
  const opponentText = `contra ${opponent}`;
  const tournamentText = isTournamentGame 
    ? `<p><strong>Torneo:</strong> ${match || 'Partida de torneo'}</p>`
    : '';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #111827; border: 1px solid #e0e0e0; border-radius: 10px;">
      <div style="text-align: center; padding: 20px 0;">
        <h1 style="color: #4f46e5;">Transcendence</h1>
        <h2 style="color: ${isWinner ? '#10b981' : '#ef4444'};">${resultText}</h2>
      </div>
      
      <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Jugador:</strong> ${username}</p>
        <p><strong>Oponente:</strong> ${opponentText}</p>
        <p><strong>Resultado:</strong> ${score}</p>
        <p><strong>Modo:</strong> ${isVsAI ? 'Contra IA' : 'Contra humano'}</p>
        ${tournamentText}
      </div>

      <div style="text-align: center; margin: 20px 0; color: #6b7280;">
        <p>Gracias por jugar a Transcendence.</p>
        <p><small>Este es un correo automático, por favor no respondas.</small></p>
      </div>
    </div>
  `;

  await sendEmail({
    to,
    subject,
    html
  });
} 