const express = require("express");
const fs = require("fs");
const crypto = require("crypto");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

const usersFile = "./server/users.json";
const loginAttempts = {}; // Guarda los intentos de cada usuario

// Función para leer usuarios
const readUsers = () => {
    if (!fs.existsSync(usersFile)) return [];
    return JSON.parse(fs.readFileSync(usersFile, "utf8"));
};

// Función para escribir usuarios
const writeUsers = (users) => {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), "utf8");
};

// Registro de Usuario
app.post("/register", (req, res) => {
    const { username, password } = req.body;
    const users = readUsers();

    if (users.find(user => user.username === username)) {
        return res.json({ message: "El usuario ya existe." });
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.createHmac("sha256", salt).update(password).digest("hex");

    users.push({ username, salt, hash });
    writeUsers(users);

    res.json({ message: "Registro exitoso." });
});

// Login
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    const users = readUsers();
    const user = users.find(user => user.username === username);

    if (!loginAttempts[username]) {
        loginAttempts[username] = { attempts: 0, blockedUntil: null };
    }

    const { attempts, blockedUntil } = loginAttempts[username];

    if (blockedUntil && blockedUntil > Date.now()) {
        return res.json({ message: "Demasiados intentos fallidos. Intenta de nuevo más tarde." });
    }

    if (!user) {
        loginAttempts[username].attempts += 1;
        return res.json({ message: "Usuario o contraseña incorrectos." });
    }

    const hash = crypto.createHmac("sha256", user.salt).update(password).digest("hex");

    if (hash === user.hash) {
        loginAttempts[username] = { attempts: 0, blockedUntil: null }; // Restablecer intentos si es correcto 
        return res.json({ message: "Inicio de sesión exitoso." });
    } else {
        loginAttempts[username].attempts += 1;

        if (loginAttempts[username].attempts >= 3) {
            loginAttempts[username].blockedUntil = Date.now() + 5 * 60 * 1000; // Bloquear 5 minutos
            return res.json({ message: "Demasiados intentos fallidos. Intenta de nuevo en 5 minutos." });
        }

        return res.json({ message: "Usuario o contraseña incorrectos." });
    }
});

app.listen(3000, () => console.log("Servidor corriendo en http://localhost:3000"));
