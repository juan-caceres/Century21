//firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
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

const appFirebase = !getApps().length ? initializeApp(firebaseConfig) : getApp(); //evitamos inicializar varias veces
const auth = initializeAuth(appFirebase, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
const db = getFirestore(appFirebase);

export { appFirebase, auth, db };