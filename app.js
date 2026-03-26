import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, updateDoc, onSnapshot, collection, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// Objeto global para que no se crucen los intervalos si tienes 2 salas
window.intervalosSalas = {}; 

window.toggleSorteo = async (idSala, estadoActual) => {
    const salaRef = doc(db, "salas", idSala);
    
    if (estadoActual === "espera") {
        // 1. LIMPIAR Y EMPEZAR
        await updateDoc(salaRef, { estado: "jugando", bolas: [] });
        
        // 2. INICIAR RELOJ AUTOMÁTICO (Cada 5 Segundos)
        window.intervalosSalas[idSala] = setInterval(async () => {
            const snap = await getDoc(salaRef);
            if (!snap.exists()) return;
            const data = snap.data();
            
            // Si alguien pausó o se llenaron las bolas, detener reloj
            if (data.estado !== "jugando" || data.bolas.length >= 75) {
                clearInterval(window.intervalosSalas[idSala]);
                return;
            }

            // Generar bola que no exista
            let nuevaBola;
            const letras = ["B", "I", "N", "G", "O"];
            do {
                const letra = letras[Math.floor(Math.random() * 5)];
                const numero = Math.floor(Math.random() * 15) + 1 + (letras.indexOf(letra) * 15);
                nuevaBola = `${letra}-${numero}`;
            } while (data.bolas.includes(nuevaBola));

            // Guardar en Firebase (Esto dispara la actualización en los socios)
            const nuevasBolas = [...data.bolas, nuevaBola];
            await updateDoc(salaRef, { bolas: nuevasBolas });

        }, 5000); 

    } else {
        // 3. PAUSAR SORTEO
        clearInterval(window.intervalosSalas[idSala]);
        await updateDoc(salaRef, { estado: "espera" });
    }
};

// Renderizar las tablas en tu HTML del Admin
onSnapshot(collection(db, "salas"), (snapshot) => {
    const contenedor = document.getElementById('contenedorTablas');
    if(!contenedor) return; // Evita error si el id no existe en admin.html
    
    contenedor.innerHTML = '';
    
    snapshot.forEach(docSnap => {
        const sala = docSnap.data();
        const id = docSnap.id;
        const color = sala.estado === "jugando" ? "#ff5252" : "#25D366";
        const texto = sala.estado === "jugando" ? "⏸ PAUSAR SORTEO" : "🚀 INICIAR AUTOMÁTICO";

        contenedor.innerHTML += `
            <div class="card" style="margin-bottom: 20px; padding: 15px; border: 1px solid rgba(255,255,255,0.2); border-radius: 10px;">
                <h3 style="margin-top: 0; color: #25D366;">${sala.nombre}</h3>
                <button onclick="toggleSorteo('${id}', '${sala.estado}')" style="background: ${color}; color: white; padding: 10px; width: 100%; border: none; border-radius: 5px; font-weight: bold; cursor: pointer;">
                    ${texto}
                </button>
            </div>
        `;
    });
});
