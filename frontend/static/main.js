

const API_BASE = "https://aa-tracker.onrender.com";

let activeDate = new Date().toISOString().split("T")[0];
let currentUserId = null;
let openItem = null;

// ---- SWIPE CONFIG ----
const ACTION_WIDTH = 140;
const DELETE_THRESHOLD = 220;

// =====================================================
// TASK RENDER WITH REAL DRAG
// =====================================================

const ACTION_WIDTH = 160;
const DELETE_THRESHOLD = 260;

function createSwipeItem(task) {
    const li = document.createElement("li");
    li.className = "swipe-wrapper";

    const actions = document.createElement("div");
    actions.className = "swipe-actions";
    actions.innerHTML = `
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>
    `;

    const content = document.createElement("div");
    content.className = "swipe-content";
    content.innerText = task.text;

    li.appendChild(actions);
    li.appendChild(content);

    let startX = 0;
    let currentX = 0;
    let velocity = 0;
    let lastTime = 0;

    function animateTo(x) {
        content.style.transform = `translateX(${x}px)`;
    }

    function onStart(x) {
        startX = x;
        currentX = x;
        lastTime = Date.now();
        content.style.transition = "none";
    }

    function onMove(x) {
        const now = Date.now();
        const dx = x - currentX;
        velocity = dx / (now - lastTime + 1);

        currentX = x;
        lastTime = now;

        let delta = currentX - startX;

        if (delta < 0) {
            delta = Math.max(delta, -320);
            animateTo(delta);
        }
    }

    async function onEnd() {
        content.style.transition = "transform 0.25s cubic-bezier(.22,1,.36,1)";
        let delta = currentX - startX;

        if (delta < -DELETE_THRESHOLD || velocity < -1.2) {
            animateTo(-window.innerWidth);
            setTimeout(async () => {
                await deleteTask(task.id);
            }, 200);
            return;
        }

        if (delta < -ACTION_WIDTH) {
            animateTo(-ACTION_WIDTH);
        } else {
            animateTo(0);
        }
    }

    // Touch
    content.addEventListener("touchstart", e => onStart(e.touches[0].clientX));
    content.addEventListener("touchmove", e => onMove(e.touches[0].clientX));
    content.addEventListener("touchend", onEnd);

    // Mouse
    content.addEventListener("mousedown", e => onStart(e.clientX));
    window.addEventListener("mousemove", e => onMove(e.clientX));
    window.addEventListener("mouseup", onEnd);

    actions.querySelector(".delete-btn").onclick = async () => {
        await deleteTask(task.id);
    };

    actions.querySelector(".edit-btn").onclick = () => {
        openEditModal(task);
    };

    return li;
}
