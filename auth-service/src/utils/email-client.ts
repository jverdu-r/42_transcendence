// auth-service/src/utils/email-client.ts

import * as nodemailer from 'nodemailer';
import * as fs from 'fs';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

// Función para obtener las credenciales en tiempo de ejecución
function getEmailCredentials() {
  // Intentar leer el archivo .env directamente si existe
  let envVars: any = {};
  try {
    const envContent = fs.readFileSync('/app/.env', 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        envVars[match[1]] = match[2].trim();
      }
    });
  } catch (error) {
    console.log('⚠️  No se pudo leer /app/.env, usando variables de entorno del sistema');
  }

  // Usar variables del archivo .env o del entorno
  const EMAIL_USER = envVars.EMAIL_USER || process.env.EMAIL_USER;
  const EMAIL_PASS = envVars.EMAIL_PASS || (
    process.env.EMAIL_PASS_FILE 
      ? fs.readFileSync(process.env.EMAIL_PASS_FILE, 'utf8').trim()
      : process.env.EMAIL_PASS
  );

  console.log('🔍 [EMAIL-CLIENT] Verificando credenciales:');
  console.log('   EMAIL_USER:', EMAIL_USER ? '✅ presente' : '❌ ausente');
  console.log('   EMAIL_PASS:', EMAIL_PASS ? '✅ presente' : '❌ ausente');
  console.log('   EMAIL_HOST:', envVars.EMAIL_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com');
  console.log('   EMAIL_PORT:', envVars.EMAIL_PORT || process.env.EMAIL_PORT || '587');

  return {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
    host: envVars.EMAIL_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(envVars.EMAIL_PORT || process.env.EMAIL_PORT || '587'),
    secure: (envVars.EMAIL_SECURE || process.env.EMAIL_SECURE) === 'true',
    from: envVars.EMAIL_FROM || process.env.EMAIL_FROM || 'transcendence@noreply.com'
  };
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  // Obtener credenciales en tiempo de ejecución
  const credentials = getEmailCredentials();
  
  // Verificar si el email está configurado
  if (!credentials.user || !credentials.pass) {
    console.warn('⚠️  Email no configurado (falta EMAIL_USER o EMAIL_PASS). No se enviará correo.');
    console.log(`📧 Email que se habría enviado a: ${to}`);
    console.log(`   Asunto: ${subject}`);
    return; // No lanzar error, solo advertir
  }

  // Crear transporter con las credenciales actuales
  const transporter = nodemailer.createTransport({
    host: credentials.host,
    port: credentials.port,
    secure: credentials.secure,
    auth: {
      user: credentials.user,
      pass: credentials.pass
    }
  });

  const mailOptions = {
    from: credentials.from,
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