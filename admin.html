import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, getDoc, onSnapshot, orderBy, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// CONFIGURACIÓN DE TU FIREBASE (bingo-club-6f019)
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

/* --- UTILIDADES --- */
window.copiarCodigo = (codigo) => {
    navigator.clipboard.writeText(codigo).then(() => {
        const toast = document.getElementById('toast');
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', 2000);
    });
};

/* --- 1. CREACIÓN DE SALA --- */
window.crearSalaMaster = async () => {
    const nombre = document.getElementById('nombreSala').value;
    const inicial = parseFloat(document.getElementById('premioInicial').value) || 0;
    const fondo = document.getElementById('fondoSala').value || "fondo.jpg";
    const fecha = document.getElementById('fechaSorteo').value;

    if(!nombre || inicial <= 0 || !fecha) return alert("⚠️ Completa todos los campos correctamente.");

    await addDoc(collection(db, "salas"), {
        nombre,
        tipo: document.getElementById('tipoSala').value,
        premioInicial: inicial,
        premioActual: inicial,
        fecha,
        fondo,
        creadoEn: new Date().getTime()
    });
    alert("✅ Sala publicada exitosamente.");
    document.getElementById('nombreSala').value = "";
    document.getElementById('premioInicial').value = "";
};

/* --- 2. REGISTRO DE SOCIO E INCREMENTO DEL 4% SIMPLE --- */
window.vincularSocioASala = async () => {
    const idSala = document.getElementById('selectSalasDisponibles').value;
    const nombre = document.getElementById('nombreSocio').value;
    const cant = parseInt(document.getElementById('cantCartones').value);

    if(!idSala || !nombre) return alert("⚠️ Selecciona sala e ingresa nombre del socio.");

    const salaRef = doc(db, "salas", idSala);
    const salaSnap = await getDoc(salaRef);
    const salaData = salaSnap.data();

    // LÓGICA: 4% del premio inicial sumado por cada cartón nuevo
    const incrementoUnitario = salaData.premioInicial * 0.04;
    const incrementoTotal = incrementoUnitario * cant;
    const nuevoPremio = salaData.premioActual + incrementoTotal;

    // Generar código y cartones
    const codigo = Math.random().toString(36).substring(2,8).toUpperCase();
    let cartones = [];
    for(let i=0; i<cant; i++) { cartones.push(generarCartonBingo()); }

    try {
        await addDoc(collection(db, "socios"), { nombre, idSala, codigo, cartones });
        await updateDoc(salaRef, { premioActual: nuevoPremio });
        alert(`✅ Socio Registrado.\nPremio subió: +${incrementoTotal.toFixed(2)}$`);
        document.getElementById('nombreSocio').value = "";
    } catch (e) { console.error(e); }
};

/* --- 3. FUNCIONES DE LIMPIEZA Y BORRADO --- */
window.borrarSalaCompleta = async (id) => {
    if(confirm("🚨 ¿BORRAR SALA COMPLETAMENTE?\nEsto eliminará la sala de Firebase de forma permanente.")) {
        await deleteDoc(doc(db, "salas", id));
    }
};

window.borrarSocio = async (idSocio) => {
    if(confirm("¿Eliminar este socio de la lista?")) {
        await deleteDoc(doc(db, "socios", idSocio));
    }
};

window.resetPremioBase = async (idSala) => {
    const salaRef = doc(db, "salas", idSala);
    const salaSnap = await getDoc(salaRef);
    if(confirm(`¿Resetear premio a ${salaSnap.data().premioInicial}$?`)) {
        await updateDoc(salaRef, { premioActual: salaSnap.data().premioInicial });
    }
};

/* --- 4. RENDERIZADO EN TIEMPO REAL --- */
if (document.getElementById('contenedorTablas')) {
    onSnapshot(query(collection(db, "salas"), orderBy("creadoEn", "desc")), (snapshot) => {
        const select = document.getElementById('selectSalasDisponibles');
        const cont = document.getElementById('contenedorTablas');
        select.innerHTML = '<option value="">Selecciona sala...</option>';
        cont.innerHTML = "";

        snapshot.forEach((d) => {
            const sala = d.data();
            const id = d.id;
            select.innerHTML += `<option value="${id}">${sala.nombre}</option>`;
            
            const div = document.createElement('div');
            div.className = "card";
            div.innerHTML = `
                <div class="sala-header">
                    <h3 style="margin:0; color:#25D366;">${sala.nombre.toUpperCase()}</h3>
                    <button class="btn-delete-sala" onclick="borrarSalaCompleta('${id}')" title="Eliminar Sala">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
                <p style="font-size:0.75rem; margin:5px 0;">💰 ACTUAL: <b style="font-size:1.1rem; color:#fff;">${sala.premioActual.toFixed(2)}$</b> | Base: ${sala.premioInicial}$</p>
                <table class="tabla-socios">
                    <thead><tr><th>Socio (Cartones)</th><th style="text-align:right;">Acción</th></tr></thead>
                    <tbody id="body-${id}"></tbody>
                </table>
                <button class="btn-reset-pote" onclick="resetPremioBase('${id}')"><i class="fas fa-undo"></i> VOLVER AL PREMIO INICIAL</button>`;
            cont.appendChild(div);
            escucharSocios(id);
        });
    });
}

function escucharSocios(idSala) {
    onSnapshot(query(collection(db, "socios"), where("idSala", "==", idSala)), (snap) => {
        const tb = document.getElementById(`body-${idSala}`);
        if(!tb) return;
        tb.innerHTML = "";
        snap.forEach(soc => {
            const s = soc.data();
            tb.innerHTML += `
                <tr>
                    <td>${s.nombre} <small>(${s.cartones.length})</small></td>
                    <td style="text-align:right;">
                        <button class="btn-del-socio" onclick="borrarSocio('${soc.id}')"><i class="fas fa-user-minus"></i></button>
                        <button class="btn-copy" onclick="copiarCodigo('${s.codigo}')">${s.codigo}</button>
                    </td>
                </tr>`;
        });
    });
}

function generarCartonBingo() {
    const r = { B:[1,15], I:[16,30], N:[31,45], G:[46,60], O:[61,75] };
    let c = {};
    ['B','I','N','G','O'].forEach(l => {
        let nums = [];
        while(nums.length < 5) {
            let n = Math.floor(Math.random()*(r[l][1]-r[l][0]+1))+r[l][0];
            if(!nums.includes(n)) nums.push(n);
        }
        c[l] = nums.sort((a,b)=>a-b);
    });
    return c;
}
