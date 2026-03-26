import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
// SEÑALADO: Faltaba addDoc en la importación. Corregido.
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, getDoc, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// Manejador de intervalos globales para el sorteo automático (una entrada por sala)
window.intervalosSalas = {}; 

// --- PUNTO FIJO 2: SOLUCIÓN CREACIÓN DE SALAS ---
// Esta función ahora está blindada contra errores de importación
window.crearSalaMaster = async () => {
    console.log("Intentando crear sala...");
    
    const inputNombre = document.getElementById('nombreSala');
    const inputTipo = document.getElementById('tipoSala');
    const inputPremio = document.getElementById('premioInicial');
    const btn = document.getElementById('crearBtn');

    const nombre = inputNombre.value.trim();
    const tipo = inputTipo.value;
    const premio = parseFloat(inputPremio.value) || 0;

    // Validación básica en el cliente
    if (!nombre) {
        inputNombre.style.border = "2px solid red";
        alert("❌ Por favor, ingresa el Nombre de la Sala.");
        return;
    }

    inputNombre.style.border = "none";
    btn.disabled = true;
    btn.innerText = "PUBLICANDO...";

    try {
        // IMPORTANTE: Se usa la carpeta "salas" en Firestore
        await addDoc(collection(db, "salas"), {
            nombre,
            tipo,
            premioActual: premio,
            estado: "espera", // Inicia bloqueado para socios
            bolas: [],
            ganadores: [],
            fondo: 'fondo_por_defecto.jpg' // Puedes configurar esto luego
        });
        
        console.log("Sala publicada en Firebase.");
        alert("✅ ¡Sala '" + nombre + "' publicada exitosamente!");
        
        // Limpiar formulario
        inputNombre.value = '';
        inputPremio.value = '';
        
    } catch (e) {
        console.error("Error crítico al crear sala en Firebase:", e);
        // MENSAJE CLAVE: Indica error de conexión o de reglas de seguridad
        alert("❌ Fallo crítico de Firebase al crear la sala.\nRevisa la Consola (F12) y tus Reglas de Firestore.");
    } finally {
        btn.disabled = false;
        btn.innerText = "PUBLICAR SALA";
    }
};

// --- GESTIÓN DE SORTEO AUTOMÁTICO (Del requerimiento anterior) ---
window.toggleSorteo = async (idSala, estadoActual) => {
    const salaRef = doc(db, "salas", idSala);
    
    if (estadoActual === "espera") {
        // INICIAR AUTOMÁTICO
        await updateDoc(salaRef, { estado: "jugando", bolas: [] }); // Limpiar bolas previas
        
        // Reloj automático cada 5 segundos
        window.intervalosSalas[idSala] = setInterval(async () => {
            const snap = await getDoc(salaRef);
            if (!snap.exists()) return;
            const data = snap.data();
            
            // Condiciones de parada
            if (data.estado !== "jugando" || data.bolas.length >= 75) {
                clearInterval(window.intervalosSalas[idSala]);
                return;
            }

            // Generar bola única
            let nuevaBola;
            const letras = ["B", "I", "N", "G", "O"];
            do {
                const letra = letras[Math.floor(Math.random() * 5)];
                const numero = Math.floor(Math.random() * 15) + 1 + (letras.indexOf(letra) * 15);
                nuevaBola = `${letra}-${numero}`;
            } while (data.bolas.includes(nuevaBola));

            // Actualizar en tiempo real para todos los socios
            const nuevasBolas = [...data.bolas, nuevaBola];
            await updateDoc(salaRef, { bolas: nuevasBolas });

        }, 5000); 

    } else {
        // PAUSAR
        if(window.intervalosSalas[idSala]) clearInterval(window.intervalosSalas[idSala]);
        await updateDoc(salaRef, { estado: "espera" });
    }
};

// --- RENDERIZADO EN TIEMPO REAL ---
// Escucha salas y actualiza select y tablas
onSnapshot(collection(db, "salas"), (snapshot) => {
    const cont = document.getElementById('contenedorTablas');
    const select = document.getElementById('selectSalas');
    if(!cont || !select) return;
    
    cont.innerHTML = '';
    select.innerHTML = '<option value="">Selecciona Sala...</option>';
    
    snapshot.forEach(docSnap => {
        const s = docSnap.data();
        const id = docSnap.id;
        
        // Llenar select para registro de socios
        select.innerHTML += `<option value="${id}">${s.nombre}</option>`;

        // Crear tarjeta de sala para control automático
        const color = s.estado === "jugando" ? "#ff5252" : "#25D366";
        const textoBtn = s.estado === "jugando" ? "⏸ PAUSAR AUTOMÁTICO" : "🚀 INICIAR AUTOMÁTICO";

        cont.innerHTML += `
            <div class="card" style="margin-bottom: 20px; padding: 15px; border: 1px solid rgba(255,255,255,0.2); border-radius: 10px;">
                <div style="display:flex; justify-content:space-between">
                    <h3>${s.nombre}</h3>
                    <button onclick="eliminarSala('${id}')" style="width:auto; background:none; color:red; padding:5px"><i class="fas fa-trash"></i></button>
                </div>
                <p>Modo: ${s.tipo} | Bolas Cantadas: ${s.bolas ? s.bolas.length : 0}</p>
                <button onclick="toggleSorteo('${id}', '${s.estado}')" style="background: ${color}; padding: 10px;">
                    ${textoBtn}
                </button>
            </div>
        `;
    });
});

// (Otras funciones auxiliares necesarias)
window.eliminarSala = async (id) => {
    if(confirm("¿Seguro que deseas eliminar esta sala?")) {
        // Si estaba jugando, detener intervalo
        if(window.intervalosSalas[id]) clearInterval(window.intervalosSalas[id]);
        await deleteDoc(doc(db, "salas", id));
    }
};

// (Mantén tus funciones de vincularSocio que usabas anteriormente aquí abajo si lo necesitas)
