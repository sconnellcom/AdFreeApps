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
const MASTERED_MS = 1250;
const AUTOMATIC_MS = 2000;
const SOLID_MS = 4000;
const LEARNING_MS = 20000;
const ACTIVE_TIMER_CAP_MS = 20000;
const SHARE_IMAGE_LIST_HASH_KEY = 'images';
const SHARE_IMAGE_INDEX_HASH_KEY = 'imageIndex';
const SHARE_ROTATION_HASH_KEY = 'rotation';
const SHARE_LEARNING_HASH_KEY = 'learning';
const SHARE_DISTRACTED_HASH_KEY = 'distracted';
const SHARE_PICK_MODE_HASH_KEY = 'pick';
const SHARE_PROGRESS_HASH_KEY = 'progress';
const CATEGORY_META = {
    mastered: { label: 'Insainly Fast' },
    automatic: { label: 'Automatic' },
    solid: { label: 'Solid' },
    learning: { label: 'Learning' },
    distracted: { label: 'Distracted' }
};
const CATEGORY_ORDER = ['mastered', 'automatic', 'solid', 'learning', 'distracted'];
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
        lastWasCorrect: false,
        recentResults: [],
        mastered: false,
        cleared: false
    };
}

function buildEmptyAllTimeStats() {
    return {
        sessions: 0,
        seen: 0,
        correct: 0,
        incorrect: 0,
        newlyMastered: 0,
        elapsedSeconds: 0
    };
}

function buildEmptySession() {
    const now = Date.now();
    return {
        startedAt: now,
        seen: 0,
        correct: 0,
        incorrect: 0,
        newlyMastered: 0,
        currentFactId: null,
        isFlipped: false,
        questionShownAt: now,
        answerShownAt: null,
        answerShownResponseMs: null,
        activeElapsedMs: 0,
        currentCardActiveMs: 0,
        lastActivityAt: now,
        attempts: [],
        undoState: null,
        awaitingPick: isPickCardModeActive(),
        currentPickTileId: null,
        lastPickTileId: null,
        lastPickFactId: null,
        lastPickWasCorrect: null
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

function sanitizeAllTimeStats(input) {
    const source = input && typeof input === 'object' ? input : {};
    return {
        sessions: Math.max(0, Number(source.sessions) || 0),
        seen: Math.max(0, Number(source.seen) || 0),
        correct: Math.max(0, Number(source.correct) || 0),
        incorrect: Math.max(0, Number(source.incorrect) || 0),
        newlyMastered: Math.max(0, Number(source.newlyMastered) || 0),
        elapsedSeconds: Math.max(0, Number(source.elapsedSeconds) || 0)
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
            lastWasCorrect: Boolean(input.lastWasCorrect),
            recentResults,
            mastered: Boolean(input.mastered) || masteredSet.has(factId),
            cleared: Boolean(input.cleared)
        };
        if (isFactMastered(progress)) {
            progress.mastered = true;
            masteredSet.add(factId);
        }
        if (progress.mastered || isSolidOrBetterCategory(getProgressCategory(progress))) {
            progress.cleared = true;
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
        tileProgress: {},
        imageUrls: [],
        currentImageIndex: 0,
        settings: {
            keepLearningInRotation: true,
            keepDistractedInRotation: true,
            pickCardMode: false,
            progressSolidOrBetter: true
        },
        activeSession: null,
        lastSessionStats: null,
        allTimeStats: buildEmptyAllTimeStats()
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
    const tileProgress = input.tileProgress && typeof input.tileProgress === 'object'
        ? sanitizeFactProgressMap(input.tileProgress, [])
        : deepClone(factProgress);
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
            answerShownAt: input.activeSession.answerShownAt ? sanitizeTimestamp(input.activeSession.answerShownAt, 30 * 60 * 1000) : null,
            answerShownResponseMs: Number.isFinite(Number(input.activeSession.answerShownResponseMs))
                ? Math.max(0, Number(input.activeSession.answerShownResponseMs))
                : null,
            activeElapsedMs: Math.max(0, Number(input.activeSession.activeElapsedMs) || 0),
            currentCardActiveMs: Math.max(0, Number(input.activeSession.currentCardActiveMs) || 0),
            lastActivityAt: sanitizeTimestamp(input.activeSession.lastActivityAt, 30 * 60 * 1000),
            attempts: Array.isArray(input.activeSession.attempts)
                ? input.activeSession.attempts.map(sanitizeAttemptEntry).filter(Boolean)
                : [],
            undoState: null,
            awaitingPick: Boolean(input.activeSession.awaitingPick),
            currentPickTileId: FACT_BY_ID[input.activeSession.currentPickTileId] ? input.activeSession.currentPickTileId : null,
            lastPickTileId: FACT_BY_ID[input.activeSession.lastPickTileId] ? input.activeSession.lastPickTileId : null,
            lastPickFactId: FACT_BY_ID[input.activeSession.lastPickFactId] ? input.activeSession.lastPickFactId : null,
            lastPickWasCorrect: typeof input.activeSession.lastPickWasCorrect === 'boolean' ? input.activeSession.lastPickWasCorrect : null
        }
        : null;

    const legacyRotate = !input.settings || input.settings.rotateUnmasteredOnly !== false;

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
        tileProgress,
        imageUrls: sanitizeImageUrls(input.imageUrls, input.imageDataUrl),
        currentImageIndex: sanitizeImageIndex(input.currentImageIndex, input.imageUrls, input.imageDataUrl),
        settings: {
            keepLearningInRotation: input.settings && 'keepLearningInRotation' in input.settings
                ? input.settings.keepLearningInRotation !== false
                : legacyRotate,
            keepDistractedInRotation: input.settings && 'keepDistractedInRotation' in input.settings
                ? input.settings.keepDistractedInRotation !== false
                : legacyRotate,
            pickCardMode: Boolean(input.settings && input.settings.pickCardMode),
            progressSolidOrBetter: !input.settings || input.settings.progressSolidOrBetter !== false
        },
        activeSession: session,
        lastSessionStats,
        allTimeStats: sanitizeAllTimeStats(input.allTimeStats)
    };
}

function sanitizeImageUrls(imageUrls, legacyImageDataUrl) {
    if (Array.isArray(imageUrls)) {
        return imageUrls
            .map((value) => typeof value === 'string' ? value.trim() : '')
            .filter(Boolean);
    }
    if (typeof legacyImageDataUrl === 'string' && legacyImageDataUrl.trim()) {
        return [legacyImageDataUrl.trim()];
    }
    return [];
}

function sanitizeImageIndex(imageIndex, imageUrls, legacyImageDataUrl) {
    const availableUrls = sanitizeImageUrls(imageUrls, legacyImageDataUrl);
    const parsed = Math.max(0, Number(imageIndex) || 0);
    if (availableUrls.length === 0) {
        return 0;
    }
    return Math.min(parsed, availableUrls.length - 1);
}

function arraysEqual(left, right) {
    if (left === right) {
        return true;
    }
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
        return false;
    }
    for (let index = 0; index < left.length; index += 1) {
        if (left[index] !== right[index]) {
            return false;
        }
    }
    return true;
}

function clearShareHash() {
    if (window.history && typeof window.history.replaceState === 'function') {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
}

function shouldConfirmSharedOverwrite(hasChanges, shouldResetProgress) {
    if (!hasChanges) {
        return true;
    }
    const message = shouldResetProgress
        ? 'Replace your current Times Tables setup with this shared setup? This will overwrite your current settings and reset your current image progress.'
        : 'Replace your current Times Tables setup with this shared setup? This will overwrite your current settings.';
    return typeof window.confirm === 'function' ? window.confirm(message) : true;
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

function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
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

function getTileProgress(factId) {
    if (!state.tileProgress[factId]) {
        state.tileProgress[factId] = buildEmptyFactProgress();
    }
    return state.tileProgress[factId];
}

function getDisplayProgress(factId) {
    return state.tileProgress[factId] || null;
}

function getConfiguredImageUrls() {
    return Array.isArray(state.imageUrls) ? state.imageUrls.filter(Boolean) : [];
}

function getCurrentImageSource() {
    const imageUrls = getConfiguredImageUrls();
    return imageUrls[state.currentImageIndex] || DEFAULT_IMAGE;
}

function recordSessionActivity() {
    if (!state.activeSession) {
        return;
    }
    const now = Date.now();
    if (!isStudyScreenActive()) {
        state.activeSession.lastActivityAt = now;
        return;
    }
    const lastActivityAt = Number(state.activeSession.lastActivityAt) || now;
    const delta = Math.max(0, now - lastActivityAt);
    const creditedMs = Math.min(delta, ACTIVE_TIMER_CAP_MS);
    state.activeSession.activeElapsedMs += creditedMs;
    if (!state.activeSession.answerShownAt) {
        state.activeSession.currentCardActiveMs += creditedMs;
    }
    state.activeSession.lastActivityAt = now;
}

function resetSessionActivityTimestamp() {
    if (!state.activeSession) {
        return;
    }
    state.activeSession.lastActivityAt = Date.now();
}

function resetCurrentCardTimer() {
    if (!state.activeSession) {
        return;
    }
    const now = Date.now();
    state.activeSession.questionShownAt = now;
    state.activeSession.answerShownAt = null;
    state.activeSession.answerShownResponseMs = null;
    state.activeSession.currentCardActiveMs = 0;
    state.activeSession.lastActivityAt = now;
}

function getSessionElapsedSeconds() {
    if (!state.activeSession) {
        return 0;
    }
    if (!isStudyScreenActive()) {
        return Math.round(state.activeSession.activeElapsedMs / 1000);
    }
    const now = Date.now();
    const lastActivityAt = Number(state.activeSession.lastActivityAt) || now;
    const delta = Math.max(0, now - lastActivityAt);
    const creditedMs = Math.min(delta, ACTIVE_TIMER_CAP_MS);
    return Math.round((state.activeSession.activeElapsedMs + creditedMs) / 1000);
}

function isStudyScreenActive() {
    const studyScreen = document.getElementById('screen-study');
    return !studyScreen || studyScreen.classList.contains('active');
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

function hasUndoState() {
    return Boolean(state.activeSession && state.activeSession.undoState);
}

function captureUndoState() {
    if (!state.activeSession) {
        return null;
    }
    const activeSession = deepClone({
        startedAt: state.activeSession.startedAt,
        seen: state.activeSession.seen,
        correct: state.activeSession.correct,
        incorrect: state.activeSession.incorrect,
        newlyMastered: state.activeSession.newlyMastered,
        currentFactId: state.activeSession.currentFactId,
        isFlipped: state.activeSession.isFlipped,
        questionShownAt: state.activeSession.questionShownAt,
        answerShownAt: state.activeSession.answerShownAt,
        answerShownResponseMs: state.activeSession.answerShownResponseMs,
        activeElapsedMs: state.activeSession.activeElapsedMs,
        currentCardActiveMs: state.activeSession.currentCardActiveMs,
        lastActivityAt: state.activeSession.lastActivityAt,
        attempts: state.activeSession.attempts,
        awaitingPick: state.activeSession.awaitingPick,
        currentPickTileId: state.activeSession.currentPickTileId,
        lastPickTileId: state.activeSession.lastPickTileId,
        lastPickFactId: state.activeSession.lastPickFactId,
        lastPickWasCorrect: state.activeSession.lastPickWasCorrect
    });

    return {
        masteredIds: deepClone(state.masteredIds),
        factProgress: deepClone(state.factProgress),
        tileProgress: deepClone(state.tileProgress),
        currentImageIndex: state.currentImageIndex,
        allTimeStats: deepClone(state.allTimeStats),
        activeSession
    };
}

function categorizeAttempt({ wasCorrect, responseMs, isNowMastered }) {
    if (!wasCorrect) {
        return null;
    }
    if (responseMs <= MASTERED_MS) {
        return 'mastered';
    }
    if (responseMs <= AUTOMATIC_MS) {
        return 'automatic';
    }
    if (responseMs <= SOLID_MS) {
        return 'solid';
    }
    if (responseMs <= LEARNING_MS) {
        return 'learning';
    }
    return 'distracted';
}

function ensureSession() {
    if (!state.activeSession) {
        state.activeSession = buildEmptySession();
    }

    const currentFactId = state.activeSession.currentFactId;
    const currentFactProgress = currentFactId ? state.factProgress[currentFactId] : null;
    const hasValidCurrentFact = Boolean(FACT_BY_ID[currentFactId]);
    const shouldReplaceForRotation =
        !isPickCardModeActive() &&
        usesRotationPool() &&
        currentFactProgress &&
        !shouldKeepInRotation(currentFactProgress);

    if (isPickCardModeActive() && !hasValidCurrentFact) {
        state.activeSession.currentFactId = null;
        state.activeSession.currentPickTileId = null;
        resetCurrentCardTimer();
        state.activeSession.awaitingPick = true;
        return;
    }

    if (!hasValidCurrentFact || shouldReplaceForRotation) {
        state.activeSession.currentFactId = pickNextFactId();
        resetCurrentCardTimer();
        state.activeSession.awaitingPick = false;
    }
}

function shouldKeepInRotation(progress) {
    if (!progress || !progress.attempts) {
        return true;
    }
    const category = getProgressCategory(progress);
    if (category === 'learning') {
        return state.settings.keepLearningInRotation !== false;
    }
    if (category === 'distracted') {
        return state.settings.keepDistractedInRotation !== false;
    }
    return false;
}

function getProgressCategory(progress) {
    if (!progress || progress.lastResponseMs === null || progress.lastResponseMs === undefined) {
        return null;
    }
    return categorizeAttempt({
        wasCorrect: progress.lastWasCorrect,
        responseMs: progress.lastResponseMs,
        isNowMastered: progress.mastered
    });
}

function isPickCardModeActive() {
    return Boolean(state.settings.pickCardMode);
}

function isProgressBasedOnSolidOrBetter() {
    return state.settings.progressSolidOrBetter !== false;
}

function isAwaitingPick() {
    return Boolean(state.activeSession && state.activeSession.awaitingPick && isPickCardModeActive());
}

function isCurrentFact(factId) {
    return Boolean(state.activeSession && state.activeSession.currentFactId === factId);
}

function isCurrentPickTile(factId) {
    return Boolean(state.activeSession && state.activeSession.currentPickTileId === factId);
}

function isSolidOrBetterCategory(category) {
    return category === 'mastered' || category === 'automatic' || category === 'solid';
}

function hasAnyCorrectAnswer(progress) {
    return Boolean(progress && progress.correct > 0);
}

function countsTowardProgress(progress) {
    if (!progress) {
        return false;
    }
    if (!isProgressBasedOnSolidOrBetter()) {
        return hasAnyCorrectAnswer(progress);
    }
    const category = getProgressCategory(progress);
    return Boolean(progress.cleared || progress.mastered || isSolidOrBetterCategory(category));
}

function isTileFullyCleared(progress) {
    return countsTowardProgress(progress);
}

function getClearedTileCount() {
    return FACTS.reduce((count, fact) => count + (countsTowardProgress(getDisplayProgress(fact.id)) ? 1 : 0), 0);
}

function getImageQueueLabel() {
    const imageUrls = getConfiguredImageUrls();
    if (imageUrls.length === 0) {
        return 'Using the default image.';
    }
    return `Image ${state.currentImageIndex + 1} of ${imageUrls.length}`;
}

function usesRotationPool() {
    return state.settings.keepLearningInRotation !== false || state.settings.keepDistractedInRotation !== false;
}

function pickNextFactId(previousFactId) {
    let pool = usesRotationPool()
        ? FACTS.filter((fact) => shouldKeepInRotation(state.factProgress[fact.id]))
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

function updateStudyCard(options = {}) {
    ensureSession();
    const { instantReset = false } = options;
    const session = state.activeSession;
    const flashcard = document.getElementById('flashcard');
    const flashcardWrap = document.getElementById('flashcardWrap');
    if (instantReset) {
        flashcard.classList.add('no-transition');
        flashcard.classList.remove('flipped');
        // eslint-disable-next-line no-unused-expressions
        flashcard.offsetWidth;
    }

    const fact = FACT_BY_ID[session.currentFactId];
    document.getElementById('cardFrontText').textContent = fact ? fact.expression : '';
    document.getElementById('cardBackText').textContent = fact ? fact.answer : '';

    flashcard.classList.toggle('flipped', session.isFlipped);
    if (instantReset) {
        // eslint-disable-next-line no-unused-expressions
        flashcard.offsetWidth;
        flashcard.classList.remove('no-transition');
    }
    flashcardWrap.classList.toggle('is-hidden', isAwaitingPick());
    document.getElementById('ratingRow').style.display = session.isFlipped ? 'flex' : 'none';
    document.getElementById('flipBtn').style.display = session.isFlipped || isPickCardModeActive() ? 'none' : 'block';
    if (isAwaitingPick()) {
        document.getElementById('ratingRow').style.display = 'none';
        document.getElementById('flipBtn').style.display = 'none';
    }
    updatePickModeActionsPosition();
}

function updateProgress() {
    const clearedCount = getClearedTileCount();
    const remainingCount = TOTAL_FACTS - clearedCount;
    const percent = Math.round((clearedCount / TOTAL_FACTS) * 100);
    const waitingForPick = isAwaitingPick();
    const progressLabel = isProgressBasedOnSolidOrBetter() ? 'solid or better' : 'correct';

    document.getElementById('masteryText').textContent = `${clearedCount} of ${TOTAL_FACTS} ${progressLabel}`;
    document.getElementById('remainingText').textContent = `${remainingCount} problems left`;
    document.getElementById('masteryFill').style.width = `${percent}%`;
    document.getElementById('imageCaption').textContent = waitingForPick
        ? ''
        : remainingCount === 0
        ? 'You uncovered the whole picture. Keep practicing as long as you like.'
        : '';
    renderCoverTiles();
}

function renderCoverTiles() {
    const covers = [
        document.getElementById('imageCover'),
        document.getElementById('settingsImageCover')
    ].filter(Boolean);
    const canPick = isAwaitingPick();
    const allCleared = getClearedTileCount() === TOTAL_FACTS;

    covers.forEach((cover) => {
        cover.innerHTML = '';
        FACTS.forEach((fact, factIndex) => {
            const tile = document.createElement('div');
            tile.className = 'cover-tile';
            const tileIndex = REVEAL_ORDER[factIndex];
            tile.style.order = tileIndex;
            const progress = getDisplayProgress(fact.id);
            if (isTileFullyCleared(progress)) {
                tile.classList.add('revealed');
            } else if (progress && progress.correct > 0) {
                tile.classList.add('partial');
            }
            if (!canPick && ((isPickCardModeActive() && isCurrentPickTile(fact.id)) || (!isPickCardModeActive() && isCurrentFact(fact.id))) && !isTileFullyCleared(progress)) {
                tile.classList.add('next-reveal');
            }
            if (cover.id === 'imageCover' && canPick && (allCleared || !isTileFullyCleared(progress))) {
                tile.classList.add('pickable');
                tile.addEventListener('click', () => handleCoverTilePick(fact.id));
            }
            cover.appendChild(tile);
        });
    });
}

function updateImage() {
    const imageUrl = getCurrentImageSource();
    document.getElementById('rewardImage').src = imageUrl;
    const settingsImage = document.getElementById('settingsRewardImage');
    if (settingsImage) {
        settingsImage.src = imageUrl;
    }
    updateSettingsImageCaption();
    updateImageUrlsInput();
}

function updateImageUrlsInput() {
    const imageUrlsInput = document.getElementById('imageUrlsInput');
    if (imageUrlsInput) {
        imageUrlsInput.value = getConfiguredImageUrls().join('\n');
    }
}

function updateSettingsImageCaption() {
    const caption = document.getElementById('settingsImageCaption');
    if (!caption) {
        return;
    }
    const clearedTileCount = getClearedTileCount();
    const imageUrls = getConfiguredImageUrls();
    if (imageUrls.length === 0) {
        caption.textContent = clearedTileCount === TOTAL_FACTS
            ? 'Default image complete.'
            : 'Using the default image.';
        return;
    }
    caption.textContent = clearedTileCount === TOTAL_FACTS && state.currentImageIndex === imageUrls.length - 1
        ? `${getImageQueueLabel()} complete.`
        : `${getImageQueueLabel()} · ${clearedTileCount} tiles cleared`;
}

function updateSessionText() {
    const sessionText = document.getElementById('sessionText');
    if (!sessionText) {
        return;
    }
    ensureSession();
    const session = state.activeSession;
    sessionText.textContent = `Session: ${session.seen} seen · ${session.correct} correct · ${session.incorrect} not yet`;
}

function updateGameplayToggle() {
    document.getElementById('progressSolidToggle').checked = isProgressBasedOnSolidOrBetter();
    document.getElementById('keepLearningToggle').checked = state.settings.keepLearningInRotation !== false;
    document.getElementById('keepDistractedToggle').checked = state.settings.keepDistractedInRotation !== false;
    document.getElementById('pickCardModeToggle').checked = isPickCardModeActive();
}

function updateUndoButton() {
    document.getElementById('undoBtn').disabled = !hasUndoState();
}

function updatePickModeActionsPosition() {
    const imageHost = document.getElementById('imageCardHost');
    const wrap = document.getElementById('flashcardWrap');
    const pickModeActionsHost = document.getElementById('pickModeActionsHost');
    const ratingRow = document.getElementById('ratingRow');

    if (!imageHost || !wrap || !pickModeActionsHost || !ratingRow) {
        return;
    }

    if (!isPickCardModeActive() || wrap.classList.contains('is-hidden') || ratingRow.style.display === 'none') {
        pickModeActionsHost.style.top = '';
        pickModeActionsHost.style.left = '';
        pickModeActionsHost.style.width = '';
        return;
    }

    pickModeActionsHost.style.top = `${wrap.offsetTop + wrap.offsetHeight + 12}px`;
    pickModeActionsHost.style.left = `${wrap.offsetLeft}px`;
    pickModeActionsHost.style.width = `${wrap.offsetWidth}px`;
}

function updateFlashcardPlacement() {
    const wrap = document.getElementById('flashcardWrap');
    const standardHost = document.getElementById('flashcardHost');
    const imageHost = document.getElementById('imageCardHost');
    const studyActions = document.getElementById('studyActions');
    const ratingRow = document.getElementById('ratingRow');
    const pickModeActionsHost = document.getElementById('pickModeActionsHost');
    const useImageHost = isPickCardModeActive();

    if (useImageHost && wrap.parentElement !== imageHost) {
        imageHost.appendChild(wrap);
    } else if (!useImageHost && wrap.parentElement !== standardHost) {
        standardHost.appendChild(wrap);
    }

    if (useImageHost && ratingRow.parentElement !== pickModeActionsHost) {
        pickModeActionsHost.appendChild(ratingRow);
    } else if (!useImageHost && ratingRow.parentElement !== studyActions) {
        studyActions.appendChild(ratingRow);
    }

    document.body.classList.toggle('pick-card-mode', useImageHost);
    document.body.classList.toggle('awaiting-pick', isAwaitingPick());
    updatePickModeActionsPosition();
}

function renderStudyScreen(options = {}) {
    closeDetailsModal();
    showScreen('study');
    ensureSession();
    updateFlashcardPlacement();
    updateImage();
    updateProgress();
    updateSessionText();
    updateGameplayToggle();
    updateUndoButton();
    updateStudyCard(options);
    updateNotice();
}

function handleCoverTilePick(factId) {
    if (!isAwaitingPick()) {
        return;
    }
    recordSessionActivity();
    if (FACT_BY_ID[factId]) {
        const previousFactId =
            state.activeSession.lastPickTileId === factId && state.activeSession.lastPickWasCorrect === false
                ? state.activeSession.lastPickFactId
                : null;
        state.activeSession.currentFactId = pickNextFactId(previousFactId);
        state.activeSession.currentPickTileId = factId;
    }
    state.activeSession.awaitingPick = false;
    state.activeSession.isFlipped = false;
    resetCurrentCardTimer();
    saveState();
    renderStudyScreen({ instantReset: true });
}

function showScreen(name) {
    document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active'));
    const next = document.getElementById(`screen-${name}`);
    if (next) {
        next.classList.add('active');
    }
}

function openStudyScreen() {
    resetSessionActivityTimestamp();
    renderStudyScreen();
}

function openStatsScreen() {
    if (isStudyScreenActive()) {
        recordSessionActivity();
    }
    resetSessionActivityTimestamp();
    renderStatsScreen();
}

function openSettingsScreen() {
    if (isStudyScreenActive()) {
        recordSessionActivity();
    }
    resetSessionActivityTimestamp();
    renderSettingsScreen();
}

function flipCard() {
    ensureSession();
    recordSessionActivity();
    state.activeSession.isFlipped = !state.activeSession.isFlipped;
    if (state.activeSession.isFlipped && !state.activeSession.answerShownAt) {
        state.activeSession.answerShownAt = Date.now();
        state.activeSession.answerShownResponseMs = state.activeSession.currentCardActiveMs;
    }
    saveState();
    updateStudyCard();
}

function recordFactAttempt(factId, wasCorrect, responseMs) {
    const progress = getFactProgress(factId);
    progress.attempts += 1;
    progress.totalResponseMs += responseMs;
    progress.lastResponseMs = responseMs;
    progress.lastWasCorrect = wasCorrect;
    if (wasCorrect && (progress.fastestResponseMs === null || responseMs < progress.fastestResponseMs)) {
        progress.fastestResponseMs = responseMs;
    }
    if (wasCorrect) {
        progress.correct += 1;
        if (responseMs <= SOLID_MS) {
            progress.cleared = true;
        }
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

function recordTileAttempt(tileId, wasCorrect, responseMs) {
    const progress = getTileProgress(tileId);
    progress.attempts += 1;
    progress.totalResponseMs += responseMs;
    progress.lastResponseMs = responseMs;
    progress.lastWasCorrect = wasCorrect;
    if (wasCorrect && (progress.fastestResponseMs === null || responseMs < progress.fastestResponseMs)) {
        progress.fastestResponseMs = responseMs;
    }
    if (wasCorrect) {
        progress.correct += 1;
        if (responseMs <= SOLID_MS) {
            progress.cleared = true;
        }
    }
    progress.recentResults.push({ correct: wasCorrect, responseMs });
    progress.recentResults = progress.recentResults.slice(-5);
}

function markAnswer(wasCorrect) {
    ensureSession();
    recordSessionActivity();
    const session = state.activeSession;
    const undoState = captureUndoState();
    const currentFactId = session.currentFactId;
    const currentTileId = session.currentPickTileId || currentFactId;
    const mastered = getMasteredSet();
    const responseMs = Math.min(
        ACTIVE_TIMER_CAP_MS,
        Math.max(0, Number(session.answerShownResponseMs ?? session.currentCardActiveMs) || 0)
    );

    session.seen += 1;
    if (wasCorrect) {
        session.correct += 1;
    } else {
        session.incorrect += 1;
    }

    const alreadyMastered = mastered.has(currentFactId);
    const isNowMastered = recordFactAttempt(currentFactId, wasCorrect, responseMs);
    recordTileAttempt(currentTileId, wasCorrect, responseMs);
    if (isNowMastered && !alreadyMastered) {
        mastered.add(currentFactId);
        state.masteredIds = Array.from(mastered);
        session.newlyMastered += 1;
        state.allTimeStats.newlyMastered += 1;
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

    state.allTimeStats.seen += 1;
    state.allTimeStats.elapsedSeconds += Math.max(0, Math.round(responseMs / 1000));
    if (wasCorrect) {
        state.allTimeStats.correct += 1;
    } else {
        state.allTimeStats.incorrect += 1;
    }

    const advancedToNextImage = advanceToNextImageIfNeeded();
    session.undoState = undoState;
    session.isFlipped = false;

    if (isPickCardModeActive()) {
        session.lastPickTileId = session.currentPickTileId;
        session.lastPickFactId = currentFactId;
        session.lastPickWasCorrect = wasCorrect;
        session.currentFactId = null;
        session.currentPickTileId = null;
        session.awaitingPick = true;
        resetCurrentCardTimer();
    } else {
        session.currentFactId = pickNextFactId(advancedToNextImage ? null : currentFactId);
        session.currentPickTileId = null;
        session.awaitingPick = false;
        resetCurrentCardTimer();
    }

    if (!saveState()) {
        showNotice('Progress is only available during this visit.');
    }

    renderStudyScreen({ instantReset: true });
}

function undoLastAnswer() {
    if (!hasUndoState()) {
        return;
    }
    recordSessionActivity();
    const undoState = deepClone(state.activeSession.undoState);
    state.masteredIds = Array.isArray(undoState.masteredIds) ? undoState.masteredIds : [];
    state.factProgress = undoState.factProgress && typeof undoState.factProgress === 'object' ? undoState.factProgress : {};
    state.tileProgress = undoState.tileProgress && typeof undoState.tileProgress === 'object' ? undoState.tileProgress : {};
    state.currentImageIndex = Math.max(0, Number(undoState.currentImageIndex) || 0);
    state.allTimeStats = sanitizeAllTimeStats(undoState.allTimeStats);
    state.activeSession = undoState.activeSession && typeof undoState.activeSession === 'object'
        ? { ...undoState.activeSession, undoState: null }
        : buildEmptySession();
    saveState();
    renderStudyScreen({ instantReset: true });
    showNotice('Last answer undone.');
}

function buildCategoryBuckets(attempts) {
    const buckets = Object.fromEntries(CATEGORY_ORDER.map((categoryId) => [categoryId, []]));
    attempts.forEach((attempt) => {
        if (attempt.wasCorrect && attempt.category && buckets[attempt.category]) {
            buckets[attempt.category].push(attempt);
        }
    });
    return buckets;
}

function getSessionStatsSnapshot() {
    if (state.activeSession) {
        return {
            seen: state.activeSession.seen,
            correct: state.activeSession.correct,
            incorrect: state.activeSession.incorrect,
            newlyMastered: state.activeSession.newlyMastered,
            elapsedSeconds: getSessionElapsedSeconds(),
            masteredTotal: state.masteredIds.length,
            attempts: state.activeSession.attempts.slice()
        };
    }
    return state.lastSessionStats || {
        seen: 0,
        correct: 0,
        incorrect: 0,
        newlyMastered: 0,
        elapsedSeconds: 0,
        masteredTotal: state.masteredIds.length,
        attempts: []
    };
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

function renderStatsScreen() {
    closeDetailsModal();
    const stats = getSessionStatsSnapshot();
    const remaining = TOTAL_FACTS - state.masteredIds.length;
    const accuracy = stats.seen > 0 ? Math.round((stats.correct / stats.seen) * 100) : 0;

    document.getElementById('resultsSeen').textContent = stats.seen;
    document.getElementById('resultsCorrect').textContent = stats.correct;
    document.getElementById('resultsIncorrect').textContent = stats.incorrect;
    document.getElementById('resultsNew').textContent = stats.newlyMastered;
    document.getElementById('resultsSummary').textContent = `${formatElapsed(stats.elapsedSeconds)} · ${accuracy}% accuracy · ${stats.masteredTotal} mastered total · ${remaining} remaining · time measured to flip`;
    document.getElementById('resultsIcon').textContent = remaining === 0 ? '🏆' : stats.newlyMastered > 0 ? '🧩' : '🎉';
    updateProgress();
    renderAllTimeSummary();
    renderResultsBuckets(stats.attempts || []);
    showScreen('stats');
}

function renderSettingsScreen() {
    closeDetailsModal();
    updateImage();
    updateProgress();
    updateGameplayToggle();
    showScreen('settings');
}

function renderAllTimeSummary() {
    const stats = state.allTimeStats || buildEmptyAllTimeStats();
    document.getElementById('allTimeSummary').textContent =
        `All time: ${stats.seen} seen · ${stats.correct} correct · ${stats.incorrect} not yet · ${state.masteredIds.length} mastered · ${formatElapsed(stats.elapsedSeconds)}`;
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
    if (!CATEGORY_META[categoryId]) {
        return;
    }
    const stats = getSessionStatsSnapshot();
    const attempts = (stats.attempts || [])
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
            <div class="details-meta">${formatResponseMs(attempt.responseMs)} · ${attempt.wasCorrect ? 'correct' : 'not yet'}</div>
        </div>
    `).join('');
    document.getElementById('detailsModal').style.display = 'flex';
}

function closeDetailsModal() {
    document.getElementById('detailsModal').style.display = 'none';
}

function startFreshSession() {
    closeDetailsModal();
    recordSessionActivity();
    state.activeSession = null;
    state.lastSessionStats = null;
    ensureSession();
    saveState();
    renderStudyScreen();
}

function setKeepLearningInRotation(enabled) {
    recordSessionActivity();
    state.settings.keepLearningInRotation = enabled;
    saveState();
    if (document.getElementById('screen-settings').classList.contains('active')) {
        renderSettingsScreen();
        return;
    }
    if (document.getElementById('screen-stats').classList.contains('active')) {
        renderStatsScreen();
        return;
    }
    renderStudyScreen();
}

function setKeepDistractedInRotation(enabled) {
    recordSessionActivity();
    state.settings.keepDistractedInRotation = enabled;
    saveState();
    if (document.getElementById('screen-settings').classList.contains('active')) {
        renderSettingsScreen();
        return;
    }
    if (document.getElementById('screen-stats').classList.contains('active')) {
        renderStatsScreen();
        return;
    }
    renderStudyScreen();
}

function setProgressSolidOrBetter(enabled) {
    recordSessionActivity();
    state.settings.progressSolidOrBetter = enabled;
    saveState();
    if (document.getElementById('screen-settings').classList.contains('active')) {
        renderSettingsScreen();
        return;
    }
    if (document.getElementById('screen-stats').classList.contains('active')) {
        renderStatsScreen();
        return;
    }
    renderStudyScreen();
}

function setPickCardMode(enabled) {
    recordSessionActivity();
    state.settings.pickCardMode = enabled;
    if (state.activeSession) {
        if (!enabled && state.activeSession.awaitingPick) {
            state.activeSession.awaitingPick = false;
            state.activeSession.currentPickTileId = null;
            resetCurrentCardTimer();
        }
        if (enabled) {
            state.activeSession.isFlipped = false;
            state.activeSession.currentFactId = null;
            state.activeSession.currentPickTileId = null;
            state.activeSession.awaitingPick = true;
            resetCurrentCardTimer();
        }
    }
    saveState();
    if (document.getElementById('screen-settings').classList.contains('active')) {
        renderSettingsScreen();
        return;
    }
    if (document.getElementById('screen-stats').classList.contains('active')) {
        renderStatsScreen();
        return;
    }
    renderStudyScreen({ instantReset: true });
}

function clearOverlayProgress({ clearStats = false } = {}) {
    state.masteredIds = [];
    state.factProgress = {};
    state.tileProgress = {};
    state.activeSession = null;
    if (clearStats) {
        state.lastSessionStats = null;
        state.allTimeStats = buildEmptyAllTimeStats();
    }
}

function resetAllProgressAndStats() {
    clearOverlayProgress({ clearStats: true });
    state.imageUrls = [];
    state.currentImageIndex = 0;
    saveState();
    renderSettingsScreen();
    showNotice('Progress, overlay, and stats reset.');
}

function restartImageProgress() {
    const shouldRestart = typeof window.confirm === 'function'
        ? window.confirm('Restart the current image progress and play again? Your stats will be kept.')
        : true;
    if (!shouldRestart) {
        return;
    }
    clearOverlayProgress({ clearStats: false });
    saveState();
    renderSettingsScreen();
    showNotice('Image progress restarted.');
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
    const closeMenu = () => {
        menuDropdown.style.display = 'none';
        themeSubmenu.style.display = 'none';
    };

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
            closeMenu();
        });
    });

    document.getElementById('menuStudyItem').addEventListener('click', () => {
        closeMenu();
        openStudyScreen();
    });
    document.getElementById('menuStatsItem').addEventListener('click', () => {
        closeMenu();
        openStatsScreen();
    });
    document.getElementById('menuSettingsItem').addEventListener('click', () => {
        closeMenu();
        openSettingsScreen();
    });

    menuDropdown.addEventListener('click', (event) => event.stopPropagation());
    document.addEventListener('click', () => {
        closeMenu();
    });
}

function getShareUrl() {
    const url = new URL(window.location.href);
    url.hash = '';
    const params = new URLSearchParams({
        [SHARE_ROTATION_HASH_KEY]: usesRotationPool() ? '1' : '0',
        [SHARE_LEARNING_HASH_KEY]: state.settings.keepLearningInRotation !== false ? '1' : '0',
        [SHARE_DISTRACTED_HASH_KEY]: state.settings.keepDistractedInRotation !== false ? '1' : '0',
        [SHARE_PICK_MODE_HASH_KEY]: state.settings.pickCardMode ? '1' : '0',
        [SHARE_PROGRESS_HASH_KEY]: isProgressBasedOnSolidOrBetter() ? '1' : '0'
    });
    const imageUrls = getConfiguredImageUrls();
    if (imageUrls.length > 0) {
        params.set(SHARE_IMAGE_LIST_HASH_KEY, imageUrls.join('\n'));
        params.set(SHARE_IMAGE_INDEX_HASH_KEY, String(state.currentImageIndex));
    }
    url.hash = params.toString();
    return url.toString();
}

function loadSharedStateFromUrl() {
    const hash = window.location.hash ? window.location.hash.slice(1) : '';
    if (!hash) {
        return;
    }
    const params = new URLSearchParams(hash);
    const sharedImages = params.get(SHARE_IMAGE_LIST_HASH_KEY);
    const sharedImageIndex = params.get(SHARE_IMAGE_INDEX_HASH_KEY);
    const rotationSetting = params.get(SHARE_ROTATION_HASH_KEY);
    const learningSetting = params.get(SHARE_LEARNING_HASH_KEY);
    const distractedSetting = params.get(SHARE_DISTRACTED_HASH_KEY);
    const pickSetting = params.get(SHARE_PICK_MODE_HASH_KEY);
    const progressSetting = params.get(SHARE_PROGRESS_HASH_KEY);
    const sharedImageUrls = typeof sharedImages === 'string'
        ? sharedImages.split('\n').map((value) => value.trim()).filter(Boolean)
        : [];
    const hasSharedImageList = sharedImageUrls.length > 0;
    const hasSharedSettings = rotationSetting !== null || learningSetting !== null || distractedSetting !== null || pickSetting !== null || progressSetting !== null;

    if (!hasSharedImageList && !hasSharedSettings) {
        return;
    }
    const currentImageUrls = getConfiguredImageUrls();
    const nextImageUrls = hasSharedImageList ? sharedImageUrls : currentImageUrls;
    const nextImageIndex = hasSharedImageList
        ? sanitizeImageIndex(sharedImageIndex, sharedImageUrls)
        : state.currentImageIndex;
    const nextKeepLearningInRotation = learningSetting !== null
        ? learningSetting !== '0'
        : rotationSetting !== null
        ? rotationSetting !== '0'
        : state.settings.keepLearningInRotation !== false;
    const nextKeepDistractedInRotation = distractedSetting !== null
        ? distractedSetting !== '0'
        : rotationSetting !== null
        ? rotationSetting !== '0'
        : state.settings.keepDistractedInRotation !== false;
    const nextPickCardMode = pickSetting !== null ? pickSetting === '1' : state.settings.pickCardMode;
    const nextProgressSolidOrBetter = progressSetting !== null ? progressSetting !== '0' : isProgressBasedOnSolidOrBetter();
    const hasChanges =
        (hasSharedImageList && !arraysEqual(nextImageUrls, currentImageUrls)) ||
        (hasSharedImageList && nextImageIndex !== state.currentImageIndex) ||
        nextKeepLearningInRotation !== (state.settings.keepLearningInRotation !== false) ||
        nextKeepDistractedInRotation !== (state.settings.keepDistractedInRotation !== false) ||
        nextPickCardMode !== state.settings.pickCardMode ||
        nextProgressSolidOrBetter !== isProgressBasedOnSolidOrBetter();
    const shouldResetProgress = hasChanges;

    if (!shouldConfirmSharedOverwrite(hasChanges, shouldResetProgress)) {
        clearShareHash();
        return;
    }

    if (hasSharedImageList) {
        state.imageUrls = nextImageUrls;
        state.currentImageIndex = nextImageIndex;
    }
    state.settings.keepLearningInRotation = nextKeepLearningInRotation;
    state.settings.keepDistractedInRotation = nextKeepDistractedInRotation;
    state.settings.pickCardMode = nextPickCardMode;
    state.settings.progressSolidOrBetter = nextProgressSolidOrBetter;

    if (shouldResetProgress) {
        clearOverlayProgress();
        state.lastSessionStats = null;
    }

    clearShareHash();
    saveState();
}

async function shareImageLink() {
    const shareUrl = getShareUrl();
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(shareUrl);
            showNotice('Share link copied.');
            return;
        }
    } catch (error) {
        // Fall through to prompt.
    }
    window.prompt('Copy this share link:', shareUrl);
}

function saveImageUrls() {
    const imageUrlsInput = document.getElementById('imageUrlsInput');
    const nextUrls = imageUrlsInput.value
        .split('\n')
        .map((value) => value.trim())
        .filter(Boolean);
    state.imageUrls = nextUrls;
    state.currentImageIndex = 0;
    clearOverlayProgress();
    saveState();
    renderSettingsScreen();
    showNotice(nextUrls.length > 0 ? 'Image list saved.' : 'Using the default image.');
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
    if (!storage.available) {
        document.getElementById('storageNotice').textContent = 'Progress is only available during this visit.';
    }
}

function advanceToNextImageIfNeeded() {
    const imageUrls = getConfiguredImageUrls();
    if (getClearedTileCount() !== TOTAL_FACTS || state.currentImageIndex >= imageUrls.length - 1) {
        return false;
    }
    state.currentImageIndex += 1;
    state.masteredIds = [];
    state.factProgress = {};
    state.tileProgress = {};
    showNotice(`Moved to image ${state.currentImageIndex + 1} of ${imageUrls.length}.`);
    return true;
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
    document.getElementById('shareImageBtn').addEventListener('click', shareImageLink);
    document.getElementById('saveImageUrlsBtn').addEventListener('click', saveImageUrls);
    document.getElementById('restartBtn').addEventListener('click', restartImageProgress);
    document.getElementById('undoBtn').addEventListener('click', undoLastAnswer);
    document.getElementById('resetAllTimeBtn').addEventListener('click', resetAllProgressAndStats);
    document.getElementById('keepLearningToggle').addEventListener('change', (event) => {
        setKeepLearningInRotation(event.target.checked);
    });
    document.getElementById('keepDistractedToggle').addEventListener('change', (event) => {
        setKeepDistractedInRotation(event.target.checked);
    });
    document.getElementById('progressSolidToggle').addEventListener('change', (event) => {
        setProgressSolidOrBetter(event.target.checked);
    });
    document.getElementById('pickCardModeToggle').addEventListener('change', (event) => {
        setPickCardMode(event.target.checked);
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

    window.addEventListener('resize', updatePickModeActionsPosition);
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMenu();
    loadSharedStateFromUrl();
    initEvents();
    renderStudyScreen();
});
