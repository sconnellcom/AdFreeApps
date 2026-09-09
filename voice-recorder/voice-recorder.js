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

const recorderFormats = [
    { mimeType: 'audio/webm;codecs=opus', extension: 'webm', label: 'WebM audio' },
    { mimeType: 'audio/webm', extension: 'webm', label: 'WebM audio' },
    { mimeType: 'audio/mp4', extension: 'm4a', label: 'MP4 audio' },
    { mimeType: 'audio/ogg;codecs=opus', extension: 'ogg', label: 'Ogg audio' }
];

const minimumDurationMs = 250;
let mediaRecorder = null;
let activeStream = null;
let currentChunks = [];
let activeFormat = null;
let recordingStartedAt = 0;
let isStarting = false;
let clipCounter = 0;
const recordings = [];

const elements = {};

function initTheme() {
    const saved = localStorage.getItem('appTheme') || 'default';
    document.body.className = saved !== 'default' ? `theme-${saved}` : '';
    const icon = document.getElementById('themeMenuIcon');
    if (icon) {
        icon.textContent = themeIcons[saved] || '💜';
    }
}

function applyTheme(theme) {
    document.body.className = theme !== 'default' ? `theme-${theme}` : '';
    localStorage.setItem('appTheme', theme);
    const icon = document.getElementById('themeMenuIcon');
    if (icon) {
        icon.textContent = themeIcons[theme] || '💜';
    }
}

function initMenu() {
    const menuBtn = document.getElementById('menuBtn');
    const menuDropdown = document.getElementById('menuDropdown');
    const themeMenuItem = document.getElementById('themeMenuItem');
    const themeSubmenu = document.getElementById('themeSubmenu');

    menuBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        const isVisible = menuDropdown.style.display !== 'none';
        menuDropdown.style.display = isVisible ? 'none' : 'block';
        if (isVisible) {
            themeSubmenu.style.display = 'none';
        }
    });

    themeMenuItem.addEventListener('click', (event) => {
        event.stopPropagation();
        const isVisible = themeSubmenu.style.display !== 'none';
        themeSubmenu.style.display = isVisible ? 'none' : 'grid';
    });

    document.querySelectorAll('.theme-btn').forEach((button) => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            applyTheme(button.dataset.theme);
            themeSubmenu.style.display = 'none';
            menuDropdown.style.display = 'none';
        });
    });

    document.addEventListener('click', () => {
        menuDropdown.style.display = 'none';
        themeSubmenu.style.display = 'none';
    });

    menuDropdown.addEventListener('click', (event) => event.stopPropagation());
}

function getSupportedFormat() {
    if (!window.MediaRecorder) {
        return null;
    }

    if (typeof MediaRecorder.isTypeSupported !== 'function') {
        return recorderFormats[0];
    }

    return recorderFormats.find((format) => MediaRecorder.isTypeSupported(format.mimeType)) || null;
}

function isRecordingSupported() {
    return Boolean(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
}

function cacheElements() {
    elements.recordBtn = document.getElementById('recordBtn');
    elements.stopBtn = document.getElementById('stopBtn');
    elements.statusMessage = document.getElementById('statusMessage');
    elements.statusHelp = document.getElementById('statusHelp');
    elements.stateBadge = document.getElementById('stateBadge');
    elements.recordingVisual = document.getElementById('recordingVisual');
    elements.clipList = document.getElementById('clipList');
    elements.emptyState = document.getElementById('emptyState');
    elements.clipCount = document.getElementById('clipCount');
    elements.formatPill = document.getElementById('formatPill');
}

function setUiState(state) {
    const supported = isRecordingSupported() && activeFormat;
    const isRecording = state === 'recording';
    const isProcessing = state === 'processing';
    const isUnavailable = state === 'unsupported';

    elements.recordBtn.disabled = !supported || isRecording || isProcessing || isStarting || isUnavailable;
    elements.stopBtn.disabled = !isRecording;
    elements.recordingVisual.classList.toggle('active', isRecording);

    const stateLabels = {
        idle: 'Idle',
        ready: 'Ready',
        recording: 'Recording',
        processing: 'Saving',
        unsupported: 'Unavailable'
    };

    elements.stateBadge.textContent = stateLabels[state] || state;
}

function setStatus(message, helpText) {
    elements.statusMessage.textContent = message;
    if (helpText) {
        elements.statusHelp.textContent = helpText;
    }
}

function formatDuration(durationMs) {
    const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${seconds}s`;
}

function formatBytes(bytes) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderRecordings() {
    elements.clipList.innerHTML = '';
    elements.clipCount.textContent = `${recordings.length} clip${recordings.length === 1 ? '' : 's'}`;
    elements.emptyState.style.display = recordings.length ? 'none' : 'block';

    recordings.forEach((recording) => {
        const item = document.createElement('li');
        item.className = 'clip-card';

        const title = document.createElement('h3');
        title.textContent = recording.name;
        item.appendChild(title);

        const meta = document.createElement('div');
        meta.className = 'clip-meta';
        meta.textContent = `${formatDuration(recording.durationMs)} · ${formatBytes(recording.blob.size)} · ${recording.formatLabel}`;
        item.appendChild(meta);

        const audio = document.createElement('audio');
        audio.className = 'clip-audio';
        audio.controls = true;
        audio.preload = 'metadata';
        audio.src = recording.url;
        item.appendChild(audio);

        const actions = document.createElement('div');
        actions.className = 'clip-actions';

        const downloadLink = document.createElement('a');
        downloadLink.className = 'btn btn-primary';
        downloadLink.href = recording.url;
        downloadLink.download = recording.fileName;
        downloadLink.textContent = '⬇ Download';
        downloadLink.setAttribute('aria-label', `Download ${recording.name}`);
        actions.appendChild(downloadLink);

        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn btn-secondary';
        deleteButton.type = 'button';
        deleteButton.textContent = '🗑 Remove';
        deleteButton.setAttribute('aria-label', `Remove ${recording.name}`);
        deleteButton.addEventListener('click', () => removeRecording(recording.id));
        actions.appendChild(deleteButton);

        item.appendChild(actions);
        elements.clipList.appendChild(item);
    });
}

function removeRecording(recordingId) {
    const index = recordings.findIndex((recording) => recording.id === recordingId);
    if (index === -1) {
        return;
    }

    URL.revokeObjectURL(recordings[index].url);
    recordings.splice(index, 1);
    renderRecordings();
    setStatus('Clip removed.', 'You can record another clip at any time.');
    setUiState(recordings.length ? 'ready' : 'idle');
}

function stopActiveStream() {
    if (!activeStream) {
        return;
    }

    activeStream.getTracks().forEach((track) => track.stop());
    activeStream = null;
}

function saveRecording(blob, durationMs, mimeType) {
    clipCounter += 1;
    const extension = activeFormat ? activeFormat.extension : 'webm';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const name = `Recording ${clipCounter}`;
    const recording = {
        id: `recording-${Date.now()}-${clipCounter}`,
        name,
        blob,
        durationMs,
        formatLabel: activeFormat ? activeFormat.label : mimeType || 'Audio',
        fileName: `voice-recording-${timestamp}.${extension}`,
        url: URL.createObjectURL(blob)
    };

    recordings.unshift(recording);
    renderRecordings();
    setStatus(`${name} saved. Playback and download are ready.`, 'You can keep multiple clips in this session and remove any you no longer need.');
    setUiState('ready');
}

function handleStop() {
    const durationMs = Date.now() - recordingStartedAt;
    const mimeType = mediaRecorder && mediaRecorder.mimeType ? mediaRecorder.mimeType : (activeFormat ? activeFormat.mimeType : 'audio/webm');
    const blob = currentChunks.length ? new Blob(currentChunks, { type: mimeType }) : null;

    stopActiveStream();
    mediaRecorder = null;
    currentChunks = [];

    if (!blob || blob.size === 0 || durationMs < minimumDurationMs) {
        setStatus('Recording was too short to save.', 'Hold Record a little longer, then press Stop to create a clip.');
        setUiState(recordings.length ? 'ready' : 'idle');
        return;
    }

    saveRecording(blob, durationMs, mimeType);
}

function describeGetUserMediaError(error) {
    if (!error) {
        return {
            message: 'Unable to access the microphone.',
            help: 'Check your browser permissions and try again.'
        };
    }

    switch (error.name) {
        case 'NotAllowedError':
        case 'SecurityError':
            return {
                message: 'Microphone permission was denied.',
                help: 'Allow microphone access in your browser settings, then try recording again.'
            };
        case 'NotFoundError':
        case 'DevicesNotFoundError':
            return {
                message: 'No microphone was found.',
                help: 'Connect a microphone or switch to a device with audio input support.'
            };
        case 'NotReadableError':
        case 'TrackStartError':
            return {
                message: 'The microphone is busy or unavailable.',
                help: 'Close other apps using the microphone and try again.'
            };
        case 'AbortError':
            return {
                message: 'Recording could not start.',
                help: 'Please try again. If it keeps happening, refresh the page or restart the browser.'
            };
        default:
            return {
                message: 'Unable to access the microphone.',
                help: error.message || 'Check browser support, HTTPS, and microphone permissions.'
            };
    }
}

async function checkMicrophoneAvailability() {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.enumerateDevices !== 'function') {
        return;
    }

    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasAudioInput = devices.some((device) => device.kind === 'audioinput');
        if (!hasAudioInput) {
            setStatus('No microphone was detected on this device.', 'Connect a microphone to start recording.');
            setUiState('unsupported');
        }
    } catch (error) {
        // Ignore enumeration errors and let getUserMedia provide the final result.
    }
}

async function startRecording() {
    if (!isRecordingSupported() || !activeFormat || isStarting) {
        setStatus('This browser cannot record audio here.', 'Use a modern browser with MediaRecorder support over HTTPS or localhost.');
        setUiState('unsupported');
        return;
    }

    isStarting = true;
    setStatus('Requesting microphone access…', 'Approve the browser permission prompt to begin recording.');
    setUiState('processing');

    try {
        activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const tracks = activeStream.getAudioTracks();
        if (!tracks.length) {
            throw new DOMException('No microphone track found.', 'NotFoundError');
        }

        currentChunks = [];
        recordingStartedAt = Date.now();

        try {
            mediaRecorder = new MediaRecorder(activeStream, { mimeType: activeFormat.mimeType });
        } catch (error) {
            mediaRecorder = new MediaRecorder(activeStream);
        }

        mediaRecorder.addEventListener('dataavailable', (event) => {
            if (event.data && event.data.size > 0) {
                currentChunks.push(event.data);
            }
        });

        mediaRecorder.addEventListener('stop', handleStop, { once: true });
        mediaRecorder.addEventListener('error', (event) => {
            stopActiveStream();
            mediaRecorder = null;
            currentChunks = [];
            const details = describeGetUserMediaError(event.error || new Error('Recording failed.'));
            setStatus(details.message, details.help);
            setUiState(recordings.length ? 'ready' : 'idle');
        }, { once: true });

        mediaRecorder.start();
        setStatus('Recording in progress… Press Stop when you are finished.', 'Your clip will be saved locally in this browser session.');
        setUiState('recording');
    } catch (error) {
        stopActiveStream();
        mediaRecorder = null;
        currentChunks = [];
        const details = describeGetUserMediaError(error);
        setStatus(details.message, details.help);
        setUiState(recordings.length ? 'ready' : 'idle');
    } finally {
        isStarting = false;
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            elements.recordBtn.disabled = true;
        }
    }
}

function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state !== 'recording') {
        return;
    }

    setStatus('Finishing your recording…', 'Saving the captured audio clip now.');
    setUiState('processing');
    mediaRecorder.stop();
}

function initializeRecorder() {
    cacheElements();
    activeFormat = getSupportedFormat();

    if (!window.isSecureContext) {
        setStatus('Recording needs a secure page.', 'Open this app on HTTPS or localhost so the browser can safely access your microphone.');
        setUiState('unsupported');
        elements.formatPill.textContent = 'Recording unavailable';
    } else if (!isRecordingSupported() || !activeFormat) {
        setStatus('This browser does not support voice recording here.', 'Try a recent version of Chrome, Edge, Firefox, or Safari with microphone access enabled.');
        setUiState('unsupported');
        elements.formatPill.textContent = 'Recording unavailable';
    } else {
        setStatus('Ready to record. Press Record to begin.', 'Your clips stay in your browser until you download or remove them.');
        setUiState('idle');
        elements.formatPill.textContent = `Downloads save as ${activeFormat.label}`;
        checkMicrophoneAvailability();
    }

    renderRecordings();
    elements.recordBtn.addEventListener('click', startRecording);
    elements.stopBtn.addEventListener('click', stopRecording);

    window.addEventListener('beforeunload', () => {
        stopActiveStream();
        recordings.forEach((recording) => URL.revokeObjectURL(recording.url));
    });
}

initTheme();
initMenu();
initializeRecorder();
