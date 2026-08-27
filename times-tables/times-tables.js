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
const MASTERED_MS = 1500;
const AUTOMATIC_MS = 2000;
const SOLID_MS = 4000;
const LEARNING_MS = 10000;
const SHARE_IMAGE_HASH_KEY = 'image';
const SHARE_ROTATION_HASH_KEY = 'rotation';
const SHARE_PICK_MODE_HASH_KEY = 'pick';
const CATEGORY_META = {
    mastered: { label: 'Mastered' },
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
    return {
        startedAt: Date.now(),
        seen: 0,
        correct: 0,
        incorrect: 0,
        newlyMastered: 0,
        currentFactId: null,
        isFlipped: false,
        questionShownAt: Date.now(),
        answerShownAt: null,
        attempts: [],
        undoState: null,
        awaitingPick: false
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
        imageDataUrl: '',
        settings: {
            rotateUnmasteredOnly: true,
            pickCardMode: false
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
            attempts: Array.isArray(input.activeSession.attempts)
                ? input.activeSession.attempts.map(sanitizeAttemptEntry).filter(Boolean)
                : [],
            undoState: null,
            awaitingPick: Boolean(input.activeSession.awaitingPick)
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
            rotateUnmasteredOnly: !input.settings || input.settings.rotateUnmasteredOnly !== false,
            pickCardMode: Boolean(input.settings && input.settings.pickCardMode)
        },
        activeSession: session,
        lastSessionStats,
        allTimeStats: sanitizeAllTimeStats(input.allTimeStats)
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
        attempts: state.activeSession.attempts,
        awaitingPick: state.activeSession.awaitingPick
    });

    return {
        masteredIds: deepClone(state.masteredIds),
        factProgress: deepClone(state.factProgress),
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

    const currentFactProgress = state.activeSession.currentFactId ? state.factProgress[state.activeSession.currentFactId] : null;
    const shouldReplaceCurrent =
        !FACT_BY_ID[state.activeSession.currentFactId] ||
        (state.settings.rotateUnmasteredOnly && currentFactProgress && !shouldKeepInRotation(currentFactProgress));

    if (shouldReplaceCurrent) {
        state.activeSession.currentFactId = pickNextFactId();
        state.activeSession.questionShownAt = Date.now();
        state.activeSession.answerShownAt = null;
        state.activeSession.awaitingPick = false;
    }
}

function shouldKeepInRotation(progress) {
    if (!progress || !progress.attempts) {
        return true;
    }
    return isLearningOrDistracted(progress);
}

function isLearningOrDistracted(progress) {
    const category = getProgressCategory(progress);
    return category === 'learning' || category === 'distracted';
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

function isAwaitingPick() {
    return Boolean(state.activeSession && state.activeSession.awaitingPick && isPickCardModeActive());
}

function isCurrentFact(factId) {
    return Boolean(state.activeSession && state.activeSession.currentFactId === factId);
}

function isSolidOrBetterCategory(category) {
    return category === 'mastered' || category === 'automatic' || category === 'solid';
}

function isTileFullyCleared(progress) {
    if (!progress) {
        return false;
    }
    const category = getProgressCategory(progress);
    return Boolean(progress.cleared || progress.mastered || isSolidOrBetterCategory(category));
}

function getClearedTileCount() {
    return FACTS.reduce((count, fact) => count + (isTileFullyCleared(state.factProgress[fact.id]) ? 1 : 0), 0);
}

function pickNextFactId(previousFactId) {
    let pool = state.settings.rotateUnmasteredOnly
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
    document.getElementById('cardFrontText').textContent = fact.expression;
    document.getElementById('cardBackText').textContent = fact.answer;

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
}

function updateProgress() {
    const clearedCount = getClearedTileCount();
    const remainingCount = TOTAL_FACTS - clearedCount;
    const percent = Math.round((clearedCount / TOTAL_FACTS) * 100);
    const waitingForPick = isAwaitingPick();

    document.getElementById('masteryText').textContent = `${clearedCount} of ${TOTAL_FACTS} solid or better`;
    document.getElementById('remainingText').textContent = `${remainingCount} facts left`;
    document.getElementById('masteryFill').style.width = `${percent}%`;
    document.getElementById('imageCaption').textContent = waitingForPick
        ? 'Pick a box on the image to show the next card.'
        : remainingCount === 0
        ? 'You uncovered the whole picture. Keep practicing as long as you like.'
        : 'Correct answers uncover more, and solid or better answers fully clear a tile.';
    const clearedTileCount = getClearedTileCount();
    document.getElementById('resultsImageCaption').textContent = clearedTileCount === TOTAL_FACTS
        ? 'Your whole image is uncovered.'
        : `${clearedTileCount} tiles fully cleared so far.`;

    renderCoverTiles();
}

function renderCoverTiles() {
    const covers = [
        document.getElementById('imageCover'),
        document.getElementById('resultsImageCover')
    ].filter(Boolean);
    const canPick = isAwaitingPick();
    const allCleared = getClearedTileCount() === TOTAL_FACTS;
    const highlightNextReveal = !isPickCardModeActive() && !canPick;

    covers.forEach((cover) => {
        cover.innerHTML = '';
        FACTS.forEach((fact, factIndex) => {
            const tile = document.createElement('div');
            tile.className = 'cover-tile';
            const tileIndex = REVEAL_ORDER[factIndex];
            tile.style.order = tileIndex;
            const progress = state.factProgress[fact.id];
            if (isTileFullyCleared(progress)) {
                tile.classList.add('revealed');
            } else if (progress && progress.correct > 0) {
                tile.classList.add('partial');
            }
            if (isPickCardModeActive() && !canPick && isCurrentFact(fact.id) && !isTileFullyCleared(progress)) {
                tile.classList.add('preview-reveal');
            }
            if (highlightNextReveal && isCurrentFact(fact.id) && !isTileFullyCleared(progress)) {
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
    const imageUrl = state.imageDataUrl || DEFAULT_IMAGE;
    document.getElementById('rewardImage').src = imageUrl;
    const resultsImage = document.getElementById('resultsRewardImage');
    if (resultsImage) {
        resultsImage.src = imageUrl;
    }
}

function updateSessionText() {
    ensureSession();
    const session = state.activeSession;
    document.getElementById('sessionText').textContent = `Session: ${session.seen} seen · ${session.correct} correct · ${session.incorrect} not yet`;
}

function updateGameplayToggle() {
    document.getElementById('rotateUnmasteredToggle').checked = state.settings.rotateUnmasteredOnly;
    document.getElementById('pickCardModeToggle').checked = isPickCardModeActive();
}

function updateUndoButton() {
    document.getElementById('undoBtn').disabled = !hasUndoState();
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
    if (FACT_BY_ID[factId]) {
        state.activeSession.currentFactId = factId;
    }
    state.activeSession.awaitingPick = false;
    state.activeSession.isFlipped = false;
    state.activeSession.questionShownAt = Date.now();
    state.activeSession.answerShownAt = null;
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

function flipCard() {
    ensureSession();
    state.activeSession.isFlipped = !state.activeSession.isFlipped;
    if (state.activeSession.isFlipped && !state.activeSession.answerShownAt) {
        state.activeSession.answerShownAt = Date.now();
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

function markAnswer(wasCorrect) {
    ensureSession();
    const session = state.activeSession;
    const undoState = captureUndoState();
    const currentFactId = session.currentFactId;
    const mastered = getMasteredSet();
    const responseMs = Math.max(0, (session.answerShownAt || Date.now()) - session.questionShownAt);

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
    session.undoState = undoState;
    session.isFlipped = false;
    session.answerShownAt = null;

    if (isPickCardModeActive()) {
        session.awaitingPick = true;
    } else {
        session.awaitingPick = false;
        session.questionShownAt = Date.now();
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
    const undoState = deepClone(state.activeSession.undoState);
    state.masteredIds = Array.isArray(undoState.masteredIds) ? undoState.masteredIds : [];
    state.factProgress = undoState.factProgress && typeof undoState.factProgress === 'object' ? undoState.factProgress : {};
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
    state.allTimeStats.sessions += 1;
    state.allTimeStats.seen += session.seen;
    state.allTimeStats.correct += session.correct;
    state.allTimeStats.incorrect += session.incorrect;
    state.allTimeStats.newlyMastered += session.newlyMastered;
    state.allTimeStats.elapsedSeconds += elapsedSeconds;
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
    updateImage();
    updateProgress();
    updateGameplayToggle();
    renderAllTimeSummary();
    renderResultsBuckets(stats.attempts || []);
    showScreen('results');
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
    state.activeSession = null;
    state.lastSessionStats = null;
    ensureSession();
    saveState();
    renderStudyScreen();
}

function setRotateUnmasteredOnly(enabled) {
    state.settings.rotateUnmasteredOnly = enabled;
    saveState();
    if (document.getElementById('screen-results').classList.contains('active')) {
        renderResultsScreen();
        return;
    }
    renderStudyScreen();
}

function setPickCardMode(enabled) {
    state.settings.pickCardMode = enabled;
    if (state.activeSession) {
        if (!enabled && state.activeSession.awaitingPick) {
            state.activeSession.awaitingPick = false;
            state.activeSession.questionShownAt = Date.now();
            state.activeSession.answerShownAt = null;
        }
        if (enabled) {
            state.activeSession.isFlipped = false;
        }
    }
    saveState();
    if (document.getElementById('screen-results').classList.contains('active')) {
        renderResultsScreen();
        return;
    }
    renderStudyScreen({ instantReset: true });
}

function clearOverlayProgress({ clearStats = false } = {}) {
    state.masteredIds = [];
    state.factProgress = {};
    state.activeSession = null;
    if (clearStats) {
        state.lastSessionStats = null;
        state.allTimeStats = buildEmptyAllTimeStats();
    }
}

function resetAllProgressAndStats() {
    clearOverlayProgress({ clearStats: true });
    saveState();
    renderResultsScreen();
    showNotice('Progress, overlay, and stats reset.');
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

function getShareUrl() {
    const url = new URL(window.location.href);
    url.hash = '';
    const params = new URLSearchParams({
        [SHARE_ROTATION_HASH_KEY]: state.settings.rotateUnmasteredOnly ? '1' : '0',
        [SHARE_PICK_MODE_HASH_KEY]: state.settings.pickCardMode ? '1' : '0'
    });
    if (state.imageDataUrl) {
        params.set(SHARE_IMAGE_HASH_KEY, state.imageDataUrl);
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
    const sharedImage = params.get(SHARE_IMAGE_HASH_KEY);
    const rotationSetting = params.get(SHARE_ROTATION_HASH_KEY);
    const pickSetting = params.get(SHARE_PICK_MODE_HASH_KEY);
    const hasSharedImage = Boolean(sharedImage && sharedImage.startsWith('data:image/'));
    const hasSharedSettings = rotationSetting !== null || pickSetting !== null;

    if (!hasSharedImage && !hasSharedSettings) {
        return;
    }
    if (hasSharedImage) {
        state.imageDataUrl = sharedImage;
    }
    if (rotationSetting !== null) {
        state.settings.rotateUnmasteredOnly = rotationSetting !== '0';
    }
    if (pickSetting !== null) {
        state.settings.pickCardMode = pickSetting === '1';
    }
    clearOverlayProgress();
    state.lastSessionStats = null;
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

async function handleImageUpload(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) {
        return;
    }
    try {
        state.imageDataUrl = await resizeImage(file);
        clearOverlayProgress();
        if (!saveState()) {
            showNotice('Custom image loaded for now, but this browser could not save it.');
        } else {
            showNotice('Custom image saved and progress reset for the new picture.');
        }
        renderResultsScreen();
    } catch (error) {
        showNotice('That image could not be used here.');
    }
}

function resetImage() {
    state.imageDataUrl = '';
    clearOverlayProgress();
    saveState();
    renderResultsScreen();
    showNotice('Using the default image with a fresh covered overlay.');
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
    document.getElementById('shareImageBtn').addEventListener('click', shareImageLink);
    document.getElementById('imageUploadInput').addEventListener('change', handleImageUpload);
    document.getElementById('undoBtn').addEventListener('click', undoLastAnswer);
    document.getElementById('resetAllTimeBtn').addEventListener('click', resetAllProgressAndStats);
    document.getElementById('rotateUnmasteredToggle').addEventListener('change', (event) => {
        setRotateUnmasteredOnly(event.target.checked);
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
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMenu();
    loadSharedStateFromUrl();
    initEvents();
    renderStudyScreen();
});
