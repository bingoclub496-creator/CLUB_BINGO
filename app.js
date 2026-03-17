import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// --- CONFIGURACIÓN WHATSAPP ---
const PHONE = "584265709830";
const WA_MSG = encodeURIComponent("Hola Bingo Club, deseo solicitar mi código de acceso.");
if(document.getElementById('waLink')) document.getElementById('waLink').href = `https://wa.me/${PHONE}?text=${WA_MSG}`;

// --- AUTO-LOGIN POR LINK ---
const urlParams = new URLSearchParams(window.location.search);
const codeParam = urlParams.get('code');
if(codeParam && document.getElementById('accessCode')) {
    document.getElementById('accessCode').value = codeParam;
    setTimeout(() => validarEntrada(), 500);
}

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

// --- ADMIN FUNCTIONS ---
window.crearSocioMaestro = async function() {
    const nom = document.getElementById('nombreSocio').value;
    const can = document.getElementById('cantCartones').value;
    if(!nom) return alert("Nombre!");
    const cod = Math.random().toString(36).substring(2,7).toUpperCase();
    await addDoc(collection(db, "socios"), { nombre: nom, codigo: cod, cartones: Array.from({length: can}, generarCarton) });
    const link = `${window.location.origin}${window.location.pathname.replace('admin.html','index.html')}?code=${cod}`;
    document.getElementById('linkGenerado').innerHTML = `Socio: ${nom}<br>Código: <b>${cod}</b><br><a href="${link}">${link}</a>`;
};

window.borrarSorteo = async () => { await setDoc(doc(db, "configuracion", "sorteo"), { inicio: null, ganador: null }); location.reload(); };
window.borrarTodosLosSocios = async () => {
    const q = await getDocs(collection(db, "socios"));
    q.forEach(async (d) => await deleteDoc(doc(db, "socios", d.id)));
    alert("Socios eliminados");
};

window.guardarProgramacion = async function() {
    const f = document.getElementById('fechaSorteo').value;
    await setDoc(doc(db, "configuracion", "sorteo"), { inicio: f, ganador: null });
    alert("Sorteo Iniciado!");
};

window.validarEntrada = async function() {
    const cod = document.getElementById('accessCode').value.toUpperCase();
    const q = query(collection(db, "socios"), where("codigo", "==", cod));
    const snap = await getDocs(q);
    if (!snap.empty) {
        sessionStorage.setItem('socioActual', JSON.stringify(snap.docs[0].data()));
        window.location.href = 'juego.html';
    } else { alert("Código no válido"); }
};

// --- JUEGO CORE ---
let secuenciaBolas = [];
let bolasCantadas = [];
let voiceEnabled = true;

function obtenerSecuencia(seed) {
    let b = Array.from({length: 75}, (_, i) => i + 1);
    let s = seed;
    for (let i = b.length - 1; i > 0; i--) {
        s = (s * 9301 + 49297) % 233280;
        let j = Math.floor((s / 233280) * (i + 1));
        [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
}

function iniciarProcesosJuego() {
    const socio = JSON.parse(sessionStorage.getItem('socioActual'));
    if(!socio) return;
    document.getElementById('userName').innerText = socio.nombre;
    dibujarTablas(socio.cartones);

    onSnapshot(doc(db, "configuracion", "sorteo"), (docSnap) => {
        if(!docSnap.exists()) return;
        const config = docSnap.data();
        
        if(config.ganador) {
            confetti();
            document.getElementById('winnerOverlay').style.display = 'flex';
            document.getElementById('ganadorNombre').innerText = config.ganador;
            return;
        }

        if(!config.inicio) return;
        const horaInicio = new Date(config.inicio).getTime();
        secuenciaBolas = obtenerSecuencia(horaInicio);

        setInterval(() => {
            const ahora = new Date().getTime();
            const dist = horaInicio - ahora;
            if(dist > 0) {
                const m = Math.floor(dist / 60000);
                const s = Math.floor((dist % 60000) / 1000);
                document.getElementById('relojDiscreto').innerText = `${m}:${s < 10 ? '0'+s : s}`;
            } else {
                document.getElementById('pantallaEspera').style.display = 'none';
                document.getElementById('areaJuego').style.display = 'block';
                const idx = Math.floor((ahora - horaInicio) / 10000); // Cada 10 segundos
                if(idx < 75) {
                    const bola = secuenciaBolas[idx];
                    if(document.getElementById('numeroBola').innerText != bola) {
                        cantarBola(bola);
                        bolasCantadas = secuenciaBolas.slice(0, idx + 1);
                        actualizarUIBola(bola);
                    }
                }
            }
        }, 1000);
    });
}

function cantarBola(n) {
    const letra = n <= 15 ? 'B' : n <= 30 ? 'I' : n <= 45 ? 'N' : n <= 60 ? 'G' : 'O';
    if('speechSynthesis' in window) {
        const msg = new SpeechSynthesisUtterance(`${letra} ${n}`);
        msg.lang = 'es-ES';
        window.speechSynthesis.speak(msg);
    }
}

function actualizarUIBola(n) {
    document.getElementById('numeroBola').innerText = n;
    document.getElementById('letraBola').innerText = n <= 15 ? 'B' : n <= 30 ? 'I' : n <= 45 ? 'N' : n <= 60 ? 'G' : 'O';
    const hist = document.getElementById('bolaHistorial');
    hist.innerHTML = bolasCantadas.slice(-5).reverse().map(b => `<div class="h-ball">${b}</div>`).join('') + hist.innerHTML;
    if(document.getElementById('bolaCantada')) document.getElementById('bolaCantada').innerText = n;
}

window.reclamarBingo = async function(btn, idx) {
    const socio = JSON.parse(sessionStorage.getItem('socioActual'));
    const carton = socio.cartones[idx];
    const winPatterns = [
        [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],
        [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],
        [0,6,12,18,24],[4,8,12,16,20]
    ];

    // Obtener los números del cartón en orden lineal
    let numsCarton = [];
    for(let i=0; i<5; i++) {
        ['B','I','N','G','O'].forEach(l => numsCarton.push(carton[l][i]));
    }
    numsCarton[12] = "FREE"; // Comodín siempre es válido

    const esBingoReal = winPatterns.some(pattern => {
        return pattern.every(pIdx => {
            const num = numsCarton[pIdx];
            return num === "FREE" || bolasCantadas.includes(num);
        });
    });

    if(esBingoReal) {
        await setDoc(doc(db, "configuracion", "sorteo"), { ganador: socio.nombre }, { merge: true });
    } else {
        alert("¡Verificación fallida! Aún no han salido todos tus números.");
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
                cells += `<div class="cell ${isC?'comodin marked':''}" onclick="this.classList.toggle('marked')">${isC?'':t[l][i]}</div>`;
            });
        }
        return `<div class="carton-card">
            <div class="bingo-header"><span>B</span><span>I</span><span>N</span><span>G</span><span>O</span></div>
            <div class="bingo-grid">${cells}</div>
            <button class="btn-bingo" onclick="reclamarBingo(this, ${idx})">¡CANTA BINGO!</button>
        </div>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('relojDiscreto')) iniciarProcesosJuego();
    if(document.getElementById('listaSocios')) {
        onSnapshot(collection(db, "socios"), (s) => {
            document.getElementById('listaSocios').innerHTML = s.docs.map(d => `<div style="font-size:0.8rem; padding:5px; border-bottom:1px solid #eee;">${d.data().nombre} [${d.data().codigo}]</div>`).join('');
        });
        onSnapshot(doc(db, "configuracion", "sorteo"), (d) => {
           if(d.exists() && d.data().ganador) document.getElementById('infoGanador').innerText = "GANADOR ACTUAL: " + d.data().ganador;
        });
    }
});
