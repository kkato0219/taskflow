const input = document.querySelector("#task-input");
const addBtn = document.querySelector("#add-btn");
const columns = document.querySelectorAll(".column");

const filterButtons = document.querySelectorAll(".filters button");
const clearBtn = document.querySelector("#clear-completed");
const taskCount = document.querySelector("#task-count");
const dueDateInput = document.querySelector("#due-date");
const priorityInput = document.querySelector("#priority");

let tasks = [];
let currentFilter = "all";

let draggedTaskId = null;

columns.forEach(column => {
    column.addEventListener("dragover", function (e) {
        e.preventDefault();
        column.classList.add("drag-over");
    });

    column.addEventListener("dragleave", function () {
        column.classList.remove("drag-over");
    });

    column.addEventListener("drop", function () {
        column.classList.remove("drag-over");

        const draggedTask = tasks.find(t => t.id === draggedTaskId);

        if (draggedTask) {
            draggedTask.status = column.dataset.status;

            saveToLocalStorage();
            renderTasks();
        }
    });
});

addBtn.addEventListener("click", function () {
    const text = input.value.trim();
    if (!text) return;

    const newTask = {
        id: Date.now(),
        text: text,
        completed: false,
        dueDate: dueDateInput.value,
        priority: priorityInput.value,
        status: "todo"
    };

    tasks.push(newTask);

    saveToLocalStorage();
    renderTasks();

    input.value = "";
    dueDateInput.value = "";
    priorityInput.value = "low";
});

function renderTasks() {

    columns.forEach(column => {
        const ul = column.querySelector(".task-list");
        ul.innerHTML = "";

        const status = column.dataset.status;

        let filteredTasks = tasks.filter(task => task.status === status);

        if (currentFilter === "active") {
            filteredTasks = filteredTasks.filter(task => !task.completed);
        } else if (currentFilter === "completed") {
            filteredTasks = filteredTasks.filter(task => task.completed);
        }

        filteredTasks = filteredTasks.slice().sort((a, b) => {
            const priorityOrder = { high: 1, medium: 2, low: 3 };

            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0) return priorityDiff;

            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;

            return a.dueDate.localeCompare(b.dueDate);
        });

        filteredTasks.forEach(task => {
            const li = document.createElement("li");

            li.addEventListener("dragover", function (e) {
                e.preventDefault();

                const rect = li.getBoundingClientRect();
                const offset = e.clientY - rect.top;

                const middle = rect.height / 2;

                if (offset > middle) {
                    li.classList.add("drag-below");
                    li.classList.remove("drag-above");
                } else {
                    li.classList.add("drag-above");
                    li.classList.remove("drag-below");
                }
            });

            li.addEventListener("drop", function (event) {
                const targetId = task.id;

                if (draggedTaskId === targetId) return;

                const draggedIndex = tasks.findIndex(t => t.id === draggedTaskId);
                const targetIndex = tasks.findIndex(t => t.id === targetId);

                const draggedTask = tasks[draggedIndex];
                const targetTask = tasks[targetIndex];

                if (draggedTask.status === targetTask.status) {

                    const rect = li.getBoundingClientRect();
                    const offset = event.clientY - rect.top;
                    const middle = rect.height / 2;

                    const [removed] = tasks.splice(draggedIndex, 1);

                    let newIndex = targetIndex;

                    if (offset > middle) {
                        newIndex = targetIndex + 1;
                    }

                    tasks.splice(targetIndex, 0, removed);

                    saveToLocalStorage();
                    renderTasks();
                }

                li.classList.remove("drag-above", "drag-below");
            });

            li.addEventListener("dragleave", function () {
                li.classList.remove("drag-above", "drag-below");
            });

            const today = new Date().toISOString().split("T")[0];
            const isOverdue = task.dueDate && task.dueDate < today && !task.completed;

            li.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px;">
                <span class="drag-handle">≡</span>

                <div>
                    <span 
                      data-id="${task.id}" 
                      class="${task.completed ? "done" : ""} ${isOverdue ? "overdue" : ""} ${task.priority}">
                      ${task.text}
                    </span>
                    <br>
                    <small>
                      ${task.dueDate ? "Due: " + task.dueDate : ""}
                      ${task.priority ? " | " + task.priority.toUpperCase() : ""}
                    </small>
                </div>
            </div>

            <button class="delete-btn" data-id="${task.id}">X</button>
            `;

            const handle = li.querySelector(".drag-handle");

            handle.setAttribute("draggable", true);

            handle.addEventListener("dragstart", function () {
                draggedTaskId = task.id;

                li.classList.add("dragging");
            });

            handle.addEventListener("dragend", function () {
                li.classList.remove("dragging");
            });

            ul.appendChild(li);
        });

    });

    const activeTasks = tasks.filter(task => !task.completed).length;
    taskCount.textContent = `${activeTasks} tasks left`;
}

function saveToLocalStorage() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem("tasks");

    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            tasks = Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error("Invalid JSON, resetting tasks");
            tasks = [];
        }
    }
}

document.addEventListener("click", function (e) {

   if (e.target.classList.contains("delete-btn")) {
      const id = Number(e.target.dataset.id);

      tasks = tasks.filter(task => task.id !== id);

      saveToLocalStorage();
      renderTasks();
   } 

   else if(e.target.dataset.id && e.detail === 2) {
      const id = Number(e.target.dataset.id);

      const task = tasks.find(t => t.id === id);

      const input = document.createElement("input");
      input.value = task.text;

      e.target.replaceWith(input);
      input.focus();

      input.addEventListener("blur", saveEdit);
      input.addEventListener("keypress", function (e) {
        if (e.key === "Enter") saveEdit();
      });

      function saveEdit() {
        const newText = input.value.trim();

        if(!newText) return renderTasks();

        tasks = tasks.map(t => {
            if (t.id === id) {
                t.text = newText;
            }
            return t;
        });

        saveToLocalStorage();
        renderTasks();
      }
   }

   else if (e.target.dataset.id && e.detail === 1) {
    const id = Number(e.target.dataset.id);

    tasks = tasks.map(task => {
        if (task.id === id) {
            task.completed = !task.completed;
        }
        return task;
    });

    saveToLocalStorage();
    renderTasks();
   }
});

filterButtons.forEach(button => {
    button.addEventListener("click", function () {
        currentFilter = this.dataset.filter;

        filterButtons.forEach(btn => btn.classList.remove("active"));
        this.classList.add("active");


        renderTasks();
    });
});

clearBtn.addEventListener("click", function () {
    tasks = tasks.filter(task => !task.completed);

    saveToLocalStorage();
    renderTasks();
});

input.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        addBtn.click();
    }
});

const themeBtn = document.getElementById("theme-toggle");

const savedTheme = localStorage.getItem("darkMode");

if (savedTheme === "true") {
    document.body.classList.add("dark");
}

themeBtn.addEventListener("click", function () {
    document.body.classList.toggle("dark");

    const isDark = document.body.classList.contains("dark");
    localStorage.setItem("darkMode", isDark);
});

loadFromLocalStorage();
renderTasks();