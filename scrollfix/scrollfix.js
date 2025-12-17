// Scroll Fix App

class ScrollFixApp {
    constructor() {
        // Sayings shown before scrolling (related to scrolling/dopamine/satisfaction)
        this.beforeScrollSayings = [
            "Scroll here so you don't get stuck scrolling elsewhere.",
            "Give it a flick, maybe scrolling will fix it.",
            "They want you to scroll - ad dollars. Stick it to the man - scroll here instead!",
            "Get your dopamine fix the ad-free way.",
            "Infinite scroll? Try intentional scroll.",
            "Breaking the scroll addiction, one swipe at a time.",
            "Your thumb has better things to scroll than ads.",
            "Reclaim your scroll power!",
            "The scroll that actually satisfies.",
            "No algorithm here, just pure scroll satisfaction.",
            "Scroll with purpose, not by design.",
            "This is the scroll you're looking for.",
            "Give your brain the scroll it deserves.",
            "Mindful scrolling starts here.",
            "The anti-doomscroll scroll."
        ];

        // Feel-good sayings shown after scrolling
        this.afterScrollSayings = [
            "You got this!",
            "Now get back to work.",
            "Ah, that's better.",
            "Feeling good? Good.",
            "Satisfied? Excellent.",
            "Perfect. Now go be productive.",
            "There you go! Mission accomplished.",
            "Nice scroll! Back to reality.",
            "Dopamine delivered. You're welcome.",
            "That hit the spot, didn't it?",
            "Scroll complete. Life continues.",
            "See? Wasn't that refreshing?",
            "Got what you needed? Great!",
            "And... we're good. Carry on.",
            "Scroll fix applied successfully."
        ];

        this.firstVisit = true;
        this.canScroll = true;
        this.scrollHistory = [];
        this.todayScrollCount = 0;
        this.consecutiveScrolls = 0;
        this.lastScrollTime = null;
        this.nextScrollAllowedTime = null;
        this.cooldownTimer = null;
        
        this.initializeElements();
        this.loadFromLocalStorage();
        this.initializeTheme();
        this.initializeEventListeners();
        this.updateDisplay();
        this.checkCooldown();
    }

    initializeElements() {
        this.card = document.getElementById('scroll-card');
        this.cardText = document.getElementById('card-text');
        this.instructions = document.getElementById('instructions');
        this.daysCounter = document.getElementById('days-counter');
        this.scrollCount = document.getElementById('scroll-count');
        this.historyToggle = document.getElementById('history-toggle');
        this.historyList = document.getElementById('history-list');
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('appTheme') || 'default';
        this.setTheme(savedTheme);
    }

    setTheme(theme) {
        document.body.classList.remove('theme-light', 'theme-dark', 'theme-warm-light', 'theme-warm-dark',
            'theme-red', 'theme-pink', 'theme-red-dark', 'theme-pink-dark', 'theme-black', 'theme-blue', 'theme-blue-dark');

        if (theme !== 'default') {
            document.body.classList.add(`theme-${theme}`);
        }

        document.querySelectorAll('.theme-btn-active').forEach(btn => {
            btn.className = `theme-btn-active theme-${theme}`;
        });

        localStorage.setItem('appTheme', theme);
    }

    initializeEventListeners() {
        // Theme picker
        const themePicker = document.querySelector('.theme-picker');
        const themeDropdown = document.querySelector('.theme-dropdown');

        themePicker.addEventListener('click', (e) => {
            if (e.target.closest('.theme-btn-active')) {
                const isVisible = themeDropdown.style.display === 'grid';
                themeDropdown.style.display = isVisible ? 'none' : 'grid';
            }
        });

        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setTheme(btn.dataset.theme);
                themeDropdown.style.display = 'none';
            });
        });

        document.addEventListener('click', (e) => {
            if (!themePicker.contains(e.target)) {
                themeDropdown.style.display = 'none';
            }
        });

        // Card swipe handling
        let touchStartY = 0;
        let touchStartX = 0;

        this.card.addEventListener('touchstart', (e) => {
            if (!this.canScroll) return;
            touchStartY = e.touches[0].clientY;
            touchStartX = e.touches[0].clientX;
        });

        this.card.addEventListener('touchend', (e) => {
            if (!this.canScroll) return;
            const touchEndY = e.changedTouches[0].clientY;
            const touchEndX = e.changedTouches[0].clientX;
            const deltaY = touchStartY - touchEndY;
            const deltaX = Math.abs(touchStartX - touchEndX);
            
            // Swipe up detection (more vertical than horizontal)
            if (deltaY > 50 && deltaX < 50) {
                this.handleScroll();
            }
        });

        // Mouse click as alternative to swipe
        this.card.addEventListener('click', () => {
            if (this.canScroll) {
                this.handleScroll();
            }
        });

        // History toggle
        this.historyToggle.addEventListener('click', () => {
            this.historyList.classList.toggle('visible');
            this.historyToggle.textContent = this.historyList.classList.contains('visible') 
                ? 'Hide Scroll History' 
                : 'View Scroll History';
            this.renderHistory();
        });
    }

    handleScroll() {
        if (!this.canScroll) return;

        const now = Date.now();

        // Check if user is scrolling too quickly (within 30 minutes of last scroll)
        const thirtyMinutes = 30 * 60 * 1000;
        if (this.lastScrollTime && (now - this.lastScrollTime) < thirtyMinutes) {
            this.consecutiveScrolls++;
        } else {
            // Reset if it's been more than 30 minutes
            this.consecutiveScrolls = 1;
        }

        // Disable further scrolling
        this.canScroll = false;
        this.card.classList.add('disabled');

        // Play flip animation
        this.card.classList.add('flipping');

        // Change text during flip
        setTimeout(() => {
            this.cardText.textContent = this.getRandomAfterSaying();
        }, 300);

        // Log the scroll
        this.logScroll();

        // Calculate cooldown time (exponential backoff: 2min, 4min, 8min, 16min, etc.)
        const baseCooldown = 2 * 60 * 1000; // 2 minutes in milliseconds
        const cooldownTime = baseCooldown * Math.pow(2, this.consecutiveScrolls - 1);
        this.nextScrollAllowedTime = now + cooldownTime + 3000; // +3s for animation
        this.lastScrollTime = now;

        // Show the feel-good message for 3 seconds, then start cooldown
        setTimeout(() => {
            this.card.classList.remove('flipping');
            this.cardText.textContent = this.getRandomBeforeSaying();
            this.updateDisplay();
            this.startCooldown();
        }, 3000);

        this.saveToLocalStorage();
    }

    logScroll() {
        const now = new Date();
        const scrollEntry = {
            timestamp: now.toISOString(),
            date: now.toLocaleDateString(),
            time: now.toLocaleTimeString()
        };

        this.scrollHistory.push(scrollEntry);
        this.todayScrollCount++;

        console.log('Scroll logged:', scrollEntry);

        this.saveToLocalStorage();
    }

    getRandomBeforeSaying() {
        if (this.firstVisit && this.scrollHistory.length === 0) {
            this.firstVisit = false;
            return this.beforeScrollSayings[0]; // "Scroll here so you don't get stuck scrolling elsewhere."
        }
        const randomIndex = Math.floor(Math.random() * this.beforeScrollSayings.length);
        return this.beforeScrollSayings[randomIndex];
    }

    getRandomAfterSaying() {
        const randomIndex = Math.floor(Math.random() * this.afterScrollSayings.length);
        return this.afterScrollSayings[randomIndex];
    }

    updateDisplay() {
        // Update card text only if scrolling is allowed
        if (this.canScroll) {
            this.cardText.textContent = this.getRandomBeforeSaying();
        }

        // Calculate days since first scroll
        const daysSinceStart = this.getDaysSinceFirstScroll();
        this.daysCounter.textContent = `Day ${daysSinceStart}`;

        // Update scroll count for today
        if (this.todayScrollCount > 0) {
            this.scrollCount.textContent = `You've scrolled ${this.todayScrollCount} time${this.todayScrollCount === 1 ? '' : 's'} today`;
        } else {
            this.scrollCount.textContent = '';
        }

        // Update instructions
        if (this.canScroll) {
            this.instructions.textContent = '👆 Swipe up on the card to scroll';
        } else if (this.nextScrollAllowedTime) {
            this.updateCooldownDisplay();
        } else {
            this.instructions.textContent = '⏳ Wait a moment before scrolling again...';
        }
    }

    updateCooldownDisplay() {
        const now = Date.now();
        const remaining = this.nextScrollAllowedTime - now;

        if (remaining <= 0) {
            this.canScroll = true;
            this.card.classList.remove('disabled');
            this.nextScrollAllowedTime = null;
            this.instructions.textContent = '👆 Swipe up on the card to scroll';
            if (this.cooldownTimer) {
                clearInterval(this.cooldownTimer);
                this.cooldownTimer = null;
            }
            this.updateDisplay();
            return;
        }

        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);

        if (minutes > 0) {
            this.instructions.textContent = `⏳ Next scroll available in ${minutes}m ${seconds}s`;
        } else {
            this.instructions.textContent = `⏳ Next scroll available in ${seconds}s`;
        }
    }

    startCooldown() {
        if (this.cooldownTimer) {
            clearInterval(this.cooldownTimer);
        }

        this.cooldownTimer = setInterval(() => {
            this.updateCooldownDisplay();
        }, 1000);
    }

    checkCooldown() {
        // On app load, check if we're still in cooldown
        if (this.nextScrollAllowedTime) {
            const now = Date.now();
            if (now < this.nextScrollAllowedTime) {
                this.canScroll = false;
                this.card.classList.add('disabled');
                this.startCooldown();
            } else {
                this.canScroll = true;
                this.nextScrollAllowedTime = null;
            }
        }
    }

    getDaysSinceFirstScroll() {
        if (this.scrollHistory.length === 0) {
            return 0;
        }

        const firstScroll = new Date(this.scrollHistory[0].timestamp);
        const now = new Date();
        const diffTime = Math.abs(now - firstScroll);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    getScrollsToday() {
        const today = new Date().toLocaleDateString();
        return this.scrollHistory.filter(entry => entry.date === today).length;
    }

    renderHistory() {
        if (this.scrollHistory.length === 0) {
            this.historyList.innerHTML = '<div class="no-history">No scrolls yet. Get started!</div>';
            return;
        }

        // Group by date
        const groupedByDate = {};
        this.scrollHistory.forEach(entry => {
            if (!groupedByDate[entry.date]) {
                groupedByDate[entry.date] = [];
            }
            groupedByDate[entry.date].push(entry);
        });

        // Render in reverse chronological order
        const dates = Object.keys(groupedByDate).reverse();
        const html = dates.map(date => {
            const entries = groupedByDate[date].reverse();
            return `
                <div class="history-item">
                    <strong>${date}</strong> - ${entries.length} scroll${entries.length === 1 ? '' : 's'}
                    ${entries.map(entry => `
                        <div class="history-item-time">• ${entry.time}</div>
                    `).join('')}
                </div>
            `;
        }).join('');

        this.historyList.innerHTML = html;
    }

    saveToLocalStorage() {
        const data = {
            scrollHistory: this.scrollHistory,
            lastSaveDate: new Date().toLocaleDateString(),
            consecutiveScrolls: this.consecutiveScrolls,
            lastScrollTime: this.lastScrollTime,
            nextScrollAllowedTime: this.nextScrollAllowedTime
        };
        localStorage.setItem('scrollFixData', JSON.stringify(data));
    }

    loadFromLocalStorage() {
        const data = localStorage.getItem('scrollFixData');
        if (data) {
            try {
                const parsed = JSON.parse(data);
                this.scrollHistory = parsed.scrollHistory || [];
                this.consecutiveScrolls = parsed.consecutiveScrolls || 0;
                this.lastScrollTime = parsed.lastScrollTime || null;
                this.nextScrollAllowedTime = parsed.nextScrollAllowedTime || null;
                
                // Reset today's count based on actual data
                const today = new Date().toLocaleDateString();
                this.todayScrollCount = this.getScrollsToday();

                // If it's a new day, reset the daily count
                if (parsed.lastSaveDate !== today) {
                    this.saveToLocalStorage(); // Update the last save date
                }

                // Reset consecutive scrolls if it's been more than 30 minutes
                if (this.lastScrollTime) {
                    const now = Date.now();
                    const thirtyMinutes = 30 * 60 * 1000;
                    if ((now - this.lastScrollTime) >= thirtyMinutes) {
                        this.consecutiveScrolls = 0;
                        this.nextScrollAllowedTime = null;
                    }
                }
            } catch (e) {
                console.error('Failed to load data from localStorage:', e);
            }
        }
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ScrollFixApp();
});
