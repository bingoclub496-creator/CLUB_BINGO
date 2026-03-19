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

// Corrección: Función para copiar info al portapapeles
window.copiarInfoSocio = function(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.innerText;
        btn.innerText = "¡COPIADO!";
        btn.style.background = "#4CAF50";
        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.background = "var(--mango)";
        }, 1500);
    }).catch(err => {
        alert("No se pudo copiar automáticamente. Por favor selecciona el texto y copia.");
        console.error('Error al copiar: ', err);
    });
};

window.crearSocioMaestro = async function() {
    const nom = document.getElementById('nombreSocio').value;
    const can = parseInt(document.getElementById('cantCartones').value);
    const resultDiv = document.getElementById('resultadLinkSocio');

    if(!nom || isNaN(can)) return alert("Por favor ingresa nombre y cantidad válida.");

    btnLoad(true, "nombreSocio"); // Sugerencia: feedback visual de carga

    const cod = Math.random().toString(36).substring(2,7).toUpperCase();
    
    try {
        await addDoc(collection(db, "socios"), { 
            nombre: nom, 
            codigo: cod, 
            cartones: Array.from({length: can}, generarCarton),
            fechaCreacion: new Date()
        });

        const currentUrl = window.location.href;
        const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/'));
        const finalLink = `${baseUrl}/index.html?code=${cod}`; // Sugerencia: auto-login link

        const infoToCopy = `BINGO CLUB DIGITAL\nSocio: ${nom}\nCódigo: ${cod}\nLink de Ingreso: ${finalLink}`;

        // Mostrar resultado con botón de copiar
        resultDiv.style.display = "block";
        resultDiv.innerHTML = `
            <div class="link-result-wrapper">
                <div class="link-text">Socio: <b>${nom}</b><br>Código: <b>${cod}</b></div>
                <button class="btn-copy" onclick="copiarInfoSocio('${infoToCopy.replace(/'/g, "\\'")}', this)">Copiar Datos y Link</button>
            </div>
        `;

        document.getElementById('nombreSocio').value = "";
        document.getElementById('cantCartones').value = "1";
    } catch (e) {
        alert("Error al guardar socio en Firebase.");
        console.error(e);
    } finally {
        btnLoad(false, "nombreSocio");
    }
};

window.resetearPartida = async function() {
    if(!confirm("¿Estás seguro de resetear el sorteo? Se borrará el horario y el ganador actual.")) return;
    await setDoc(doc(db, "configuracion", "sorteo"), { inicio: null, ganador: null });
    alert("Partida reseteada. Programa un nuevo horario.");
};

window.borrarTodosSocios = async function() {
    if(!confirm("¿Estás seguro de borrar TODOS los socios registrados? Esto no se puede deshacer.")) return;
    const q = query(collection(db, "socios"));
    const snap = await getDocs(q);
    snap.forEach(async (d) => {
        await deleteDoc(doc(db, "socios", d.id));
    });
    alert("Todos los socios han sido eliminados.");
};

window.guardarProgramacion = async function() {
    const f = document.getElementById('fechaSorteo').value;
    if(!f) return alert("Selecciona fecha y hora.");
    await setDoc(doc(db, "configuracion", "sorteo"), { inicio: f, ganador: null });
    alert("Sorteo programado en la nube. ¡Suerte a todos!");
};

// Auxiliar visual para botones admin
function btnLoad(loading, inputId) {
    const btn = document.querySelector(`button[onclick="crearSocioMaestro()"]`);
    if(loading) { btn.innerText = "GUARDANDO..."; btn.disabled = true; btn.style.opacity="0.5"; }
    else { btn.innerText = "GENERAR SOCIO Y LINK"; btn.disabled = false; btn.style.opacity="1"; }
}

// --- LOGICA DE ACCESO (PANTALLA INDEX) ---
window.validarEntrada = async function() {
    const cod = document.getElementById('accessCode').value.toUpperCase();
    if(!cod) return alert("Ingresa tu código.");

    const btn = document.querySelector('.btn-login');
    btn.innerText = "VERIFICANDO..."; btn.disabled = true;

    const q = query(collection(db, "socios"), where("codigo", "==", cod));
    try {
        const snap = await getDocs(q);
        if (!snap.empty) {
            // Guardar datos en sesión
            sessionStorage.setItem('socioActual', JSON.stringify(snap.docs[0].data()));
            window.location.href = 'juego.html';
        } else {
            alert("El código ingresado no existe o es incorrecto.");
            btn.innerText = "INGRESAR AL CLUB"; btn.disabled = false;
        }
    } catch (e) {
        alert("Error de conexión. Intenta de nuevo.");
        btn.innerText = "INGRESAR AL CLUB"; btn.disabled = false;
    }
};

// Auto-rellenar código si viene en la URL (Sugerencia link directo)
document.addEventListener('DOMContentLoaded', () => {
    if(document.body.classList.contains('login-page')) {
        const urlParams = new URLSearchParams(window.location.search);
        const codeParam = urlParams.get('code');
        if (codeParam) {
            document.getElementById('accessCode').value = codeParam.toUpperCase();
            // Opcional: auto-ingresar
            // validarEntrada();
        }
    }
});


// --- LÓGICA DE JUEGO EN VIVO (PANTALLA JUEGO) ---
let secuenciaBolas = [];
let voiceSynth = window.speechSynthesis; // Sugerencia: Voz automática

function obtenerSecuenciaFija(seed) {
    let bolas = Array.from({length: 75}, (_, i) => i + 1);
    let tempSeed = seed;
    // Mezcla determinista basada en el tiempo de inicio
    for (let i = bolas.length - 1; i > 0; i--) {
        tempSeed = (tempSeed * 9301 + 49297) % 233280;
        let j = Math.floor((tempSeed / 233280) * (i + 1));
        [bolas[i], bolas[j]] = [bolas[j], bolas[i]];
    }
    return bolas;
}

function cantarBolaVoz(numero) {
    if(!voiceSynth) return;
    voiceSynth.cancel(); // Parar voz anterior
    const letra = numero <= 15 ? 'B' : numero <= 30 ? 'I' : numero <= 45 ? 'N' : numero <= 60 ? 'G' : 'O';
    const msg = new SpeechSynthesisUtterance(`${letra}. ${numero}`);
    msg.lang = 'es-ES';
    msg.rate = 0.9;
    voiceSynth.speak(msg);
}

// Corrección 3: Actualizar historial fijo de últimas 5
function actualizarUIHistorial(bolasCantadasHastaAhora) {
    const ultimas5 = bolasCantadasHastaAhora.slice(-5);
    
    // Limpiar clases activas antiguas
    for(let i=0; i<5; i++) {
        const el = document.getElementById(`hist${i}`);
        el.innerText = "-";
        el.classList.remove('active');
    }

    // Llenar slots disponibles
    ultimas5.forEach((bola, index) => {
        const slotIdx = 4 - (ultimas5.length - 1 - index); // Llenar de derecha a izquierda
        if(slotIdx >= 0) {
            const el = document.getElementById(`hist${slotIdx}`);
            el.innerText = bola;
            el.classList.add('active');
        }
    });
}

function iniciarProcesosJuego() {
    const socio = JSON.parse(sessionStorage.getItem('socioActual'));
    if(!socio || !document.getElementById('relojDiscreto')) return;

    document.getElementById('userName').innerText = `SOCIO: ${socio.nombre}`;
    dibujarTablas(socio.cartones);

    onSnapshot(doc(db, "configuracion", "sorteo"), (docSnap) => {
        if(!docSnap.exists()) return;
        const config = docSnap.data();
        
        // --- ESTADO 1: HAY UN GANADOR GLOBAL ---
        if(config.ganador) {
            juegoDetenido = true;
            document.getElementById('winnerOverlay').style.display = 'flex';
            document.getElementById('ganadorNombre').innerText = config.ganador;
            
            // Efecto Confeti Sugerido
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, zIndex: 4000 });
            
            // Actualizar admin si está abierto
            if(document.getElementById('statusSorteo')) document.getElementById('statusSorteo').innerText = `GANADOR: ${config.ganador}`;
            return;
        }

        if(!config.inicio) {
             document.getElementById('pantallaEspera').style.display = 'flex';
             document.getElementById('relojDiscreto').innerText = "PAUSA";
             return;
        }

        const horaInicio = new Date(config.inicio).getTime();
        secuenciaBolas = obtenerSecuenciaFija(horaInicio);

        // --- ESTADO 2: CUENTA REGRESIVA O JUEGO EN CURSO ---
        const monitor = setInterval(() => {
            const ahora = new Date().getTime();
            const dist = horaInicio - ahora;

            if(dist > 0) {
                // Cuenta regresiva activa
                document.getElementById('pantallaEspera').style.display = 'flex';
                document.getElementById('areaJuego').style.display = 'none';
                
                const min = Math.floor(dist / 60000);
                const seg = Math.floor((dist % 60000) / 1000);
                document.getElementById('relojDiscreto').innerText = `${min}:${seg < 10 ? '0'+seg : seg}`;
                juegoIniciado = false;
            } else {
                // El sorteo ha iniciado
                clearInterval(monitor); // Detener monitor de cuenta regresiva
                document.getElementById('pantallaEspera').style.display = 'none';
                document.getElementById('areaJuego').style.display = 'block';
                juegoIniciado = true;
                
                iniciarCantadorAutomatico(horaInicio);
            }
        }, 1000);
    });
}

let loopCantador;
let juegoIniciado = false;
let juegoDetenido = false;
let bolasCantadasGuardadas = []; // Crítico para verificación real

function iniciarCantadorAutomatico(horaInicio) {
    if(loopCantador) clearInterval(loopCantador); // Evitar duplicados

    const cantarActual = () => {
        if(juegoDetenido) return clearInterval(loopCantador);
        
        const ahora = new Date().getTime();
        const segTrans = Math.floor((ahora - horaInicio) / 1000);
        const indiceActual = Math.floor(segTrans / 10); // Sugerencia: Nueva bola cada 10 seg
        
        if (indiceActual < 75) {
            const numeroBola = secuenciaBolas[indiceActual];
            
            // Verificar si es una bola nueva para cantarla
            if(document.getElementById('numeroBola').innerText != numeroBola) {
                
                // Actualizar UI Principal
                document.getElementById('numeroBola').innerText = numeroBola;
                document.getElementById('letraBola').innerText = numeroBola <= 15 ? 'B' : numeroBola <= 30 ? 'I' : numeroBola <= 45 ? 'N' : numeroBola <= 60 ? 'G' : 'O';
                
                // Sugerencia: Cantar con voz
                cantarBolaVoz(numeroBola);

                // Guardar en historial real
                bolasCantadasGuardadas = secuenciaBolas.slice(0, indiceActual + 1);
                
                // Corrección 3: Actualizar historial UI fijo (últimas 5)
                actualizarUIHistorial(bolasCantadasGuardadas);

                // Actualizar Admin si está abierto
                const bolaAdmin = document.getElementById('bolaCantada');
                if(bolaAdmin) bolaAdmin.innerText = numeroBola;
            }
        } else {
            clearInterval(loopCantador);
            alert("¡Todas las bolas han sido cantadas!");
        }
    };

    cantarActual(); // Cantar primera inmediata si corresponde
    loopCantador = setInterval(cantarActual, 1000); // Revisar cada segundo el tiempo
}


// --- VERIFICACIÓN REAL DE BINGO ---
window.reclamarBingo = async function(btn, cartonIdx) {
    if(!juegoIniciado || juegoDetenido) return;
    
    const socio = JSON.parse(sessionStorage.getItem('socioActual'));
    const cartonNumbersFlat = obtenerNumerosMatriz(cartonIdx); // [B1, I1, N1..., B2, I2...]

    // Patrones ganadores estándar (5 en línea, columna o diagonal en matriz 5x5)
    const winPatterns = [
        // Filas (Horizontales)
        [0,1,2,3,4], [5,6,7,8,9], [10,11,12,13,14], [15,16,17,18,19], [20,21,22,23,24],
        // Columnas (Verticales)
        [0,5,10,15,20], [1,6,11,16,21], [2,7,12,17,22], [3,8,13,18,23], [4,9,14,19,24],
        // Diagonales
        [0,6,12,18,24], [4,8,12,16,20]
    ];

    // VERIFICACIÓN TÉCNICA REAL: ¿Los números del cartón están en 'bolasCantadasGuardadas'?
    const esBingoVeridico = winPatterns.some(pattern => {
        return pattern.every(indexInFlat => {
            const numeroEnCarton = cartonNumbersFlat[indexInFlat];
            // El comodín central (FREE) siempre es válido
            if (numeroEnCarton === "FREE") return true;
            // Verificar si el número fue cantado REALMENTE en Firebase
            return bolasCantadasGuardadas.includes(numeroEnCarton);
        });
    });

    if(esBingoVeridico) {
        btn.innerText = "¡VERIFICANDO!"; btn.disabled = true;
        // Guardar ganador en Firebase (Sincronización global)
        await setDoc(doc(db, "configuracion", "sorteo"), { ganador: socio.nombre }, { merge: true });
    } else {
        alert("¡CUIDADO SOCIO!\nTu cartón aún no tiene un Bingo verificado con las bolas cantadas en la nube. Revisa bien tus números marked.");
    }
};

// Auxiliar para convertir estructura de cartón {B:[], I:[]} a array plano [0...24]
function obtenerNumerosMatriz(cartonIdx) {
    const socio = JSON.parse(sessionStorage.getItem('socioActual'));
    const cartonData = socio.cartones[cartonIdx];
    let flatMatriz = [];
    
    // Recorrer filas (0 a 4)
    for(let i=0; i<5; i++) {
        // Recorrer columnas B, I, N, G, O
        ['B','I','N','G','O'].forEach(letra => {
            if(letra === 'N' && i === 2) {
                flatMatriz.push("FREE"); // Comodín central
            } else {
                flatMatriz.push(cartonData[letra][i]);
            }
        });
    }
    return flatMatriz;
}

// Dibujar tablas ergonómicas
function dibujarTablas(tabs) {
    const cont = document.getElementById('cartonesContainer');
    if(!cont) return;
    cont.innerHTML = tabs.map((t, idx) => {
        let cells = "";
        // Sugerencia/Corrección: Números Bold y Comodín Grande
        for(let i=0; i<5; i++) {
            ['B','I','N','G','O'].forEach(l => {
                const isC = l==='N' && i===2;
                if(isC) {
                    cells += `<div class="cell comodin marked"></div>`; // FREE con logo grande
                } else {
                    cells += `<div class="cell" onclick="this.classList.toggle('marked')"><span>${t[l][i]}</span></div>`;
                }
            });
        }
        return `<div class="carton-card">
            <div class="bingo-header"><span>B</span><span>I</span><span>N</span><span>G</span><span>O</span></div>
            <div class="bingo-grid">${cells}</div>
            <button class="btn-bingo" onclick="reclamarBingo(this, ${idx})">¡CANTA BINGO!</button>
        </div>`;
    }).join('');
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // Detectar página por elemento clave
    if(document.getElementById('relojDiscreto')) iniciarProcesosJuego(); // Página Juego
    if(document.getElementById('listaSocios')) { // Página Admin
        // Escuchar socios tiempo real
        onSnapshot(collection(db, "socios"), (snap) => {
            const div = document.getElementById('listaSocios');
            div.innerHTML = snap.docs.map(d => {
                const s = d.data();
                return `<div class="socio-item"><span>${s.nombre} (<b>${s.codigo}</b>)</span></div>`;
            }).join('');
        });
        
        // Escuchar estado sorteo
        onSnapshot(doc(db, "configuracion", "sorteo"), (d) => {
           if(d.exists() && d.data().ganador) document.getElementById('statusSorteo').innerText = `GANADOR GLOBAL ACTUAL: ${d.data().ganador}`;
           else document.getElementById('statusSorteo').innerText = "ESPERANDO SORTEO / SIN GANADOR";
        });
    }
});
