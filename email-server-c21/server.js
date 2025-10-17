// email-server-c21/server.js - Backend para enviar emails con SendGrid
const express = require('express');
const sgMail = require('@sendgrid/mail');
const cors = require('cors');
require('dotenv').config();
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar SendGrid
if (!process.env.SENDGRID_API_KEY) {
  console.error('❌ SENDGRID_API_KEY no configurada en variables de entorno');
}
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Inicializar Firebase Admin
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : require('./serviceAccountKey.json');
  
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Middleware
app.use(cors());
app.use(express.json());

// Almacenamiento en memoria de timeouts activos
const timeoutsActivos = new Map();

// 🔥 Al iniciar: cargar emails pendientes de Firestore
async function cargarEmailsPendientes() {
  try {
    const ahora = new Date();
    const snapshot = await db.collection('emailsProgramados')
      .where('estado', '==', 'pendiente')
      .get();

    console.log(`📥 Cargando ${snapshot.size} emails pendientes de Firestore...`);

    if (snapshot.empty) {
      console.log('✅ No hay emails pendientes');
      return;
    }

    let emailsEnviados = 0;
    let emailsProgramados = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const fechaEnvio = data.fechaEnvio.toDate ? data.fechaEnvio.toDate() : new Date(data.fechaEnvio);
      
      if (fechaEnvio <= ahora) {
        // Si ya pasó la fecha, enviar inmediatamente
        await enviarYMarcarComoEnviado(doc.id, data);
        emailsEnviados++;
      } else {
        // Programar para más tarde
        programarTimeout(doc.id, fechaEnvio, data);
        emailsProgramados++;
      }
    }

    console.log(`✅ Emails pendientes cargados: ${emailsEnviados} enviados ahora, ${emailsProgramados} programados para después`);
  } catch (error) {
    console.error('❌ Error al cargar emails pendientes:', error);
  }
}

// Función para programar timeout
function programarTimeout(docId, fechaEnvio, data) {
  const fechaEnvioDate = fechaEnvio instanceof Date ? fechaEnvio : fechaEnvio.toDate();
  const delay = fechaEnvioDate.getTime() - Date.now();
  
  if (delay <= 0) {
    enviarYMarcarComoEnviado(docId, data);
    return;
  }

  const timeoutId = setTimeout(async () => {
    await enviarYMarcarComoEnviado(docId, data);
    timeoutsActivos.delete(docId);
  }, delay);

  timeoutsActivos.set(docId, timeoutId);
  
  console.log(`⏰ Timeout programado para ${data.usuarioEmail} - ${fechaEnvioDate.toLocaleString('es-AR')}`);
}

// Función para enviar email y actualizar Firestore
async function enviarYMarcarComoEnviado(docId, data) {
  try {
    await enviarEmailRecordatorio(
      data.usuarioEmail,
      data.salaNumero,
      data.fecha,
      data.horaInicio,
      data.motivo
    );

    await db.collection('emailsProgramados').doc(docId).update({
      estado: 'enviado',
      fechaEnviado: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Email enviado y marcado como enviado: ${data.usuarioEmail}`);
  } catch (error) {
    console.error(`❌ Error al enviar email ${docId}:`, error.message);
    
    await db.collection('emailsProgramados').doc(docId).update({
      estado: 'error',
      error: error.message,
      fechaError: admin.firestore.FieldValue.serverTimestamp()
    });
  }
}

// Endpoint de salud
app.get('/', (req, res) => {
  const apiKeyConfigured = !!process.env.SENDGRID_API_KEY;
  const fromEmailConfigured = !!process.env.SENDGRID_FROM_EMAIL;
  
  res.json({ 
    status: 'OK', 
    message: 'Servidor de emails activo con SendGrid',
    timeoutsActivos: timeoutsActivos.size,
    emailsProgramados: timeoutsActivos.size,
    sendgridConfigured: apiKeyConfigured && fromEmailConfigured,
    warnings: {
      apiKey: apiKeyConfigured ? 'OK' : 'FALTA SENDGRID_API_KEY',
      fromEmail: fromEmailConfigured ? 'OK' : 'FALTA SENDGRID_FROM_EMAIL'
    }
  });
});

// 🔥 Programar email (guardar en Firestore)
app.post('/programar-email', async (req, res) => {
  try {
    const { 
      reservaId,
      usuarioEmail, 
      salaNumero, 
      fecha, 
      horaInicio, 
      motivo
    } = req.body;

    if (!usuarioEmail || !salaNumero || !fecha || !horaInicio || !motivo) {
      return res.status(400).json({ 
        success: false, 
        error: 'Faltan datos requeridos' 
      });
    }

    // Parsear fecha y hora
    const [anio, mes, dia] = fecha.split('-').map(Number);
    const [hora, minuto] = horaInicio.split(':').map(Number);
    const fechaReserva = new Date(anio, mes - 1, dia, hora, minuto);
    const fechaEnvio = new Date(fechaReserva.getTime() - 60 * 60 * 1000);
    
    const ahora = new Date();
    
    // 🔥 Guardar en Firestore
    const emailDoc = {
      reservaId: reservaId || null,
      usuarioEmail,
      salaNumero,
      fecha,
      horaInicio,
      motivo,
      fechaReserva: admin.firestore.Timestamp.fromDate(fechaReserva),
      fechaEnvio: admin.firestore.Timestamp.fromDate(fechaEnvio),
      estado: 'pendiente',
      creadoEn: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('emailsProgramados').add(emailDoc);
    
    if (fechaEnvio <= ahora) {
      // Enviar inmediatamente
      await enviarYMarcarComoEnviado(docRef.id, emailDoc);
      
      return res.json({ 
        success: true, 
        message: 'Email enviado inmediatamente (reserva en menos de 1 hora)',
        emailId: docRef.id,
        fechaEnvio: 'inmediato'
      });
    }
    
    // Programar timeout
    programarTimeout(docRef.id, fechaEnvio, emailDoc);
    
    console.log(`📅 Email guardado en Firestore: ${docRef.id}`);
    
    res.json({ 
      success: true, 
      message: 'Email programado correctamente',
      emailId: docRef.id,
      fechaEnvio: fechaEnvio.toISOString(),
      delayMinutos: Math.round((fechaEnvio.getTime() - ahora.getTime()) / 60000)
    });

  } catch (error) {
    console.error('❌ Error al programar email:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al programar el email',
      details: error.message 
    });
  }
});

// 🔥 Cancelar email programado
app.post('/cancelar-email', async (req, res) => {
  try {
    const { reservaId } = req.body;
    
    if (!reservaId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Se requiere reservaId' 
      });
    }

    const snapshot = await db.collection('emailsProgramados')
      .where('reservaId', '==', reservaId)
      .where('estado', '==', 'pendiente')
      .get();

    if (snapshot.empty) {
      return res.json({ 
        success: true, 
        message: 'Email no estaba programado o ya fue enviado' 
      });
    }

    for (const doc of snapshot.docs) {
      if (timeoutsActivos.has(doc.id)) {
        clearTimeout(timeoutsActivos.get(doc.id));
        timeoutsActivos.delete(doc.id);
      }

      await doc.ref.update({
        estado: 'cancelado',
        fechaCancelado: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`🗑️ Email cancelado: ${doc.id}`);
    }
    
    res.json({ 
      success: true, 
      message: 'Email cancelado correctamente',
      cancelados: snapshot.size
    });
    
  } catch (error) {
    console.error('❌ Error al cancelar email:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al cancelar el email',
      details: error.message 
    });
  }
});

// Función auxiliar para enviar email con SendGrid
async function enviarEmailRecordatorio(usuarioEmail, salaNumero, fecha, horaInicio, motivo) {
  // Validar que los parámetros no sean undefined
  if (!usuarioEmail || !salaNumero || !fecha || !horaInicio || !motivo) {
    throw new Error('Faltan parámetros requeridos para enviar email');
  }

  const msg = {
    to: usuarioEmail,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: `Recordatorio: Reserva en Sala ${salaNumero}`,
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;background-color:#f4f4f4;padding:20px;margin:0}.container{background-color:white;border-radius:10px;padding:30px;max-width:600px;margin:0 auto;box-shadow:0 2px 10px rgba(0,0,0,0.1)}.header{background-color:#BEAF87;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center}.header h1{margin:0;font-size:24px}.content{padding:20px}.info-row{margin:15px 0;padding:12px;background-color:#f9f9f9;border-left:4px solid #BEAF87;border-radius:4px}.info-label{font-weight:bold;color:#252526;font-size:14px}.info-value{color:#333;margin-top:5px;font-size:16px}.footer{text-align:center;margin-top:30px;padding-top:20px;border-top:1px solid #ddd;color:#666;font-size:12px}.alert{background-color:#fff3cd;border:2px solid #ffc107;padding:15px;border-radius:5px;margin:20px 0;text-align:center;font-weight:bold}.warning{color:#856404;font-size:16px}</style></head><body><div class="container"><div class="header"><h1>RECORDATORIO DE RESERVA</h1></div><div class="content"><div class="alert"><p class="warning">Tu reserva comienza en 1 HORA</p><p style="margin:5px 0;color:#856404;">No olvides asistir.</p></div><div class="info-row"><div class="info-label">Sala:</div><div class="info-value">${String(salaNumero).replace(/[<>]/g, '')}</div></div><div class="info-row"><div class="info-label">Fecha:</div><div class="info-value">${String(fecha).replace(/[<>]/g, '')}</div></div><div class="info-row"><div class="info-label">Hora de inicio:</div><div class="info-value">${String(horaInicio).replace(/[<>]/g, '')}</div></div><div class="info-row"><div class="info-label">Motivo:</div><div class="info-value">${String(motivo).replace(/[<>]/g, '')}</div></div></div><div class="footer"><p><strong>Sistema de Gestion de Salas C21</strong></p><p>Este es un mensaje automatico, por favor no responder.</p></div></div></body></html>`,
    text: `Recordatorio de Reserva
========================

Tu reserva comienza en 1 HORA

Sala: ${salaNumero}
Fecha: ${fecha}
Hora de inicio: ${horaInicio}
Motivo: ${motivo}

No olvides asistir.

========================
Sistema de Gestion de Salas C21`,
  };

  try {
    const result = await sgMail.send(msg);
    console.log('✅ Email enviado correctamente con SendGrid');
    return result;
  } catch (error) {
    console.error('❌ Error al enviar email con SendGrid:', error.message);
    if (error.response && error.response.body && error.response.body.errors) {
      console.error('Detalles del error SendGrid:', JSON.stringify(error.response.body.errors, null, 2));
    }
    throw error;
  }
}

// Endpoint legacy (opcional, para compatibilidad)
app.post('/enviar-recordatorio', async (req, res) => {
  try {
    const { usuarioEmail, salaNumero, fecha, horaInicio, motivo } = req.body;

    if (!usuarioEmail || !salaNumero || !fecha || !horaInicio || !motivo) {
      return res.status(400).json({ 
        success: false, 
        error: 'Faltan datos requeridos' 
      });
    }

    const info = await enviarEmailRecordatorio(usuarioEmail, salaNumero, fecha, horaInicio, motivo);
    
    console.log('✅ Email enviado');
    res.json({ 
      success: true, 
      message: 'Email enviado correctamente',
      messageId: info[0]?.messageId || 'sent'
    });

  } catch (error) {
    console.error('❌ Error al enviar email:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al enviar el email',
      details: error.message 
    });
  }
});

app.get('/keep-alive', (req, res) => {
  const ahora = new Date();
  const horaActual = ahora.getHours();
  const diaActual = ahora.getDay();
  
  const esHorarioLaboral = diaActual >= 1 && diaActual <= 6 && horaActual >= 8 && horaActual < 18;
  
  console.log(`🏓 Ping recibido a las ${ahora.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}`);

  res.json({ 
    status: 'awake',
    message: 'Servidor activo',
    timestamp: ahora.toISOString(),
    timeoutsActivos: timeoutsActivos.size,
    emailsProgramados: timeoutsActivos.size,
    horarioLaboral: esHorarioLaboral,
    hora: `${horaActual}:${ahora.getMinutes().toString().padStart(2, '0')}`,
    dia: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][diaActual]
  });
});

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📧 Cargando emails pendientes...`);
  await cargarEmailsPendientes();
  console.log(`✅ Servidor listo para recibir peticiones`);
});