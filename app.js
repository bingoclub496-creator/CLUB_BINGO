<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Bingo Club - Acceso</title>
    <style>
        body { font-family: sans-serif; background: #004d61; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .login-card { background: rgba(255,255,255,0.1); padding: 30px; border-radius: 20px; text-align: center; width: 300px; }
        input { width: 100%; padding: 15px; border-radius: 10px; border: none; margin: 15px 0; box-sizing: border-box; font-size: 1.2rem; text-align: center; }
        button { background: #25D366; color: white; border: none; padding: 15px; width: 100%; border-radius: 10px; font-weight: bold; cursor: pointer; }
    </style>
</head>
<body>
    <div class="login-card">
        <h2>BINGO CLUB</h2>
        <p>Ingresa tu Código de Socio</p>
        <input type="text" id="cod" placeholder="ABC123">
        <button onclick="entrar()">ENTRAR A JUGAR</button>
    </div>

<script type="module">
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
    import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

    const firebaseConfig = { apiKey: "AIzaSyA1GIQ1xaJUINYabyqOejrlfjqUAcoQwg4", authDomain: "bingo-club-6f019.firebaseapp.com", projectId: "bingo-club-6f019", storageBucket: "bingo-club-6f019.firebasestorage.app", messagingSenderId: "1059179173812", appId: "1:1059179173812:web:78b43eaac565d213bec4e1" };
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    window.entrar = async () => {
        const c = document.getElementById('cod').value.toUpperCase();
        const q = query(collection(db, "socios"), where("codigoAcceso", "==", c));
        const snap = await getDocs(q);
        if(!snap.empty) {
            const socio = snap.docs[0];
            window.location.href = `juego.html?sala=${socio.data().idSala}&socio=${socio.id}`;
        } else {
            alert("Código no encontrado.");
        }
    };
</script>
</body>
</html>
