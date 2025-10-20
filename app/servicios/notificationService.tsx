// app/servicios/notificationService.ts
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';


interface NotificationPayload {
  title: string;
  body: string;
  data?: any;
}


  const convertirAFormatoDDMMYYYY = (fechaISO: string): string => {
  const [anio, mes, dia] = fechaISO.split('-');
  return `${dia}-${mes}-${anio}`;
  };

/**
 * Envía notificaciones push a todos los usuarios con rol admin o superuser
 */
export async function sendNotificationToAdmins(notification: NotificationPayload): Promise<void> {
  try {
    console.log('🔔 Enviando notificaciones a admins y superusers...');

    // Obtener todos los usuarios con rol admin o superuser
    const usersRef = collection(db, 'users');
    const adminQuery = query(usersRef,where('role', 'in', ['admin', 'superuser']));
    const querySnapshot = await getDocs(adminQuery);
    const pushTokens: string[] = [];

    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      // Verificar que el usuario tenga token y no esté eliminado
      if (userData.notificationToken && !userData.eliminado) {
        pushTokens.push(userData.notificationToken);
      }
    });

    console.log(`📱 Tokens encontrados: ${pushTokens.length}`);

    if (pushTokens.length === 0) {
      console.log('⚠️ No hay tokens de notificación disponibles');
      return;
    }

    // Enviar notificaciones en lotes de 100 (límite de Expo)
    const messages = pushTokens.map((token) => ({
      to: token,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      priority: 'high',
      channelId: 'default',
    }));

    const batchSize = 100;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      const result = await response.json();
      console.log('✅ Lote de notificaciones enviado:', result);
    }

    console.log('✅ Todas las notificaciones fueron enviadas exitosamente');
  } catch (error) {
    console.error('❌ Error enviando notificaciones:', error);
    // No lanzamos el error para no interrumpir el flujo principal
  }
}

/**
 * Envía notificación cuando se crea una reserva
 */
export async function notifyReservaCreated(userName: string,salaName: string,fecha: string,horaInicio: string,horaFin: string,): Promise<void> {
  const fechaFormateada = convertirAFormatoDDMMYYYY(fecha);
  await sendNotificationToAdmins({
    title: '📅 Nueva Reserva Creada',
    body: `${userName} reservó ${salaName} el ${fechaFormateada} de ${horaInicio} a ${horaFin}`,
    data: {
      type: 'reserva_created',
      salaName,
      fecha,
      horaInicio,
      horaFin,
      userName,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Envía notificación cuando se edita una reserva
 */
export async function notifyReservaEdited(
  userName: string,
  salaName: string,
  fecha: string,
  horaInicio: string,
  horaFin: string,
): Promise<void> {
  const fechaFormateada = convertirAFormatoDDMMYYYY(fecha);
  await sendNotificationToAdmins({
    title: '✏️ Reserva Modificada',
    body: `${userName} modificó su reserva de ${salaName} para el ${fechaFormateada} de ${horaInicio} a ${horaFin}`,
    data: {
      type: 'reserva_edited',
      salaName,
      fecha,
      horaInicio,
      horaFin,
      userName,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Envía notificación cuando se elimina una reserva
 */
export async function notifyReservaDeleted(
  userName: string,
  salaName: string,
  fecha: string,
  horaInicio: string,
  horaFin: string,
): Promise<void> {
  console.log("enviando notificacion al eliminar reserva");
  const fechaFormateada = convertirAFormatoDDMMYYYY(fecha);
  await sendNotificationToAdmins({
    title: '🗑️ Reserva Eliminada',
    body: `${userName} eliminó su reserva de ${salaName} del ${fechaFormateada} de ${horaInicio} a ${horaFin}`,
    data: {
      type: 'reserva_deleted',
      salaName,
      fecha,
      horaInicio,
      horaFin,
      userName,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Envía notificación cuando un admin elimina una reserva de otro usuario
 */
export async function notifyReservaDeletedByAdmin(
  userName: string,
  salaName: string,
  fecha: string,
  horaInicio: string,
  horaFin: string,
): Promise<void> {
  const fechaFormateada = convertirAFormatoDDMMYYYY(fecha);
  await sendNotificationToAdmins({
    title: '⚠️ Reserva Eliminada por Admin',
    body: `${userName} eliminó la reserva en ${salaName} del ${fechaFormateada} de ${horaInicio} a ${horaFin}`,
    data: {
      type: 'reserva_deleted_by_admin',
      salaName,
      fecha,
      horaInicio,
      horaFin,
      userName,
      timestamp: new Date().toISOString(),
    },
  });
}