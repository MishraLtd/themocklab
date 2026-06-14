// Main Application Logic

class App {
    constructor() {
        this.currentView = 'dashboard';
        this.theme = localStorage.getItem('theme') || 'light';
        this.container = document.getElementById('view-container');
        this.sidebar = document.getElementById('sidebar');
        
        this.init();
    }

    async init() {
        this.setupTheme();
        this.setupEventListeners();
        await this.populateExamsMenu();
        this.loadView(this.currentView);
    }

    setupTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        const icon = document.querySelector('#theme-toggle i');
        if(icon) {
            icon.className = this.theme === 'dark' ? 'ph ph-sun' : 'ph ph-moon';
        }
        
        // Sync settings toggle if it exists
        const settingsToggle = document.getElementById('settings-theme-toggle');
        if (settingsToggle) {
            settingsToggle.checked = (this.theme === 'dark');
        }
    }

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', this.theme);
        this.setupTheme();
        this.showToast(`Theme switched to ${this.theme} mode`, 'success');

        // Re-render charts if they exist to match theme. For simplicity, just reload view.
        if(this.currentView === 'dashboard') {
            setTimeout(() => this.loadView('dashboard'), 100);
        }
    }

    setupEventListeners() {
        // Theme toggle button
        document.getElementById('theme-toggle')?.addEventListener('click', () => this.toggleTheme());

        // Mobile sidebar toggles
        document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
            this.sidebar.classList.add('open');
        });
        
        document.getElementById('mobile-close-btn')?.addEventListener('click', () => {
            this.sidebar.classList.remove('open');
        });

        // Navigation clicks
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Handle Submenu toggle
                if (item.classList.contains('has-submenu')) {
                    item.classList.toggle('open');
                    const submenu = item.nextElementSibling;
                    if (submenu && submenu.classList.contains('submenu')) {
                        submenu.classList.toggle('open');
                    }
                    return;
                }

                // Handle routing
                const view = item.dataset.view;
                if (view) {
                    this.loadView(view);
                    
                    // Update active state
                    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                    item.classList.add('active');

                    // Close sidebar on mobile
                    if (window.innerWidth <= 768) {
                        this.sidebar.classList.remove('open');
                    }
                }
            });
        });
    }

    async populateExamsMenu() {
        const examsMenu = document.getElementById('exams-submenu');
        if (!examsMenu) return;

        try {
            const exams = await fetchExams(); // Simulated API call
            examsMenu.innerHTML = exams.map(exam => `
                <li class="nav-item" data-view="practice">
                    <i class="${exam.icon}"></i>
                    <span>${exam.name}</span>
                </li>
            `).join('');

            // Add listeners to new items
            examsMenu.querySelectorAll('.nav-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    this.loadView(item.dataset.view);
                });
            });
        } catch (error) {
            console.error("Failed to load exams", error);
        }
    }

    async loadView(viewName) {
        this.currentView = viewName;
        this.container.innerHTML = Components.renderLoader();

        try {
            if (viewName === 'dashboard') {
                const stats = await fetchDashboardStats();
                this.container.innerHTML = Components.renderDashboard(stats);
                this.initCharts();
            } 
            else if (viewName === 'mock-tests') {
                // Fetch mock tests from DB placeholder
                this.container.innerHTML = Components.renderMockTests(MockDB.upcomingTests);
            }
            else if (viewName === 'practice') {
                // Fetch practice questions from DB placeholder
                this.container.innerHTML = Components.renderPractice(MockDB.practiceQuestion);
            }
            else if (viewName === 'settings') {
                this.container.innerHTML = Components.renderSettings();
                this.setupTheme(); // Ensure toggle matches state
            }
            else {
                // Placeholder for other routes (Bookmarks, Performance, etc)
                this.container.innerHTML = Components.renderEmptyState(
                    'Coming Soon', 
                    'This module is currently under development. Please check back later.',
                    'ph-rocket'
                );
            }

            // Scroll to top
            this.container.scrollTop = 0;

        } catch (error) {
            this.container.innerHTML = Components.renderEmptyState(
                'Error', 
                'Failed to load content. Please try again.',
                'ph-warning'
            );
        }
    }

    startTest(testId) {
        this.showToast(`Starting Test ID: ${testId}... Redirecting.`, 'success');
        // Placeholder for redirecting to active test environment
        // window.location.href = `/test/${testId}`;
    }

    showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'ph-check-circle' : 'ph-info';
        toast.innerHTML = `<i class="ph ${icon}"></i> <span>${message}</span>`;
        
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideUpToast 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    initCharts() {
        // Chart.js implementation for Dashboard
        const textCol = this.theme === 'dark' ? '#9ca3af' : '#5f5e5b';
        const gridCol = this.theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
        
        // 1. Weekly Chart
        const weeklyCtx = document.getElementById('weeklyChart');
        if (weeklyCtx) {
            new Chart(weeklyCtx, {
                type: 'line',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [{
                        label: 'Questions Attempted',
                        data: [45, 62, 55, 89, 72, 120, 150],
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointBackgroundColor: '#2563eb'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { grid: { color: gridCol }, ticks: { color: textCol } },
                        x: { grid: { display: false }, ticks: { color: textCol } }
                    }
                }
            });
        }

        // 2. Accuracy Radial/Doughnut Chart
        const accCtx = document.getElementById('accuracyChart');
        if (accCtx) {
            new Chart(accCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Physics', 'Chemistry', 'Mathematics'],
                    datasets: [{
                        data: [82, 90, 78],
                        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '75%',
                    plugins: {
                        legend: { position: 'bottom', labels: { color: textCol, padding: 20, usePointStyle: true } }
                    }
                }
            });
        }
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
