// Инициализация Telegram Web App
const tg = window.Telegram?.WebApp;

// Кнопка "Войти"
const loginBtn = document.getElementById("login-btn");

// Если Web App не открыт в Telegram — скрываем кнопку
// (initData будет undefined при прямом открытии в браузере)
if (!tg?.initData) {
    loginBtn.textContent = "Открыть в Telegram";
    loginBtn.disabled = true;
}

// Обработчик для логина
loginBtn.addEventListener("click", async () => {
    try {
        // Берем initData, которую Telegram передает при запуске
        const initData = tg.initData;

        // Отправляем на сервер для валидации
        const res = await fetch("/auth/signin", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ initData })
        });

        if (!res.ok) {
            throw new Error("Auth failed");
        }

        const isAuth = await res.json();

        if (isAuth) {
            // Авторизация успешна — переписываем UI
            document.querySelector(".container").innerHTML = `
                <h2>Вы успешно авторизованы</h2>
                <p>Добро пожаловать!</p>
            `;
        } else {
            alert("Не удалось авторизовать");
        }

    } catch (err) {
        console.error(err);
        alert("Ошибка авторизации");
    }
});
