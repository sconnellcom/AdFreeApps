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
const MASTERY_STREAK_REQUIRED = 2;
const MASTERY_AVG_MS = 6000;
const REALLY_FAST_MS = 2000;
const KNOWN_MS = 3500;
const FAST_MS = 5500;
const SLOW_MS = 9000;
const CATEGORY_META = {
    mastered: { label: 'Mastered' },
    'really-fast': { label: 'Really Fast' },
    known: { label: 'Known' },
    fast: { label: 'Fast' },
    'needs-work': { label: 'Needs Work' },
    slow: { label: 'Slow' }
};
const CATEGORY_ORDER = ['mastered', 'really-fast', 'known', 'fast', 'needs-work', 'slow'];
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

function buildEmptyFactProgress() {
    return {
        attempts: 0,
        correct: 0,
        totalResponseMs: 0,
        fastestResponseMs: null,
        lastResponseMs: null,
        recentResults: [],
        mastered: false
    };
}

function buildEmptySession() {
    return {
        startedAt: Date.now(),
        seen: 0,
        correct: 0,
        incorrect: 0,
        newlyMastered: 0,
        currentFactId: null,
        isFlipped: false,
        questionShownAt: Date.now(),
        attempts: []
    };
}

function sanitizeTimestamp(value, maxAgeMs) {
    const parsed = Number(value);
    const now = Date.now();
    if (!parsed || parsed > now) {
        return now;
    }
    if (maxAgeMs && now - parsed > maxAgeMs) {
        return now;
    }
    return parsed;
}

function sanitizeAttemptEntry(input) {
    if (!input || !FACT_BY_ID[input.factId]) {
        return null;
    }
    const responseMs = Math.max(0, Number(input.responseMs) || 0);
    const wasCorrect = Boolean(input.wasCorrect);
    const category = CATEGORY_META[input.category] ? input.category : categorizeAttempt({
        wasCorrect,
        responseMs,
        isNowMastered: Boolean(input.isNowMastered)
    });

    return {
        factId: input.factId,
        expression: FACT_BY_ID[input.factId].expression,
        responseMs,
        wasCorrect,
        category,
        isNowMastered: Boolean(input.isNowMastered),
        answeredAt: sanitizeTimestamp(input.answeredAt)
    };
}

function sanitizeFactProgressMap(rawMap, fallbackMasteredIds) {
    const map = {};
    const masteredSet = new Set(Array.isArray(fallbackMasteredIds) ? fallbackMasteredIds.filter((id) => FACT_BY_ID[id]) : []);
    const inputMap = rawMap && typeof rawMap === 'object' ? rawMap : {};

    Object.keys(inputMap).forEach((factId) => {
        if (!FACT_BY_ID[factId]) {
            return;
        }
        const input = inputMap[factId] || {};
        const recentResults = Array.isArray(input.recentResults)
            ? input.recentResults
                .map((entry) => ({
                    correct: Boolean(entry && entry.correct),
                    responseMs: Math.max(0, Number(entry && entry.responseMs) || 0)
                }))
                .slice(-5)
            : [];
        const progress = {
            attempts: Math.max(0, Number(input.attempts) || 0),
            correct: Math.max(0, Number(input.correct) || 0),
            totalResponseMs: Math.max(0, Number(input.totalResponseMs) || 0),
            fastestResponseMs: Number.isFinite(Number(input.fastestResponseMs)) ? Math.max(0, Number(input.fastestResponseMs)) : null,
            lastResponseMs: Number.isFinite(Number(input.lastResponseMs)) ? Math.max(0, Number(input.lastResponseMs)) : null,
            recentResults,
            mastered: Boolean(input.mastered) || masteredSet.has(factId)
        };
        if (isFactMastered(progress)) {
            progress.mastered = true;
            masteredSet.add(factId);
        }
        map[factId] = progress;
    });

    masteredSet.forEach((factId) => {
        if (!map[factId]) {
            map[factId] = buildEmptyFactProgress();
            map[factId].mastered = true;
        }
    });

    return map;
}

function loadState() {
    const baseState = {
        masteredIds: [],
        factProgress: {},
        imageDataUrl: '',
        settings: {
            rotateUnmasteredOnly: true
        },
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
    const factProgress = sanitizeFactProgressMap(input.factProgress, input.masteredIds);
    const masteredIds = Array.from(new Set(
        Object.keys(factProgress).filter((factId) => factProgress[factId].mastered)
    ));

    const session = input.activeSession && typeof input.activeSession === 'object'
        ? {
            startedAt: sanitizeTimestamp(input.activeSession.startedAt),
            seen: Math.max(0, Number(input.activeSession.seen) || 0),
            correct: Math.max(0, Number(input.activeSession.correct) || 0),
            incorrect: Math.max(0, Number(input.activeSession.incorrect) || 0),
            newlyMastered: Math.max(0, Number(input.activeSession.newlyMastered) || 0),
            currentFactId: FACT_BY_ID[input.activeSession.currentFactId] ? input.activeSession.currentFactId : null,
            isFlipped: Boolean(input.activeSession.isFlipped),
            questionShownAt: sanitizeTimestamp(input.activeSession.questionShownAt, 30 * 60 * 1000),
            attempts: Array.isArray(input.activeSession.attempts)
                ? input.activeSession.attempts.map(sanitizeAttemptEntry).filter(Boolean)
                : []
        }
        : null;

    const lastSessionStats = input.lastSessionStats && typeof input.lastSessionStats === 'object'
        ? {
            seen: Math.max(0, Number(input.lastSessionStats.seen) || 0),
            correct: Math.max(0, Number(input.lastSessionStats.correct) || 0),
            incorrect: Math.max(0, Number(input.lastSessionStats.incorrect) || 0),
            newlyMastered: Math.max(0, Number(input.lastSessionStats.newlyMastered) || 0),
            elapsedSeconds: Math.max(0, Number(input.lastSessionStats.elapsedSeconds) || 0),
            masteredTotal: Math.max(0, Number(input.lastSessionStats.masteredTotal) || masteredIds.length),
            attempts: Array.isArray(input.lastSessionStats.attempts)
                ? input.lastSessionStats.attempts.map(sanitizeAttemptEntry).filter(Boolean)
                : []
        }
        : null;

    return {
        masteredIds,
        factProgress,
        imageDataUrl: typeof input.imageDataUrl === 'string' ? input.imageDataUrl : '',
        settings: {
            rotateUnmasteredOnly: !input.settings || input.settings.rotateUnmasteredOnly !== false
        },
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

function getFactProgress(factId) {
    if (!state.factProgress[factId]) {
        state.factProgress[factId] = buildEmptyFactProgress();
    }
    return state.factProgress[factId];
}

function isFactMastered(progress) {
    if (!progress) {
        return false;
    }
    if (progress.mastered) {
        return true;
    }
    const recent = Array.isArray(progress.recentResults) ? progress.recentResults.slice(-MASTERY_STREAK_REQUIRED) : [];
    if (recent.length < MASTERY_STREAK_REQUIRED) {
        return false;
    }
    if (!recent.every((entry) => entry.correct)) {
        return false;
    }
    const averageMs = recent.reduce((sum, entry) => sum + entry.responseMs, 0) / recent.length;
    return averageMs <= MASTERY_AVG_MS;
}

function categorizeAttempt({ wasCorrect, responseMs, isNowMastered }) {
    if (isNowMastered) {
        return 'mastered';
    }
    if (responseMs >= SLOW_MS) {
        return 'slow';
    }
    if (!wasCorrect) {
        return 'needs-work';
    }
    if (responseMs <= REALLY_FAST_MS) {
        return 'really-fast';
    }
    if (responseMs <= KNOWN_MS) {
        return 'known';
    }
    if (responseMs <= FAST_MS) {
        return 'fast';
    }
    return 'needs-work';
}

function ensureSession() {
    if (!state.activeSession) {
        state.activeSession = buildEmptySession();
    }

    if (!FACT_BY_ID[state.activeSession.currentFactId]) {
        state.activeSession.currentFactId = pickNextFactId();
        state.activeSession.questionShownAt = Date.now();
    }
}

function pickNextFactId(previousFactId) {
    const mastered = getMasteredSet();
    let pool = state.settings.rotateUnmasteredOnly
        ? FACTS.filter((fact) => !mastered.has(fact.id))
        : FACTS.slice();

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
        : 'Each correct answer uncovers more, and mastered facts fully clear their tile.';

    renderCoverTiles();
}

function renderCoverTiles() {
    const imageCover = document.getElementById('imageCover');
    imageCover.innerHTML = '';

    FACTS.forEach((fact, factIndex) => {
        const tile = document.createElement('div');
        tile.className = 'cover-tile';
        const tileIndex = REVEAL_ORDER[factIndex];
        tile.style.order = tileIndex;
        const progress = state.factProgress[fact.id];
        if (progress && progress.mastered) {
            tile.classList.add('revealed');
        } else if (progress && progress.correct > 0) {
            tile.classList.add('partial');
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

function updateGameplayToggle() {
    document.getElementById('rotateUnmasteredToggle').checked = state.settings.rotateUnmasteredOnly;
}

function renderStudyScreen() {
    closeDetailsModal();
    showScreen('study');
    ensureSession();
    updateImage();
    updateProgress();
    updateSessionText();
    updateGameplayToggle();
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

function recordFactAttempt(factId, wasCorrect, responseMs) {
    const progress = getFactProgress(factId);
    progress.attempts += 1;
    progress.totalResponseMs += responseMs;
    progress.lastResponseMs = responseMs;
    if (progress.fastestResponseMs === null || responseMs < progress.fastestResponseMs) {
        progress.fastestResponseMs = responseMs;
    }
    if (wasCorrect) {
        progress.correct += 1;
    }
    progress.recentResults.push({ correct: wasCorrect, responseMs });
    progress.recentResults = progress.recentResults.slice(-5);

    const alreadyMastered = progress.mastered || getMasteredSet().has(factId);
    const isNowMastered = alreadyMastered || isFactMastered(progress);
    if (isNowMastered) {
        progress.mastered = true;
    }
    return isNowMastered;
}

function markAnswer(wasCorrect) {
    ensureSession();
    const session = state.activeSession;
    const currentFactId = session.currentFactId;
    const mastered = getMasteredSet();
    const responseMs = Math.max(0, Date.now() - session.questionShownAt);

    session.seen += 1;
    if (wasCorrect) {
        session.correct += 1;
    } else {
        session.incorrect += 1;
    }

    const alreadyMastered = mastered.has(currentFactId);
    const isNowMastered = recordFactAttempt(currentFactId, wasCorrect, responseMs);
    if (isNowMastered && !alreadyMastered) {
        mastered.add(currentFactId);
        state.masteredIds = Array.from(mastered);
        session.newlyMastered += 1;
    }

    const category = categorizeAttempt({ wasCorrect, responseMs, isNowMastered });
    session.attempts.push({
        factId: currentFactId,
        expression: FACT_BY_ID[currentFactId].expression,
        responseMs,
        wasCorrect,
        category,
        isNowMastered,
        answeredAt: Date.now()
    });

    session.currentFactId = pickNextFactId(currentFactId);
    session.isFlipped = false;
    session.questionShownAt = Date.now();

    if (!saveState()) {
        showNotice('Progress is only available during this visit.');
    }

    renderStudyScreen();
}

function buildCategoryBuckets(attempts) {
    const buckets = Object.fromEntries(CATEGORY_ORDER.map((categoryId) => [categoryId, []]));
    attempts.forEach((attempt) => {
        if (buckets[attempt.category]) {
            buckets[attempt.category].push(attempt);
        }
    });
    return buckets;
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
        masteredTotal: state.masteredIds.length,
        attempts: session.attempts.slice()
    };
    state.activeSession = null;
    saveState();
    renderResultsScreen();
}

function renderResultsBuckets(attempts) {
    const buckets = buildCategoryBuckets(attempts);
    CATEGORY_ORDER.forEach((categoryId) => {
        const button = document.querySelector(`.results-bucket[data-category="${categoryId}"]`);
        const countEl = document.getElementById(`resultsBucket-${categoryId}`);
        const count = buckets[categoryId].length;
        countEl.textContent = String(count);
        button.disabled = count === 0;
    });
}

function renderResultsScreen() {
    closeDetailsModal();
    const stats = state.lastSessionStats || {
        seen: 0,
        correct: 0,
        incorrect: 0,
        newlyMastered: 0,
        elapsedSeconds: 0,
        masteredTotal: state.masteredIds.length,
        attempts: []
    };
    const remaining = TOTAL_FACTS - state.masteredIds.length;
    const accuracy = stats.seen > 0 ? Math.round((stats.correct / stats.seen) * 100) : 0;

    document.getElementById('resultsSeen').textContent = stats.seen;
    document.getElementById('resultsCorrect').textContent = stats.correct;
    document.getElementById('resultsIncorrect').textContent = stats.incorrect;
    document.getElementById('resultsNew').textContent = stats.newlyMastered;
    document.getElementById('resultsSummary').textContent = `${formatElapsed(stats.elapsedSeconds)} · ${accuracy}% accuracy · ${stats.masteredTotal} mastered total · ${remaining} remaining · time measured to flip`;
    document.getElementById('resultsIcon').textContent = remaining === 0 ? '🏆' : stats.newlyMastered > 0 ? '🧩' : '🎉';
    renderResultsBuckets(stats.attempts || []);
    showScreen('results');
}

function formatElapsed(totalSeconds) {
    if (!totalSeconds) {
        return '0s';
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function formatResponseMs(ms) {
    if (ms < 1000) {
        return `${Math.round(ms)}ms`;
    }
    return `${(ms / 1000).toFixed(1)}s`;
}

function openDetailsModal(categoryId) {
    if (!state.lastSessionStats || !CATEGORY_META[categoryId]) {
        return;
    }
    const attempts = (state.lastSessionStats.attempts || [])
        .filter((attempt) => attempt.category === categoryId)
        .sort((left, right) => right.responseMs - left.responseMs);

    if (attempts.length === 0) {
        return;
    }

    document.getElementById('detailsTitle').textContent = CATEGORY_META[categoryId].label;
    const list = document.getElementById('detailsList');
    list.innerHTML = attempts.map((attempt) => `
        <div class="details-item">
            <div class="details-expression">${attempt.expression}</div>
            <div class="details-meta">${formatResponseMs(attempt.responseMs)} · ${attempt.wasCorrect ? 'right' : 'not yet'}</div>
        </div>
    `).join('');
    document.getElementById('detailsModal').style.display = 'flex';
}

function closeDetailsModal() {
    document.getElementById('detailsModal').style.display = 'none';
}

function startFreshSession() {
    closeDetailsModal();
    state.activeSession = null;
    state.lastSessionStats = null;
    ensureSession();
    saveState();
    renderStudyScreen();
}

function setRotateUnmasteredOnly(enabled) {
    state.settings.rotateUnmasteredOnly = enabled;
    saveState();
    renderStudyScreen();
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
    document.getElementById('rotateUnmasteredToggle').addEventListener('change', (event) => {
        setRotateUnmasteredOnly(event.target.checked);
    });

    document.querySelectorAll('.results-bucket').forEach((button) => {
        button.addEventListener('click', () => openDetailsModal(button.dataset.category));
    });

    document.getElementById('detailsCloseBtn').addEventListener('click', closeDetailsModal);
    document.getElementById('detailsModal').addEventListener('click', (event) => {
        if (event.target.id === 'detailsModal') {
            closeDetailsModal();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeDetailsModal();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMenu();
    initEvents();
    renderStudyScreen();
});
