// notifications.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export async function registerForPushNotificationsAsync(uid: string) {
  if (!uid) return;

  if (!Device.isDevice) {
    alert('Debe usarse un dispositivo físico.');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    alert('No se otorgaron permisos para notificaciones.');
    return;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log('Token:', token);

  // 🔥 Guardar directamente en Firestore
  await updateDoc(doc(db, 'users', uid), {
    notificationToken: token,
  });
}
