// frontend/static/main.js

const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

/**
 * Обёртка fetch запроса на авторизацию
 */
async function tryTelegramLogin(initData) {
    try {
        const response = await fetch(
            "https://aa-tracker.onrender.com/auth/telegram",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ initData })
            }
        );

        return await response.json();
    } catch (error) {
        console.error("Server connection error:", error);
        return { status: "error", reason: "connection_error" };
    }
}

/**
 * Отображение начального UI
 */
function showLoginUI() {
    document.getElementById("login-btn").style.display = "block";
}

/**
 * Скрываем UI входа
 */
function hideLoginUI() {
    document.getElementById("login-btn").style.display = "none";
}

/**
 * Логика после успешного входа
 */
function onLoginSuccess(data) {
    alert("Login successful");
    hideLoginUI();
    // TODO: здесь будет логика показа задач
}

/**
 * Основной авто-логин
 */
async function autoLogin() {
    const initData = tg.initData;

    console.log("Attempting auto login with initData:", initData);

    if (!initData) {
        console.warn("Open this app via Telegram (no initData)");
        showLoginUI();
        return;
    }

    const data = await tryTelegramLogin(initData);

    if (data.status === "ok") {
        onLoginSuccess(data);
    } else {
        console.warn("Auth error:", data.reason);
        showLoginUI();
    }
}

// При загрузке страницы пытаемся авторизовать
window.addEventListener("DOMContentLoaded", () => {
    autoLogin();
});

// Слушатель на кнопку входа
const loginBtn = document.getElementById("login-btn");
loginBtn.addEventListener("click", async () => {
    autoLogin();
});
