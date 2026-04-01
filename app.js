import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, query, where, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

window.relojesSalas = {};

// --- 1. FUNCIÓN: PUBLICAR SALA ---
window.crearSalaMaster = async () => {
    const nombre = document.getElementById('nombreSala').value.trim();
    const tipo = document.getElementById('tipoSala').value;
    const premio = document.getElementById('premioInicial').value || 0;
    const fecha = document.getElementById('fechaSorteo').value;

    if (!nombre || !fecha) return alert("❌ Debes indicar Nombre y Fecha/Hora.");

    try {
        await addDoc(collection(db, "salas"), {
            nombre, tipo, premioBs: premio, fechaSorteo: fecha,
            estado: "espera", bolas: [], creadoEn: new Date().getTime()
        });
        alert("✅ Sala publicada en la red.");
        document.getElementById('nombreSala').value = "";
        document.getElementById('premioInicial').value = "";
    } catch (e) {
        alert("❌ Error de conexión con Firebase.");
    }
};

// --- 2. RELOJ DE INICIO AUTOMÁTICO ---
function monitorearTiempo(idSala, fechaProg) {
    if (window.relojesSalas[idSala]) clearInterval(window.relojesSalas[idSala]);

    window.relojesSalas[idSala] = setInterval(async () => {
        const ahora = new Date().getTime();
        const tiempoMeta = new Date(fechaProg).getTime();

        if (ahora >= tiempoMeta) {
            clearInterval(window.relojesSalas[idSala]);
            const salaRef = doc(db, "salas", idSala);
            const snap = await getDoc(salaRef);
            if (snap.exists() && snap.data().estado === "espera") {
                await updateDoc(salaRef, { estado: "jugando" });
                cantarBolasAutomatico(idSala);
            }
        }
    }, 5000); 
}

// --- 3. CANTAR BOLAS AUTOMÁTICAMENTE ---
async function cantarBolasAutomatico(idSala) {
    const salaRef = doc(db, "salas", idSala);
    const loop = setInterval(async () => {
        const snap = await getDoc(salaRef);
        const data = snap.data();
        if (!data || data.estado !== "jugando" || data.bolas.length >= 75) {
            clearInterval(loop);
            return;
        }
        let nB;
        const L = ["B","I","N","G","O"];
        do {
            const letVal = L[Math.floor(Math.random()*5)];
            const numVal = Math.floor(Math.random()*15) + 1 + (L.indexOf(letVal)*15);
            nB = `${letVal}-${numVal}`;
        } while (data.bolas.includes(nB));
        await updateDoc(salaRef, { bolas: [...data.bolas, nB] });
    }, 6000); // 1 bola cada 6 segundos
}

// --- 4. RENDERIZADO EN TIEMPO REAL ---
onSnapshot(collection(db, "salas"), (snap) => {
    const cont = document.getElementById('contenedorTablas');
    const sel = document.getElementById('selectSalasDisponibles');
    cont.innerHTML = "";
    sel.innerHTML = '<option value="">Selecciona sala...</option>';

    snap.forEach(d => {
        const sala = d.data();
        const id = d.id;

        // Select
        const o = document.createElement('option');
        o.value = id; o.innerText = sala.nombre;
        sel.appendChild(o);

        // Reloj
        if (sala.estado === "espera") monitorearTiempo(id, sala.fechaSorteo);

        // Card
        const card = document.createElement('div');
        card.className = 'card';
        card.style.background = "rgba(0,0,0,0.3)";
        card.innerHTML = `
            <div class="sala-header">
                <h3>${sala.nombre} <span style="color:#25D366; font-size:0.7rem;">[${sala.estado.toUpperCase()}]</span></h3>
                <button class="btn-delete-sala" onclick="eliminarSala('${id}')"><i class="fas fa-trash"></i></button>
            </div>
            <p style="font-size:0.8rem; color:#25D366; margin:0;">
                <i class="far fa-calendar-alt"></i> ${sala.fechaSorteo.replace('T', ' ')} | 
                <i class="fas fa-money-bill-wave"></i> Pote: <b>Bs. ${sala.premioBs}</b>
            </p>
            <table class="tabla-socios">
                <thead><tr><th>Socio</th><th>Código</th><th>Acción</th></tr></thead>
                <tbody id="list-${id}"></tbody>
            </table>
        `;
        cont.appendChild(card);
        cargarSocios(id);
    });
});

// --- FUNCIONES EXTRA ---
window.vincularSocioASala = async () => {
    const n = document.getElementById('nombreSocio').value.trim();
    const idS = document.getElementById('selectSalasDisponibles').value;
    const c = document.getElementById('cantCartones').value;
    if (!n || !idS) return alert("❌ Datos incompletos");
    const cod = Math.random().toString(36).substring(2, 8).toUpperCase();
    await addDoc(collection(db, "socios"), { nombre: n, idSala: idS, cantCartones: c, codigoAcceso: cod });
    document.getElementById('nombreSocio').value = "";
    alert("Socio registrado.");
};

async function cargarSocios(idSala) {
    const q = query(collection(db, "socios"), where("idSala", "==", idSala));
    onSnapshot(q, (s) => {
        const tb = document.getElementById(`list-${idSala}`);
        if(tb) {
            tb.innerHTML = "";
            s.forEach(sd => {
                const sc = sd.data();
                tb.innerHTML += `<tr><td>${sc.nombre}</td><td><b>${sc.codigoAcceso}</b></td>
                <td><button onclick="eliminarSocio('${sd.id}')" style="background:red; padding:2px 8px; border-radius:5px; width:auto">X</button></td></tr>`;
            });
        }
    });
}

window.eliminarSala = async (id) => { if(confirm("¿Eliminar sala?")) await deleteDoc(doc(db, "salas", id)); };
window.eliminarSocio = async (id) => { if(confirm("¿Eliminar socio?")) await deleteDoc(doc(db, "socios", id)); };
