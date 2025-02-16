async function register() {
    const username = document.getElementById("register-username").value.trim();
    const password = document.getElementById("register-password").value.trim();
    const confirmPassword = document.getElementById("register-confirm-password").value.trim();

    if (!username || !password || !confirmPassword) {
        document.getElementById("message").innerText = "El nombre de usuario y las contraseñas no pueden estar vacíos.";
        return;
    }

    if (password !== confirmPassword) {
        document.getElementById("message").innerText = "Las contraseñas no coinciden.";
        return;
    }

    const response = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const result = await response.json();
    document.getElementById("message").innerText = result.message;
}


async function login() {
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value.trim();

    if (!username || !password) {
        document.getElementById("message").innerText = "El nombre de usuario y la contraseña no pueden estar vacíos ni contener solo espacios";
        return;
    }

    const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const result = await response.json();
    document.getElementById("message").innerText = result.message;

    if (result.message === "Inicio de sesión exitoso.") {
        window.location.href = "../bienvenida.html"; 
    }
}
