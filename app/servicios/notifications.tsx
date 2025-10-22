// app/servicios/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import Constants from 'expo-constants';

/**
 * Registra el dispositivo para recibir notificaciones push
 * y guarda el token en Firestore
 */
export async function registerForPushNotificationsAsync(uid: string) {

  

  if (!uid) {
    console.log('⚠️ No se proporcionó UID');
    return;
  }

  // Verificar que sea un dispositivo físico
  if (!Device.isDevice) {
    console.log('⚠️ Debe usarse un dispositivo físico para notificaciones push');
    return;
  }

  try {
    // Configurar canal de Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#BEAF87',
        sound: 'default',
      });
    }

    // Verificar permisos existentes
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Si no tiene permisos, solicitarlos
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // Si no se otorgaron permisos, salir
    if (finalStatus !== 'granted') {
      console.log('❌ No se otorgaron permisos para notificaciones');
      return;
    }

    // Obtener el token de Expo Push
    const projectId = 
      Constants.expoConfig?.extra?.eas?.projectId ?? 
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.log('⚠️ No se encontró projectId en la configuración');
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ 
      projectId 
    });
    const token = tokenData.data;

    console.log('✅ Token de notificación obtenido:', token);



    // Guardar el token en Firestore
    await updateDoc(doc(db, 'users', uid), {
      notificationToken: token,
      lastTokenUpdate: new Date().toISOString(),
    });

    console.log('✅ Token guardado en Firestore para el usuario:', uid);

    return token;
  } catch (error) {
    console.error('❌ Error registrando notificaciones:', error);
  }
}

/**
 * Limpia el token de notificaciones del usuario
 * Útil cuando el usuario cierra sesión
 */
export async function clearPushToken(uid: string) {
  try {
    await updateDoc(doc(db, 'users', uid), {
      notificationToken: '',
    });
    console.log('✅ Token de notificación eliminado');
  } catch (error) {
    console.error('❌ Error eliminando token:', error);
  }
}