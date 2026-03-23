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
let secuenciaBolas = [];
let voiceSynth = window.speechSynthesis;

// ==========================================
// 1. UTILIDADES Y GENERACIÓN
// ==========================================
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

function obtenerSecuenciaFija(seed) {
    let bolas = Array.from({length: 75}, (_, i) => i + 1);
    let s = seed;
    for (let i = bolas.length - 1; i > 0; i--) {
        s = (s * 9301 + 49297) % 233280;
        let j = Math.floor((s / 233280) * (i + 1));
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

// ==========================================
// 2. FUNCIONES DEL ADMINISTRADOR
// ==========================================
window.crearSocioMaestro = async function() {
    const nom = document.getElementById('nombreSocio').value;
    const can = parseInt(document.getElementById('cantCartones').value);
    const resultDiv = document.getElementById('resultadLinkSocio');
    
    if(!nom || isNaN(can)) return alert("Ingresa nombre y cantidad de cartones.");

    try {
        const cod = Math.random().toString(36).substring(2,7).toUpperCase();
        await addDoc(collection(db, "socios"), { 
            nombre: nom, codigo: cod, cartones: Array.from({length: can}, generarCarton)
        });
        
        resultDiv.style.display = "block";
        resultDiv.innerHTML = `<strong>¡Socio Creado!</strong><br>Socio: ${nom}<br>Código: <b>${cod}</b>`;
        document.getElementById('nombreSocio').value = "";
    } catch (e) { alert("Error al crear socio."); }
};

window.aperturarPartida = async function() {
    const monto = document.getElementById('montoPremio').value;
    const sala = document.getElementById('nombreSala').value;
    const fecha = document.getElementById('fechaSorteo').value;
    
    if(!monto || !sala || !fecha) return alert("Completa Sala, Premio y Fecha de Sorteo.");

    await setDoc(doc(db, "configuracion", "sorteo"), {
        premio: monto,
        sala: sala,
        inicio: fecha,
        ganadores: [],
        estado: "activo"
    });
    alert(`Partida aperturada con éxito en ${sala}`);
};

window.resetearPartida = async function() {
    if(confirm("¿Seguro? Esto finalizará el juego y ELIMINARÁ todos los códigos de acceso actuales (Expiración).")) {
        // 1. Finalizar partida en la base de datos
        await setDoc(doc(db, "configuracion", "sorteo"), { 
            estado: "finalizado", ganadores: [], premio: "", sala: "", inicio: null 
        });
        
        // 2. Eliminar socios para que expiren los códigos
        const snap = await getDocs(collection(db, "socios"));
        snap.forEach(async (documento) => {
            await deleteDoc(doc(db, "socios", documento.id));
        });
        
        alert("Partida reiniciada y códigos de acceso expirados.");
    }
};

// ==========================================
// 3. LOGIN Y ACCESO DEL JUGADOR
// ==========================================
window.validarEntrada = async function() {
    const cod = document.getElementById('accessCode').value.toUpperCase();
    if(!cod) return alert("Ingresa un código.");
    
    const btn = document.querySelector('.btn-login');
    btn.innerText = "VERIFICANDO...";
    
    try {
        const q = query(collection(db, "socios"), where("codigo", "==", cod));
        const snap = await getDocs(q);
        if (!snap.empty) {
            sessionStorage.setItem('socioActual', JSON.stringify(snap.docs[0].data()));
            window.location.href = 'juego.html';
        } else {
            alert("Código incorrecto o expirado. Solicita uno nuevo.");
            btn.innerText = "INGRESAR A LA SALA";
        }
    } catch (e) { 
        alert("Error de conexión. Verifica las reglas de Firebase."); 
        btn.innerText = "INGRESAR A LA SALA";
    }
};

// ==========================================
// 4. LÓGICA DE JUEGO EN VIVO Y VERIFICACIÓN
// ==========================================
window.reclamarBingo = async function(btn, cartonIdx) {
    if(juegoDetenido) return;
    const socio = JSON.parse(sessionStorage.getItem('socioActual'));
    const d = socio.cartones[cartonIdx];
    
    // Matriz plana 5x5
    let f = []; 
    for(let i=0; i<5; i++) {
        ['B','I','N','G','O'].forEach(l => { f.push((l==='N' && i===2) ? "FREE" : d[l][i]); });
    }

    const patrones = [
        [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24], // Lineas H
        [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24], // Lineas V
        [10,11,12,13,14, 2,7,17,22], // CRUZ GRANDE (Fila 3 + Col 3 sin repetir centro)
        [7,11,13,17] // CRUZ PEQUEÑA (Las 4 casillas alrededor del comodín)
    ];

    const esBingo = patrones.some(p => p.every(idx => f[idx] === "FREE" || bolasCantadasGuardadas.includes(f[idx])));

    if(esBingo) {
        btn.innerText = "¡VERIFICADO!";
        btn.style.background = "#2e7d32";
        btn.disabled = true;
        
        const sorteoRef = doc(db, "configuracion", "sorteo");
        await updateDoc(sorteoRef, { ganadores: arrayUnion(socio.nombre) }).catch(async () => {
            await setDoc(sorteoRef, { ganadores: [socio.nombre] }, { merge: true });
        });
    } else {
        alert("¡Aún no completas Línea o Cruz!");
    }
};

function iniciarProcesosJuego() {
    const socio = JSON.parse(sessionStorage.getItem('socioActual'));
    if(!socio || !document.getElementById('numeroBola')) return;
    
    document.getElementById('userName').innerText = `JUGADOR: ${socio.nombre}`;
    dibujarTablas(socio.cartones);

    onSnapshot(doc(db, "configuracion", "sorteo"), (docSnap) => {
        if(!docSnap.exists()) return;
        const config = docSnap.data();

        // Control de Expiración (Si admin resetea)
        if(config.estado === "finalizado" && (!config.ganadores || config.ganadores.length === 0)) {
            sessionStorage.clear();
            window.location.href = "index.html";
            return;
        }

        if(config.premio) {
            document.getElementById('displayPremio').innerText = `${config.sala.toUpperCase()} | PREMIO: ${config.premio}`;
        }

        if(config.ganadores && config.ganadores.length > 0) {
            juegoDetenido = true;
            document.getElementById('winnerOverlay').style.display = 'flex';
            document.getElementById('ganadorNombre').innerText = config.ganadores.join(" / ");
            confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
        }

        if(config.inicio && !juegoDetenido && config.estado === "activo") {
            const horaInicio = new Date(config.inicio).getTime();
            secuenciaBolas = obtenerSecuenciaFija(horaInicio);
            
            setInterval(() => {
                const ahora = new Date().getTime();
                if(ahora >= horaInicio && !juegoDetenido) {
                    const segTrans = Math.floor((ahora - horaInicio) / 1000);
                    const indice = Math.floor(segTrans / 5); // 5 SEGUNDOS
                    
                    if(indice >= 0 && indice < 75) {
                        const bola = secuenciaBolas[indice];
                        if(document.getElementById('numeroBola').innerText != bola) {
                            document.getElementById('numeroBola').innerText = bola;
                            document.getElementById('letraBola').innerText = bola <= 15 ? 'B' : bola <= 30 ? 'I' : bola <= 45 ? 'N' : bola <= 60 ? 'G' : 'O';
                            cantarBolaVoz(bola);
                            bolasCantadasGuardadas = secuenciaBolas.slice(0, indice + 1);
                            
                            // Actualizar historial mini
                            const ultimas = bolasCantadasGuardadas.slice(-3).reverse();
                            ultimas.forEach((b, i) => {
                                const el = document.getElementById(`hist${i}`);
                                if(el) { el.innerText = b; el.classList.add('active'); }
                            });
                        }
                    }
                }
            }, 1000);
        }
    });
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
        return `<div class="carton-card">
                    <div class="bingo-header"><span>B</span><span>I</span><span>N</span><span>G</span><span>O</span></div>
                    <div class="bingo-grid">${cells}</div>
                    <button class="btn-bingo" onclick="reclamarBingo(this, ${idx})">¡BINGO!</button>
                </div>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('cartonesContainer')) iniciarProcesosJuego();
});
