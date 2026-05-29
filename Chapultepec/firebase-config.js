import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Reemplaza con tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDQJRMOOBjhPxwcgiQKMkUc2bJNesphNOw",
  authDomain: "fa-chapultepec.firebaseapp.com",
  projectId: "fa-chapultepec",
  storageBucket: "fa-chapultepec.firebasestorage.app",
  messagingSenderId: "368182385424",
  appId: "1:368182385424:web:2547bafd8cb7ede30f6395",
  measurementId: "G-RYL86JV5HH"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
