import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
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

const appFirebase = initializeApp(firebaseConfig);
export const auth = getAuth(appFirebase);
export const db = getFirestore(appFirebase);