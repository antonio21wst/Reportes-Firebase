import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Reemplaza con tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD0jD2G6_WLLMZRD1vBRYsLoUeiQeWqo_c",
  authDomain: "fa-galindo.firebaseapp.com",
  projectId: "fa-galindo",
  storageBucket: "fa-galindo.firebasestorage.app",
  messagingSenderId: "839561785524",
  appId: "1:839561785524:web:cfb8a3a649629973b5e7e1",
  measurementId: "G-1F61JV3SZR",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
