function onTelegramAuth(user) {
    fetch("/auth/telegram", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(user)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("Authorization failed");
        }
        return response.json();
    })
    .then(() => {
        window.location.href = "/dashboard";
    })
    .catch(() => {
        alert("Ошибка авторизации через Telegram");
    });
}
