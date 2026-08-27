const FACTS = [];
for (let left = 2; left <= 12; left += 1) {
    for (let right = 2; right <= 12; right += 1) {
        FACTS.push({
            id: `${left}x${right}`,
            expression: `${left} x ${right}`,
            answer: String(left * right)
        });
    }
}

const TOTAL_FACTS = FACTS.length;
const FACT_BY_ID = Object.fromEntries(FACTS.map((fact) => [fact.id, fact]));
const STORAGE_KEY = 'times_tables_progress_v1';
const DEFAULT_IMAGE = 'default-image.svg';
const REVEAL_ORDER = buildRevealOrder(TOTAL_FACTS);
const themeIcons = {
    default: '💜',
    black: '⚫',
    blue: '🔵',
    'blue-dark': '🌊',
    light: '🍋',
    dark: '🫒',
    'warm-light': '🌻',
    'warm-dark': '🍂',
    red: '❤️',
    'red-dark': '🌹',
    pink: '💗',
    'pink-dark': '🌸'
};

const storage = (() => {
    try {
        const probeKey = '__times_tables_probe__';
        localStorage.setItem(probeKey, '1');
        localStorage.removeItem(probeKey);
        return {
            available: true,
            getItem(key) {
                return localStorage.getItem(key);
            },
            setItem(key, value) {
                localStorage.setItem(key, value);
                return true;
            }
        };
    } catch (error) {
        return {
            available: false,
            getItem() {
                return null;
            },
            setItem() {
                return false;
            }
        };
    }
})();

let state = loadState();
let noticeTimer = null;

function buildRevealOrder(length) {
    const values = Array.from({ length }, (_, index) => index);
    let seed = 1776;
    for (let index = values.length - 1; index > 0; index -= 1) {
        seed = (seed * 48271) % 2147483647;
        const swapIndex = seed % (index + 1);
        [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
    }
    return values;
}

function loadState() {
    const baseState = {
        masteredIds: [],
        imageDataUrl: '',
        activeSession: null,
        lastSessionStats: null
    };

    if (!storage.available) {
        return baseState;
    }

    try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) {
            return baseState;
        }
        const parsed = JSON.parse(raw);
        return sanitizeState(parsed);
    } catch (error) {
        return baseState;
    }
}

function sanitizeState(input) {
    const validMastered = Array.isArray(input.masteredIds)
        ? input.masteredIds.filter((id) => FACT_BY_ID[id])
        : [];

    const session = input.activeSession && typeof input.activeSession === 'object'
        ? {
            startedAt: Number(input.activeSession.startedAt) || Date.now(),
            seen: Number(input.activeSession.seen) || 0,
            correct: Number(input.activeSession.correct) || 0,
            incorrect: Number(input.activeSession.incorrect) || 0,
            newlyMastered: Number(input.activeSession.newlyMastered) || 0,
            currentFactId: FACT_BY_ID[input.activeSession.currentFactId] ? input.activeSession.currentFactId : null,
            isFlipped: Boolean(input.activeSession.isFlipped)
        }
        : null;

    const lastSessionStats = input.lastSessionStats && typeof input.lastSessionStats === 'object'
        ? {
            seen: Number(input.lastSessionStats.seen) || 0,
            correct: Number(input.lastSessionStats.correct) || 0,
            incorrect: Number(input.lastSessionStats.incorrect) || 0,
            newlyMastered: Number(input.lastSessionStats.newlyMastered) || 0,
            elapsedSeconds: Number(input.lastSessionStats.elapsedSeconds) || 0,
            masteredTotal: Number(input.lastSessionStats.masteredTotal) || validMastered.length
        }
        : null;

    return {
        masteredIds: Array.from(new Set(validMastered)),
        imageDataUrl: typeof input.imageDataUrl === 'string' ? input.imageDataUrl : '',
        activeSession: session,
        lastSessionStats
    };
}

function saveState() {
    if (!storage.available) {
        return false;
    }
    try {
        return storage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        return false;
    }
}

function getMasteredSet() {
    return new Set(state.masteredIds);
}

function ensureSession() {
    if (!state.activeSession) {
        state.activeSession = {
            startedAt: Date.now(),
            seen: 0,
            correct: 0,
            incorrect: 0,
            newlyMastered: 0,
            currentFactId: null,
            isFlipped: false
        };
    }

    if (!FACT_BY_ID[state.activeSession.currentFactId]) {
        state.activeSession.currentFactId = pickNextFactId();
    }
}

function pickNextFactId(previousFactId) {
    const mastered = getMasteredSet();
    let pool = FACTS.filter((fact) => !mastered.has(fact.id));
    if (pool.length === 0) {
        pool = FACTS.slice();
    }
    if (previousFactId && pool.length > 1) {
        const filtered = pool.filter((fact) => fact.id !== previousFactId);
        if (filtered.length > 0) {
            pool = filtered;
        }
    }
    return pool[Math.floor(Math.random() * pool.length)].id;
}

function updateStudyCard() {
    ensureSession();
    const session = state.activeSession;
    const fact = FACT_BY_ID[session.currentFactId];
    document.getElementById('cardFrontText').textContent = fact.expression;
    document.getElementById('cardBackText').textContent = fact.answer;

    const flashcard = document.getElementById('flashcard');
    flashcard.classList.toggle('flipped', session.isFlipped);
    document.getElementById('ratingRow').style.display = session.isFlipped ? 'flex' : 'none';
    document.getElementById('flipBtn').style.display = session.isFlipped ? 'none' : 'block';
}

function updateProgress() {
    const masteredCount = state.masteredIds.length;
    const remainingCount = TOTAL_FACTS - masteredCount;
    const percent = Math.round((masteredCount / TOTAL_FACTS) * 100);

    document.getElementById('masteryText').textContent = `${masteredCount} of ${TOTAL_FACTS} mastered`;
    document.getElementById('remainingText').textContent = `${remainingCount} facts left`;
    document.getElementById('masteryFill').style.width = `${percent}%`;
    document.getElementById('imageCaption').textContent = remainingCount === 0
        ? 'You uncovered the whole picture. Keep practicing as long as you like.'
        : 'Each new correct answer uncovers one part of the picture.';

    renderCoverTiles();
}

function renderCoverTiles() {
    const imageCover = document.getElementById('imageCover');
    imageCover.innerHTML = '';
    const mastered = getMasteredSet();

    FACTS.forEach((fact, factIndex) => {
        const tile = document.createElement('div');
        tile.className = 'cover-tile';
        const tileIndex = REVEAL_ORDER[factIndex];
        tile.style.order = tileIndex;
        if (mastered.has(fact.id)) {
            tile.classList.add('revealed');
        }
        imageCover.appendChild(tile);
    });
}

function updateImage() {
    document.getElementById('rewardImage').src = state.imageDataUrl || DEFAULT_IMAGE;
}

function updateSessionText() {
    ensureSession();
    const session = state.activeSession;
    document.getElementById('sessionText').textContent = `Session: ${session.seen} seen · ${session.correct} right · ${session.incorrect} not yet`;
}

function renderStudyScreen() {
    showScreen('study');
    ensureSession();
    updateImage();
    updateProgress();
    updateSessionText();
    updateStudyCard();
    updateNotice();
}

function showScreen(name) {
    document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active'));
    const next = document.getElementById(`screen-${name}`);
    if (next) {
        next.classList.add('active');
    }
}

function flipCard() {
    ensureSession();
    state.activeSession.isFlipped = !state.activeSession.isFlipped;
    saveState();
    updateStudyCard();
}

function markAnswer(wasCorrect) {
    ensureSession();
    const session = state.activeSession;
    const currentFactId = session.currentFactId;
    const mastered = getMasteredSet();

    session.seen += 1;
    if (wasCorrect) {
        session.correct += 1;
        if (!mastered.has(currentFactId)) {
            mastered.add(currentFactId);
            state.masteredIds = Array.from(mastered);
            session.newlyMastered += 1;
        }
    } else {
        session.incorrect += 1;
    }

    session.currentFactId = pickNextFactId(currentFactId);
    session.isFlipped = false;

    if (!saveState()) {
        showNotice('Progress is only available during this visit.');
    }

    renderStudyScreen();
}

function finishSession() {
    ensureSession();
    const session = state.activeSession;
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - session.startedAt) / 1000));

    state.lastSessionStats = {
        seen: session.seen,
        correct: session.correct,
        incorrect: session.incorrect,
        newlyMastered: session.newlyMastered,
        elapsedSeconds,
        masteredTotal: state.masteredIds.length
    };
    state.activeSession = null;
    saveState();
    renderResultsScreen();
}

function renderResultsScreen() {
    const stats = state.lastSessionStats || {
        seen: 0,
        correct: 0,
        incorrect: 0,
        newlyMastered: 0,
        elapsedSeconds: 0,
        masteredTotal: state.masteredIds.length
    };
    const remaining = TOTAL_FACTS - state.masteredIds.length;
    const accuracy = stats.seen > 0 ? Math.round((stats.correct / stats.seen) * 100) : 0;

    document.getElementById('resultsSeen').textContent = stats.seen;
    document.getElementById('resultsCorrect').textContent = stats.correct;
    document.getElementById('resultsIncorrect').textContent = stats.incorrect;
    document.getElementById('resultsNew').textContent = stats.newlyMastered;
    document.getElementById('resultsSummary').textContent = `${formatElapsed(stats.elapsedSeconds)} · ${accuracy}% accuracy · ${stats.masteredTotal} mastered total · ${remaining} remaining`;
    document.getElementById('resultsIcon').textContent = remaining === 0 ? '🏆' : stats.newlyMastered > 0 ? '🧩' : '🎉';
    showScreen('results');
}

function startFreshSession() {
    state.activeSession = null;
    state.lastSessionStats = null;
    ensureSession();
    saveState();
    renderStudyScreen();
}

function formatElapsed(totalSeconds) {
    if (!totalSeconds) {
        return '0s';
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function applyTheme(theme) {
    document.body.className = theme !== 'default' ? `theme-${theme}` : '';
    try {
        localStorage.setItem('appTheme', theme);
    } catch (error) {
        // Ignore theme persistence failures.
    }
    const icon = document.getElementById('themeMenuIcon');
    if (icon) {
        icon.textContent = themeIcons[theme] || '💜';
    }
}

function initTheme() {
    let savedTheme = 'default';
    try {
        savedTheme = localStorage.getItem('appTheme') || 'default';
    } catch (error) {
        savedTheme = 'default';
    }
    applyTheme(savedTheme);
}

function initMenu() {
    const menuBtn = document.getElementById('menuBtn');
    const menuDropdown = document.getElementById('menuDropdown');
    const themeMenuItem = document.getElementById('themeMenuItem');
    const themeSubmenu = document.getElementById('themeSubmenu');

    menuBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        const isOpen = menuDropdown.style.display !== 'none';
        menuDropdown.style.display = isOpen ? 'none' : 'block';
        if (isOpen) {
            themeSubmenu.style.display = 'none';
        }
    });

    themeMenuItem.addEventListener('click', (event) => {
        event.stopPropagation();
        themeSubmenu.style.display = themeSubmenu.style.display !== 'none' ? 'none' : 'grid';
    });

    document.querySelectorAll('.theme-btn').forEach((button) => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            applyTheme(button.dataset.theme);
            themeSubmenu.style.display = 'none';
            menuDropdown.style.display = 'none';
        });
    });

    menuDropdown.addEventListener('click', (event) => event.stopPropagation());
    document.addEventListener('click', () => {
        menuDropdown.style.display = 'none';
        themeSubmenu.style.display = 'none';
    });
}

function resizeImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const image = new Image();
            image.onload = () => {
                let width = image.width;
                let height = image.height;
                const ratio = Math.min(1, 1200 / width, 1200 / height);
                width = Math.max(1, Math.round(width * ratio));
                height = Math.max(1, Math.round(height * ratio));

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const context = canvas.getContext('2d');
                if (!context) {
                    reject(new Error('Canvas is unavailable.'));
                    return;
                }
                context.drawImage(image, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            image.onerror = () => reject(new Error('Image could not be loaded.'));
            image.src = event.target.result;
        };
        reader.onerror = () => reject(new Error('Image could not be read.'));
        reader.readAsDataURL(file);
    });
}

async function handleImageUpload(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) {
        return;
    }
    try {
        state.imageDataUrl = await resizeImage(file);
        if (!saveState()) {
            showNotice('Custom image loaded for now, but this browser could not save it.');
        } else {
            showNotice('Custom image saved.');
        }
        renderStudyScreen();
    } catch (error) {
        showNotice('That image could not be used here.');
    }
}

function resetImage() {
    state.imageDataUrl = '';
    saveState();
    renderStudyScreen();
    showNotice('Using the default image.');
}

function showNotice(message) {
    const notice = document.getElementById('storageNotice');
    if (!notice) {
        return;
    }
    notice.textContent = message;
    if (noticeTimer) {
        clearTimeout(noticeTimer);
    }
    noticeTimer = window.setTimeout(() => {
        notice.textContent = '';
    }, 3200);
}

function updateNotice() {
    const uploadInput = document.getElementById('imageUploadInput');
    const uploadLabel = document.getElementById('uploadLabel');

    if (!storage.available) {
        document.getElementById('storageNotice').textContent = 'Progress is only available during this visit.';
    }

    if (!window.FileReader) {
        uploadInput.disabled = true;
        uploadLabel.classList.add('disabled');
        uploadLabel.textContent = 'Upload unavailable';
    }
}

function initEvents() {
    const flashcard = document.getElementById('flashcard');
    flashcard.addEventListener('click', flipCard);
    flashcard.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            flipCard();
        }
    });

    document.getElementById('flipBtn').addEventListener('click', flipCard);
    document.getElementById('wrongBtn').addEventListener('click', () => markAnswer(false));
    document.getElementById('rightBtn').addEventListener('click', () => markAnswer(true));
    document.getElementById('doneBtn').addEventListener('click', finishSession);
    document.getElementById('resumeBtn').addEventListener('click', startFreshSession);
    document.getElementById('resetImageBtn').addEventListener('click', resetImage);
    document.getElementById('imageUploadInput').addEventListener('change', handleImageUpload);
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMenu();
    initEvents();
    renderStudyScreen();
});
