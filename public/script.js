let pendingTwoFactorAuth = false;

async function register() {
    const username = document.getElementById("register-username").value.trim();
    const password = document.getElementById("register-password").value.trim();
    const confirmPassword = document.getElementById("register-confirm-password").value.trim();

    if (!username || !password || !confirmPassword) {
        showMessage("El nombre de usuario y las contraseñas no pueden estar vacíos.");
        return;
    }

    if (password !== confirmPassword) {
        showMessage("Las contraseñas no coinciden.");
        return;
    }

    try {
        const response = await fetch("/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();
        console.log("Respuesta del registro:", result); // Para debugging

        if (result.qrCode) {
            document.getElementById("setup-2fa").style.display = "block";
            document.getElementById("qr-code").src = result.qrCode;
            document.getElementById("secret-key").textContent = result.secret;
            localStorage.setItem("pendingUsername", username);
            showMessage("Escanea el código QR con Google Authenticator");
        } else {
            showMessage(result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage("Error al registrar usuario");
    }
}
async function verify2FA() {
    const token = document.getElementById("2fa-token").value.trim();
    const username = localStorage.getItem("pendingUsername");

    if (!token) {
        showMessage("Por favor ingrese el código de verificación");
        return;
    }

    try {
        const response = await fetch("/verify-2fa", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, token })
        });

        const result = await response.json();
        
        if (result.message === "2FA activado correctamente") {
            document.getElementById("setup-2fa").style.display = "none";
            localStorage.removeItem("pendingUsername");
            showMessage("2FA activado correctamente");
        } else {
            showMessage(result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage("Error al verificar el código");
    }
}

async function login() {
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value.trim();
    const twoFactorToken = document.getElementById("2fa-login-token")?.value.trim();

    if (!username || !password) {
        showMessage("El nombre de usuario y la contraseña no pueden estar vacíos");
        return;
    }

    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                username, 
                password,
                token: twoFactorToken 
            })
        });

        const result = await response.json();
        console.log("Respuesta del login:", result); // Para debugging

        if (result.requiresTwoFactor) {
            document.getElementById("2fa-input").style.display = "block";
            showMessage("Ingrese el código de Google Authenticator");
            return;
        }

        if (result.token) {
            localStorage.setItem("jwt_token", result.token);
            showMessage("Inicio de sesión exitoso");
            setTimeout(() => {
                window.location.href = "./bienvenida.html";
            }, 1500);
        } else {
            showMessage(result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage("Error al iniciar sesión");
    }
}

function showMessage(message) {
    const messageElement = document.getElementById("message");
    messageElement.textContent = message;
    messageElement.style.display = "block";
}