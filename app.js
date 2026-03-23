import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, getDocs, doc, setDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

let bolasCantadasGuardadas = [];
let juegoIniciado = false;
let juegoDetenido = false;

// --- VERIFICACIÓN DE FIGURAS ---
window.reclamarBingo = async function(btn, cartonIdx) {
    if(juegoDetenido) return;
    const socio = JSON.parse(sessionStorage.getItem('socioActual'));
    const d = socio.cartones[cartonIdx];
    let f = []; 
    for(let i=0; i<5; i++) { ['B','I','N','G','O'].forEach(l => { f.push((l==='N' && i===2) ? "FREE" : d[l][i]); }); }

    const patrones = [
        [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24], // Lineas H
        [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24], // Lineas V
        [10,11,12,13,14, 2,7,12,17,22], // CRUZ GRANDE (Fila 3 y Col 3)
        [7,11,13,17] // CRUZ PEQUEÑA (Diamante central)
    ];

    const esBingo = patrones.some(p => p.every(idx => f[idx] === "FREE" || bolasCantadasGuardadas.includes(f[idx])));

    if(esBingo) {
        btn.innerText = "¡VERIFICADO!";
        btn.style.background = "#2e7d32";
        await updateDoc(doc(db, "configuracion", "sorteo"), { ganadores: arrayUnion(socio.nombre) });
    } else {
        alert("Aún no tienes una figura válida.");
    }
};

// --- LOGICA DEL JUEGO ---
function iniciarProcesosJuego() {
    const socio = JSON.parse(sessionStorage.getItem('socioActual'));
    if(!socio || !document.getElementById('numeroBola')) return;
    
    document.getElementById('userName').innerText = `SOCIO: ${socio.nombre}`;
    dibujarTablas(socio.cartones);

    onSnapshot(doc(db, "configuracion", "sorteo"), (docSnap) => {
        const config = docSnap.data();
        if(!config) return;

        if(config.premio) document.getElementById('displayPremio').innerText = `${config.sala} | PREMIO: ${config.premio}`;

        if(config.ganadores && config.ganadores.length > 0) {
            juegoDetenido = true;
            document.getElementById('winnerOverlay').style.display = 'flex';
            document.getElementById('ganadorNombre').innerText = config.ganadores.join(" / ");
            confetti({ particleCount: 150 });
        }

        if(config.inicio && !juegoIniciado) {
            juegoIniciado = true;
            const horaInicio = new Date(config.inicio).getTime();
            const secuencia = obtenerSecuenciaFija(horaInicio);
            
            setInterval(() => {
                const ahora = new Date().getTime();
                const indice = Math.floor((ahora - horaInicio) / 5000); // 5 SEGUNDOS
                if(indice >= 0 && indice < 75 && !juegoDetenido) {
                    const bola = secuencia[indice];
                    document.getElementById('numeroBola').innerText = bola;
                    document.getElementById('letraBola').innerText = bola <= 15 ? 'B' : bola <= 30 ? 'I' : bola <= 45 ? 'N' : bola <= 60 ? 'G' : 'O';
                    bolasCantadasGuardadas = secuencia.slice(0, indice + 1);
                }
            }, 1000);
        }
    });
}

// Funciones auxiliares (obtenerSecuenciaFija, dibujarTablas, etc.) se mantienen igual...
// (Sigue el código de funciones de apoyo que ya tenías)
