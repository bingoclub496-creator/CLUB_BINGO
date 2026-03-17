import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// --- UTILIDADES ---
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

// --- ADMIN ---
window.crearSocioMaestro = async function() {
    const nom = document.getElementById('nombreSocio').value;
    const can = parseInt(document.getElementById('cantCartones').value);
    if(!nom) return alert("Nombre requerido");
    const cod = Math.random().toString(36).substring(2,7).toUpperCase();
    await addDoc(collection(db, "socios"), { nombre: nom, codigo: cod, cartones: Array.from({length: can}, generarCarton) });
    alert("Código: " + cod);
};

window.guardarProgramacion = async function() {
    const f = document.getElementById('fechaSorteo').value;
    await setDoc(doc(db, "configuracion", "sorteo"), { inicio: f, ganador: null });
    alert("Sorteo Programado");
};

// --- LOGIN ---
window.validarEntrada = async function() {
    const cod = document.getElementById('accessCode').value.toUpperCase();
    const q = query(collection(db, "socios"), where("codigo", "==", cod));
    const snap = await getDocs(q);
    if (!snap.empty) {
        sessionStorage.setItem('socioActual', JSON.stringify(snap.docs[0].data()));
        window.location.href = 'juego.html';
    } else { alert("Código inválido"); }
};

// --- LÓGICA DE JUEGO ---
let secuenciaBolas = [];
let juegoDetenido = false;

function obtenerSecuenciaFija(seed) {
    let bolas = Array.from({length: 75}, (_, i) => i + 1);
    let tempSeed = seed;
    for (let i = bolas.length - 1; i > 0; i--) {
        tempSeed = (tempSeed * 9301 + 49297) % 233280;
        let j = Math.floor((tempSeed / 233280) * (i + 1));
        [bolas[i], bolas[j]] = [bolas[j], bolas[i]];
    }
    return bolas;
}

function iniciarProcesosJuego() {
    const socio = JSON.parse(sessionStorage.getItem('socioActual'));
    if(!socio) return;
    document.getElementById('userName').innerText = socio.nombre;
    dibujarTablas(socio.cartones);

    onSnapshot(doc(db, "configuracion", "sorteo"), (docSnap) => {
        if(!docSnap.exists()) return;
        const config = docSnap.data();
        
        // Si hay un ganador, detener todo
        if(config.ganador) {
            juegoDetenido = true;
            document.getElementById('winnerOverlay').style.display = 'flex';
            document.getElementById('ganadorNombre').innerText = config.ganador;
            if(document.getElementById('statusSorteo')) document.getElementById('statusSorteo').innerText = "SORTEO FINALIZADO - GANADOR: " + config.ganador;
            return;
        }

        const horaInicio = new Date(config.inicio).getTime();
        secuenciaBolas = obtenerSecuenciaFija(horaInicio);

        const monitor = setInterval(() => {
            if(juegoDetenido) return clearInterval(monitor);
            const ahora = new Date().getTime();
            const dist = horaInicio - ahora;

            if(dist > 0) {
                const min = Math.floor(dist / 60000);
                const seg = Math.floor((dist % 60000) / 1000);
                document.getElementById('relojDiscreto').innerText = `${min}:${seg < 10 ? '0'+seg : seg}`;
            } else {
                document.getElementById('pantallaEspera').style.display = 'none';
                document.getElementById('areaJuego').style.display = 'block';
                
                const segTrans = Math.floor((ahora - horaInicio) / 1000);
                const indice = Math.floor(segTrans / 10); // Nueva bola cada 10 seg
                
                if (indice < 75) {
                    const b = secuenciaBolas[indice];
                    document.getElementById('numeroBola').innerText = b;
                    document.getElementById('letraBola').innerText = b <= 15 ? 'B' : b <= 30 ? 'I' : b <= 45 ? 'N' : b <= 60 ? 'G' : 'O';
                    if(document.getElementById('bolaCantada')) document.getElementById('bolaCantada').innerText = b;
                }
            }
        }, 1000);
    });
}

// --- VERIFICACIÓN DE BINGO ---
window.reclamarBingo = async function(btn, index) {
    const socio = JSON.parse(sessionStorage.getItem('socioActual'));
    const cartonDiv = btn.parentElement;
    const celdas = cartonDiv.querySelectorAll('.cell');
    
    // Convertir DOM a matriz 5x5 de estados "marcado"
    let matriz = [];
    for(let i=0; i<25; i++) matriz.push(celdas[i].classList.contains('marked'));

    // Patrones ganadores (Filas, Columnas, Diagonales)
    const winPatterns = [
        [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24], // Horizontales
        [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24], // Verticales
        [0,6,12,18,24],[4,8,12,16,20] // Diagonales
    ];

    const esGanador = winPatterns.some(p => p.every(idx => matriz[idx]));

    if(esGanador) {
        await setDoc(doc(db, "configuracion", "sorteo"), { ganador: socio.nombre }, { merge: true });
    } else {
        alert("¡Aún no completas una línea!");
    }
};

function dibujarTablas(tabs) {
    const cont = document.getElementById('cartonesContainer');
    if(!cont) return;
    cont.innerHTML = tabs.map((t, idx) => {
        let cells = "";
        for(let i=0; i<5; i++) {
            ['B','I','N','G','O'].forEach(l => {
                const isC = l==='N' && i===2;
                cells += `<div class="cell ${isC?'comodin marked':''}" onclick="this.classList.toggle('marked')">${t[l][i]}</div>`;
            });
        }
        return `<div class="carton-card">
            <div class="bingo-grid">${cells}</div>
            <button class="btn-bingo" onclick="reclamarBingo(this, ${idx})">¡BINGO!</button>
        </div>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('relojDiscreto')) iniciarProcesosJuego();
    if(document.getElementById('listaSocios')) {
        onSnapshot(collection(db, "socios"), (s) => {
            document.getElementById('listaSocios').innerHTML = s.docs.map(d => `<div style="font-size:0.8rem; padding:5px; border-bottom:1px solid #ccc;">${d.data().nombre} [${d.data().codigo}]</div>`).join('');
        });
    }
});