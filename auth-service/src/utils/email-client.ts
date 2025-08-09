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
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'transcendence@noreply.com',
    to,
    subject,
    html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Correo enviado:', info.messageId);
  } catch (error) {
    console.error('❌ Error al enviar correo:', error);
    throw error;
  }
}