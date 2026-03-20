import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// TU CONFIGURACIÓN REAL DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyA1GIQ1xaJUINYabyqOejrlfjqUAcoQwg4",
  authDomain: "bingo-club-6f019.firebaseapp.com",
  projectId: "bingo-club-6f019",
  storageBucket: "bingo-club-6f019.firebasestorage.app",
  messagingSenderId: "1059179173812",
  appId: "1:1059179173812:web:78b43eaac565d213bec4e1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- WHATSAPP CONFIG (PANTALLA INDEX) ---
const PHONE_NUMBER = "584265709830";
const WA_MESSAGE = encodeURIComponent("Hola Bingo Club Digital, deseo solicitar mi código de acceso.");
if (document.getElementById('waLink')) {
    document.getElementById('waLink').href = `https://wa.me/${PHONE_NUMBER}?text=${WA_MESSAGE}`;
}

// --- UTILIDADES GLOBALES ---
function generarCarton() {
    const r = { B:[1,15], I:[16,30], N:[31,45], G:[46,60], O:[61,75] };
    let tab = {};
    ['B','I','N','G','O'].forEach(l => {
        let col = [];
        while(col.length < 5) {
            let n = Math.floor(Math.random() * (r[l][1]-r[l][0]+1)) + r[l][0];
            if(!col.includes(n)) col.push(n);
        }
        tab[l] = col.sort((a,b)=>a-b);
    });
    return tab;
}

// --- FUNCIONES ADMINISTRADOR (PANTALLA ADMIN) ---

window.copiarInfoSocio = function(text, btn) {
