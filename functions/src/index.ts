// functions/src/index.ts
import { setGlobalOptions } from "firebase-functions/v2";
import { onDocumentCreated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall } from "firebase-functions/v2/https";
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import { defineSecret } from "firebase-functions/params";

// Inicializar Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Configuración global
setGlobalOptions({ 
  maxInstances: 10,
  region: "southamerica-east1"
});

// ✅ Secrets de Firebase (método moderno)
const emailUserSecret = defineSecret("EMAIL_USER");
const emailPassSecret = defineSecret("EMAIL_PASS");

// ✅ FUNCIÓN para crear transporter con Brevo
function getTransporter() {
  console.log('📧 Configurando transporter con Brevo...');
  console.log('EMAIL_USER existe:', !!emailUserSecret.value());
  console.log('EMAIL_PASS existe:', !!emailPassSecret.value());
  
  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: emailUserSecret.value(), // Tu email de Brevo
      pass: emailPassSecret.value()  // Tu SMTP key de Brevo
    }
  });
}

// ============================================
// 1. TRIGGER: Cuando se crea una reserva
// ============================================
export const onReservaCreated = onDocumentCreated(
  {
    document: "reservas/{reservaId}",
    secrets: [emailUserSecret, emailPassSecret]
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log("No hay datos en el snapshot");
      return;
    }

    const reservaId = event.params.reservaId;
    const reserva = snapshot.data();

    console.log('🔔 Nueva reserva creada:', reservaId);

    try {
      // Calcular fecha de envío (1 hora antes)
      const [anio, mes, dia] = reserva.fecha.split('-').map(Number);
      const [hora, minuto] = reserva.horaInicio.split(':').map(Number);

      // La hora guardada es hora local de Argentina
      const fechaReservaLocal = new Date(anio, mes - 1, dia, hora, minuto);
      
      // Convertir a UTC sumando 3 horas
      const fechaReservaUTC = new Date(fechaReservaLocal.getTime() + (3 * 60 * 60 * 1000));
      
      // Calcular 1 hora antes en UTC
      const fechaEnvio = new Date(fechaReservaUTC.getTime() - (60 * 60 * 1000));

      const ahora = new Date();

      console.log('📅 Fecha reserva local (Argentina):', fechaReservaLocal.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }));
      console.log('📅 Fecha reserva UTC:', fechaReservaUTC.toISOString());
      console.log('📧 Fecha envío UTC:', fechaEnvio.toISOString());
      console.log('🕐 Ahora UTC:', ahora.toISOString());

      if (fechaEnvio <= ahora) {
        console.log('⚠️ La fecha de envío ya pasó, no se programa email');
        return;
      }

      // Guardar email programado en Firestore
      await db.collection('emailsProgramados').add({
        reservaId,
        usuarioEmail: reserva.usuarioEmail,
        salaNumero: reserva.sala,
        fecha: reserva.fecha,
        horaInicio: reserva.horaInicio,
        motivo: reserva.motivo || 'Sin motivo especificado',
        fechaReserva: admin.firestore.Timestamp.fromDate(fechaReservaUTC),
        fechaEnvio: admin.firestore.Timestamp.fromDate(fechaEnvio),
        estado: 'pendiente',
        intentos: 0,
        creadoEn: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log('✅ Email programado correctamente para', fechaEnvio.toISOString());

    } catch (error) {
      console.error('❌ Error programando email:', error);
    }
  }
);

// ============================================
// 2. TRIGGER: Cuando se elimina una reserva
// ============================================
export const onReservaDeleted = onDocumentDeleted(
  "reservas/{reservaId}",
  async (event) => {
    const reservaId = event.params.reservaId;

    console.log('🗑️ Reserva eliminada:', reservaId);

    try {
      // Buscar emails programados para esta reserva
      const emailsSnapshot = await db.collection('emailsProgramados')
        .where('reservaId', '==', reservaId)
        .where('estado', '==', 'pendiente')
        .get();

      if (emailsSnapshot.empty) {
        console.log('ℹ️ No hay emails pendientes para cancelar');
        return;
      }

      // Eliminar todos los emails pendientes
      const batch = db.batch();
      emailsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      console.log(`✅ ${emailsSnapshot.size} email(s) cancelado(s)`);

    } catch (error) {
      console.error('❌ Error cancelando emails:', error);
    }
  }
);

// ============================================
// 3. FUNCIÓN PROGRAMADA: Procesar emails cada 5 minutos
// ============================================
export const procesarEmailsPendientes = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "America/Argentina/Buenos_Aires",
    secrets: [emailUserSecret, emailPassSecret]
  },
  async (event) => {
    console.log('⏰ Procesando emails pendientes...', new Date().toISOString());

    try {
      const ahora = admin.firestore.Timestamp.now();

      // Buscar emails pendientes cuya fecha de envío ya pasó
      const emailsSnapshot = await db.collection('emailsProgramados')
        .where('estado', '==', 'pendiente')
        .where('fechaEnvio', '<=', ahora)
        .limit(50)
        .get();

      if (emailsSnapshot.empty) {
        console.log('✅ No hay emails pendientes');
        return;
      }

      console.log(`📬 Procesando ${emailsSnapshot.size} emails...`);

      // Procesar cada email
      const promises = emailsSnapshot.docs.map(async (doc) => {
        const emailData = doc.data();

        try {
          await enviarEmailRecordatorio(emailData);

          // Marcar como enviado
          await doc.ref.update({
            estado: 'enviado',
            enviadoEn: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log(`✅ Email enviado a ${emailData.usuarioEmail}`);

        } catch (error) {
          console.error(`❌ Error enviando email a ${emailData.usuarioEmail}:`, error);

          // Marcar como fallido (máximo 3 reintentos)
          const intentos = (emailData.intentos || 0) + 1;
          
          if (intentos >= 3) {
            await doc.ref.update({
              estado: 'fallido',
              intentos,
              errorMessage: error instanceof Error ? error.message : 'Error desconocido'
            });
          } else {
            await doc.ref.update({
              intentos,
            });
          }
        }
      });

      await Promise.all(promises);
      console.log('✅ Procesamiento completado');

    } catch (error) {
      console.error('❌ Error en procesamiento:', error);
    }
  }
);

// ============================================
// 4. FUNCIÓN: Enviar email de recordatorio
// ============================================
async function enviarEmailRecordatorio(emailData: any): Promise<void> {
  const transporter = getTransporter();
  const fechaFormateada = convertirAFormatoDDMMYYYY(emailData.fecha);

  const mailOptions = {
    from: `"Century 21 Reservas" <${emailUserSecret.value()}>`,
    to: emailData.usuarioEmail,
    subject: `🔔 Recordatorio: Reserva en ${emailData.salaNumero} - 1 hora restante`,
    html: `
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
                <li>📅 <strong>Fecha:</strong> ${fechaFormateada}</li>
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
    `,
  };

  await transporter.sendMail(mailOptions);
}

// ============================================
// 5. FUNCIÓN HTTP: Enviar email inmediato (para testing)
// ============================================
export const enviarRecordatorioInmediato = onCall(
  {
    secrets: [emailUserSecret, emailPassSecret],
    cors: true
  },
  async (request) => {
    // Verificar autenticación
    if (!request.auth) {
      throw new Error('Usuario no autenticado');
    }

    const { usuarioEmail, salaNumero, fecha, horaInicio, motivo } = request.data;

    if (!usuarioEmail || !salaNumero || !fecha || !horaInicio) {
      throw new Error('Faltan datos requeridos');
    }

    try {
      await enviarEmailRecordatorio({
        usuarioEmail,
        salaNumero,
        fecha,
        horaInicio,
        motivo: motivo || 'Sin motivo especificado',
      });

      return { success: true, message: 'Email enviado correctamente' };

    } catch (error: any) {
      console.error('Error enviando email:', error);
      throw new Error(error.message);
    }
  }
);

// ============================================
// HELPER: Convertir fecha a DD-MM-YYYY
// ============================================
function convertirAFormatoDDMMYYYY(fechaISO: string): string {
  const [anio, mes, dia] = fechaISO.split('-');
  return `${dia}-${mes}-${anio}`;
}