// email-server-c21/server.js - Backend Century 21 con Brevo + Firestore
const express = require('express');
const SibApiV3Sdk = require('@getbrevo/brevo');
const cron = require('node-cron');
const cors = require('cors');
require('dotenv').config();

// Agregar Firebase Admin SDK
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  })
});

const db = admin.firestore();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Array en memoria (respaldo temporal)
let emailsProgramados = [];

// CONFIGURACION BREVO
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
apiInstance.setApiKey(
  SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

if (!process.env.BREVO_API_KEY) {
  console.error('❌ ERROR: Falta BREVO_API_KEY');
} else {
  console.log('✅ Brevo API Key configurada');
}

// ========== FUNCIONES AUXILIARES ==========

const enviarEmailRecordatorio = async (emailData) => {
  try {
    console.log('📧 Enviando email a:', emailData.usuarioEmail);
    
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
    console.log(`✅ Email enviado a ${emailData.usuarioEmail}`);
    return true;
    
  } catch (error) {
    console.error('❌ Error enviando email:', error.message);
    return false;
  }
};

// Procesar emails pendientes desde Firestore
const procesarEmailsPendientes = async () => {
  try {
    const ahora = new Date();
    console.log(`⏰ Procesando emails pendientes en Firestore...`);

    // Buscar emails pendientes cuya fecha de envío ya pasó
    const emailsRef = db.collection('emailsProgramados');
    const snapshot = await emailsRef
      .where('estado', '==', 'pendiente')
      .where('fechaEnvio', '<=', ahora)
      .get();

    if (snapshot.empty) {
      console.log('✅ No hay emails pendientes para enviar');
      return;
    }

    console.log(`📬 Se encontraron ${snapshot.size} emails para enviar`);

    // Procesar cada email
    for (const doc of snapshot.docs) {
      const emailData = doc.data();
      
      console.log(`📤 Enviando email a ${emailData.usuarioEmail}...`);
      
      const enviado = await enviarEmailRecordatorio({
        usuarioEmail: emailData.usuarioEmail,
        salaNumero: emailData.salaNumero,
        fecha: emailData.fecha,
        horaInicio: emailData.horaInicio,
        motivo: emailData.motivo
      });

      if (enviado) {
        // Marcar como enviado
        await emailsRef.doc(doc.id).update({
          estado: 'enviado',
          enviadoEn: new Date()
        });
        console.log(`✅ Email procesado y marcado como enviado`);
      } else {
        // Marcar como fallido
        await emailsRef.doc(doc.id).update({
          estado: 'fallido',
          intentos: admin.firestore.FieldValue.increment(1)
        });
        console.log(`❌ Email marcado como fallido`);
      }
    }

  } catch (error) {
    console.error('❌ Error procesando emails desde Firestore:', error);
  }
};

// CRON JOB: Verificar emails cada minuto
cron.schedule('* * * * *', () => {
  console.log(`⏰ [${new Date().toISOString()}] Verificando emails...`);
  procesarEmailsPendientes();
});

// ========== ENDPOINTS API ==========

// 1️⃣ Programar email (ahora guarda DIRECTO en Firestore)
app.post('/programar-email', async (req, res) => {
  try {
    console.log('📥 Recibiendo petición /programar-email');
    
    const { reservaId, usuarioEmail, salaNumero, fecha, horaInicio, motivo } = req.body;

    if (!reservaId || !usuarioEmail || !salaNumero || !fecha || !horaInicio) {
      return res.status(400).json({
        success: false,
        error: 'Faltan datos requeridos'
      });
    }

    const [anio, mes, dia] = fecha.split('-').map(Number);
    const [hora, minuto] = horaInicio.split(':').map(Number);

    // Crear fecha local Argentina
    const fechaReservaLocal = new Date(anio, mes - 1, dia, hora, minuto);
    
    // Convertir a UTC (Argentina es UTC-3)
    const fechaReservaUTC = new Date(fechaReservaLocal.getTime() + (3 * 60 * 60 * 1000));
    
    // Fecha de envío: 1 hora antes
    const fechaEnvio = new Date(fechaReservaUTC.getTime() - (60 * 60 * 1000));

    const ahora = new Date();
    
    if (fechaEnvio <= ahora) {
      return res.status(400).json({
        success: false,
        error: 'La fecha de envío debe ser futura'
      });
    }

    // GUARDAR EN FIRESTORE
    const emailDoc = {
      reservaId,
      usuarioEmail,
      salaNumero,
      fecha,
      horaInicio,
      motivo: motivo || 'Sin motivo especificado',
      fechaReserva: admin.firestore.Timestamp.fromDate(fechaReservaUTC),
      fechaEnvio: admin.firestore.Timestamp.fromDate(fechaEnvio),
      estado: 'pendiente',
      intentos: 0,
      creadoEn: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('emailsProgramados').add(emailDoc);

    console.log(`✅ Email guardado en Firestore con ID: ${docRef.id}`);

    res.json({
      success: true,
      message: 'Email programado correctamente en Firestore',
      emailId: docRef.id,
      fechaEnvio: fechaEnvio.toISOString()
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

// 2️⃣ Cancelar email programado
app.post('/cancelar-email', async (req, res) => {
  try {
    const { reservaId } = req.body;

    if (!reservaId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere reservaId'
      });
    }

    // Buscar en Firestore
    const snapshot = await db.collection('emailsProgramados')
      .where('reservaId', '==', reservaId)
      .where('estado', '==', 'pendiente')
      .get();

    if (snapshot.empty) {
      return res.json({
        success: false,
        message: 'Email no encontrado o ya fue enviado'
      });
    }

    // Eliminar todos los documentos encontrados
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    console.log(`✅ Email cancelado para reserva ${reservaId}`);
    
    res.json({
      success: true,
      message: 'Email cancelado correctamente'
    });

  } catch (error) {
    console.error('❌ Error cancelando email:', error);
    res.status(500).json({
      success: false,
      error: 'Error en el servidor',
      details: error.message
    });
  }
});

// 3️⃣ Enviar email inmediatamente
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

    res.json({
      success: enviado,
      message: enviado ? 'Email enviado correctamente' : 'Error al enviar email'
    });

  } catch (error) {
    console.error('❌ Error enviando email inmediato:', error);
    res.status(500).json({
      success: false,
      error: 'Error en el servidor',
      details: error.message
    });
  }
});

// 4️⃣ Obtener emails programados desde Firestore
app.get('/emails-programados', async (req, res) => {
  try {
    const snapshot = await db.collection('emailsProgramados')
      .where('estado', '==', 'pendiente')
      .orderBy('fechaEnvio', 'asc')
      .get();

    const emails = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      fechaEnvio: doc.data().fechaEnvio.toDate().toISOString()
    }));

    res.json({
      success: true,
      total: emails.length,
      emails
    });

  } catch (error) {
    console.error('❌ Error obteniendo emails:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 5️⃣ Endpoint de salud (para cron-job.org)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    brevoConfigured: !!process.env.BREVO_API_KEY,
    firebaseConfigured: !!admin.apps.length
  });
});

// Endpoint para procesar emails manualmente
app.post('/procesar-emails-pendientes', async (req, res) => {
  try {
    await procesarEmailsPendientes();
    res.json({
      success: true,
      message: 'Procesamiento completado'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║  🚀 Servidor Century 21 con Firestore                 ║
╠════════════════════════════════════════════════════════╣
║  📡 Puerto: ${PORT}                                    
║  ⏰ Cron activo: cada minuto                           ║
║  📅 Fecha: ${new Date().toLocaleString('es-AR')}
║  🔐 Brevo: ${process.env.BREVO_API_KEY ? '✅' : '❌'}       
║  🔥 Firebase: ${admin.apps.length ? '✅' : '❌'}       
╚════════════════════════════════════════════════════════╝
  `);
});