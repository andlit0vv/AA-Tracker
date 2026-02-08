// Проверка работы 
console.log("main.js OK");

// Сам скрипт
const tg = window.Telegram.WebApp;

// сообщаем Telegram, что мини-апп готов
tg.ready();

const loginBtn = document.getElementById("login-btn");

loginBtn.addEventListener("click", async () => {
    const initData = tg.initData;

    if (!initData) {
        alert("Открой приложение через Telegram");
        return;
    }

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

        const data = await response.json();
        console.log("Backend response:", data);

        if (data.status === "ok") {
            alert("Успешная авторизация");
        } else {
            alert("Ошибка авторизации");
        }
    } catch (err) {
        console.error(err);
        alert("Ошибка соединения с сервером");
    }
});
