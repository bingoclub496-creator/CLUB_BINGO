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

// --- WHATSAPP ---
const PHONE_NUMBER = "584265709830";
const WA_MESSAGE = encodeURIComponent("Hola Bingo Club Digital, deseo solicitar mi código de acceso.");
if (document.getElementById('waLink')) {
    document.getElementById('waLink').href = `https://wa.me/${PHONE_NUMBER}?text=${WA_MESSAGE}`;
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

// --- ADMIN ---
window.copiarInfoSocio = function(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.innerText;
        btn.innerText = "¡COPIADO!";
        btn.style.background = "#4CAF50";
        setTimeout(() => { btn.innerText = originalText; btn.style.background = "var(--mango)"; }, 1500);
    });
};

window.crearSocioMaestro = async function() {
    const nom = document.getElementById('nombreSocio').value;
    const can = parseInt(document.getElementById('cantCartones').value);
    const resultDiv = document.getElementById('resultadLinkSocio');
    if(!nom || isNaN(can)) return alert("Ingresa datos válidos.");

    try {
        const cod = Math.random().toString(36).substring(2,7).toUpperCase();
        await addDoc(collection(db, "socios"), { 
            nombre: nom, codigo: cod, cartones: Array.from({length: can}, generarCarton), fechaCreacion: new Date()
        });
        const currentUrl = window.location.href;
        const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/'));
        const infoToCopy = `BINGO CLUB DIGITAL\nSocio: ${nom}\nCódigo: ${cod}\nLink: ${baseUrl}/index.html?code=${cod}`;
        resultDiv.style.display = "block";
        resultDiv.innerHTML = `<div class="link-result-wrapper"><div class="link-text">Socio: <b>${nom}</b> (<b>${cod}</b>)</div><button class="btn-copy" onclick="copiarInfoSocio('${infoToCopy.replace(/'/g, "\\'")}', this)">Copiar Datos</button></div>`;
        document.getElementById('nombreSocio').value = "";
    } catch (e) { alert("Error al guardar."); }
};

window.resetearPartida = async function() {
    if(confirm("¿Resetear sorteo?")) await setDoc(doc(db, "configuracion", "sorteo"), { inicio: null, ganador: null });
};

window.guardarProgramacion = async function() {
    const f = document.getElementById('fechaSorteo').value;
    if(!f) return alert("Selecciona hora.");
    await setDoc(doc(db, "configuracion", "sorteo"), { inicio: f, ganador: null });
    alert("Programado.");
};

// --- ACCESO ---
window.validarEntrada = async function() {
    const cod = document.getElementById('accessCode').value.toUpperCase();
    if(!cod) return alert("Ingresa código.");
    const btn = document.querySelector('.btn-login');
    btn.innerText = "VERIFICANDO...";
    try {
        const q = query(collection(db, "socios"), where("codigo", "==", cod));
        const snap = await getDocs(q);
        if (!snap.empty) {
            sessionStorage.setItem('socioActual', JSON.stringify(snap.docs[0].data()));
            window.location.href = 'juego.html';
        } else {
            alert("Código incorrecto.");
            btn.innerText = "INGRESAR AL CLUB";
        }
    } catch (e) { 
        alert("Error de conexión."); 
        btn.innerText = "INGRESAR AL CLUB";
    }
};

// --- JUEGO ---
let secuenciaBolas = [];
let voiceSynth = window.speechSynthesis;
let loopCantador;
let juegoIniciado = false;
let juegoDetenido = false;
let bolasCantadasGuardadas = [];

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

function cantarBolaVoz(numero) {
    if(!voiceSynth) return;
    voiceSynth.cancel();
    const letra = numero <= 15 ? 'B' : numero <= 30 ? 'I' : numero <= 45 ? 'N' : numero <= 60 ? 'G' : 'O';
    const msg = new SpeechSynthesisUtterance(`${letra}. ${numero}`);
    msg.lang = 'es-ES';
    voiceSynth.speak(msg);
}

// VERSIÓN BLINDADA DEL HISTORIAL
function actualizarUIHistorial(bolas) {
    const ultimas5 = bolas.slice(-5).reverse();
    for(let i=0; i<5; i++) {
        const el = document.getElementById(`hist${i}`);
        if(!el) continue;
        el.innerText = ultimas5[i] || "-";
        if(ultimas5[i]) el.classList.add('active');
        else el.classList.remove('active');
    }
}

function iniciarProcesosJuego() {
    const socio = JSON.parse(sessionStorage.getItem('socioActual'));
    if(!socio || !document.getElementById('relojDiscreto')) return;
    document.getElementById('userName').innerText = `SOCIO: ${socio.nombre}`;
    dibujarTablas(socio.cartones);

    onSnapshot(doc(db, "configuracion", "sorteo"), (docSnap) => {
        if(!docSnap.exists()) return;
        const config = docSnap.data();
        if(config.ganador) {
            juegoDetenido = true;
            document.getElementById('winnerOverlay').style.display = 'flex';
            document.getElementById('ganadorNombre').innerText = config.ganador;
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            return;
        }
        if(!config.inicio) {
             document.getElementById('pantallaEspera').style.display = 'flex';
             document.getElementById('relojDiscreto').innerText = "PAUSA";
             return;
        }
        const horaInicio = new Date(config.inicio).getTime();
        secuenciaBolas = obtenerSecuenciaFija(horaInicio);

        const monitor = setInterval(() => {
            const ahora = new Date().getTime();
            const dist = horaInicio - ahora;
            if(dist > 0) {
                document.getElementById('pantallaEspera').style.display = 'flex';
                document.getElementById('areaJuego').style.display = 'none';
                const min = Math.floor(dist / 60000);
                const seg = Math.floor((dist % 60000) / 1000);
                document.getElementById('relojDiscreto').innerText = `${min}:${seg < 10 ? '0'+seg : seg}`;
            } else {
                clearInterval(monitor);
                document.getElementById('pantallaEspera').style.display = 'none';
                document.getElementById('areaJuego').style.display = 'block';
                juegoIniciado = true;
                iniciarCantadorAutomatico(horaInicio);
            }
        }, 1000);
    });
}

function iniciarCantadorAutomatico(horaInicio) {
    if(loopCantador) clearInterval(loopCantador);
    const TIEMPO_ENTRE_BOLAS = 5; 

    loopCantador = setInterval(() => {
        if(juegoDetenido) return clearInterval(loopCantador);
        const ahora = new Date().getTime();
        const segTrans = Math.floor((ahora - horaInicio) / 1000);
        const indiceActual = Math.floor(segTrans / TIEMPO_ENTRE_BOLAS); 

        if (indiceActual < 75) {
            const numeroBola = secuenciaBolas[indiceActual];
            if(document.getElementById('numeroBola').innerText != numeroBola) {
                document.getElementById('numeroBola').innerText = numeroBola;
                document.getElementById('letraBola').innerText = numeroBola <= 15 ? 'B' : numeroBola <= 30 ? 'I' : numeroBola <= 45 ? 'N' : numeroBola <= 60 ? 'G' : 'O';
                cantarBolaVoz(numeroBola);
                bolasCantadasGuardadas = secuenciaBolas.slice(0, indiceActual + 1);
                actualizarUIHistorial(bolasCantadasGuardadas);
                if(document.getElementById('bolaCantada')) document.getElementById('bolaCantada').innerText = numeroBola;
            }
        }
    }, 1000);
}

window.reclamarBingo = async function(btn, cartonIdx) {
    if(!juegoIniciado || juegoDetenido) return;
    const socio = JSON.parse(sessionStorage.getItem('socioActual'));
    const cartonNumbersFlat = obtenerNumerosMatriz(cartonIdx);
    const winPatterns = [
        [0,1,2,3,4], [5,6,7,8,9], [10,11,12,13,14], [15,16,17,18,19], [20,21,22,23,24],
        [0,5,10,15,20], [1,6,11,16,21], [2,7,12,17,22], [3,8,13,18,23], [4,9,14,19,24],
        [0,6,12,18,24], [4,8,12,16,20]
    ];
    const esBingo = winPatterns.some(p => p.every(idx => {
        const n = cartonNumbersFlat[idx];
        return n === "FREE" || bolasCantadasGuardadas.includes(n);
    }));

    if(esBingo) {
        await setDoc(doc(db, "configuracion", "sorteo"), { ganador: socio.nombre }, { merge: true });
    } else { alert("Aún no tienes Bingo verificado."); }
};

function obtenerNumerosMatriz(idx) {
    const s = JSON.parse(sessionStorage.getItem('socioActual'));
    const d = s.cartones[idx];
    let f = [];
    for(let i=0; i<5; i++) { ['B','I','N','G','O'].forEach(l => { f.push((l==='N' && i===2) ? "FREE" : d[l][i]); }); }
    return f;
}

function dibujarTablas(tabs) {
    const cont = document.getElementById('cartonesContainer');
    if(!cont) return;
    cont.innerHTML = tabs.map((t, idx) => {
        let cells = "";
        for(let i=0; i<5; i++) {
            ['B','I','N','G','O'].forEach(l => {
                const isC = l==='N' && i===2;
                cells += isC ? `<div class="cell comodin marked"></div>` : `<div class="cell" onclick="this.classList.toggle('marked')"><span>${t[l][i]}</span></div>`;
            });
        }
        return `<div class="carton-card"><div class="bingo-header"><span>B</span><span>I</span><span>N</span><span>G</span><span>O</span></div><div class="bingo-grid">${cells}</div><button class="btn-bingo" onclick="reclamarBingo(this, ${idx})">¡BINGO!</button></div>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.get('code')) document.getElementById('accessCode').value = urlParams.get('code').toUpperCase();
    iniciarProcesosJuego();
});
