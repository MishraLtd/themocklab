// UI Components Generator

const Components = {
    renderDashboard: (stats) => `
        <div class="page-header fade-in">
            <h1>Welcome back, Alex</h1>
            <p>Here is your continuous learning progress. Keep pushing!</p>
        </div>

        <div class="grid-cards fade-in" style="animation-delay: 0.1s;">
            <div class="stat-card">
                <div class="stat-header">
                    <span class="stat-title">Questions Solved</span>
                    <div class="stat-icon blue"><i class="ph ph-target"></i></div>
                </div>
                <div class="stat-value">${stats.questionsSolved}</div>
                <div class="stat-trend up"><i class="ph ph-trend-up"></i> +124 this week</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-header">
                    <span class="stat-title">Overall Accuracy</span>
                    <div class="stat-icon green"><i class="ph ph-crosshair"></i></div>
                </div>
                <div class="stat-value">${stats.accuracy}%</div>
                <div class="stat-trend up"><i class="ph ph-trend-up"></i> +2.1% this week</div>
            </div>

            <div class="stat-card">
                <div class="stat-header">
                    <span class="stat-title">Current Streak</span>
                    <div class="stat-icon orange"><i class="ph ph-fire"></i></div>
                </div>
                <div class="stat-value">${stats.streak} Days</div>
                <div class="stat-trend"><i class="ph ph-minus"></i> Maintain it!</div>
            </div>

            <div class="stat-card">
                <div class="stat-header">
                    <span class="stat-title">Rank Estimate</span>
                    <div class="stat-icon purple"><i class="ph ph-trophy"></i></div>
                </div>
                <div class="stat-value">${stats.rankEstimate}</div>
                <div class="stat-trend up"><i class="ph ph-trend-up"></i> Top 5% last month</div>
            </div>
        </div>

        <div class="charts-grid fade-in" style="animation-delay: 0.2s;">
            <div class="chart-card">
                <h3>Weekly Performance Analytics</h3>
                <div class="chart-container">
                    <canvas id="weeklyChart"></canvas>
                </div>
            </div>
            <div class="chart-card">
                <h3>Subject Accuracy</h3>
                <div class="chart-container">
                    <canvas id="accuracyChart"></canvas>
                </div>
            </div>
        </div>
    `,

    renderMockTests: (tests) => {
        let testsHTML = tests.map(test => `
            <div class="test-card">
                <div class="test-info">
                    <h4>${test.title}</h4>
                    <div class="test-meta">
                        <span><i class="ph ph-exam"></i> ${test.exam}</span>
                        <span><i class="ph ph-question"></i> ${test.questions} Qs</span>
                        <span><i class="ph ph-clock"></i> ${test.time}</span>
                    </div>
                </div>
                <div class="test-actions">
                    <span class="test-tag tag-${test.difficulty}"><i class="ph ph-circle"></i> ${test.difficulty}</span>
                    <button class="btn btn-primary" style="margin-left: 1rem;" onclick="app.startTest('${test.id}')">Start Test</button>
                </div>
            </div>
        `).join('');

        return `
            <div class="page-header fade-in">
                <h1>Mock Tests</h1>
                <p>Simulate real exam environments with comprehensive tests.</p>
            </div>
            
            <div class="fade-in" style="animation-delay: 0.1s;">
                <div style="display: flex; gap: 1rem; margin-bottom: 2rem;">
                    <select class="settings-group" style="padding: 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); margin-bottom: 0;">
                        <option>All Exams</option>
                        <option>JEE Main</option>
                        <option>NEET</option>
                    </select>
                    <select class="settings-group" style="padding: 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); margin-bottom: 0;">
                        <option>All Types</option>
                        <option>Full Mock</option>
                        <option>Subject Test</option>
                        <option>Chapter Test</option>
                    </select>
                </div>

                <div class="test-list">
                    ${testsHTML}
                </div>
            </div>
        `;
    },

    renderPractice: (question) => {
        let paletteHTML = Array.from({length: 20}, (_, i) => {
            let num = i + 1;
            let cls = num === 1 ? 'active' : (num === 2 || num === 5 ? 'answered' : (num === 7 ? 'reviewed' : ''));
            return `<button class="palette-btn ${cls}">${num}</button>`;
        }).join('');

        let optionsHTML = question.options.map(opt => `
            <label class="option-label hover-target">
                <input type="radio" name="q_${question.id}" value="${opt.id}">
                <span style="font-weight: 500; margin-right: 15px;">(${opt.id.toUpperCase()})</span>
                <span>${opt.text}</span>
            </label>
        `).join('');

        return `
            <div class="page-header fade-in">
                <h1>Question Practice</h1>
                <p>Master concepts step-by-step.</p>
            </div>

            <div class="practice-container fade-in" style="animation-delay: 0.1s;">
                <div class="question-panel">
                    <div class="q-header">
                        <div>
                            <span class="q-subject">${question.subject}</span>
                            <span class="q-meta" style="margin-left: 10px;">• ${question.chapter}</span>
                        </div>
                        <div class="test-tag tag-${question.difficulty.toLowerCase()}">${question.difficulty}</div>
                    </div>
                    
                    <div class="q-text">
                        Q1. ${question.text}
                    </div>

                    <div class="q-options">
                        ${optionsHTML}
                    </div>

                    <div class="q-actions">
                        <div class="left">
                            <button class="btn btn-secondary" onclick="app.showToast('Question Saved to Bookmarks', 'success')"><i class="ph ph-bookmark-simple"></i> Save</button>
                            <button class="btn btn-secondary" onclick="app.showToast('Reported for review', 'error')"><i class="ph ph-flag"></i> Report</button>
                        </div>
                        <div>
                            <button class="btn btn-secondary" style="margin-right: 10px;">Show Solution</button>
                            <button class="btn btn-primary" onclick="app.showToast('Answer Submitted!', 'success')">Next <i class="ph ph-arrow-right"></i></button>
                        </div>
                    </div>
                </div>

                <div class="palette-panel">
                    <h3 style="font-size: 1rem; margin-bottom: 1rem;">Question Palette</h3>
                    <div style="display: flex; gap: 10px; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 1rem; flex-wrap: wrap;">
                        <span style="display: flex; align-items: center; gap: 4px;"><div style="width:10px;height:10px;background:var(--success);border-radius:2px;"></div> Answered</span>
                        <span style="display: flex; align-items: center; gap: 4px;"><div style="width:10px;height:10px;background:var(--warning);border-radius:2px;"></div> Review</span>
                        <span style="display: flex; align-items: center; gap: 4px;"><div style="width:10px;height:10px;background:var(--bg-surface);border:1px solid var(--border-color);border-radius:2px;"></div> Unanswered</span>
                    </div>
                    <div class="palette-grid">
                        ${paletteHTML}
                    </div>
                </div>
            </div>
        `;
    },

    renderSettings: () => `
        <div class="page-header fade-in">
            <h1>Settings</h1>
            <p>Customize your learning experience.</p>
        </div>

        <div class="settings-group fade-in" style="animation-delay: 0.1s;">
            <h3 style="margin-bottom: 1.5rem; font-size: 1.125rem;">Preferences</h3>
            
            <div class="form-row">
                <div>
                    <label>Dark Mode</label>
                    <p class="text-muted" style="margin: 0; font-size: 0.8rem;">Switch between light and dark themes</p>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" id="settings-theme-toggle" onchange="app.toggleTheme()">
                    <span class="slider"></span>
                </label>
            </div>

            <div class="form-row">
                <div>
                    <label>Auto-Start Timer</label>
                    <p class="text-muted" style="margin: 0; font-size: 0.8rem;">Start mock test timer automatically</p>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" checked>
                    <span class="slider"></span>
                </label>
            </div>

            <div class="form-row">
                <div>
                    <label>Study Reminders</label>
                    <p class="text-muted" style="margin: 0; font-size: 0.8rem;">Receive daily push notifications</p>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" checked>
                    <span class="slider"></span>
                </label>
            </div>

            <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 2rem 0;">

            <button class="btn btn-danger" style="width: 100%;"><i class="ph ph-sign-out"></i> Log Out</button>
        </div>
    `,

    renderEmptyState: (title, message, icon) => `
        <div class="empty-state fade-in">
            <i class="ph ${icon} empty-icon"></i>
            <h3>${title}</h3>
            <p>${message}</p>
            <button class="btn btn-primary" onclick="app.loadView('dashboard')">Back to Dashboard</button>
        </div>
    `,

    renderLoader: () => `
        <div style="display: flex; justify-content: center; align-items: center; height: 300px; width: 100%;">
            <i class="ph ph-spinner ph-spin" style="font-size: 2.5rem; color: var(--brand-primary);"></i>
        </div>
    `
};
