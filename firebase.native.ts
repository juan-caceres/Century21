// firebase.native.ts
import { initializeApp, getApps, getApp } from "firebase/app";
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from "./firebase.config";

const appFirebase = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

export const auth = initializeAuth(appFirebase, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(appFirebase);
export default appFirebase;