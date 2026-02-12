// frontend/static/main.js

const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const THEME_KEY = "aa_task_theme";

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
}

function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
}

function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") {
        return saved;
    }
    return "dark";
}

function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    saveTheme(next);
}

document.addEventListener("DOMContentLoaded", () => {
    applyTheme(loadTheme());
    autoLogin();
});

// ===== Auth logic =====
async function tryTelegramLogin(initData) {
    try {
        const response = await fetch(
            "https://aa-tracker.onrender.com/auth/telegram",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ initData }),
            }
        );
        return await response.json();
    } catch (error) {
        console.error("Server connection error:", error);
        return { status: "error" };
    }
}

function showLoginUI() {
    document.getElementById("login-btn")?.classList.remove("hidden");
}

function hideLoginUI() {
    document.getElementById("login-btn")?.classList.add("hidden");
}

async function autoLogin() {
    const initData = tg.initData;
    if (!initData) {
        showLoginUI();
        return;
    }
    const data = await tryTelegramLogin(initData);
    if (data.status === "ok") {
        hideLoginUI();
        await loadTasksForToday();
    } else {
        showLoginUI();
    }
}

// ===== Task logic =====
const API_BASE = "https://aa-tracker.onrender.com";

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

function renderTasks(tasks) {
    const list = document.getElementById("tasks-list");
    list.innerHTML = "";
    if (tasks.length === 0) {
        list.innerHTML = `<li class="empty">Нет задач</li>`;
        return;
    }
    tasks.forEach((task) => {
        const li = document.createElement("li");
        li.textContent = task.text;
        li.dataset.id = task.id;
        list.appendChild(li);
    });
}

async function loadTasksForToday() {
    const today = new Date().toISOString().split("T")[0];
    const tasks = await fetchTasks(today);
    renderTasks(tasks);
}

// ===== Modal logic =====
const addTaskModal = document.getElementById("addTaskModal");
const newTaskInput = document.getElementById("new-task-input");
const saveTaskBtn = document.getElementById("save-task-btn");
const cancelTaskBtn = document.getElementById("cancel-task-btn");

document.getElementById("add-task-btn")?.addEventListener("click", () => {
    newTaskInput.value = "";
    addTaskModal.classList.remove("hidden");
});

cancelTaskBtn?.addEventListener("click", () => {
    addTaskModal.classList.add("hidden");
});

saveTaskBtn?.addEventListener("click", async () => {
    const text = newTaskInput.value.trim();
    if (!text) {
        alert("Введите текст задачи");
        return;
    }

    try {
        const today = new Date().toISOString().split("T")[0];

        const res = await fetch(`${API_BASE}/tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: text,
                date: today,
            }),
        });

        if (!res.ok) throw new Error("Ошибка при создании задачи");

        addTaskModal.classList.add("hidden");
        await loadTasksForToday();
    } catch (err) {
        console.error("Add task error:", err);
        alert("Не удалось создать задачу");
    }
});

// ===== theme toggle (if exists in HTML) =====
document.getElementById("theme-toggle")?.addEventListener("click", () => {
    toggleTheme();
});
