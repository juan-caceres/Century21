// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDXMZ1-8JHRmrSr1KYgSIsScadsoxhlZXM",
  authDomain: "century21-60277.firebaseapp.com",
  projectId: "century21-60277",
  storageBucket: "century21-60277.firebasestorage.app",
  messagingSenderId: "423314868478",
  appId: "1:423314868478:web:559cd38606fa7e7268bdaf",
  measurementId: "G-LMFH7QCEMV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);