// js/firebase-config.js

// Импорт необходимых функций из Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Ваша конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCY6gMYkgSMjMO88d9JH5e42gPxvYJqEb4",
    authDomain: "cloudvape-52614.firebaseapp.com",
    databaseURL: "https://cloudvape-52614-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "cloudvape-52614",
    storageBucket: "cloudvape-52614.firebasestorage.app",
    messagingSenderId: "828514133568",
    appId: "1:828514133568:web:c17c975b806ff6312fe1a5",
    measurementId: "G-FWL1XF9587"
  };

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
