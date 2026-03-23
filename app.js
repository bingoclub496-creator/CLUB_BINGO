import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, getDocs, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// --- FUNCIÓN COPIAR AL PORTAPAPELES ---
window.copiarCodigo = function(codigo) {
    navigator.clipboard.writeText(codigo).then(() => {
        const toast = document.getElementById('toast');
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 2000);
    }).catch(err => {
        console.error('Error al copiar: ', err);
    });
};

// --- 1. CREAR SALA CON FONDO ---
window.crearSalaMaster = async function() {
    const nombre = document.getElementById('nombreSala').value;
    const tipo = document.getElementById('tipoSala').value;
    const fecha = document.getElementById('fechaSorteo').value;
    const premio = document.getElementById('premioSala').value;
    const fondo = document.getElementById('fondoSala').value || "fondo.jpg";

    if(!nombre || !fecha || !premio) return alert("Completa los datos de la sala");

    await addDoc(collection(db, "salas"), {
        nombre, tipo, fecha, premio, fondo,
        estado: "abierta",
        creadoEn: new Date().getTime()
    });
    alert("Sala creada exitosamente");
    document.getElementById('nombreSala').value = "";
    document.getElementById('premioSala').value = "";
};

// --- 2. VINCULAR SOCIO ---
window.vincularSocioASala = async function() {
    const nombre = document.getElementById('nombreSocio').value;
    const idSala = document.getElementById('selectSalasDisponibles').value;
    
    if(!nombre || !idSala) return alert("Falta nombre del socio o seleccionar sala");

    const codigo = Math.random().toString(36).substring(2,8).toUpperCase();
    const cartones = [generarCartonBingo(), generarCartonBingo()];

    await addDoc(collection(db, "socios"), {
        nombre, idSala, codigo, cartones
    });
    alert(`Socio registrado: ${nombre}\nCódigo: ${codigo}`);
    document.getElementById('nombreSocio').value = "";
};

// --- 3. GENERAR CARTÓN (Centro Libre) ---
function generarCartonBingo() {
    const r = { B:[1,15], I:[16,30], N:[31,45], G:[46,60], O:[61,75] };
    let carton = {};
    ['B','I','N','G','O'].forEach(l => {
        let nums = [];
        while(nums.length < 5) {
            let n = Math.floor(Math.random()*(r[l][1]-r[l][0]+1))+r[l][0];
            if(!nums.includes(n)) nums.push(n);
        }
        carton[l] = nums.sort((a,b)=>a-b);
    });
    return carton;
}

// --- 4. MONITOREO REAL-TIME ---
if (document.getElementById('contenedorTablas')) {
    onSnapshot(query(collection(db, "salas"), orderBy("creadoEn", "desc")), (snapshot) => {
        const select = document.getElementById('selectSalasDisponibles');
        const contenedor = document.getElementById('contenedorTablas');
        select.innerHTML = '<option value="">Selecciona una sala...</option>';
        contenedor.innerHTML = "";

        snapshot.forEach((doc) => {
            const sala = doc.data();
            const id = doc.id;
            select.innerHTML += `<option value="${id}">${sala.nombre}</option>`;
            
            const tableWrap = document.createElement('div');
            tableWrap.innerHTML = `
                <div style="margin-bottom:20px; padding:15px; background:rgba(255,255,255,0.05); border-radius:15px;">
                    <h3 style="margin:0; color:#25D366; font-size:1rem;">${sala.nombre}</h3>
                    <p style="font-size:0.7rem; margin:5px 0;">🎁 Premio: ${sala.premio} | 🖼️ Fondo: ${sala.fondo}</p>
                    <table class="tabla-socios">
                        <thead><tr><th>Nombre Socio</th><th style="text-align:right;">Acción</th></tr></thead>
                        <tbody id="body-${id}"></tbody>
                    </table>
                </div>`;
            contenedor.appendChild(tableWrap);
            escucharSocios(id);
        });
    });
}

function escucharSocios(idSala) {
    const q = query(collection(db, "socios"), where("idSala", "==", idSala));
    onSnapshot(q, (snap) => {
        const tbody = document.getElementById(`body-${idSala}`);
        if(!tbody) return;
        tbody.innerHTML = "";
        snap.forEach(docS => {
            const s = docS.data();
            tbody.innerHTML += `
                <tr>
                    <td>${s.nombre}</td>
                    <td style="text-align:right;">
                        <span style="font-family:monospace; color:#ffeb3b; margin-right:10px;">${s.codigo}</span>
                        <button class="btn-copy" onclick="copiarCodigo('${s.codigo}')">
                            <i class="fas fa-copy"></i> COPIAR
                        </button>
                    </td>
                </tr>`;
        });
    });
}
