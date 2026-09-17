// firebase.web.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from "./firebase.config";
import { getStorage } from "firebase/storage";

const appFirebase = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

export const auth = getAuth(appFirebase);

// browserLocalPersistence guarda la sesión en IndexedDB del navegador:
// sobrevive a cerrar la pestaña, cerrar el navegador, y reiniciar el celu/PC.
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.log("⚠️ No se pudo configurar la persistencia web:", err);
});

export const db = getFirestore(appFirebase);
export const storage = getStorage(appFirebase);
export default appFirebase;