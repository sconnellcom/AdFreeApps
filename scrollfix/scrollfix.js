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

        // Available flip animations
        this.flipAnimations = ['flip1', 'flip2', 'flip3', 'flip4', 'flip5'];

        this.firstVisit = true;
        this.canScroll = true;
        this.scrollHistory = [];
        this.todayScrollCount = 0;
        this.lastScrollTime = null;
        this.nextScrollAllowedTime = null;
        this.cooldownTimer = null;
        this.currentAfterMessage = null;
        
        this.initializeElements();
        this.loadFromLocalStorage();
        this.initializeTheme();
        this.initializeEventListeners();
        this.checkCooldown();
        this.updateDisplay();
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

        // Disable further scrolling
        this.canScroll = false;
        this.card.classList.add('disabled');
        this.card.classList.add('after-scroll');

        // Select a random flip animation
        const randomAnimation = this.flipAnimations[Math.floor(Math.random() * this.flipAnimations.length)];
        this.card.classList.add(randomAnimation);

        // Get a random "after scroll" message and save it
        this.currentAfterMessage = this.getRandomAfterSaying();

        // Change text during flip
        setTimeout(() => {
            this.cardText.textContent = this.currentAfterMessage;
        }, 300);

        // Log the scroll
        this.logScroll();

        // Fixed 2-minute cooldown
        const cooldownTime = 2 * 60 * 1000; // 2 minutes in milliseconds
        this.nextScrollAllowedTime = now + cooldownTime + 600; // +600ms for animation
        this.lastScrollTime = now;

        // Remove animation class after animation completes
        setTimeout(() => {
            this.card.classList.remove(randomAnimation);
            this.startCooldown();
        }, 600);

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
        // Update card text based on cooldown state
        if (this.canScroll) {
            this.cardText.textContent = this.getRandomBeforeSaying();
        } else if (this.currentAfterMessage) {
            // Keep showing the saved "after scroll" message during cooldown
            this.cardText.textContent = this.currentAfterMessage;
        }

        // Calculate days since last scroll
        const daysSinceLastScroll = this.getDaysSinceLastScroll();
        if (daysSinceLastScroll === 0) {
            this.daysCounter.textContent = `0 days with no scrolling`;
        } else if (daysSinceLastScroll === 1) {
            this.daysCounter.textContent = `1 day with no scrolling`;
        } else {
            this.daysCounter.textContent = `${daysSinceLastScroll} days with no scrolling`;
        }

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
            this.card.classList.remove('after-scroll');
            this.nextScrollAllowedTime = null;
            this.currentAfterMessage = null;
            this.instructions.textContent = '👆 Swipe up on the card to scroll';
            if (this.cooldownTimer) {
                clearInterval(this.cooldownTimer);
                this.cooldownTimer = null;
            }
            this.updateDisplay();
            this.saveToLocalStorage();
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
                this.card.classList.add('after-scroll');
                this.startCooldown();
            } else {
                this.canScroll = true;
                this.nextScrollAllowedTime = null;
                this.currentAfterMessage = null;
            }
        }
    }

    getDaysSinceLastScroll() {
        if (this.scrollHistory.length === 0) {
            return 0;
        }

        // Get the most recent scroll entry
        const lastScroll = new Date(this.scrollHistory[this.scrollHistory.length - 1].timestamp);
        const now = new Date();
        
        // Set both dates to midnight to compare only dates, not times
        const lastScrollDate = new Date(lastScroll.getFullYear(), lastScroll.getMonth(), lastScroll.getDate());
        const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Calculate the difference in days
        const diffTime = todayDate - lastScrollDate;
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
            lastScrollTime: this.lastScrollTime,
            nextScrollAllowedTime: this.nextScrollAllowedTime,
            currentAfterMessage: this.currentAfterMessage
        };
        localStorage.setItem('scrollFixData', JSON.stringify(data));
    }

    loadFromLocalStorage() {
        const data = localStorage.getItem('scrollFixData');
        if (data) {
            try {
                const parsed = JSON.parse(data);
                this.scrollHistory = parsed.scrollHistory || [];
                this.lastScrollTime = parsed.lastScrollTime || null;
                this.nextScrollAllowedTime = parsed.nextScrollAllowedTime || null;
                this.currentAfterMessage = parsed.currentAfterMessage || null;
                
                // Reset today's count based on actual data
                const today = new Date().toLocaleDateString();
                this.todayScrollCount = this.getScrollsToday();

                // If it's a new day, reset the daily count
                if (parsed.lastSaveDate !== today) {
                    this.saveToLocalStorage(); // Update the last save date
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
