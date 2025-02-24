const express = require("express");
const fs = require("fs");
const crypto = require("crypto");
const cors = require("cors");
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

const JWT_SECRET = crypto.randomBytes(32).toString('hex');
const usersFile = "./server/users.json";
const loginAttempts = {};

const readUsers = () => {
    if (!fs.existsSync(usersFile)) return [];
    return JSON.parse(fs.readFileSync(usersFile, "utf8"));
};

const writeUsers = (users) => {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), "utf8");
};

// verificar JWT
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(403).json({ message: "Token no proporcionado" });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Token inválido" });
    }
};

// Registro de Usuario
app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    const users = readUsers();

    if (users.find(user => user.username === username)) {
        return res.json({ message: "El usuario ya existe." });
    }

    // Generar secreto para Google Authenticator
    const secret = speakeasy.generateSecret({
        name: `MiApp:${username}`
    });

    // Generar QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.createHmac("sha256", salt).update(password).digest("hex");

    users.push({
        username,
        salt,
        hash,
        twoFactorSecret: secret.base32,
        twoFactorEnabled: false
    });
    writeUsers(users);

    res.json({
        message: "Registro exitoso. Configure la autenticación de dos factores.",
        qrCode: qrCodeUrl,
        secret: secret.base32
    });
});

// Verificar y activar 2FA
app.post("/verify-2fa", (req, res) => {
    const { username, token } = req.body;
    const users = readUsers();
    const user = users.find(u => u.username === username);

    if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token
    });

    if (verified) {
        user.twoFactorEnabled = true;
        writeUsers(users);
        res.json({ message: "2FA activado correctamente" });
    } else {
        res.status(400).json({ message: "Código inválido" });
    }
});

// Login
app.post("/login", async (req, res) => {
    const { username, password, token } = req.body;
    const users = readUsers();
    const user = users.find(u => u.username === username);

    // Verificar intentos de login
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

    if (hash !== user.hash) {
        loginAttempts[username].attempts += 1;
        if (loginAttempts[username].attempts >= 3) {
            loginAttempts[username].blockedUntil = Date.now() + 5 * 60 * 1000;
            return res.json({ message: "Demasiados intentos fallidos. Intenta de nuevo en 5 minutos." });
        }
        return res.json({ message: "Usuario o contraseña incorrectos." });
    }

    // Verificar 2FA si está activado
    if (user.twoFactorEnabled) {
        if (!token) {
            return res.json({ 
                message: "Se requiere código 2FA",
                requiresTwoFactor: true 
            });
        }

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: token
        });

        if (!verified) {
            return res.json({ message: "Código 2FA inválido" });
        }
    }

    // Generar JWT
    const jwtToken = jwt.sign(
        { username: user.username, id: user.id },
        JWT_SECRET,
        { expiresIn: '24h' }
    );

    loginAttempts[username] = { attempts: 0, blockedUntil: null };

    res.json({
        message: "Inicio de sesión exitoso.",
        token: jwtToken
    });
});

// Ruta protegida 
app.get("/protected", verifyToken, (req, res) => {
    res.json({ message: "Acceso permitido", user: req.user });
});

app.listen(3000, () => console.log("Servidor corriendo en http://localhost:3000"));