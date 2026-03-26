import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, updateDoc, onSnapshot, collection, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = { /* ... tu config ... */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let timer = null;

window.controlSorteo = async (id, estado) => {
    const ref = doc(db, "salas", id);
    
    if (estado === "espera") {
        // INICIAR
        await updateDoc(ref, { estado: "jugando", bolas: [] });
        
        timer = setInterval(async () => {
            const s = await getDoc(ref);
            const data = s.data();
            
            if (data.estado !== "jugando" || data.bolas.length >= 75) {
                clearInterval(timer);
                return;
            }

            const letras = ["B","I","N","G","O"];
            let b;
            do {
                let l = letras[Math.floor(Math.random()*5)];
                let n = Math.floor(Math.random()*15) + 1 + (letras.indexOf(l)*15);
                b = `${l}-${n}`;
            } while (data.bolas.includes(b));

            await updateDoc(ref, { bolas: [...data.bolas, b] });
        }, 5000);
    } else {
        // PARAR
        clearInterval(timer);
        await updateDoc(ref, { estado: "espera" });
    }
};

// Renderizar salas en el panel
onSnapshot(collection(db, "salas"), (snap) => {
    const panel = document.getElementById('contenedorTablas');
    panel.innerHTML = '';
    snap.forEach(d => {
        const s = d.data();
        panel.innerHTML += `
            <div class="card">
                <h3>${s.nombre}</h3>
                <button onclick="controlSorteo('${d.id}', '${s.estado}')">
                    ${s.estado === 'jugando' ? 'DETENER' : 'INICIAR AUTOMÁTICO'}
                </button>
            </div>`;
    });
});
