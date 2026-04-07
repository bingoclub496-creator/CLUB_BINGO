import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, addDoc, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

const socio = JSON.parse(sessionStorage.getItem("socioLogueado"));
if(!socio) window.location.href = "index.html";

let bolasOficiales = [];
let datosCartones = [];

// 1. GENERADOR DE CARTONES (Persistente basado en ID de Socio)
function cargarJuego() {
    const num = socio.cartones || 1;
    const cont = document.getElementById('contenedorCartones');
    document.getElementById('txtSala').innerText = socio.idSala.replace('SALA_','');
    
    for(let i=0; i<num; i++) {
        // La semilla asegura que si el socio se sale y entra, tenga los mismos números
        const matriz = crearMatriz(socio.id + "_rev" + i); 
        datosCartones.push(matriz);
        dibujarCarton(matriz, i);
    }
}

function crearMatriz(seed) {
    const hash = seed.split('').reduce((a,b)=>a+b.charCodeAt(0),0);
    const rand = (s) => {
        let t = s += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    
    let columns = [];
    for(let i=0; i<5; i++) {
        let pool = Array.from({length: 15}, (_, v) => v + (i*15+1));
        let col = [];
        for(let j=0; j<5; j++) {
            let idx = Math.floor(rand(hash + i + j) * pool.length);
            col.push(pool.splice(idx,1)[0]);
        }
        columns.push(col.sort((a,b)=>a-b));
    }
    return columns;
}

function dibujarCarton(m, id) {
    let h = `<div class="carton-card"><div class="carton-header"><span>B</span><span>I</span><span>N</span><span>G</span><span>O</span></div><div class="grid-bingo">`;
    for(let f=0; f<5; f++) {
        for(let c=0; c<5; c++) {
            if(c==2 && f==2) h += `<div class="celda free">CLUB</div>`;
            else h += `<div class="celda" onclick="this.classList.toggle('marcada')">${m[c][f]}</div>`;
        }
    }
    h += `</div><button class="btn-bingo-carton" onclick="verificarBingo(${id})">¡Cantar Bingo!</button></div>`;
    document.getElementById('contenedorCartones').innerHTML += h;
}

// 2. ESCUCHA DE LA SALA EN VIVO
onSnapshot(doc(db, "salas", socio.idSala), (d) => {
    if(!d.exists()) return;
    const data = d.data();
    bolasOficiales = data.bolas || [];
    document.getElementById('txtPote').innerText = "Bs. " + (data.premioBs || "0.00");
    
    if(bolasOficiales.length > 0) {
        const u = bolasOficiales[bolasOficiales.length - 1];
        document.getElementById('bolaActual').innerText = u;
        const hist = [...bolasOficiales].reverse().slice(1, 6);
        const boxes = document.querySelectorAll('.bola-hist');
        boxes.forEach((b, i) => b.innerText = hist[i] || "-");
    }
});

// 3. MOTOR DE VALIDACIÓN (Cruces Grande/Pequeña + Líneas)
window.verificarBingo = (idx) => {
    const m = datosCartones[idx];
    const check = (c, f) => {
        if(c===2 && f===2) return false; // El centro nunca suma para cantar bingo
        return bolasOficiales.includes(m[c][f]);
    };

    const esLleno = socio.idSala.includes('CARTON');
    let gano = false;

    // VALIDACIÓN CARTÓN LLENO
    if(esLleno) {
        let count = 0;
        for(let c=0; c<5; c++) for(let f=0; f<5; f++) if(check(c,f)) count++;
        if(count === 24) gano = true;
    } else {
        // VALIDACIÓN SALA NORMAL
        // 1. Líneas y Columnas
        for(let i=0; i<5; i++) {
            let row = true, col = true;
            for(let j=0; j<5; j++) {
                if(!check(j, i)) row = false;
                if(!check(i, j)) col = false;
            }
            if(row || col) gano = true;
        }
        // 2. Diagonales
        let d1 = true, d2 = true;
        for(let i=0; i<5; i++) {
            if(!check(i, i)) d1 = false;
            if(!check(i, 4-i)) d2 = false;
        }
        if(d1 || d2) gano = true;

        // 3. CRUZ GRANDE (Extremos: N1, N5, B3, O3)
        if(check(2,0) && check(2,4) && check(0,2) && check(4,2)) gano = true;

        // 4. CRUZ PEQUEÑA (Internos: N2, N4, I3, G3)
        if(check(2,1) && check(2,3) && check(1,2) && check(3,2)) gano = true;
    }

    if(gano) enviarBingo();
    else alert("❌ Tu cartón aún no cumple con las figuras ganadoras.");
};

async function enviarBingo() {
    await addDoc(collection(db, "alertas"), {
        nombre: socio.nombre,
        telefono: socio.telefono,
        hora: new Date().toLocaleTimeString()
    });
    alert("¡BINGO VÁLIDO! 🏆 Alerta enviada al administrador.");
}

cargarJuego();
