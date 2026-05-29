import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Reemplaza con tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAbByDGyg4ovT32J27sN0QMmSNeNwkgpZI",
  authDomain: "courtyar-94e3a.firebaseapp.com",
  projectId: "courtyar-94e3a",
  storageBucket: "courtyar-94e3a.firebasestorage.app",
  messagingSenderId: "437000575809",
  appId: "1:437000575809:web:be48b97e65e32d9a681fc0",
  measurementId: "G-H713G0SZRW"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
