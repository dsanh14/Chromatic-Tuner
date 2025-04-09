// Constants for musical notes and frequencies
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
let A4 = 440; // Reference frequency for A4 (now mutable)
const C0 = A4 * Math.pow(2, -4.75); // Frequency of C0

// DOM elements
const startButton = document.getElementById('startButton');
const frequencyDisplay = document.getElementById('frequency');
const noteDisplay = document.getElementById('note');
const centsDisplay = document.getElementById('cents');
const statusDisplay = document.getElementById('status');
const needle = document.querySelector('.needle');

// New feature DOM elements
const calibrationSlider = document.getElementById('calibration');
const calibrationValue = document.getElementById('calibrationValue');
const sensitivitySlider = document.getElementById('sensitivity');
const sensitivityValue = document.getElementById('sensitivityValue');
const metronomeBpmSlider = document.getElementById('metronomeBpm');
const metronomeValue = document.getElementById('metronomeValue');
const metronomeToggle = document.getElementById('metronomeToggle');
const recordToggle = document.getElementById('recordToggle');
const downloadRecording = document.getElementById('downloadRecording');
const spectrumCanvas = document.getElementById('spectrumCanvas');
const noteHistory = document.getElementById('noteHistory');

// Audio context and variables
let audioContext;
let analyser;
let microphone;
let isListening = false;
let animationFrameId;

// New feature variables
let isMetronomeRunning = false;
let metronomeInterval;
let isRecording = false;
let mediaRecorder;
let recordedChunks = [];
let noteHistoryList = [];
const MAX_HISTORY_ITEMS = 10;
let sensitivityThreshold = 0.1;

// Initialize the audio context
async function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        
        // Initialize spectrum analyzer
        initSpectrumAnalyzer();
        
        // Initialize recording
        initRecording(stream);
        
        statusDisplay.textContent = 'Ready to tune';
        startButton.disabled = false;
    } catch (error) {
        statusDisplay.textContent = 'Error accessing microphone: ' + error.message;
        console.error('Error accessing microphone:', error);
    }
}

// Initialize spectrum analyzer
function initSpectrumAnalyzer() {
    const canvasCtx = spectrumCanvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    function drawSpectrum() {
        if (!isListening) return;
        
        requestAnimationFrame(drawSpectrum);
        analyser.getByteFrequencyData(dataArray);
        
        canvasCtx.fillStyle = 'rgb(0, 0, 0)';
        canvasCtx.fillRect(0, 0, spectrumCanvas.width, spectrumCanvas.height);
        
        const barWidth = (spectrumCanvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 2;
            
            canvasCtx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
            canvasCtx.fillRect(x, spectrumCanvas.height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
        }
    }
    
    drawSpectrum();
}

// Initialize recording functionality
function initRecording(stream) {
    mediaRecorder = new MediaRecorder(stream);
    
    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };
    
    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        downloadRecording.href = url;
        downloadRecording.download = 'tuning-session.wav';
        downloadRecording.disabled = false;
    };
}

// Convert frequency to musical note
function frequencyToNote(frequency) {
    if (frequency === 0) return { note: '--', cents: 0 };
    
    const h = Math.round(12 * Math.log2(frequency / C0));
    const octave = Math.floor(h / 12);
    const noteIndex = h % 12;
    const note = NOTES[noteIndex] + octave;
    
    // Calculate cents (how far from the nearest note)
    const idealFrequency = C0 * Math.pow(2, h / 12);
    const cents = 1200 * Math.log2(frequency / idealFrequency);
    
    return { note, cents: Math.round(cents) };
}

// Detect pitch using autocorrelation
function detectPitch(buffer) {
    const sampleRate = audioContext.sampleRate;
    const bufferSize = buffer.length;
    
    // Find the best correlation
    let bestR = -1;
    let bestPeriod = -1;
    
    for (let period = 20; period < bufferSize / 2; period++) {
        let r = 0;
        for (let i = 0; i < bufferSize - period; i++) {
            r += buffer[i] * buffer[i + period];
        }
        
        if (r > bestR) {
            bestR = r;
            bestPeriod = period;
        }
    }
    
    // Adjust threshold based on sensitivity
    const threshold = sensitivityThreshold * (1 - sensitivitySlider.value / 100);
    
    if (bestR > threshold) {
        return sampleRate / bestPeriod;
    }
    return 0;
}

// Process audio and update display
function processAudio() {
    const buffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buffer);
    
    const frequency = detectPitch(buffer);
    const { note, cents } = frequencyToNote(frequency);
    
    // Update display
    frequencyDisplay.textContent = frequency > 0 ? `${frequency.toFixed(1)} Hz` : '-- Hz';
    noteDisplay.textContent = note;
    centsDisplay.textContent = frequency > 0 ? `${cents > 0 ? '+' : ''}${cents}` : '±0';
    
    // Update needle position (-50 to +50 cents)
    const needlePosition = Math.max(-50, Math.min(50, cents));
    needle.style.transform = `translateX(${needlePosition}%)`;
    
    // Update needle color based on tuning
    if (Math.abs(cents) < 5) {
        needle.style.backgroundColor = 'var(--success-color)';
    } else if (Math.abs(cents) < 20) {
        needle.style.backgroundColor = 'var(--warning-color)';
    } else {
        needle.style.backgroundColor = 'var(--error-color)';
    }
    
    // Add to history if a valid note is detected
    if (frequency > 0) {
        addToHistory(note, frequency);
    }
    
    animationFrameId = requestAnimationFrame(processAudio);
}

// Add note to history
function addToHistory(note, frequency) {
    const timestamp = new Date().toLocaleTimeString();
    noteHistoryList.unshift({ note, frequency, timestamp });
    
    if (noteHistoryList.length > MAX_HISTORY_ITEMS) {
        noteHistoryList.pop();
    }
    
    updateHistoryDisplay();
}

// Update history display
function updateHistoryDisplay() {
    noteHistory.innerHTML = noteHistoryList.map(item => `
        <div class="note-history-item">
            <span class="note">${item.note}</span>
            <span class="frequency">${item.frequency.toFixed(1)} Hz</span>
            <span class="timestamp">${item.timestamp}</span>
        </div>
    `).join('');
}

// Toggle metronome
function toggleMetronome() {
    if (!isMetronomeRunning) {
        const bpm = parseInt(metronomeBpmSlider.value);
        const interval = 60000 / bpm; // Convert BPM to milliseconds
        
        metronomeInterval = setInterval(() => {
            // Create a click sound
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.value = 1000;
            gainNode.gain.value = 0.1;
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
        }, interval);
        
        isMetronomeRunning = true;
        metronomeToggle.textContent = 'Stop Metronome';
    } else {
        clearInterval(metronomeInterval);
        isMetronomeRunning = false;
        metronomeToggle.textContent = 'Start Metronome';
    }
}

// Toggle recording
function toggleRecording() {
    if (!isRecording) {
        recordedChunks = [];
        mediaRecorder.start();
        isRecording = true;
        recordToggle.textContent = 'Stop Recording';
        downloadRecording.disabled = true;
    } else {
        mediaRecorder.stop();
        isRecording = false;
        recordToggle.textContent = 'Start Recording';
    }
}

// Update calibration
function updateCalibration() {
    A4 = parseInt(calibrationSlider.value);
    calibrationValue.textContent = `${A4} Hz`;
}

// Update sensitivity
function updateSensitivity() {
    sensitivityValue.textContent = `${sensitivitySlider.value}%`;
}

// Update metronome BPM
function updateMetronomeBpm() {
    metronomeValue.textContent = `${metronomeBpmSlider.value} BPM`;
    if (isMetronomeRunning) {
        clearInterval(metronomeInterval);
        toggleMetronome();
    }
}

// Toggle audio processing
function toggleListening() {
    if (!isListening) {
        isListening = true;
        startButton.textContent = 'Stop Tuning';
        processAudio();
    } else {
        isListening = false;
        startButton.textContent = 'Start Tuning';
        cancelAnimationFrame(animationFrameId);
        
        // Reset display
        frequencyDisplay.textContent = '-- Hz';
        noteDisplay.textContent = '--';
        centsDisplay.textContent = '±0';
        needle.style.transform = 'translateX(-50%)';
        needle.style.backgroundColor = 'var(--primary-color)';
    }
}

// Event listeners
startButton.addEventListener('click', toggleListening);
startButton.disabled = true;

// New feature event listeners
calibrationSlider.addEventListener('input', updateCalibration);
sensitivitySlider.addEventListener('input', updateSensitivity);
metronomeBpmSlider.addEventListener('input', updateMetronomeBpm);
metronomeToggle.addEventListener('click', toggleMetronome);
recordToggle.addEventListener('click', toggleRecording);

// Initialize audio when the page loads
initAudio(); 