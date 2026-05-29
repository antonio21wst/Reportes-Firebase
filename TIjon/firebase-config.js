import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuración específica de Firebase para TIJON
const firebaseConfig = {
  apiKey: "AIzaSyDgFtoVmicImRs_QAbplJYLpBEkxjA2Ubg",
  authDomain: "tijon-82005.firebaseapp.com",
  projectId: "tijon-82005",
  storageBucket: "tijon-82005.firebasestorage.app",
  messagingSenderId: "1067781009826",
  appId: "1:1067781009826:web:904adf39fd641a5dd842fb",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
