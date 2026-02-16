const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const API_BASE = "https://aa-tracker.onrender.com";

let currentUserId = null;
let activeDate = new Date().toISOString().split("T")[0];
let editingTaskId = null;

// =====================================================
// INIT
// =====================================================
document.addEventListener("DOMContentLoaded", async () => {
    await autoLogin();
    setupModal();
});

// =====================================================
// AUTH
// =====================================================

async function autoLogin() {
    const initData = tg.initData;
    if (!initData) return;

    const response = await fetch(`${API_BASE}/auth/telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
    });

    const data = await response.json();

    if (data.status === "ok") {
        currentUserId = data.telegram_id;
        renderCalendar();
        await loadTasksForDate(activeDate);
    }
}

// =====================================================
// CALENDAR
// =====================================================

function renderCalendar() {
    const calendar = document.getElementById("calendar");
    calendar.innerHTML = "";

    for (let i = -3; i <= 3; i++) {
        const d = new Date(activeDate);
        d.setDate(d.getDate() + i);

        const iso = d.toISOString().split("T")[0];

        const el = document.createElement("div");
        el.className = "calendar-day";
        if (iso === activeDate) el.classList.add("active");

        el.innerText = d.getDate();

        el.onclick = async () => {
            activeDate = iso;
            renderCalendar();
            await loadTasksForDate(activeDate);
        };

        calendar.appendChild(el);
    }
}

// =====================================================
// TASKS
// =====================================================

async function loadTasksForDate(date) {
    const url = new URL(`${API_BASE}/tasks`);
    url.searchParams.append("date", date);
    url.searchParams.append("telegram_id", currentUserId);

    const res = await fetch(url);
    const data = await res.json();
    renderTasks(data.tasks || []);
}

function renderTasks(tasks) {
    const list = document.getElementById("tasks-list");
    list.innerHTML = "";

    if (!tasks.length) {
        list.innerHTML = `<li class="empty">Нет задач</li>`;
        return;
    }

    tasks.forEach(task => {
        const li = createSwipeItem(task);
        list.appendChild(li);
    });
}

// =====================================================
// SWIPE LOGIC
// =====================================================

function createSwipeItem(task) {
    const container = document.createElement("li");
    container.className = "swipe-container";

    const content = document.createElement("div");
    content.className = "swipe-content";
    content.innerText = task.text;

    if (task.done) content.classList.add("done");

    const actions = document.createElement("div");
    actions.className = "swipe-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    editBtn.innerText = "Edit";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.innerText = "Delete";

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    container.appendChild(content);
    container.appendChild(actions);

    // ---- Swipe detection ----
    let startX = 0;
    let currentX = 0;

    content.addEventListener("touchstart", e => {
        startX = e.touches[0].clientX;
    });

    content.addEventListener("touchmove", e => {
        currentX = e.touches[0].clientX;
        const delta = currentX - startX;

        if (delta < 0) {
            content.style.transform = `translateX(${delta}px)`;
        }
    });

    content.addEventListener("touchend", async () => {
        const delta = currentX - startX;

        if (delta < -150) {
            // strong swipe = delete
            await deleteTask(task.id);
        } else if (delta < -60) {
            content.style.transform = "translateX(-120px)";
        } else {
            content.style.transform = "translateX(0)";
        }
    });

    // ---- Buttons ----

    editBtn.onclick = () => {
        openEditModal(task);
    };

    deleteBtn.onclick = async () => {
        await deleteTask(task.id);
    };

    return container;
}

// =====================================================
// EDIT / DELETE
// =====================================================

async function deleteTask(id) {
    await fetch(`${API_BASE}/tasks/${id}`, { method: "DELETE" });
    await loadTasksForDate(activeDate);
}

function openEditModal(task) {
    editingTaskId = task.id;
    const modal = document.getElementById("addTaskModal");
    const input = document.getElementById("new-task-input");
    input.value = task.text;
    modal.classList.remove("hidden");
}

async function saveTask(text) {
    if (editingTaskId) {
        await fetch(`${API_BASE}/tasks/${editingTaskId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        });
        editingTaskId = null;
    } else {
        await fetch(`${API_BASE}/tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text,
                date: activeDate,
                telegram_id: currentUserId,
            }),
        });
    }

    await loadTasksForDate(activeDate);
}

// =====================================================
// MODAL
// =====================================================

function setupModal() {
    const modal = document.getElementById("addTaskModal");
    const input = document.getElementById("new-task-input");
    const saveBtn = document.getElementById("save-task-btn");
    const cancelBtn = document.getElementById("cancel-task-btn");

    document.getElementById("add-task-btn").onclick = () => {
        editingTaskId = null;
        input.value = "";
        modal.classList.remove("hidden");
    };

    cancelBtn.onclick = () => {
        modal.classList.add("hidden");
    };

    saveBtn.onclick = async () => {
        const text = input.value.trim();
        if (!text) return;
        await saveTask(text);
        modal.classList.add("hidden");
    };
}
