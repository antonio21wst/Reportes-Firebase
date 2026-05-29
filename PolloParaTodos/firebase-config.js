import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// REMPLAZA CON LA CONFIGURACIÓN ESPECÍFICA DE FIREBASE PARA POLLO PARA TODOS
const firebaseConfig = {
  apiKey: "AIzaSyAKGH13FDXzcmqZIHKATlATY4xu506l8pc",
  authDomain: "polloparatodos-26402.firebaseapp.com",
  projectId: "polloparatodos-26402",
  storageBucket: "polloparatodos-26402.firebasestorage.app",
  messagingSenderId: "332791050297",
  appId: "1:332791050297:web:eb2a0a228ddac25dec5de8",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
