// ===== Telegram Init =====
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// ===== Config =====
const API_BASE = "https://aa-tracker.onrender.com";
const THEME_KEY = "aa_task_theme";

let currentUserId = null;
let activeDate = new Date().toISOString().split("T")[0]; // текущая выбранная дата


// =====================================================
// THEME LOGIC
// =====================================================

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
}

function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
}

function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === "light" || saved === "dark" ? saved : "dark";
}

function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    saveTheme(next);
}


// =====================================================
// INIT
// =====================================================

document.addEventListener("DOMContentLoaded", async () => {
    applyTheme(loadTheme());
    setupCalendarToggle();
    setupModal();
    await autoLogin();
});


// =====================================================
// AUTH
// =====================================================

async function tryTelegramLogin(initData) {
    try {
        const response = await fetch(`${API_BASE}/auth/telegram`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData }),
        });
        return await response.json();
    } catch (error) {
        console.error("Server connection error:", error);
        return { status: "error" };
    }
}

async function autoLogin() {
    const initData = tg.initData;

    if (!initData) return;

    const data = await tryTelegramLogin(initData);

    if (data.status === "ok") {
        currentUserId = data.telegram_id;
        localStorage.setItem("telegram_id", currentUserId);

        renderCalendar();
        await loadTasksForDate(activeDate);
    }
}


// =====================================================
// CALENDAR
// =====================================================

function setupCalendarToggle() {
    const toggleBtn = document.getElementById("toggle-calendar");
    const calendarEl = document.getElementById("calendar");

    toggleBtn?.addEventListener("click", () => {
        calendarEl.classList.toggle("hidden");
        toggleBtn.textContent = calendarEl.classList.contains("hidden")
            ? "📅 Показать календарь"
            : "📅 Скрыть календарь";
    });
}

function renderCalendar() {
    const calendarEl = document.getElementById("calendar");
    calendarEl.innerHTML = "";

    const days = getWeekAround(activeDate);

    days.forEach(date => {
        const div = document.createElement("div");
        div.className = "calendar-day";
        if (date === activeDate) div.classList.add("active");

        const d = new Date(date);
        div.innerHTML = `
            <div>${d.getDate()}</div>
            <small>${getWeekdayShort(d)}</small>
        `;

        div.addEventListener("click", async () => {
            activeDate = date;
            renderCalendar();
            await loadTasksForDate(activeDate);
        });

        calendarEl.appendChild(div);
    });
}

function getWeekAround(centerISO) {
    const center = new Date(centerISO);
    const result = [];

    for (let i = -3; i <= 3; i++) {
        const d = new Date(center);
        d.setDate(center.getDate() + i);
        result.push(d.toISOString().split("T")[0]);
    }

    return result;
}

function getWeekdayShort(date) {
    return ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"][date.getDay()];
}


// =====================================================
// TASKS
// =====================================================

async function fetchTasks(date) {
    if (!currentUserId) {
        currentUserId = localStorage.getItem("telegram_id");
    }

    const url = new URL(`${API_BASE}/tasks`);
    url.searchParams.append("date", date);
    url.searchParams.append("telegram_id", currentUserId);

    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch tasks");

    const body = await res.json();
    return body.tasks || [];
}

function renderTasks(tasks) {
    const list = document.getElementById("tasks-list");
    list.innerHTML = "";

    if (!tasks.length) {
        list.innerHTML = `<li class="empty">Нет задач</li>`;
        return;
    }

    tasks.forEach(task => {
        const li = document.createElement("li");
        li.textContent = task.text;
        li.dataset.id = task.id;
        list.appendChild(li);
    });
}

async function loadTasksForDate(date) {
    try {
        const tasks = await fetchTasks(date);
        renderTasks(tasks);
    } catch (err) {
        console.error("Load tasks error:", err);
        renderTasks([]);
    }
}


// =====================================================
// MODAL + CREATE TASK
// =====================================================

function setupModal() {
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
            const res = await fetch(`${API_BASE}/tasks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text,
                    date: activeDate, // теперь создаётся для выбранной даты
                    telegram_id: currentUserId,
                }),
            });

            if (!res.ok) throw new Error("Ошибка создания");

            addTaskModal.classList.add("hidden");
            await loadTasksForDate(activeDate);

        } catch (err) {
            console.error("Add task error:", err);
            alert("Не удалось создать задачу");
        }
    });
}


// =====================================================
// THEME TOGGLE (если добавите кнопку)
// =====================================================

document.getElementById("theme-toggle")?.addEventListener("click", toggleTheme);
