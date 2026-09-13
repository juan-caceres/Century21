import { initializeApp, getApps, getApp } from "firebase/app";
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = { 
  apiKey: "AIzaSyDXMZ1-8JHRmrSr1KYgSIsScadsoxhlZXM", 
  authDomain: "century21-60277.firebaseapp.com", 
  projectId: "century21-60277",
  storageBucket: "century21-60277.appspot.com",
  messagingSenderId: "423314868478",
  appId: "1:423314868478:web:559cd38606fa7e7268bdaf",
  measurementId: "G-LMFH7QCEMV"
};

// 1. Inicializamos la app
const appFirebase = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

// 2. Inicializamos Auth con persistencia para que no se cierre la sesión
export const auth = initializeAuth(appFirebase, /*{
  persistence: getReactNativePersistence(AsyncStorage)
}*/);

// 3. Exportamos la base de datos
export const db = getFirestore(appFirebase);
export default appFirebase;