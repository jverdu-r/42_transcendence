// auth-service/src/utils/email-client.ts

import * as nodemailer from 'nodemailer';
import * as fs from 'fs';  // ✅ Añade esta línea

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

const EMAIL_PASS = process.env.EMAIL_PASS_FILE 
  ? fs.readFileSync(process.env.EMAIL_PASS_FILE, 'utf8').trim()
  : process.env.EMAIL_PASS;

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: EMAIL_PASS
  }
});

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  // Verificar si el email está configurado
  if (!process.env.EMAIL_USER || !EMAIL_PASS) {
    console.warn('⚠️  Email no configurado (falta EMAIL_USER o EMAIL_PASS). No se enviará correo.');
    console.log(`📧 Email que se habría enviado a: ${to}`);
    console.log(`   Asunto: ${subject}`);
    return; // No lanzar error, solo advertir
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'transcendence@noreply.com',
    to,
    subject,
    html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Correo enviado:', info.messageId, 'a:', to);
  } catch (error) {
    console.error('❌ Error al enviar correo a', to, ':', error);
    // No lanzar error para no interrumpir el flujo del juego
  }
}