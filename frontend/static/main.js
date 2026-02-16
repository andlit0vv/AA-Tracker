

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
    let dragging = false;

    function closeItem() {
        content.style.transform = `translateX(0px)`;
        openItem = null;
    }

    function onStart(x) {
        dragging = true;
        startX = x;
        currentX = x;

        if (openItem && openItem !== content) {
            openItem.style.transform = `translateX(0px)`;
        }
        openItem = content;
    }

    function onMove(x) {
        if (!dragging) return;
        currentX = x;
        let delta = currentX - startX;

        if (delta < 0) {
            delta = Math.max(delta, -300);
            content.style.transform = `translateX(${delta}px)`;
        }
    }

    async function onEnd() {
        dragging = false;
        let delta = currentX - startX;

        if (delta < -DELETE_THRESHOLD) {
            await deleteTask(task.id);
            return;
        }

        if (delta < -ACTION_WIDTH) {
            content.style.transform = `translateX(-${ACTION_WIDTH}px)`;
        } else {
            closeItem();
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
