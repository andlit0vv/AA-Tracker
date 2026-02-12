// frontend/static/main.js

const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// === Theme logic ===
const THEME_KEY = "aa_task_theme";
function applyTheme(theme) { document.documentElement.setAttribute("data-theme", theme); }
function saveTheme(theme) { localStorage.setItem(THEME_KEY, theme); }
function loadTheme() { const s = localStorage.getItem(THEME_KEY); return (s==="light"||s==="dark"?s:"dark"); }
function toggleTheme() { const cur = document.documentElement.getAttribute("data-theme"); const next = cur==="dark"? "light":"dark"; applyTheme(next); saveTheme(next); }

document.addEventListener("DOMContentLoaded", () => {
    applyTheme(loadTheme());
    autoLogin();
});

// === Auth logic ===
async function tryTelegramLogin(initData) {
    try {
        const response = await fetch("https://aa-tracker.onrender.com/auth/telegram", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData })
        });
        return await response.json();
    } catch (err) {
        console.error("Server connection error:", err);
        return { status: "error" };
    }
}

function showLoginUI() { document.getElementById("login-btn").style.display = "block"; }
function hideLoginUI() { document.getElementById("login-btn").style.display = "none"; }

async function autoLogin() {
    const initData = tg.initData;
    if (!initData) { showLoginUI(); return; }
    const data = await tryTelegramLogin(initData);
    if (data.status === "ok") {
        hideLoginUI();
        await loadTasksForToday();  // после логина загружаем задачи
    } else {
        showLoginUI();
    }
}

// === Task logic ===

// API endpoint base
const API_BASE = "https://aa-tracker.onrender.com";

// функция получить задачи по дате
async function fetchTasks(date) {
    try {
        const res = await fetch(`${API_BASE}/tasks?date=${date}`);
        if (!res.ok) throw new Error("Failed to fetch tasks");
        const body = await res.json();
        return body.tasks || [];
    } catch (err) {
        console.error("Fetch tasks error:", err);
        return [];
    }
}

// отрисовка списка задач
function renderTasks(tasks) {
    const list = document.getElementById("tasks-list");
    list.innerHTML = "";

    if (tasks.length === 0) {
        list.innerHTML = `<li class="empty">Нет задач</li>`;
        return;
    }

    tasks.forEach(task => {
        const li = document.createElement("li");
        li.textContent = task.text;
        li.dataset.id = task.id;
        li.classList.add("task-item");

        list.appendChild(li);
    });
}

// загрузить задачи на сегодня
async function loadTasksForToday() {
    const today = new Date().toISOString().split("T")[0]; // формат YYYY-MM-DD
    const tasks = await fetchTasks(today);
    renderTasks(tasks);
}

// === Theme toggle button ===
const themeBtn = document.getElementById("theme-toggle");
if (themeBtn) themeBtn.addEventListener("click", () => toggleTheme());

// login button
const loginBtn = document.getElementById("login-btn");
if (loginBtn) loginBtn.addEventListener("click", autoLogin);

// кнопка “Добавить задачу”
document.getElementById("add-task-btn").addEventListener("click", () => {
    console.log("Open add task modal (TODO)");
});
