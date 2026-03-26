import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, getDoc, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = { /* Misma config anterior */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let intervaloBolas = {}; // Objeto para manejar intervalos por sala

// --- INICIO AUTOMÁTICO ---
window.toggleSorteo = async (idSala, estadoActual) => {
    const salaRef = doc(db, "salas", idSala);
    
    if (estadoActual === "espera") {
        await updateDoc(salaRef, { estado: "jugando", bolas: [] });
        
        // El reloj de bolas automáticas
        intervaloBolas[idSala] = setInterval(async () => {
            const snap = await getDoc(salaRef);
            const data = snap.data();
            
            if (data.estado !== "jugando" || data.bolas.length >= 75) {
                clearInterval(intervaloBolas[idSala]);
                return;
            }

            let nuevaBola;
            const letras = ["B", "I", "N", "G", "O"];
            do {
                const l = letras[Math.floor(Math.random() * 5)];
                const n = Math.floor(Math.random() * 15) + 1 + (letras.indexOf(l) * 15);
                nuevaBola = `${l}-${n}`;
            } while (data.bolas.includes(nuevaBola));

            let listaActualizada = [...data.bolas, nuevaBola];
            await updateDoc(salaRef, { bolas: listaActualizada });
        }, 5000); // Lanzar cada 5 segundos

    } else {
        clearInterval(intervaloBolas[idSala]);
        await updateDoc(salaRef, { estado: "espera" });
    }
};

// --- GESTIÓN DE SALAS ---
onSnapshot(collection(db, "salas"), (snap) => {
    const cont = document.getElementById('contenedorTablas');
    cont.innerHTML = '';
    snap.forEach(d => {
        const s = d.data();
        const id = d.id;
        const btnColor = s.estado === "jugando" ? "#ff5252" : "#25D366";
        const btnTxt = s.estado === "jugando" ? "⏸ PARAR" : "🚀 INICIAR AUTOMÁTICO";

        cont.innerHTML += `
            <div class="card">
                <h3>${s.nombre}</h3>
                <button onclick="toggleSorteo('${id}', '${s.estado}')" style="background:${btnColor}">${btnTxt}</button>
                <div id="lista-socios-${id}"></div>
            </div>
        `;
    });
});

// (Mantener aquí tus funciones de vincularSocio y eliminarSala)
