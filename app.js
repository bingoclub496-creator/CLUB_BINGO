import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// --- FUNCIONES DE APOYO ---
const generarCarton = () => {
    const r = (min, max) => {
        let n = [];
        while(n.length < 5) {
            let num = Math.floor(Math.random() * (max - min + 1)) + min;
            if(!n.includes(num)) n.push(num);
        }
        return n.sort((a,b) => a-b);
    };
    return { B: r(1,15), I: r(16,30), N: r(31,45), G: r(46,60), O: r(61,75) };
};

// --- ACCIONES DEL ADMINISTRADOR ---

window.crearSalaMaster = async () => {
    const n = document.getElementById('nombreSala').value;
    const t = document.getElementById('tipoSala').value;
    const p = parseFloat(document.getElementById('premioInicial').value) || 0;
    const f = document.getElementById('fechaSorteo').value;

    if(!n || !f) return alert("Faltan datos de la sala");

    await addDoc(collection(db, "salas"), {
        nombre: n, tipo: t, premioActual: p, horaInicio: f,
        estado: "espera", bolas: [], ganadores: []
    });
    alert("Sala Creada");
};

window.vincularSocio = async () => {
    const nom = document.getElementById('nombreSocio').value;
    const idS = document.getElementById('selectSalasDisponibles').value;
    const cant = parseInt(document.getElementById('cantCartones').value);

    if(!nom || !idS) return alert("Faltan datos del socio");

    let carts = [];
    for(let i=0; i<cant; i++) carts.push(generarCarton());

    await addDoc(collection(db, "socios"), {
        nombre: nom, idSala: idS, cartones: carts,
        codigoAcceso: Math.random().toString(36).substr(2, 6).toUpperCase()
    });
    alert("Socio Vinculado");
};

// --- INICIO DEL SORTEO (LA CLAVE) ---
window.toggleSorteo = async (id, estadoActual) => {
    const nuevo = estadoActual === "espera" ? "jugando" : "espera";
    await updateDoc(doc(db, "salas", id), { estado: nuevo });
};

// --- RENDERIZADO DINÁMICO ---
onSnapshot(collection(db, "salas"), (snap) => {
    const cont = document.getElementById('contenedorTablas');
    const sel = document.getElementById('selectSalasDisponibles');
    cont.innerHTML = ''; 
    sel.innerHTML = '<option value="">Seleccionar Sala...</option>';

    snap.forEach(d => {
        const sala = d.data();
        const id = d.id;

        sel.innerHTML += `<option value="${id}">${sala.nombre}</option>`;

        const colorBtn = sala.estado === "jugando" ? "#f44336" : "#25D366";
        const textoBtn = sala.estado === "jugando" ? "⏸ PAUSAR" : "🚀 INICIAR SORTEO";

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between">
                <h3>${sala.nombre}</h3>
                <button onclick="eliminarSala('${id}')" style="width:auto; background:none; color:red"><i class="fas fa-trash"></i></button>
            </div>
            <button class="btn-status" onclick="toggleSorteo('${id}', '${sala.estado}')" style="background:${colorBtn}">
                ${textoBtn}
            </button>
            <table class="tabla-socios">
                <thead><tr><th>Socio</th><th>Código</th><th>Acción</th></tr></thead>
                <tbody id="body-${id}"></tbody>
            </table>
        `;
        cont.appendChild(card);
        cargarSocios(id);
    });
});

function cargarSocios(idSala) {
    const q = query(collection(db, "socios"), where("idSala", "==", idSala));
    onSnapshot(q, (snap) => {
        const tb = document.getElementById(`body-${idSala}`);
        if(!tb) return;
        tb.innerHTML = '';
        snap.forEach(s => {
            const socio = s.data();
            tb.innerHTML += `<tr>
                <td>${socio.nombre}</td>
                <td><b>${socio.codigoAcceso}</b></td>
                <td><button onclick="copiar('${socio.codigoAcceso}')" style="padding:5px; width:auto"><i class="fas fa-copy"></i></button></td>
            </tr>`;
        });
    });
}

window.eliminarSala = async (id) => confirm("¿Eliminar sala?") && await deleteDoc(doc(db, "salas", id));
window.copiar = (c) => {
    navigator.clipboard.writeText(c);
    document.getElementById('toast').style.display='block';
    setTimeout(()=> document.getElementById('toast').style.display='none', 2000);
};
