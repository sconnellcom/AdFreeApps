// ===== IMAGE RESIZE =====

function resizeImage(file) {
    return new Promise((resolve) => {
        const MAX_W = 800, MAX_H = 600;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let w = img.width, h = img.height;
                if (w > MAX_W || h > MAX_H) {
                    const ratio = Math.min(MAX_W / w, MAX_H / h);
                    w = Math.round(w * ratio);
                    h = Math.round(h * ratio);
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function handleCardImageFile(file, item, side) {
    resizeImage(file).then(dataUrl => {
        item.querySelector(`.card-${side}-image`).value = dataUrl;
        updateCardImagePreview(item, side, dataUrl);
    });
}

function handleCardImage(input, side) {
    const file = input.files[0];
    if (!file) return;
    const item = input.closest('.card-editor-item');
    handleCardImageFile(file, item, side);
    input.value = '';
}

function removeCardImage(btn, side) {
    const item = btn.closest('.card-editor-item');
    item.querySelector(`.card-${side}-image`).value = '';
    updateCardImagePreview(item, side, '');
}

function updateCardImagePreview(item, side, dataUrl) {
    const row = item.querySelector(`.card-image-row[data-side="${side}"]`);
    let thumb = row.querySelector('.card-thumb');
    let removeBtn = row.querySelector('.btn-img-remove');
    if (dataUrl) {
        if (!thumb) {
            thumb = document.createElement('img');
            thumb.className = 'card-thumb';
            thumb.alt = `${side.charAt(0).toUpperCase() + side.slice(1)} card image`;
            row.insertBefore(thumb, row.querySelector('.btn-img-upload'));
        }
        thumb.src = dataUrl;
        if (!removeBtn) {
            removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn-img-remove';
            removeBtn.title = 'Remove image';
            removeBtn.textContent = '✕';
            removeBtn.onclick = function () { removeCardImage(this, side); };
            row.appendChild(removeBtn);
        }
    } else {
        if (thumb) thumb.remove();
        if (removeBtn) removeBtn.remove();
    }
}

// ===== DATA LAYER =====

const STORAGE_KEYS = {
    DECKS: 'quizard_decks',
    CARDS: 'quizard_cards',
    STUDY_LOG: 'quizard_study_log'
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

// ===== STUDY LOG =====

function loadStudyLog() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDY_LOG)) || [];
    } catch (e) {
        return [];
    }
}

function appendStudyLog(entry) {
    const log = loadStudyLog();
    log.push(entry);
    localStorage.setItem(STORAGE_KEYS.STUDY_LOG, JSON.stringify(log));
}

function clearStudyLog() {
    if (!confirm('Clear all Chronicle history? This cannot be undone.')) return;
    localStorage.removeItem(STORAGE_KEYS.STUDY_LOG);
    renderStudyLog();
}

function formatStudyLogEntry(entry, showDeckName) {
    const d = new Date(entry.date);
    const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const mins = Math.floor(entry.elapsed / 60);
    const secs = entry.elapsed % 60;
    const elapsedStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    const pctClass = entry.pct === 100 ? 'log-pct-perfect' : entry.pct >= 80 ? 'log-pct-great' : entry.pct >= 50 ? 'log-pct-ok' : 'log-pct-low';
    return `
    <div class="study-log-item">
        <div class="study-log-meta">
            <span class="study-log-date">${dateStr} · ${timeStr}</span>
            <span class="study-log-elapsed">⏱ ${elapsedStr}</span>
        </div>
        ${showDeckName ? `<div class="study-log-deck">${escapeHtml(entry.deckTitle)}</div>` : ''}
        <div class="study-log-score">
            <span class="${pctClass} study-log-pct">${entry.pct}%</span>
            <span class="study-log-fraction">${entry.known} / ${entry.total} mastered</span>
        </div>
    </div>`;
}

function renderStudyLog() {
    showScreen('study-log');
    document.getElementById('studyLogTitle').textContent = 'Chronicle';
    document.getElementById('studyLogClearBtn').style.display = '';
    const log = loadStudyLog().reverse(); // newest first
    const container = document.getElementById('studyLogList');

    if (log.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <p>No Rehearsal sessions yet. Complete a Spellbook to see your history here!</p>
            </div>`;
        return;
    }

    container.innerHTML = log.map(entry => formatStudyLogEntry(entry, true)).join('');
}

function renderDeckStudyLog(deckId) {
    const decks = loadDecks();
    const deck = decks.find(d => d.id === deckId);
    const deckTitle = deck ? deck.title : 'Spellbook';

    showScreen('study-log');
    document.getElementById('studyLogTitle').textContent = `Chronicle — ${deckTitle}`;
    document.getElementById('studyLogClearBtn').style.display = 'none';

    const log = loadStudyLog().filter(e => e.deckId === deckId).reverse();
    const container = document.getElementById('studyLogList');

    if (log.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <p>No Rehearsal sessions yet for this Spellbook. Complete a session to see your history here!</p>
            </div>`;
        return;
    }

    container.innerHTML = log.map(entry => formatStudyLogEntry(entry, false)).join('');
}

// ===== EXPORT / IMPORT =====

function exportDeck(deckId) {
    const decks = loadDecks();
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return;
    const cards = getCardsForDeck(deckId).map(({ front, back, frontImage, backImage, position }) =>
        ({ front, back, frontImage: frontImage || '', backImage: backImage || '', position }));
    const data = { deck: { title: deck.title, createdAt: deck.createdAt }, cards };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (deck.title.replace(/[^a-z0-9_\-]/gi, '_') || 'deck') + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ===== IMPORT OPTIONS MODAL =====

function openImportOptionsModal() {
    document.getElementById('importOptionsModal').style.display = 'flex';
}

function closeImportOptionsModal() {
    document.getElementById('importOptionsModal').style.display = 'none';
}

function triggerFileImport() {
    closeImportOptionsModal();
    document.getElementById('importFileInput').click();
}

function openImportPasteModal() {
    closeImportOptionsModal();
    document.getElementById('importPasteTextarea').value = '';
    document.getElementById('importPasteModal').style.display = 'flex';
}

function closeImportPasteModal() {
    document.getElementById('importPasteModal').style.display = 'none';
}

function handlePasteJsonImport() {
    const text = document.getElementById('importPasteTextarea').value.trim();
    if (!text) return;
    let data;
    try {
        data = JSON.parse(text);
    } catch (err) {
        alert('Could not parse the JSON: ' + err.message + '\n\nMake sure it is a valid Quizard JSON export.');
        return;
    }
    if (!data || !data.deck || typeof data.deck.title !== 'string' || !Array.isArray(data.cards)) {
        alert('This does not look like a Quizard Spellbook export. Expected fields: deck.title (string) and cards (array).');
        return;
    }
    closeImportPasteModal();
    showImportModal(data);
}

// ===== IMPORT FILE =====

function handleImportFile(input) {
    const file = input.files[0];
    if (!file) return;
    input.value = '';
    const reader = new FileReader();
    reader.onload = (e) => {
        let data;
        try {
            data = JSON.parse(e.target.result);
        } catch {
            alert('Could not read the file. Make sure it is a JSON file exported from Quizard.');
            return;
        }
        if (!data || !data.deck || typeof data.deck.title !== 'string' || !Array.isArray(data.cards)) {
            alert('This file does not look like a Quizard Spellbook export.');
            return;
        }
        showImportModal(data);
    };
    reader.readAsText(file);
}

function importDeckData(data) {
    const deckId = generateId();
    const decks = loadDecks();
    decks.push({ id: deckId, title: data.deck.title, createdAt: data.deck.createdAt || Date.now() });
    saveDecks(decks);
    const allCards = loadCards();
    const newCards = data.cards.map((c, i) => ({
        id: generateId(),
        deckId,
        front: String(c.front || ''),
        back: String(c.back || ''),
        frontImage: String(c.frontImage || ''),
        backImage: String(c.backImage || ''),
        position: typeof c.position === 'number' ? c.position : i
    }));
    saveCards(allCards.concat(newCards));
    renderDeckList();
}

function overwriteDeckData(deckId, data) {
    const decks = loadDecks();
    const deckIdx = decks.findIndex(d => d.id === deckId);
    if (deckIdx === -1) {
        importDeckData(data);
        return;
    }
    decks[deckIdx].title = data.deck.title;
    saveDecks(decks);
    const allCards = loadCards();
    const otherCards = allCards.filter(c => c.deckId !== deckId);
    const newCards = data.cards.map((c, i) => ({
        id: generateId(),
        deckId,
        front: String(c.front || ''),
        back: String(c.back || ''),
        frontImage: String(c.frontImage || ''),
        backImage: String(c.backImage || ''),
        position: typeof c.position === 'number' ? c.position : i
    }));
    saveCards(otherCards.concat(newCards));
    renderDeckList();
}

// ===== IMPORT MODAL =====

let pendingImportData = null;
let pendingImportOverwriteId = null;

function showImportModal(data) {
    pendingImportData = data;
    pendingImportOverwriteId = null;
    const cardCount = data.cards.length;
    const decks = loadDecks();
    const existing = decks.find(d => d.title === data.deck.title);
    const titleEl = document.getElementById('shareImportTitle');
    const bodyEl = document.getElementById('shareImportBody');
    const actionsEl = document.getElementById('shareImportActions');

    if (existing) {
        pendingImportOverwriteId = existing.id;
        titleEl.textContent = 'Spellbook Already Exists';
        bodyEl.innerHTML = `A Spellbook named &ldquo;${escapeHtml(data.deck.title)}&rdquo; already exists. Overwrite it (keeping Rehearsal stats) or summon as a new Spellbook?`;
        actionsEl.innerHTML =
            `<button class="btn btn-primary" onclick="confirmShareImport('overwrite')">Overwrite</button>` +
            `<button class="btn btn-secondary" onclick="confirmShareImport('new')">Summon as New</button>` +
            `<button class="btn btn-secondary" onclick="cancelShareImport()">Cancel</button>`;
    } else {
        titleEl.textContent = 'Summon Spellbook?';
        bodyEl.innerHTML = `&ldquo;${escapeHtml(data.deck.title)}&rdquo; &mdash; ${cardCount} spell${cardCount !== 1 ? 's' : ''}`;
        actionsEl.innerHTML =
            `<button class="btn btn-primary" onclick="confirmShareImport('new')">Summon</button>` +
            `<button class="btn btn-secondary" onclick="cancelShareImport()">Cancel</button>`;
    }
    document.getElementById('shareImportModal').style.display = 'flex';
}

function confirmShareImport(action) {
    if (!pendingImportData) return;
    if (action === 'overwrite' && pendingImportOverwriteId) {
        overwriteDeckData(pendingImportOverwriteId, pendingImportData);
        showToast('Spellbook updated!');
    } else {
        importDeckData(pendingImportData);
        showToast('Spellbook summoned!');
    }
    pendingImportData = null;
    pendingImportOverwriteId = null;
    document.getElementById('shareImportModal').style.display = 'none';
    if (location.hash.startsWith('#share=')) {
        history.replaceState(null, '', location.pathname + location.search);
    }
}

function cancelShareImport() {
    pendingImportData = null;
    pendingImportOverwriteId = null;
    document.getElementById('shareImportModal').style.display = 'none';
    if (location.hash.startsWith('#share=')) {
        history.replaceState(null, '', location.pathname + location.search);
    }
}

// ===== TOAST =====

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

// ===== SHARE LINK =====

const SHARE_LINK_SIZE_WARN = 50 * 1024; // 50 KB — warn if compressed payload exceeds this

async function compressDeck(obj) {
    const json = JSON.stringify(obj);
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const buf = await new Response(stream).arrayBuffer();
    const bytes = new Uint8Array(buf);
    const CHUNK = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function decompressDeck(b64url) {
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return JSON.parse(await new Response(stream).text());
}

async function shareDeckLink(deckId) {
    if (typeof CompressionStream === 'undefined') {
        alert('Your browser does not support the compression needed for share links.\nUse the Export button to share as a file instead.');
        return;
    }
    const decks = loadDecks();
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return;
    const cards = getCardsForDeck(deckId).map(({ front, back, frontImage, backImage, position }) =>
        ({ front, back, frontImage: frontImage || '', backImage: backImage || '', position }));
    const data = { deck: { title: deck.title, createdAt: deck.createdAt }, cards };
    try {
        const encoded = await compressDeck(data);
        const url = location.origin + location.pathname + '#share=' + encoded;
        const SIZE_WARN = SHARE_LINK_SIZE_WARN;
        if (encoded.length > SIZE_WARN) {
            const proceed = confirm(
                `This deck has a lot of data (${Math.round(encoded.length / 1024)} KB compressed).\n` +
                `The share link may be too long for some messaging apps.\n\n` +
                `Consider using the Export button to share as a file instead.\n\nCopy the link anyway?`
            );
            if (!proceed) return;
        }
        try {
            await navigator.clipboard.writeText(url);
            showToast('Share link copied!');
        } catch {
            prompt('Copy this share link:', url);
        }
    } catch (err) {
        console.error('Share link error:', err);
        alert('Could not generate the share link. Try exporting as a file instead.');
    }
}

async function checkShareHash() {
    const hash = location.hash;
    if (!hash.startsWith('#share=')) return;
    const encoded = hash.slice(7);
    if (!encoded) return;
    if (typeof DecompressionStream === 'undefined') {
        alert('Your browser does not support the decompression needed to read this share link.');
        history.replaceState(null, '', location.pathname + location.search);
        return;
    }
    try {
        const data = await decompressDeck(encoded);
        if (!data || !data.deck || typeof data.deck.title !== 'string' || !Array.isArray(data.cards)) {
            alert('This share link does not appear to contain a valid Spellbook.');
            history.replaceState(null, '', location.pathname + location.search);
            return;
        }
        showImportModal(data);
    } catch (err) {
        console.error('Share hash decode error:', err);
        alert('Could not read this share link. It may be corrupted or cut off.');
        history.replaceState(null, '', location.pathname + location.search);
    }
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
                <p>No Spellbooks yet. Cast your first Spellbook!</p>
            </div>`;
        return;
    }

    container.innerHTML = decks.map(deck => {
        const cardCount = cards.filter(c => c.deckId === deck.id).length;
        return `
        <div class="deck-item">
            <div class="deck-info">
                <div class="deck-title">${escapeHtml(deck.title)}</div>
                <div class="deck-meta">${cardCount} spell${cardCount !== 1 ? 's' : ''}</div>
            </div>
            <div class="deck-actions">
                <button class="btn btn-primary" onclick="startStudy('${deck.id}')" title="Rehearse" ${cardCount === 0 ? 'disabled' : ''}>Rehearse</button>
                <button class="btn-icon" onclick="renderDeckStudyLog('${deck.id}')" title="View Chronicle for this Spellbook" aria-label="View Chronicle for ${escapeHtml(deck.title)}">📊</button>
                <button class="btn-icon" onclick="openEditor('${deck.id}')" title="Edit">✏️</button>
                <button class="btn-icon" onclick="exportDeck('${deck.id}')" title="Export deck as file" aria-label="Export ${escapeHtml(deck.title)} as file">⬇️</button>
                <button class="btn-icon" onclick="shareDeckLink('${deck.id}')" title="Copy share link" aria-label="Copy share link for ${escapeHtml(deck.title)}">🔗</button>
                <button class="btn-icon" onclick="deleteDeck('${deck.id}')" title="Delete">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

function deleteDeck(deckId) {
    const decks = loadDecks();
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return;
    if (!confirm(`Delete "${deck.title}"? This will also delete all its Spells.`)) return;

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

    document.getElementById('editorTitle').textContent = deck ? 'Edit Spellbook' : 'New Spellbook';
    document.getElementById('deckTitleInput').value = deck ? deck.title : '';

    // Start with existing cards, or two blank cards for new deck
    const cardData = existingCards.length > 0
        ? existingCards.map(c => ({ front: c.front, back: c.back, frontImage: c.frontImage || '', backImage: c.backImage || '' }))
        : [{ front: '', back: '', frontImage: '', backImage: '' }, { front: '', back: '', frontImage: '', backImage: '' }];

    renderCardEditors(cardData);
    showScreen('deck-editor');
    document.getElementById('deckTitleInput').focus();

    const exportBtn = document.getElementById('exportDeckBtn');
    const shareBtn = document.getElementById('shareDeckBtn');
    const deleteBtn = document.getElementById('deleteDeckBtn');
    if (exportBtn) exportBtn.style.display = deckId ? '' : 'none';
    if (shareBtn) shareBtn.style.display = deckId ? '' : 'none';
    if (deleteBtn) deleteBtn.style.display = deckId ? '' : 'none';
}

function deleteDeckFromEditor() {
    if (!editorDeckId) return;
    const decks = loadDecks();
    const deck = decks.find(d => d.id === editorDeckId);
    if (!deck) return;
    if (!confirm(`Delete "${deck.title}"? This will also delete all its Spells.`)) return;

    saveDecks(decks.filter(d => d.id !== editorDeckId));
    const cards = loadCards();
    saveCards(cards.filter(c => c.deckId !== editorDeckId));
    editorDeckId = null;
    renderDeckList();
}

function attachCardEditorPasteListeners() {
    document.querySelectorAll('.card-editor-item').forEach(item => {
        ['front', 'back'].forEach(side => {
            const textarea = item.querySelector(`.card-${side}`);
            if (!textarea) return;
            textarea.addEventListener('paste', (e) => {
                const items = e.clipboardData && e.clipboardData.items;
                if (!items) return;
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.startsWith('image/')) {
                        e.preventDefault();
                        handleCardImageFile(items[i].getAsFile(), item, side);
                        return;
                    }
                }
            });
        });
    });
}

function renderCardEditors(cardData) {
    const list = document.getElementById('cardEditorList');
    list.innerHTML = cardData.map((card, i) => `
        <div class="card-editor-item" data-index="${i}">
            <div class="card-num">Spell ${i + 1}</div>
            <button class="card-editor-remove" onclick="removeCardEditor(${i})" title="Remove spell">✕</button>
            <div class="card-fields">
                <div class="card-field-group">
                    <textarea class="form-input card-front" placeholder="Front (term)" rows="2">${escapeHtml(card.front)}</textarea>
                    <div class="card-image-row" data-side="front">
                        <input type="hidden" class="card-front-image" value="${escapeHtml(card.frontImage || '')}">
                        ${card.frontImage ? `<img class="card-thumb" src="${card.frontImage}" alt="Front card image">` : ''}
                        <label class="btn-img-upload" title="Add image to front">📷 Photo<input type="file" accept="image/*" class="card-img-file-input" onchange="handleCardImage(this,'front')"></label>
                        ${card.frontImage ? `<button type="button" class="btn-img-remove" onclick="removeCardImage(this,'front')" title="Remove image">✕</button>` : ''}
                    </div>
                </div>
                <div class="card-field-group">
                    <textarea class="form-input card-back" placeholder="Back (definition)" rows="2">${escapeHtml(card.back)}</textarea>
                    <div class="card-image-row" data-side="back">
                        <input type="hidden" class="card-back-image" value="${escapeHtml(card.backImage || '')}">
                        ${card.backImage ? `<img class="card-thumb" src="${card.backImage}" alt="Back card image">` : ''}
                        <label class="btn-img-upload" title="Add image to back">📷 Photo<input type="file" accept="image/*" class="card-img-file-input" onchange="handleCardImage(this,'back')"></label>
                        ${card.backImage ? `<button type="button" class="btn-img-remove" onclick="removeCardImage(this,'back')" title="Remove image">✕</button>` : ''}
                    </div>
                </div>
            </div>
        </div>`).join('');
    attachCardEditorPasteListeners();
}

function removeCardEditor(index) {
    const cards = getEditorCardData();
    if (cards.length <= 1) {
        const msg = document.getElementById('editorMsg');
        msg.textContent = 'A Spellbook must have at least one Spell.';
        setTimeout(() => { msg.textContent = ''; }, 2000);
        return;
    }
    cards.splice(index, 1);
    renderCardEditors(cards);
}

function addCardEditor() {
    const cards = getEditorCardData();
    cards.push({ front: '', back: '', frontImage: '', backImage: '' });
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
        back: item.querySelector('.card-back').value,
        frontImage: item.querySelector('.card-front-image').value,
        backImage: item.querySelector('.card-back-image').value
    }));
}

function saveDeck() {
    const title = document.getElementById('deckTitleInput').value.trim();
    const msgEl = document.getElementById('editorMsg');
    if (!title) {
        document.getElementById('deckTitleInput').focus();
        document.getElementById('deckTitleInput').style.borderColor = 'var(--danger-color)';
        msgEl.textContent = 'Please enter a Spellbook title.';
        setTimeout(() => {
            document.getElementById('deckTitleInput').style.borderColor = '';
            msgEl.textContent = '';
        }, 2000);
        return;
    }
    msgEl.textContent = '';

    const cardData = getEditorCardData().filter(c => c.front.trim() || c.back.trim() || c.frontImage || c.backImage);

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
        frontImage: c.frontImage || '',
        backImage: c.backImage || '',
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
    const backwards = document.getElementById('backwardsToggle') && document.getElementById('backwardsToggle').checked;

    let queue = cards.map(c => c.id);
    if (shuffle) {
        queue = shuffleArray(queue);
    }

    // If backwards casting, swap front/back on a copy of the cards
    const cardMap = Object.fromEntries(cards.map(c => {
        if (backwards) {
            return [c.id, { ...c, front: c.back, back: c.front, frontImage: c.backImage || '', backImage: c.frontImage || '' }];
        }
        return [c.id, c];
    }));

    studyState = {
        deckId,
        deckTitle: deck.title,
        cards: cardMap,
        queue: [...queue],
        knownIds: new Set(),
        firstTimeKnownIds: new Set(),
        ratedIds: new Set(),
        seenCount: 0,
        totalCards: cards.length,
        isFlipped: false,
        history: [],
        historyPos: -1,
        startTime: Date.now(),
        backwards
    };

    // Update card-side labels to reflect mode
    const frontLabel = document.getElementById('frontLabel');
    const backLabel = document.getElementById('backLabel');
    if (frontLabel) frontLabel.textContent = backwards ? 'Definition' : 'Term';
    if (backLabel) backLabel.textContent = backwards ? 'Term' : 'Definition';

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
    s.seenCount++;
    s.history.push(cardId);
    s.historyPos = s.history.length - 1;

    renderStudyCard(cardId);
}

function renderStudyCard(cardId) {
    const s = studyState;
    const card = s.cards[cardId];
    s.isFlipped = false;

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

    // Card images
    const frontImg = document.getElementById('cardFrontImage');
    const backImg = document.getElementById('cardBackImage');
    if (card.frontImage) {
        frontImg.src = card.frontImage;
        frontImg.style.display = 'block';
        frontImg.onload = updateFlashcardHeight;
    } else {
        frontImg.src = '';
        frontImg.style.display = 'none';
    }
    if (card.backImage) {
        backImg.src = card.backImage;
        backImg.style.display = 'block';
        backImg.onload = updateFlashcardHeight;
    } else {
        backImg.src = '';
        backImg.style.display = 'none';
    }
    updateFlashcardHeight();

    // Reset flip state without animating (suppress transition for one frame)
    const flashcard = document.getElementById('flashcard');
    flashcard.classList.add('no-transition');
    flashcard.classList.remove('flipped');
    // eslint-disable-next-line no-unused-expressions
    flashcard.offsetWidth; // force reflow so the removal takes effect instantly
    flashcard.classList.remove('no-transition');

    // Show/hide rating buttons
    document.getElementById('studyRatingRow').style.visibility = 'hidden';
    document.getElementById('cardTapHint').style.display = 'block';

    // Update prev/next button states
    const prevBtn = document.getElementById('prevCardBtn');
    const nextBtn = document.getElementById('nextCardBtn');
    if (prevBtn) prevBtn.disabled = s.historyPos <= 0;
    if (nextBtn) nextBtn.disabled = s.historyPos >= s.history.length - 1;
}

function flipCard() {
    if (!studyState) return;
    studyState.isFlipped = !studyState.isFlipped;
    const flashcard = document.getElementById('flashcard');
    flashcard.classList.toggle('flipped', studyState.isFlipped);

    if (studyState.isFlipped) {
        document.getElementById('studyRatingRow').style.visibility = 'visible';
        document.getElementById('cardTapHint').style.display = 'none';
    } else {
        document.getElementById('studyRatingRow').style.visibility = 'hidden';
        document.getElementById('cardTapHint').style.display = 'block';
    }
}

function prevCard() {
    if (!studyState || studyState.historyPos <= 0) return;
    studyState.historyPos--;
    renderStudyCard(studyState.history[studyState.historyPos]);
}

function nextCard() {
    if (!studyState || studyState.historyPos >= studyState.history.length - 1) return;
    studyState.historyPos++;
    renderStudyCard(studyState.history[studyState.historyPos]);
}

function rateCard(knewIt) {
    if (!studyState) return;
    const s = studyState;
    const cardId = s.history[s.historyPos];
    const cardQueueIndex = s.queue.indexOf(cardId);

    // Record first-time result (ignore re-ratings of the same card)
    if (!s.ratedIds.has(cardId)) {
        s.ratedIds.add(cardId);
        if (knewIt) s.firstTimeKnownIds.add(cardId);
    }

    if (cardQueueIndex !== -1) {
        s.queue.splice(cardQueueIndex, 1);
        if (knewIt) {
            s.knownIds.add(cardId);
        } else {
            // Reinsert 3 positions later (or at end if fewer remain)
            const insertAt = Math.min(cardQueueIndex + 3, s.queue.length);
            s.queue.splice(insertAt, 0, cardId);
        }
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

    const firstTimeCorrect = s.firstTimeKnownIds.size;
    const pct = s.totalCards > 0 ? Math.round((firstTimeCorrect / s.totalCards) * 100) : 0;

    document.getElementById('resultsDeckName').textContent = s.deckTitle;
    document.getElementById('resultsKnown').textContent = firstTimeCorrect;
    document.getElementById('resultsTotal').textContent = s.totalCards;
    document.getElementById('resultsSeen').textContent = s.seenCount;
    document.getElementById('resultsTime').textContent = timeStr;

    document.getElementById('resultsPercent').textContent = `${pct}%`;

    let trophy = '🎉';
    if (pct === 100) trophy = '🏆';
    else if (pct >= 80) trophy = '🌟';
    else if (pct >= 50) trophy = '👍';
    document.getElementById('resultsTrophy').textContent = trophy;

    appendStudyLog({
        id: generateId(),
        deckId: s.deckId,
        deckTitle: s.deckTitle,
        date: Date.now(),
        known: firstTimeCorrect,
        total: s.totalCards,
        pct,
        elapsed
    });
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

function updateFlashcardHeight() {
    const flashcard = document.getElementById('flashcard');
    const faces = flashcard.querySelectorAll('.card-face');
    let maxH = 200;
    faces.forEach(f => {
        if (f.scrollHeight > maxH) maxH = f.scrollHeight;
    });
    flashcard.style.minHeight = maxH + 'px';
}

// ===== STUDY: EDIT CARD =====

function openEditCardModal() {
    if (!studyState) return;
    const cardId = studyState.history[studyState.historyPos];
    if (!cardId) return;
    const card = studyState.cards[cardId];
    document.getElementById('editCardFront').value = card.front;
    document.getElementById('editCardBack').value = card.back;
    document.getElementById('editCardModal').style.display = 'flex';
    document.getElementById('editCardFront').focus();
}

function saveEditCardModal() {
    if (!studyState) return;
    const cardId = studyState.history[studyState.historyPos];
    if (!cardId) return;
    const newFront = document.getElementById('editCardFront').value;
    const newBack = document.getElementById('editCardBack').value;

    // Update in-memory study state
    studyState.cards[cardId].front = newFront;
    studyState.cards[cardId].back = newBack;

    // Persist to localStorage
    const allCards = loadCards();
    const idx = allCards.findIndex(c => c.id === cardId);
    if (idx !== -1) {
        allCards[idx].front = newFront;
        allCards[idx].back = newBack;
        saveCards(allCards);
    }

    // Re-render the current card without changing queue order
    renderStudyCard(cardId);

    document.getElementById('editCardModal').style.display = 'none';
    showToast('Spell updated!');
}

function cancelEditCardModal() {
    document.getElementById('editCardModal').style.display = 'none';
}

// ===== AI DECK CREATOR =====

let webllmEngine = null;
let webllmLoadedModel = null;

function openAiDeckScreen() {
    showScreen('ai-deck');
    document.getElementById('aiSetupPanel').style.display = '';
    document.getElementById('aiStatusArea').style.display = 'none';
    document.getElementById('aiPreviewArea').style.display = 'none';
    document.getElementById('aiSetupMsg').textContent = '';
}

async function generateAiDeck() {
    const topic = document.getElementById('aiTopicInput').value.trim();
    const notes = document.getElementById('aiNotesInput').value.trim();
    const notesOnly = document.getElementById('aiNotesOnlyCheck').checked;
    const cardCount = Math.min(50, Math.max(3, parseInt(document.getElementById('aiCardCountInput').value) || 10));
    const modelId = document.getElementById('aiModelSelect').value;
    const msgEl = document.getElementById('aiSetupMsg');

    msgEl.textContent = '';
    if (!topic) {
        document.getElementById('aiTopicInput').focus();
        document.getElementById('aiTopicInput').style.borderColor = 'var(--danger-color)';
        msgEl.textContent = 'Please enter a topic to study.';
        setTimeout(() => {
            document.getElementById('aiTopicInput').style.borderColor = '';
            msgEl.textContent = '';
        }, 2500);
        return;
    }

    document.getElementById('aiSetupPanel').style.display = 'none';
    document.getElementById('aiPreviewArea').style.display = 'none';
    document.getElementById('aiStatusArea').style.display = '';

    try {
        if (!webllmEngine || webllmLoadedModel !== modelId) {
            webllmEngine = null;
            webllmLoadedModel = null;
            setAiStatus('Downloading model… this may take a few minutes on first use.', 0);
            // WebLLM is loaded via dynamic import from the esm.run CDN (no build system in this project).
            // The library runs the chosen model entirely in-browser using WebGPU.
            const { CreateMLCEngine } = await import('https://esm.run/@mlc-ai/web-llm');
            webllmEngine = await CreateMLCEngine(modelId, {
                initProgressCallback: (p) => setAiStatus(p.text || 'Loading…', p.progress || 0)
            });
            webllmLoadedModel = modelId;
        }

        setAiStatus('Generating flashcards… (pass 1 of 2)', 0.8);

        const systemPrompt =
            'You are a flashcard creation assistant. ' +
            'Output ONLY a valid JSON array of objects, each with exactly two string fields: ' +
            '"front" (the question or term) and "back" (the answer or definition). ' +
            'No extra text, no markdown, no code fences — just the raw JSON array.';

        const userPrompt = notes
            ? `Create ${cardCount} flashcards to study "${topic}" based on the following notes:\n\n${notes}` +
              (notesOnly ? '\n\nIMPORTANT: Only use information found in the notes above. Do not add any facts or details from outside knowledge.' : '')
            : `Create ${cardCount} clear and educational flashcards to study "${topic}".`;

        const response = await webllmEngine.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 2048
        });

        const text = response.choices[0].message.content || '';
        const cards = parseAiCards(text);

        if (!cards || cards.length === 0) {
            console.error('AI raw response (failed to parse):', text);
            throw new Error('Could not parse flashcards from the model response. Try again.');
        }

        // Second pass: review each card for accuracy and correct formatting
        setAiStatus(`Reviewing ${cards.length} cards for accuracy… (pass 2 of 2)`, 0.95);

        const reviewSystemPrompt =
            'You are a flashcard accuracy reviewer. ' +
            'You will be given a JSON array of flashcard objects with "front" and "back" string fields. ' +
            'Review each card for factual accuracy and clarity. Fix any errors or ambiguous wording. ' +
            'Keep the same number of cards. ' +
            'Return ONLY a valid JSON array with the corrected cards. ' +
            'No extra text, no markdown, no code fences — just the raw JSON array.';

        const reviewUserPrompt = (notes && notesOnly)
            ? `Review these ${cards.length} flashcards about "${topic}" for accuracy. ` +
              `Only use information from the notes below — correct any card that contains facts not found in the notes.\n\n` +
              `Notes:\n${notes}\n\nCards to review:\n${JSON.stringify(cards)}`
            : `Review these ${cards.length} flashcards about "${topic}" for factual accuracy and clarity. ` +
              `Fix any errors in the content or formatting.\n\n${JSON.stringify(cards)}`;

        let finalCards = cards;
        try {
            const reviewResponse = await webllmEngine.chat.completions.create({
                messages: [
                    { role: 'system', content: reviewSystemPrompt },
                    { role: 'user', content: reviewUserPrompt }
                ],
                temperature: 0.3,
                max_tokens: 2048
            });

            const reviewText = reviewResponse.choices[0].message.content || '';
            const reviewedCards = parseAiCards(reviewText);

            if (reviewedCards && reviewedCards.length > 0) {
                finalCards = reviewedCards;
            } else {
                console.warn('AI review pass could not be parsed, using original cards:', reviewText);
            }
        } catch (reviewErr) {
            console.warn('AI review pass failed, using original cards:', reviewErr);
        }

        document.getElementById('aiDeckTitleInput').value = topic;
        renderAiPreview(finalCards);

        document.getElementById('aiStatusArea').style.display = 'none';
        document.getElementById('aiSetupPanel').style.display = '';
        document.getElementById('aiPreviewArea').style.display = '';

    } catch (err) {
        console.error('AI deck generation error:', err);
        webllmEngine = null;
        webllmLoadedModel = null;
        document.getElementById('aiStatusArea').style.display = 'none';
        document.getElementById('aiSetupPanel').style.display = '';
        const msg = err.message || '';
        if (msg.toLowerCase().includes('webgpu') || msg.toLowerCase().includes('gpu')) {
            msgEl.textContent = 'WebGPU is required. Please use Chrome or Edge on a desktop device.';
        } else {
            msgEl.textContent = 'Generation failed: ' + (msg.slice(0, 120) || 'Unknown error');
        }
    }
}

function cancelAiGeneration() {
    webllmEngine = null;
    webllmLoadedModel = null;
    document.getElementById('aiStatusArea').style.display = 'none';
    document.getElementById('aiSetupPanel').style.display = '';
}

function setAiStatus(text, progress) {
    document.getElementById('aiStatusText').textContent = text;
    document.getElementById('aiProgressFill').style.width = `${Math.round((progress || 0) * 100)}%`;
}

function parseAiCards(text) {
    const tryParse = (str) => {
        try {
            const data = JSON.parse(str);
            if (Array.isArray(data)) return sanitizeAiCards(data);
            // Handle { cards: [...] } or { flashcards: [...] } wrappers
            const arr = data.cards || data.flashcards || data.deck;
            if (Array.isArray(arr)) return sanitizeAiCards(arr);
        } catch (e) {
            console.warn('AI card JSON parse attempt failed:', e);
        }
        return null;
    };

    let result = tryParse(text.trim());
    if (result) return result;

    // Try extracting a JSON array from surrounding text
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
        result = tryParse(match[0]);
        if (result) return result;
    }

    return null;
}

function sanitizeAiCards(arr) {
    return arr
        .filter(c => c && (typeof c.front === 'string' || typeof c.back === 'string'))
        .map(c => ({
            front: String(c.front || c.question || c.term || '').trim(),
            back: String(c.back || c.answer || c.definition || '').trim()
        }))
        .filter(c => c.front || c.back);
}

function renderAiPreview(cards) {
    const list = document.getElementById('aiCardPreviewList');
    list.innerHTML = cards.map((card, i) => `
        <div class="card-editor-item" data-ai-index="${i}">
            <div class="card-num">Spell ${i + 1}</div>
            <button class="card-editor-remove" onclick="removeAiCard(this)" title="Remove Spell">✕</button>
            <div class="card-fields">
                <textarea class="form-input card-front" placeholder="Front (term)" rows="2">${escapeHtml(card.front)}</textarea>
                <textarea class="form-input card-back" placeholder="Back (definition)" rows="2">${escapeHtml(card.back)}</textarea>
            </div>
        </div>`).join('');
}

function removeAiCard(btn) {
    const list = document.getElementById('aiCardPreviewList');
    const items = list.querySelectorAll('.card-editor-item');
    if (items.length <= 1) return;
    btn.closest('.card-editor-item').remove();
    list.querySelectorAll('.card-editor-item').forEach((item, i) => {
        item.dataset.aiIndex = i;
        item.querySelector('.card-num').textContent = `Spell ${i + 1}`;
    });
}

function getAiPreviewCards() {
    return Array.from(document.querySelectorAll('#aiCardPreviewList .card-editor-item')).map(item => ({
        front: item.querySelector('.card-front').value.trim(),
        back: item.querySelector('.card-back').value.trim()
    })).filter(c => c.front || c.back);
}

function saveAiDeck() {
    const title = (document.getElementById('aiDeckTitleInput').value.trim()) ||
        (document.getElementById('aiTopicInput').value.trim()) || 'AI Generated Spellbook';
    const cards = getAiPreviewCards();

    if (cards.length === 0) {
        showToast('No Spells to save!');
        return;
    }

    const deckId = generateId();
    const decks = loadDecks();
    decks.push({ id: deckId, title, createdAt: Date.now() });
    saveDecks(decks);

    const allCards = loadCards();
    const newCards = cards.map((c, i) => ({
        id: generateId(),
        deckId,
        front: c.front,
        back: c.back,
        frontImage: '',
        backImage: '',
        position: i
    }));
    saveCards(allCards.concat(newCards));

    showToast(`"${title}" saved with ${cards.length} Spells!`);
    renderDeckList();
}

// ===== INIT =====

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMenu();
    renderDeckList();
    checkShareHash();

    // Flashcard flip on click
    document.getElementById('flashcard').addEventListener('click', flipCard);

    // Shuffle toggle: restart study with new order when changed mid-session
    document.getElementById('shuffleToggle').addEventListener('change', () => {
        if (studyState) restartStudy();
    });

    // Backwards Casting toggle: restart study with swapped faces when changed mid-session
    document.getElementById('backwardsToggle').addEventListener('change', () => {
        if (studyState) restartStudy();
    });

    // Keyboard shortcut: space to flip, 1 for know, 2 for still learning, arrows to navigate
    document.addEventListener('keydown', (e) => {
        // Don't intercept keys while the edit card modal is open
        if (document.getElementById('editCardModal').style.display !== 'none') {
            if (e.key === 'Escape') cancelEditCardModal();
            return;
        }
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
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                prevCard();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                nextCard();
            }
        }
    });
});
