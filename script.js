document.addEventListener('DOMContentLoaded', () => {

    // ============== 1. Element Selection ==============
    const taskForm = document.getElementById('task-form');
    const taskModal = document.getElementById('task-modal');
    const addTaskBtn = document.getElementById('add-task-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const searchBar = document.getElementById('search-bar');
    const sortTasks = document.getElementById('sort-tasks');
    const clearCompletedBtn = document.getElementById('clear-completed-btn');
    const taskListContainer = document.getElementById('task-list-container');
    const toastContainer = document.getElementById('toast-container');
    const modalTitle = document.getElementById('modal-title');
    const taskIdInput = document.getElementById('task-id');


    // ============== 2. State Management ==============
    let state = {
        tasks: JSON.parse(localStorage.getItem('tasks')) || [],
        searchTerm: '',
        sortBy: 'default',
        editingTaskId: null
    };


    // ============== 3. Core Functions ==============
    const saveState = () => {
        localStorage.setItem('tasks', JSON.stringify(state.tasks));
    };

    const showToast = (message, type = 'success') => {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    };


    // ============== 4. The Main Render Function ==============
    const renderTasks = () => {
        taskListContainer.innerHTML = '';

        let filteredTasks = state.tasks.filter(task =>
            task.title.toLowerCase().includes(state.searchTerm.toLowerCase())
        );

        // NOTE: Sorting is disabled when drag-and-drop is the primary ordering method.
        // You could have a "manual" sort option to re-enable this.
        if (state.sortBy === 'date-asc') {
            filteredTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        } else if (state.sortBy === 'priority') {
            const priorityMap = { high: 3, medium: 2, low: 1 };
            filteredTasks.sort((a, b) => priorityMap[b.priority] - priorityMap[a.priority]);
        }
        
        if (filteredTasks.length === 0 && state.searchTerm === '') {
            taskListContainer.innerHTML = '<p class="empty-state">You\'re all caught up! 🎉</p>';
            return;
        } else if (filteredTasks.length === 0 && state.searchTerm !== '') {
            taskListContainer.innerHTML = `<p class="empty-state">No tasks found for "${state.searchTerm}"</p>`;
            return;
        }

        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);

        const getTaskCategory = (task) => {
            const dueDate = new Date(task.dueDate);
            if (dueDate < today && dueDate.toDateString() !== today.toDateString()) return 'Past Due';
            if (dueDate.toDateString() === today.toDateString()) return 'Today';
            if (dueDate.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
            return 'Upcoming';
        };

        const groupedTasks = filteredTasks.reduce((acc, task) => {
            const category = getTaskCategory(task);
            if (!acc[category]) acc[category] = [];
            acc[category].push(task);
            return acc;
        }, {});

        const categoryOrder = ['Past Due', 'Today', 'Tomorrow', 'Upcoming'];

        categoryOrder.forEach(category => {
            if (groupedTasks[category]) {
                const section = document.createElement('div');
                section.className = 'date-section';
                section.innerHTML = `<h3 class="date-section-header">${category} (${groupedTasks[category].length})</h3>`;
                const ul = document.createElement('ul');
                ul.className = 'task-list';

                groupedTasks[category].forEach(task => {
                    const taskItem = document.createElement('li');
                    taskItem.className = `task-item priority-${task.priority}`;
                    taskItem.dataset.id = task.id;
                    taskItem.draggable = true;

                    if (task.completed) taskItem.classList.add('completed');
                    
                    taskItem.innerHTML = `
                        <div class="task-content">
                            <div class="task-details">
                                <h3>${task.title}</h3>
                                <p>${task.description}</p>
                                <small>Due: ${task.dueDate}</small>
                            </div>
                        </div>
                        <div class="task-actions">
                            <button class="complete-btn">✔️</button>
                            <button class="edit-btn">✏️</button>
                            <button class="delete-btn">🗑️</button>
                        </div>
                    `;
                    ul.appendChild(taskItem);
                });
                section.appendChild(ul);
                taskListContainer.appendChild(section);
            }
        });
    };


    // ============== 5. Event Listeners ==============

    const openModal = (task = null) => {
        taskForm.reset();
        if (task) {
            modalTitle.textContent = 'Edit Task';
            taskIdInput.value = task.id;
            document.getElementById('task-title').value = task.title;
            document.getElementById('task-desc').value = task.description;
            document.getElementById('task-due-date').value = task.dueDate;
            document.getElementById('task-priority').value = task.priority;
            state.editingTaskId = task.id;
        } else {
            modalTitle.textContent = 'Add Task';
            taskIdInput.value = '';
            state.editingTaskId = null;
        }
        taskModal.classList.add('show');
    };

    const closeModal = () => {
        taskModal.classList.remove('show');
    };

    addTaskBtn.addEventListener('click', () => openModal());
    cancelBtn.addEventListener('click', closeModal);
    taskModal.addEventListener('click', (e) => e.target === taskModal && closeModal());

    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = state.editingTaskId || Date.now();
        const taskData = {
            id,
            title: document.getElementById('task-title').value,
            description: document.getElementById('task-desc').value,
            dueDate: document.getElementById('task-due-date').value,
            priority: document.getElementById('task-priority').value,
            completed: state.editingTaskId ? state.tasks.find(t=>t.id === id).completed : false
        };

        if (state.editingTaskId) {
            state.tasks = state.tasks.map(t => t.id === id ? taskData : t);
            showToast('Task updated successfully!');
        } else {
            state.tasks.push(taskData);
            showToast('Task added successfully!');
        }

        saveState();
        renderTasks();
        closeModal();
    });

    taskListContainer.addEventListener('click', (e) => {
        const taskItem = e.target.closest('.task-item');
        const taskId = taskItem ? Number(taskItem.dataset.id) : null;

        if (e.target.classList.contains('complete-btn')) {
            const task = state.tasks.find(t => t.id === taskId);
            task.completed = !task.completed;
        } else if (e.target.classList.contains('delete-btn')) {
            if (confirm('Are you sure you want to delete this task?')) {
                state.tasks = state.tasks.filter(t => t.id !== taskId);
                showToast('Task deleted.', 'error');
            }
        } else if (e.target.classList.contains('edit-btn')) {
            const taskToEdit = state.tasks.find(t => t.id === taskId);
            openModal(taskToEdit);
        } else if (e.target.classList.contains('date-section-header')) {
            e.target.parentElement.classList.toggle('collapsed');
        }

        if (taskId) {
            saveState();
            renderTasks();
        }
    });
    
    searchBar.addEventListener('input', (e) => {
        state.searchTerm = e.target.value;
        renderTasks();
    });

    sortTasks.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderTasks();
    });

    clearCompletedBtn.addEventListener('click', () => {
        const completedCount = state.tasks.filter(t => t.completed).length;
        if (completedCount > 0 && confirm(`Are you sure you want to clear ${completedCount} completed tasks?`)) {
            state.tasks = state.tasks.filter(t => !t.completed);
            saveState();
            renderTasks();
            showToast('Completed tasks cleared!');
        } else if (completedCount === 0) {
            showToast('No completed tasks to clear.', 'error');
        }
    });


    // ============== 6. Drag and Drop Logic (Functional) ==============
    let draggedItemId = null;

    taskListContainer.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('task-item')) {
            draggedItemId = Number(e.target.dataset.id);
            setTimeout(() => e.target.classList.add('dragging'), 0);
        }
    });
    
    taskListContainer.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('task-item')) {
            e.target.classList.remove('dragging');
        }
    });

    taskListContainer.addEventListener('dragover', (e) => {
        e.preventDefault(); // Necessary to allow dropping
    });
    
    taskListContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedItemId === null) return;

        const afterElement = getDragAfterElement(e.target.closest('.task-list'), e.clientY);
        const droppedOnTaskId = afterElement ? Number(afterElement.dataset.id) : null;
        
        // Find the dragged task and remove it from its current position
        const draggedTask = state.tasks.find(t => t.id === draggedItemId);
        if (!draggedTask) return;
        
        const originalIndex = state.tasks.findIndex(t => t.id === draggedItemId);
        state.tasks.splice(originalIndex, 1);

        if (droppedOnTaskId === null) {
            // Dropped at the end of a list
            state.tasks.push(draggedTask);
        } else {
            // Dropped before another element
            const dropIndex = state.tasks.findIndex(t => t.id === droppedOnTaskId);
            state.tasks.splice(dropIndex, 0, draggedTask);
        }
        
        draggedItemId = null;
        // The sorting is now manual, so set dropdown to default
        state.sortBy = 'default';
        sortTasks.value = 'default';

        saveState();
        renderTasks();
    });

    function getDragAfterElement(container, y) {
        if (!container) return null;
        const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }


    // ============== 7. Initial Render ==============
    renderTasks();
    setInterval(() => {
        const now = new Date();
        state.tasks.forEach(task => {
            const dueDate = new Date(task.dueDate);
            if (!task.completed && dueDate < now && (now - dueDate < 1000 * 60 * 60)) {
                // showToast(`Task "${task.title}" is past due!`, 'error');
            }
        });
    }, 60000 * 30);
});
