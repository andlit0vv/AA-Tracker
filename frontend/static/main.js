const tg = window.Telegram.WebApp;

tg.ready();
tg.expand();

const loginBtn = document.getElementById("login-btn");

loginBtn.addEventListener("click", async () => {
    const initData = tg.initData;

    if (!initData) {
        alert("Open this app via Telegram");
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

        if (data.status === "ok") {
            alert("Login successful");
        } else {
            alert("Auth error");
        }
    } catch (e) {
        alert("Server connection error");
        console.error(e);
    }
});
