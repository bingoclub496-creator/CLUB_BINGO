import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, getDocs, doc, setDoc, updateDoc, arrayUnion, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
let juegoDetenido = false;
let voiceSynth = window.speechSynthesis;

// --- LÓGICA DE GANAR ---
window.reclamarBingo = async function(btn, idx) {
    if(juegoDetenido) return;
    const socio = JSON.parse(sessionStorage.getItem('socioActual'));
    const d = socio.cartones[idx];
    let f = []; 
    for(let i=0; i<5; i++) { ['B','I','N','G','O'].forEach(l => { f.push((l==='N' && i===2) ? "FREE" : d[l][i]); }); }

    const p = [
        [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24], // H
        [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24], // V
        [10,11,12,13,14, 2,7,17,22], // CRUZ GRANDE
        [7,11,13,17] // CRUZ PEQUEÑA
    ];

    const esBingo = p.some(pat => pat.every(i => f[i] === "FREE" || bolasCantadasGuardadas.includes(f[i])));

    if(esBingo) {
        btn.innerText = "¡VERIFICADO!";
        btn.disabled = true;
        await updateDoc(doc(db, "configuracion", "sorteo"), { ganadores: arrayUnion(socio.nombre) })
            .catch(async () => await setDoc(doc(db, "configuracion", "sorteo"), { ganadores: [socio.nombre] }, { merge: true }));
    } else { alert("¡Aún no completas la figura!"); }
};

// --- PROCESOS DE JUEGO ---
function iniciarProcesosJuego() {
    const socio = JSON.parse(sessionStorage.getItem('socioActual'));
    if(!socio || !document.getElementById('cartonesContainer')) return;
    
    document.getElementById('userName').innerText = `SOCIO: ${socio.nombre}`;
    dibujarTablas(socio.cartones);

    onSnapshot(doc(db, "configuracion", "sorteo"), (docSnap) => {
        const config = docSnap.data();
        if(!config) return;

        if(config.premio) document.getElementById('displayPremio').innerText = `${config.sala} | PREMIO: ${config.premio}`;

        if(config.ganadores?.length > 0) {
            juegoDetenido = true;
            document.getElementById('winnerOverlay').style.display = 'flex';
            document.getElementById('ganadorNombre').innerText = config.ganadores.join(" / ");
            confetti({ particleCount: 150 });
        }

        if(config.inicio && !juegoDetenido) {
            const h = new Date(config.inicio).getTime();
            const sec = obtenerSecuenciaFija(h);
            setInterval(() => {
                const seg = Math.floor((Date.now() - h) / 5000);
                if(seg >= 0 && seg < 75 && !juegoDetenido) {
                    const b = sec[seg];
                    if(document.getElementById('numeroBola').innerText != b) {
                        document.getElementById('numeroBola').innerText = b;
                        bolasCantadasGuardadas = sec.slice(0, seg + 1);
                        actualizarHistorial(bolasCantadasGuardadas);
                    }
                }
            }, 1000);
        }
    });
}

function dibujarTablas(tabs) {
    const cont = document.getElementById('cartonesContainer');
    cont.innerHTML = tabs.map((t, idx) => {
        let cells = "";
        for(let i=0; i<5; i++) {
            ['B','I','N','G','O'].forEach(l => {
                const isC = l==='N' && i===2;
                cells += isC ? `<div class="cell comodin marked"></div>` : `<div class="cell" onclick="this.classList.toggle('marked')">${t[l][i]}</div>`;
            });
        }
        return `<div class="carton-card"><div class="bingo-header"><span>B</span><span>I</span><span>N</span><span>G</span><span>O</span></div><div class="bingo-grid">${cells}</div><button class="btn-bingo" onclick="reclamarBingo(this, ${idx})">¡BINGO!</button></div>`;
    }).join('');
}

function obtenerSecuenciaFija(seed) {
    let b = Array.from({length: 75}, (_, i) => i + 1);
    for (let i = b.length - 1; i > 0; i--) {
        seed = (seed * 9301 + 49297) % 233280;
        let j = Math.floor((seed / 233280) * (i + 1));
        [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
}

function actualizarHistorial(bolas) {
    bolas.slice(-3).reverse().forEach((b, i) => {
        const el = document.getElementById(`hist${i}`);
        if(el) { el.innerText = b; el.classList.add('active'); }
    });
}

// Inicializadores
window.validarEntrada = async function() {
    const cod = document.getElementById('accessCode').value.toUpperCase();
    const snap = await getDocs(query(collection(db, "socios"), where("codigo", "==", cod)));
    if(!snap.empty) { sessionStorage.setItem('socioActual', JSON.stringify(snap.docs[0].data())); window.location.href='juego.html'; }
    else { alert("Código Inválido"); }
};

window.aperturarPartida = async function() {
    await setDoc(doc(db, "configuracion", "sorteo"), {
        premio: document.getElementById('montoPremio').value,
        sala: document.getElementById('nombreSala').value,
        inicio: document.getElementById('fechaSorteo').value,
        ganadores: [], estado: "activo"
    });
    alert("Partida Iniciada");
};

window.crearSocioMaestro = async function() {
    const nom = document.getElementById('nombreSocio').value;
    const can = parseInt(document.getElementById('cantCartones').value);
    const cod = Math.random().toString(36).substring(2,7).toUpperCase();
    await addDoc(collection(db, "socios"), { nombre: nom, codigo: cod, cartones: Array.from({length: can}, () => {
        const r = { B:[1,15], I:[16,30], N:[31,45], G:[46,60], O:[61,75] };
        let tab = {};
        ['B','I','N','G','O'].forEach(l => {
            let col = []; while(col.length < 5) { let n = Math.floor(Math.random() * (r[l][1]-r[l][0]+1)) + r[l][0]; if(!col.includes(n)) col.push(n); }
            tab[l] = col.sort((a,b)=>a-b);
        });
        return tab;
    })});
    document.getElementById('resultadLinkSocio').innerHTML = `Socio: ${nom} | CÓDIGO: <b>${cod}</b>`;
};

window.resetearPartida = async function() {
    await setDoc(doc(db, "configuracion", "sorteo"), { estado: "finalizado", ganadores: [] });
    const snap = await getDocs(collection(db, "socios"));
    snap.forEach(async (d) => await deleteDoc(doc(db, "socios", d.id)));
    alert("Sala Limpia");
};

document.addEventListener('DOMContentLoaded', () => { if(document.getElementById('cartonesContainer')) iniciarProcesosJuego(); });
