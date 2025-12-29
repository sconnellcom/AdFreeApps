// Morse Code Dictionary
const morseCode = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
    'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
    'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
    'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..', '0': '-----', '1': '.----', '2': '..---',
    '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...',
    '8': '---..', '9': '----.', '.': '.-.-.-', ',': '--..--', '?': '..--..',
    "'": '.----.', '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-',
    '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-', '+': '.-.-.',
    '-': '-....-', '_': '..--.-', '"': '.-..-.', '$': '...-..-', '@': '.--.-.',
    ' ': '/'
};

// Reverse lookup for morse to text
const reverseMorseCode = Object.fromEntries(
    Object.entries(morseCode).map(([k, v]) => [v, k])
);

// Theme Management
function initializeTheme() {
    const themeBtnActive = document.querySelector('.theme-btn-active');
    const themeDropdown = document.querySelector('.theme-dropdown');
    const themeButtons = document.querySelectorAll('.theme-btn');

    // Load saved theme
    const savedTheme = localStorage.getItem('appTheme') || 'default';
    if (savedTheme !== 'default') {
        document.body.classList.add(`theme-${savedTheme}`);
        themeBtnActive.className = `theme-btn-active theme-${savedTheme}`;
    }

    themeBtnActive.addEventListener('click', (e) => {
        e.stopPropagation();
        themeDropdown.style.display = themeDropdown.style.display === 'grid' ? 'none' : 'grid';
    });

    themeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const theme = btn.dataset.theme;

            // Remove all theme classes
            document.body.className = '';
            themeBtnActive.className = 'theme-btn-active';

            // Apply new theme
            if (theme !== 'default') {
                document.body.classList.add(`theme-${theme}`);
            }
            themeBtnActive.classList.add(`theme-${theme}`);

            // Save theme
            localStorage.setItem('appTheme', theme);
            themeDropdown.style.display = 'none';
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!themeBtnActive.contains(e.target) && !themeDropdown.contains(e.target)) {
            themeDropdown.style.display = 'none';
        }
    });
}

// Tab Management
function initializeTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

// Text to Morse Converter
function textToMorse(text) {
    return text.toUpperCase().split('').map(char => {
        return morseCode[char] || char;
    }).join(' ');
}

// Morse to Text Converter
function morseToText(morse) {
    // Clean up input - replace multiple spaces with single space
    const cleaned = morse.trim().replace(/\s+/g, ' ');
    
    return cleaned.split(' ').map(code => {
        if (code === '/') return ' ';
        return reverseMorseCode[code] || '?';
    }).join('');
}

// Initialize Converter
function initializeConverter() {
    const convertBtn = document.getElementById('convertBtn');
    const decodeBtn = document.getElementById('decodeBtn');
    const textInput = document.getElementById('textInput');
    const morseInput = document.getElementById('morseInput');
    const morseOutput = document.getElementById('morseOutput');
    const textOutput = document.getElementById('textOutput');

    convertBtn.addEventListener('click', () => {
        const text = textInput.value;
        if (text.trim()) {
            const morse = textToMorse(text);
            morseOutput.textContent = morse;
        } else {
            morseOutput.textContent = 'Please enter some text to convert.';
        }
    });

    decodeBtn.addEventListener('click', () => {
        const morse = morseInput.value;
        if (morse.trim()) {
            const text = morseToText(morse);
            textOutput.textContent = text;
        } else {
            textOutput.textContent = 'Please enter morse code to decode.';
        }
    });
}

// Initialize Cheat Sheet
function initializeCheatSheet() {
    const grid = document.getElementById('cheatSheetGrid');
    
    Object.entries(morseCode).forEach(([char, morse]) => {
        if (char !== ' ') {
            const item = document.createElement('div');
            item.className = 'cheat-item';
            item.innerHTML = `
                <div class="cheat-char">${char}</div>
                <div class="cheat-morse">${morse}</div>
            `;
            grid.appendChild(item);
        }
    });
}

// Morse Player with Flashlight
let isPlaying = false;
let playTimeout = null;
let activeFlashTrack = null;
let activeFlashStream = null;

async function getFlashlight() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                facingMode: 'environment',
                advanced: [{ torch: true }]
            }
        });
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        
        if (!capabilities.torch) {
            // Clean up if torch not supported
            stream.getTracks().forEach(t => t.stop());
            throw new Error('Flashlight not supported on this device');
        }
        
        return { track, stream };
    } catch (error) {
        throw new Error('Unable to access flashlight: ' + error.message);
    }
}

async function setFlashlight(track, on) {
    try {
        await track.applyConstraints({
            advanced: [{ torch: on }]
        });
    } catch (error) {
        console.error('Error setting flashlight:', error);
    }
}

function initializePlayer() {
    const playBtn = document.getElementById('playBtn');
    const stopBtn = document.getElementById('stopBtn');
    const textInput = document.getElementById('textInput');
    const wpmSlider = document.getElementById('wpmSlider');
    const wpmValue = document.getElementById('wpmValue');
    const flashIndicator = document.getElementById('flashIndicator');
    const playerStatus = document.getElementById('playerStatus');

    wpmSlider.addEventListener('input', () => {
        wpmValue.textContent = wpmSlider.value;
    });

    playBtn.addEventListener('click', async () => {
        const text = textInput.value.trim();
        if (!text) {
            playerStatus.textContent = 'Please enter text in the text input field to flash.';
            return;
        }

        const morse = textToMorse(text);
        const wpm = parseInt(wpmSlider.value, 10);
        
        // Calculate timing (standard is PARIS method: 50 units per word)
        const unitTime = 1200 / wpm; // milliseconds per unit
        const dotTime = unitTime;
        const dashTime = unitTime * 3;
        const symbolGap = unitTime;
        const letterGap = unitTime * 3;
        const wordGap = unitTime * 7;

        isPlaying = true;
        playBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        playerStatus.textContent = 'Playing...';

        let useFlashlight = false;

        // Try to get flashlight
        try {
            const result = await getFlashlight();
            activeFlashTrack = result.track;
            activeFlashStream = result.stream;
            useFlashlight = true;
            playerStatus.textContent = 'Playing with flashlight...';
        } catch (error) {
            playerStatus.textContent = 'Playing (flashlight not available, using indicator)...';
            console.log('Flashlight not available:', error.message);
        }

        async function flash(duration) {
            if (!isPlaying) return;
            
            flashIndicator.classList.add('flashing');
            if (useFlashlight && activeFlashTrack) {
                await setFlashlight(activeFlashTrack, true);
            }
            
            await new Promise(resolve => {
                playTimeout = setTimeout(resolve, duration);
            });
            
            flashIndicator.classList.remove('flashing');
            if (useFlashlight && activeFlashTrack) {
                await setFlashlight(activeFlashTrack, false);
            }
        }

        async function gap(duration) {
            if (!isPlaying) return;
            await new Promise(resolve => {
                playTimeout = setTimeout(resolve, duration);
            });
        }

        try {
            const symbols = morse.split('');
            
            for (let i = 0; i < symbols.length && isPlaying; i++) {
                const symbol = symbols[i];
                
                if (symbol === '.') {
                    await flash(dotTime);
                    await gap(symbolGap);
                } else if (symbol === '-') {
                    await flash(dashTime);
                    await gap(symbolGap);
                } else if (symbol === ' ') {
                    await gap(letterGap);
                } else if (symbol === '/') {
                    await gap(wordGap);
                }
            }

            playerStatus.textContent = 'Playback complete!';
        } catch (error) {
            playerStatus.textContent = 'Error during playback: ' + error.message;
        } finally {
            if (activeFlashTrack) {
                await setFlashlight(activeFlashTrack, false);
                activeFlashTrack.stop();
                activeFlashTrack = null;
            }
            if (activeFlashStream) {
                activeFlashStream.getTracks().forEach(track => track.stop());
                activeFlashStream = null;
            }
            isPlaying = false;
            playBtn.style.display = 'inline-block';
            stopBtn.style.display = 'none';
        }
    });

    stopBtn.addEventListener('click', async () => {
        isPlaying = false;
        if (playTimeout) {
            clearTimeout(playTimeout);
            playTimeout = null;
        }
        if (activeFlashTrack) {
            await setFlashlight(activeFlashTrack, false);
            activeFlashTrack.stop();
            activeFlashTrack = null;
        }
        if (activeFlashStream) {
            activeFlashStream.getTracks().forEach(track => track.stop());
            activeFlashStream = null;
        }
        flashIndicator.classList.remove('flashing');
        playerStatus.textContent = 'Playback stopped.';
    });
}

// Morse Reader using Camera
let readerStream = null;
let readerAnimationFrame = null;
let detectedMorse = [];
let lastBrightness = 0;
let flashDetected = false;
let lastFlashTime = 0;
let availableCameras = [];
let selectedCameraId = null;
let currentZoom = 1.0;

// Tap input state
let tapStartTime = 0;
let isTapping = false;
let tapMorse = [];
let lastTapTime = 0;
const TAP_THRESHOLD = 200; // ms - tap vs hold threshold
const LETTER_GAP_TAP = 500; // ms - gap for letter separation
const WORD_GAP_TAP = 1500; // ms - gap for word separation

function initializeReader() {
    const startBtn = document.getElementById('startReaderBtn');
    const stopBtn = document.getElementById('stopReaderBtn');
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    const readerOutput = document.getElementById('readerOutput');
    const morseDisplay = document.getElementById('morseDisplay');
    const readerStatus = document.getElementById('readerStatus');
    const ctx = canvas.getContext('2d');
    const cameraSelect = document.getElementById('cameraSelect');
    const zoomSlider = document.getElementById('zoomSlider');
    const zoomValue = document.getElementById('zoomValue');

    // Enumerate cameras
    async function enumerateCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            availableCameras = devices.filter(device => device.kind === 'videoinput');
            
            cameraSelect.innerHTML = '<option value="">Select Camera...</option>';
            availableCameras.forEach((camera, index) => {
                const option = document.createElement('option');
                option.value = camera.deviceId;
                option.textContent = camera.label || `Camera ${index + 1}`;
                cameraSelect.appendChild(option);
            });

            // Select first camera by default
            if (availableCameras.length > 0) {
                selectedCameraId = availableCameras[0].deviceId;
                cameraSelect.value = selectedCameraId;
            }
        } catch (error) {
            console.error('Error enumerating cameras:', error);
            readerStatus.textContent = 'Error listing cameras: ' + error.message;
        }
    }

    // Initialize camera list
    enumerateCameras();

    cameraSelect.addEventListener('change', (e) => {
        selectedCameraId = e.target.value;
        // Restart camera if it's already running
        if (readerStream) {
            stopCamera();
            startCamera();
        }
    });

    zoomSlider.addEventListener('input', () => {
        currentZoom = parseFloat(zoomSlider.value);
        zoomValue.textContent = currentZoom.toFixed(1) + 'x';
    });

    // Mode switching
    const radioButtons = document.querySelectorAll('input[name="readerMode"]');
    const cameraMode = document.getElementById('cameraMode');
    const tapMode = document.getElementById('tapMode');
    const tapButton = document.getElementById('tapButton');
    const clearTapBtn = document.getElementById('clearTapBtn');

    radioButtons.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'camera') {
                cameraMode.style.display = 'block';
                tapMode.style.display = 'none';
                // Stop camera if running
                stopCamera();
                // Reset tap state
                resetTapState();
            } else {
                cameraMode.style.display = 'none';
                tapMode.style.display = 'block';
                // Stop camera if running
                stopCamera();
                // Reset tap state
                resetTapState();
            }
        });
    });

    function resetTapState() {
        tapMorse = [];
        lastTapTime = 0;
        updateDisplay();
    }

    function updateDisplay() {
        const morseString = tapMorse.join('');
        morseDisplay.textContent = morseString || 'Waiting for input...';
        const text = morseToText(morseString);
        readerOutput.textContent = text || 'Waiting for input...';
    }

    // Tap button handlers
    let tapCheckInterval = null;
    
    function startTap() {
        if (isTapping) return;
        isTapping = true;
        tapStartTime = Date.now();
        tapButton.classList.add('active');
        
        // Check for letter and word gaps
        if (tapCheckInterval) clearInterval(tapCheckInterval);
    }

    function endTap() {
        if (!isTapping) return;
        isTapping = false;
        const tapDuration = Date.now() - tapStartTime;
        tapButton.classList.remove('active');
        
        // Determine if dot or dash
        if (tapDuration < TAP_THRESHOLD) {
            tapMorse.push('.');
        } else {
            tapMorse.push('-');
        }
        
        lastTapTime = Date.now();
        updateDisplay();
        
        // Start checking for gaps
        tapCheckInterval = setInterval(checkForGaps, 100);
    }

    function checkForGaps() {
        if (tapMorse.length === 0 || isTapping) return;
        
        const now = Date.now();
        const timeSinceTap = now - lastTapTime;
        const lastSymbol = tapMorse[tapMorse.length - 1];
        
        if (timeSinceTap > WORD_GAP_TAP && lastSymbol !== '/') {
            tapMorse.push('/');
            updateDisplay();
        } else if (timeSinceTap > LETTER_GAP_TAP && lastSymbol !== ' ' && lastSymbol !== '/') {
            tapMorse.push(' ');
            updateDisplay();
        }
    }

    // Mouse/touch events for tap button
    tapButton.addEventListener('mousedown', startTap);
    tapButton.addEventListener('mouseup', endTap);
    tapButton.addEventListener('mouseleave', () => {
        if (isTapping) endTap();
    });
    
    tapButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startTap();
    });
    tapButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        endTap();
    });
    tapButton.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        if (isTapping) endTap();
    });

    clearTapBtn.addEventListener('click', () => {
        resetTapState();
        readerStatus.textContent = 'Input cleared.';
        if (tapCheckInterval) {
            clearInterval(tapCheckInterval);
            tapCheckInterval = null;
        }
    });

    // Camera mode
    const BRIGHTNESS_THRESHOLD = 30; // Adjust based on testing
    const FLASH_COOLDOWN = 100; // ms between flashes
    const DOT_TIME = 200; // ms
    const DASH_TIME = 600; // ms
    const LETTER_GAP = 300; // ms
    const WORD_GAP = 700; // ms
    const DOT_DASH_TOLERANCE = 100; // ms tolerance for dot/dash detection

    function stopCamera() {
        if (readerStream) {
            readerStream.getTracks().forEach(track => track.stop());
            readerStream = null;
        }
        if (readerAnimationFrame) {
            cancelAnimationFrame(readerAnimationFrame);
            readerAnimationFrame = null;
        }
        video.srcObject = null;
        startBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
        detectedMorse = [];
    }

    async function startCamera() {
        try {
            const constraints = {
                video: selectedCameraId ? 
                    { deviceId: { exact: selectedCameraId } } : 
                    { facingMode: 'user' }
            };
            
            readerStream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = readerStream;
            
            startBtn.style.display = 'none';
            stopBtn.style.display = 'inline-block';
            readerStatus.textContent = 'Camera active. Show flashes to the camera!';
            morseDisplay.textContent = '';
            readerOutput.textContent = '';
            detectedMorse = [];

            video.addEventListener('loadedmetadata', () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                detectFlashes();
            });
        } catch (error) {
            readerStatus.textContent = 'Error accessing camera: ' + error.message;
        }
    }

    startBtn.addEventListener('click', startCamera);

    stopBtn.addEventListener('click', () => {
        stopCamera();
        readerStatus.textContent = 'Camera stopped.';
    });

    let flashStartTime = 0;
    let lastSymbolTime = 0;

    function detectFlashes() {
        if (!readerStream) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Calculate the region to sample based on zoom
        // Higher zoom = smaller center region
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const sampleWidth = canvas.width / currentZoom;
        const sampleHeight = canvas.height / currentZoom;
        const sampleX = centerX - sampleWidth / 2;
        const sampleY = centerY - sampleHeight / 2;
        
        const imageData = ctx.getImageData(
            Math.max(0, sampleX), 
            Math.max(0, sampleY), 
            Math.min(canvas.width, sampleWidth), 
            Math.min(canvas.height, sampleHeight)
        );
        const data = imageData.data;

        // Calculate average brightness (sample every 4th pixel for performance)
        let totalBrightness = 0;
        let sampleCount = 0;
        for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel (4 pixels * 4 bytes)
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            totalBrightness += avg;
            sampleCount++;
        }
        const avgBrightness = sampleCount > 0 ? totalBrightness / sampleCount : 0;

        const now = Date.now();
        const brightnessDiff = avgBrightness - lastBrightness;

        // Detect flash start
        if (brightnessDiff > BRIGHTNESS_THRESHOLD && !flashDetected && 
            (now - lastFlashTime) > FLASH_COOLDOWN) {
            flashDetected = true;
            flashStartTime = now;
            lastFlashTime = now;
        }

        // Detect flash end
        if (flashDetected && brightnessDiff < -BRIGHTNESS_THRESHOLD) {
            flashDetected = false;
            const flashDuration = now - flashStartTime;
            
            // Determine if dot or dash
            if (flashDuration < DOT_TIME + DOT_DASH_TOLERANCE) {
                detectedMorse.push('.');
            } else {
                detectedMorse.push('-');
            }
            
            lastSymbolTime = now;
            updateCameraDetectedText();
        }

        // Detect gaps between letters and words
        if (detectedMorse.length > 0 && !flashDetected) {
            const timeSinceLastSymbol = now - lastSymbolTime;
            
            if (timeSinceLastSymbol > WORD_GAP && detectedMorse[detectedMorse.length - 1] !== '/') {
                detectedMorse.push('/');
                lastSymbolTime = now;
                updateCameraDetectedText();
            } else if (timeSinceLastSymbol > LETTER_GAP && detectedMorse[detectedMorse.length - 1] !== ' ' && detectedMorse[detectedMorse.length - 1] !== '/') {
                detectedMorse.push(' ');
                lastSymbolTime = now;
                updateCameraDetectedText();
            }
        }

        lastBrightness = avgBrightness;
        readerAnimationFrame = requestAnimationFrame(detectFlashes);
    }

    function updateCameraDetectedText() {
        const morseString = detectedMorse.join('');
        const text = morseToText(morseString);
        morseDisplay.textContent = morseString || 'Waiting for flashes...';
        readerOutput.textContent = text || 'Waiting for flashes...';
        readerStatus.textContent = `Detected morse: ${morseString}`;
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeTabs();
    initializeConverter();
    initializeCheatSheet();
    initializePlayer();
    initializeReader();
});
