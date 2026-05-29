import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Reemplaza con tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBi_5koVC7msEjdfjGPWCRjnDfdTxvKv_8",
  authDomain: "la-joya-hotel.firebaseapp.com",
  projectId: "la-joya-hotel",
  storageBucket: "la-joya-hotel.firebasestorage.app",
  messagingSenderId: "279051030212",
  appId: "1:279051030212:web:b26819c4ed4859825f0391",
  measurementId: "G-018E8ZRQY7"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
