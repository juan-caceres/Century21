// email-server-c21/server.js - Backend para Century 21 con Brevo
const express = require('express');
const SibApiV3Sdk = require('@getbrevo/brevo');
const cron = require('node-cron');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Array para almacenar emails programados
let emailsProgramados = [];

// 🔥 CONFIGURAR BREVO
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
apiInstance.setApiKey(
  SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

// Verificar configuración al iniciar
if (!process.env.BREVO_API_KEY) {
  console.error('❌ ERROR: Falta BREVO_API_KEY en las variables de entorno');
} else {
  console.log('✅ Brevo API Key configurada correctamente');
}

// ========== FUNCIONES AUXILIARES ==========

// Función para enviar email de recordatorio
const enviarEmailRecordatorio = async (emailData) => {
  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    
    sendSmtpEmail.sender = { 
      name: 'Century 21 Reservas', 
      email: process.env.EMAIL_USER || 'abcitcentury21@gmail.com'
    };
    
    sendSmtpEmail.to = [{ 
      email: emailData.usuarioEmail,
      name: emailData.usuarioEmail.split('@')[0]
    }];
    
    sendSmtpEmail.subject = `🔔 Recordatorio: Reserva en ${emailData.salaNumero} - 1 hora restante`;
    
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background-color: #BEAF87; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { padding: 20px; }
          .info-box { background-color: #f9f9f9; padding: 15px; border-left: 4px solid #BEAF87; margin: 15px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Recordatorio de Reserva</h1>
          </div>
          <div class="content">
            <p>Hola,</p>
            <p>Te recordamos que tu reserva está programada para <strong>dentro de 1 hora</strong>.</p>
            
            <div class="info-box">
              <h3>📋 Detalles de la Reserva:</h3>
              <ul style="list-style: none; padding-left: 0;">
                <li>🏢 <strong>Sala:</strong> ${emailData.salaNumero}</li>
                <li>📅 <strong>Fecha:</strong> ${emailData.fecha}</li>
                <li>⏰ <strong>Hora:</strong> ${emailData.horaInicio}</li>
                <li>📝 <strong>Motivo:</strong> ${emailData.motivo}</li>
              </ul>
            </div>
            
            <p>¡Te esperamos!</p>
          </div>
          <div class="footer">
            <p>Este es un mensaje automático, por favor no respondas a este correo.</p>
            <p style="color: #999; font-size: 10px; margin-top: 10px;">Century 21 - Sistema de Reservas</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Email enviado correctamente a ${emailData.usuarioEmail}`, result.messageId);
    return true;
    
  } catch (error) {
    console.error(`❌ Error enviando email a ${emailData.usuarioEmail}:`, error.response ? error.response.body : error);
    return false;
  }
};

// Función para verificar y enviar emails programados
const verificarYEnviarEmails = () => {
  const ahora = new Date();
  
  emailsProgramados = emailsProgramados.filter(email => {
    const fechaEnvio = new Date(email.fechaEnvio);
    
    // Si ya es hora de enviar y no se ha enviado
    if (ahora >= fechaEnvio && !email.enviado) {
      console.log(`📧 Enviando email programado para ${email.usuarioEmail}...`);
      enviarEmailRecordatorio(email);
      email.enviado = true;
      return false; // Eliminar de la lista
    }
    
    // Si la fecha ya pasó (la reserva ya ocurrió), eliminar
    const fechaReserva = new Date(email.fechaReserva);
    if (ahora > fechaReserva) {
      console.log(`🗑️ Eliminando email vencido de ${email.usuarioEmail}`);
      return false;
    }
    
    return true; // Mantener en la lista
  });
};

// Ejecutar verificación cada minuto
cron.schedule('* * * * *', () => {
  console.log(`⏰ [${new Date().toISOString()}] Verificando emails programados...`);
  console.log(`📊 Emails pendientes: ${emailsProgramados.length}`);
  verificarYEnviarEmails();
});

// ========== ENDPOINTS API ==========

// 1️⃣ Endpoint para programar un email
app.post('/programar-email', (req, res) => {
  try {
    console.log('📥 Recibiendo petición /programar-email con datos:', req.body);
    
    const { reservaId, usuarioEmail, salaNumero, fecha, horaInicio, motivo } = req.body;

    if (!reservaId || !usuarioEmail || !salaNumero || !fecha || !horaInicio) {
      console.log('❌ Faltan datos requeridos');
      return res.status(400).json({
        success: false,
        error: 'Faltan datos requeridos',
        details: 'Se requiere: reservaId, usuarioEmail, salaNumero, fecha, horaInicio'
      });
    }

    const [anio, mes, dia] = fecha.split('-').map(Number);
    const [hora, minuto] = horaInicio.split(':').map(Number);

    if (isNaN(anio) || isNaN(mes) || isNaN(dia) || isNaN(hora) || isNaN(minuto)) {
      console.log('❌ Error parseando fecha/hora');
      return res.status(400).json({
        success: false,
        error: 'Formato de fecha u hora inválido',
        details: `Recibido - Fecha: ${fecha}, Hora: ${horaInicio}`
      });
    }

    // Crear fecha con los valores locales de Argentina
    const fechaReservaLocal = new Date(anio, mes - 1, dia, hora, minuto);
    console.log('🇦🇷 Fecha local Argentina:', fechaReservaLocal.toString());
    
    // Convertir a UTC sumando 3 horas (Argentina es UTC-3)
    const fechaReservaUTC = new Date(fechaReservaLocal.getTime() + (3 * 60 * 60 * 1000));
    console.log('🌍 Fecha UTC:', fechaReservaUTC.toISOString());

    // Calcular fecha de envío (1 hora antes en UTC)
    const fechaEnvio = new Date(fechaReservaUTC.getTime() - (60 * 60 * 1000));
    console.log('📧 Fecha de envío (1h antes, UTC):', fechaEnvio.toISOString());

    // Verificar que la fecha de envío sea futura
    const ahora = new Date();
    console.log('🕐 Fecha actual (UTC):', ahora.toISOString());
    
    if (fechaEnvio <= ahora) {
      console.log('⚠️ La fecha de envío ya pasó - NO SE PROGRAMA');
      return res.status(400).json({
        success: false,
        error: 'La fecha de envío debe ser futura',
        details: `Fecha envío: ${fechaEnvio.toISOString()}, Ahora: ${ahora.toISOString()}`
      });
    }

    const emailProgramado = {
      reservaId,
      usuarioEmail,
      salaNumero,
      fecha,
      horaInicio,
      motivo: motivo || 'Sin motivo especificado',
      fechaReserva: fechaReservaUTC.toISOString(),
      fechaEnvio: fechaEnvio.toISOString(),
      enviado: false,
      creadoEn: new Date().toISOString()
    };

    emailsProgramados.push(emailProgramado);

    console.log(`✅ Email programado exitosamente`);
    console.log(`   - Usuario: ${usuarioEmail}`);
    console.log(`   - Sala: ${salaNumero}`);
    console.log(`   - Reserva Argentina: ${horaInicio} del ${fecha}`);
    console.log(`   - Envío UTC: ${fechaEnvio.toISOString()}`);
    console.log(`   - Total emails pendientes: ${emailsProgramados.length}`);

    res.json({
      success: true,
      message: 'Email programado correctamente',
      fechaEnvio: fechaEnvio.toISOString(),
      emailsPendientes: emailsProgramados.length,
      debug: {
        fechaReservaLocal: fechaReservaLocal.toISOString(),
        fechaReservaUTC: fechaReservaUTC.toISOString(),
        fechaEnvio: fechaEnvio.toISOString(),
        ahora: ahora.toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error programando email:', error);
    res.status(500).json({
      success: false,
      error: 'Error en el servidor',
      details: error.message
    });
  }
});

// 2️⃣ Endpoint para cancelar un email programado
app.post('/cancelar-email', (req, res) => {
  try {
    const { reservaId } = req.body;

    if (!reservaId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere reservaId'
      });
    }

    const indexAntes = emailsProgramados.length;
    emailsProgramados = emailsProgramados.filter(e => e.reservaId !== reservaId);
    const indexDespues = emailsProgramados.length;

    if (indexAntes > indexDespues) {
      console.log(`✅ Email cancelado para reserva ${reservaId}`);
      res.json({
        success: true,
        message: 'Email cancelado correctamente'
      });
    } else {
      console.log(`⚠️ No se encontró email para reserva ${reservaId}`);
      res.json({
        success: false,
        message: 'Email no encontrado (posiblemente ya fue enviado)'
      });
    }

  } catch (error) {
    console.error('❌ Error cancelando email:', error);
    res.status(500).json({
      success: false,
      error: 'Error en el servidor',
      details: error.message
    });
  }
});

// 3️⃣ Endpoint para enviar email inmediatamente
app.post('/enviar-recordatorio', async (req, res) => {
  try {
    const { usuarioEmail, salaNumero, fecha, horaInicio, motivo } = req.body;

    if (!usuarioEmail || !salaNumero || !fecha || !horaInicio) {
      return res.status(400).json({
        success: false,
        error: 'Faltan datos requeridos'
      });
    }

    const emailData = {
      usuarioEmail,
      salaNumero,
      fecha,
      horaInicio,
      motivo: motivo || 'Sin motivo especificado'
    };

    const enviado = await enviarEmailRecordatorio(emailData);

    if (enviado) {
      res.json({
        success: true,
        message: 'Email enviado correctamente'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error al enviar email'
      });
    }

  } catch (error) {
    console.error('❌ Error enviando email inmediato:', error);
    res.status(500).json({
      success: false,
      error: 'Error en el servidor',
      details: error.message
    });
  }
});

// 4️⃣ Endpoint para obtener emails programados
app.get('/emails-programados', (req, res) => {
  res.json({
    success: true,
    total: emailsProgramados.length,
    emails: emailsProgramados.map(e => ({
      reservaId: e.reservaId,
      usuarioEmail: e.usuarioEmail,
      salaNumero: e.salaNumero,
      fecha: e.fecha,
      horaInicio: e.horaInicio,
      fechaEnvio: e.fechaEnvio,
      enviado: e.enviado
    }))
  });
});

// 5️⃣ Endpoint de salud
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    emailsProgramados: emailsProgramados.length,
    uptime: process.uptime(),
    brevoConfigured: !!process.env.BREVO_API_KEY
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║  🚀 Servidor Century 21 iniciado correctamente        ║
╠════════════════════════════════════════════════════════╣
║  📡 Puerto: ${PORT}                                    
║  ⏰ Cron activo: verificación cada minuto              ║
║  📧 Emails programados: ${emailsProgramados.length}                              ║
║  📅 Fecha: ${new Date().toLocaleString('es-AR')}
║  🔐 Brevo: ${process.env.BREVO_API_KEY ? '✅ Configurado' : '❌ Falta API Key'}       
╚════════════════════════════════════════════════════════╝
  `);
});