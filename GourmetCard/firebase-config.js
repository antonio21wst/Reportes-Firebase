// Firebase Web SDK Configuration
// This configuration is for client-side Firebase usage
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAqBAhnC4jmrtC8jTnNrfv7xUrawQLnI9M",
  authDomain: "plan-de-lealtad-5cbd9.firebaseapp.com",
  projectId: "plan-de-lealtad-5cbd9",
  storageBucket: "plan-de-lealtad-5cbd9.firebasestorage.app",
  messagingSenderId: "68393732266",
  appId: "1:68393732266:web:faa95376ca25347f27a8d3",
  measurementId: "G-KLWLTEHR0F",
};

// Note: To use this configuration with Firebase SDK:
//
// Option 1 - Using CDN (recommended for simple projects):
// <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>
// <script>
//   firebase.initializeApp(firebaseConfig);
// </script>
//
// Option 2 - Using ES6 modules:
// <script type="module">
//   import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
//   const app = initializeApp(firebaseConfig);
// </script>

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// LA PALABRA CLAVE "export" ES LA QUE SOLUCIONA TU ERROR DE CONSOLA
export const db = getFirestore(app);
