// ===== DATA LAYER =====

const STORAGE_KEYS = {
    DECKS: 'quizard_decks',
    CARDS: 'quizard_cards'
};

function loadDecks() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.DECKS)) || [];
    } catch (e) {
        return [];
    }
}

function saveDecks(decks) {
    localStorage.setItem(STORAGE_KEYS.DECKS, JSON.stringify(decks));
}

function loadCards() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.CARDS)) || [];
    } catch (e) {
        return [];
    }
}

function saveCards(cards) {
    localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
}

function getCardsForDeck(deckId) {
    return loadCards()
        .filter(c => c.deckId === deckId)
        .sort((a, b) => a.position - b.position);
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ===== THEME =====

const themeIcons = {
    'default': '💜', 'black': '⚫', 'blue': '🔵', 'blue-dark': '🌊',
    'light': '🍋', 'dark': '🫒', 'warm-light': '🌻', 'warm-dark': '🍂',
    'red': '❤️', 'red-dark': '🌹', 'pink': '💗', 'pink-dark': '🌸'
};

function initTheme() {
    const saved = localStorage.getItem('appTheme') || 'default';
    document.body.className = saved !== 'default' ? `theme-${saved}` : '';
    const icon = document.getElementById('themeMenuIcon');
    if (icon) icon.textContent = themeIcons[saved] || '💜';
}

function applyTheme(theme) {
    document.body.className = theme !== 'default' ? `theme-${theme}` : '';
    localStorage.setItem('appTheme', theme);
    const icon = document.getElementById('themeMenuIcon');
    if (icon) icon.textContent = themeIcons[theme] || '💜';
}

// ===== MENU =====

function initMenu() {
    const menuBtn = document.getElementById('menuBtn');
    const menuDropdown = document.getElementById('menuDropdown');
    const themeMenuItem = document.getElementById('themeMenuItem');
    const themeSubmenu = document.getElementById('themeSubmenu');

    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = menuDropdown.style.display !== 'none';
        menuDropdown.style.display = isVisible ? 'none' : 'block';
        if (isVisible) themeSubmenu.style.display = 'none';
    });

    themeMenuItem.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = themeSubmenu.style.display !== 'none';
        themeSubmenu.style.display = isVisible ? 'none' : 'grid';
    });

    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            applyTheme(btn.dataset.theme);
            themeSubmenu.style.display = 'none';
            menuDropdown.style.display = 'none';
        });
    });

    document.addEventListener('click', () => {
        menuDropdown.style.display = 'none';
        themeSubmenu.style.display = 'none';
    });

    menuDropdown.addEventListener('click', (e) => e.stopPropagation());
}

// ===== SCREEN NAVIGATION =====

function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(`screen-${name}`);
    if (el) el.classList.add('active');
}

// ===== DECK LIST =====

function renderDeckList() {
    showScreen('deck-list');
    const decks = loadDecks();
    const cards = loadCards();
    const container = document.getElementById('deckList');

    if (decks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🃏</div>
                <p>No decks yet. Create your first deck!</p>
            </div>`;
        return;
    }

    container.innerHTML = decks.map(deck => {
        const cardCount = cards.filter(c => c.deckId === deck.id).length;
        return `
        <div class="deck-item">
            <div class="deck-info">
                <div class="deck-title">${escapeHtml(deck.title)}</div>
                <div class="deck-meta">${cardCount} card${cardCount !== 1 ? 's' : ''}</div>
            </div>
            <div class="deck-actions">
                <button class="btn btn-primary" onclick="startStudy('${deck.id}')" title="Study" ${cardCount === 0 ? 'disabled' : ''}>Study</button>
                <button class="btn-icon" onclick="openEditor('${deck.id}')" title="Edit">✏️</button>
                <button class="btn-icon" onclick="deleteDeck('${deck.id}')" title="Delete">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

function deleteDeck(deckId) {
    const decks = loadDecks();
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return;
    if (!confirm(`Delete "${deck.title}"? This will also delete all its cards.`)) return;

    saveDecks(decks.filter(d => d.id !== deckId));
    const cards = loadCards();
    saveCards(cards.filter(c => c.deckId !== deckId));
    renderDeckList();
}

// ===== DECK EDITOR =====

let editorDeckId = null;

function openEditor(deckId) {
    editorDeckId = deckId || null;
    const decks = loadDecks();
    const deck = deckId ? decks.find(d => d.id === deckId) : null;
    const existingCards = deckId ? getCardsForDeck(deckId) : [];

    document.getElementById('editorTitle').textContent = deck ? 'Edit Deck' : 'New Deck';
    document.getElementById('deckTitleInput').value = deck ? deck.title : '';

    // Start with existing cards, or two blank cards for new deck
    const cardData = existingCards.length > 0
        ? existingCards.map(c => ({ front: c.front, back: c.back }))
        : [{ front: '', back: '' }, { front: '', back: '' }];

    renderCardEditors(cardData);
    showScreen('deck-editor');
    document.getElementById('deckTitleInput').focus();
}

function renderCardEditors(cardData) {
    const list = document.getElementById('cardEditorList');
    list.innerHTML = cardData.map((card, i) => `
        <div class="card-editor-item" data-index="${i}">
            <div class="card-num">Card ${i + 1}</div>
            <button class="card-editor-remove" onclick="removeCardEditor(${i})" title="Remove card">✕</button>
            <div class="card-fields">
                <textarea class="form-input card-front" placeholder="Front (term)" rows="2">${escapeHtml(card.front)}</textarea>
                <textarea class="form-input card-back" placeholder="Back (definition)" rows="2">${escapeHtml(card.back)}</textarea>
            </div>
        </div>`).join('');
}

function removeCardEditor(index) {
    const cards = getEditorCardData();
    if (cards.length <= 1) {
        const msg = document.getElementById('editorMsg');
        msg.textContent = 'A deck must have at least one card.';
        setTimeout(() => { msg.textContent = ''; }, 2000);
        return;
    }
    cards.splice(index, 1);
    renderCardEditors(cards);
}

function addCardEditor() {
    const cards = getEditorCardData();
    cards.push({ front: '', back: '' });
    renderCardEditors(cards);
    // Scroll to last card
    const list = document.getElementById('cardEditorList');
    list.scrollTop = list.scrollHeight;
    // Focus the new front input
    const items = list.querySelectorAll('.card-editor-item');
    const last = items[items.length - 1];
    if (last) last.querySelector('.card-front').focus();
}

function getEditorCardData() {
    const items = document.querySelectorAll('.card-editor-item');
    return Array.from(items).map(item => ({
        front: item.querySelector('.card-front').value,
        back: item.querySelector('.card-back').value
    }));
}

function saveDeck() {
    const title = document.getElementById('deckTitleInput').value.trim();
    const msgEl = document.getElementById('editorMsg');
    if (!title) {
        document.getElementById('deckTitleInput').focus();
        document.getElementById('deckTitleInput').style.borderColor = 'var(--danger-color)';
        msgEl.textContent = 'Please enter a deck title.';
        setTimeout(() => {
            document.getElementById('deckTitleInput').style.borderColor = '';
            msgEl.textContent = '';
        }, 2000);
        return;
    }
    msgEl.textContent = '';

    const cardData = getEditorCardData().filter(c => c.front.trim() || c.back.trim());

    let decks = loadDecks();
    let allCards = loadCards();

    if (editorDeckId) {
        // Update existing deck
        decks = decks.map(d => d.id === editorDeckId ? { ...d, title } : d);
        // Replace cards for this deck
        allCards = allCards.filter(c => c.deckId !== editorDeckId);
    } else {
        // Create new deck
        editorDeckId = generateId();
        decks.push({ id: editorDeckId, title, createdAt: Date.now() });
    }

    // Save cards
    const newCards = cardData.map((c, i) => ({
        id: generateId(),
        deckId: editorDeckId,
        front: c.front.trim(),
        back: c.back.trim(),
        position: i
    }));
    allCards = allCards.concat(newCards);

    saveDecks(decks);
    saveCards(allCards);
    renderDeckList();
}

// ===== STUDY SESSION =====

let studyState = null;

function startStudy(deckId) {
    const deck = loadDecks().find(d => d.id === deckId);
    const cards = getCardsForDeck(deckId);

    if (!deck || cards.length === 0) return;

    const shuffle = document.getElementById('shuffleToggle') && document.getElementById('shuffleToggle').checked;

    let queue = cards.map(c => c.id);
    if (shuffle) {
        queue = shuffleArray(queue);
    }

    studyState = {
        deckId,
        deckTitle: deck.title,
        cards: Object.fromEntries(cards.map(c => [c.id, c])),
        queue: [...queue],
        knownIds: new Set(),
        seenCount: 0,
        totalCards: cards.length,
        isFlipped: false,
        startTime: Date.now()
    };

    showStudyCard();
}

function showStudyCard() {
    showScreen('study');
    const s = studyState;

    if (s.queue.length === 0) {
        showResults();
        return;
    }

    const cardId = s.queue[0];
    const card = s.cards[cardId];
    s.isFlipped = false;
    s.seenCount++;

    // Progress
    const learned = s.knownIds.size;
    const total = s.totalCards;
    const queueLen = s.queue.length;

    document.getElementById('studyProgressText').textContent =
        `${learned} learned · ${queueLen} remaining`;
    document.getElementById('studyDeckName').textContent = s.deckTitle;

    const progressPct = total > 0 ? (learned / total) * 100 : 0;
    document.getElementById('studyProgressFill').style.width = `${progressPct}%`;

    // Card faces
    document.getElementById('cardFrontText').textContent = card.front;
    document.getElementById('cardBackText').textContent = card.back;

    // Reset flip state
    const flashcard = document.getElementById('flashcard');
    flashcard.classList.remove('flipped');

    // Show/hide rating buttons
    document.getElementById('studyRatingRow').style.display = 'none';
    document.getElementById('cardTapHint').style.display = 'block';
}

function flipCard() {
    if (!studyState) return;
    studyState.isFlipped = !studyState.isFlipped;
    const flashcard = document.getElementById('flashcard');
    flashcard.classList.toggle('flipped', studyState.isFlipped);

    if (studyState.isFlipped) {
        document.getElementById('studyRatingRow').style.display = 'flex';
        document.getElementById('cardTapHint').style.display = 'none';
    } else {
        document.getElementById('studyRatingRow').style.display = 'none';
        document.getElementById('cardTapHint').style.display = 'block';
    }
}

function rateCard(knewIt) {
    if (!studyState) return;
    const s = studyState;
    const cardId = s.queue.shift(); // remove from front

    if (knewIt) {
        s.knownIds.add(cardId);
    } else {
        // Reinsert 3 positions later (or at end if fewer than 3 remain)
        const insertAt = Math.min(3, s.queue.length);
        s.queue.splice(insertAt, 0, cardId);
    }

    showStudyCard();
}

function showResults() {
    showScreen('results');
    const s = studyState;
    const elapsed = Math.round((Date.now() - s.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    document.getElementById('resultsDeckName').textContent = s.deckTitle;
    document.getElementById('resultsKnown').textContent = s.knownIds.size;
    document.getElementById('resultsTotal').textContent = s.totalCards;
    document.getElementById('resultsSeen').textContent = s.seenCount;
    document.getElementById('resultsTime').textContent = timeStr;

    const pct = s.totalCards > 0 ? Math.round((s.knownIds.size / s.totalCards) * 100) : 0;
    document.getElementById('resultsPercent').textContent = `${pct}%`;

    let trophy = '🎉';
    if (pct === 100) trophy = '🏆';
    else if (pct >= 80) trophy = '🌟';
    else if (pct >= 50) trophy = '👍';
    document.getElementById('resultsTrophy').textContent = trophy;
}

function restartStudy() {
    if (studyState) startStudy(studyState.deckId);
}

// ===== UTILITIES =====

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ===== INIT =====

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMenu();
    renderDeckList();

    // Flashcard flip on click
    document.getElementById('flashcard').addEventListener('click', flipCard);

    // Shuffle toggle: restart study with new order when changed mid-session
    document.getElementById('shuffleToggle').addEventListener('change', () => {
        if (studyState) restartStudy();
    });

    // Keyboard shortcut: space to flip, 1 for know, 2 for still learning
    document.addEventListener('keydown', (e) => {
        if (document.getElementById('screen-study').classList.contains('active')) {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                if (!studyState.isFlipped) {
                    flipCard();
                }
            } else if (e.key === '1' && studyState.isFlipped) {
                rateCard(true);
            } else if (e.key === '2' && studyState.isFlipped) {
                rateCard(false);
            }
        }
    });
});
