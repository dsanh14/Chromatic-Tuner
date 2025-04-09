// Constants for musical notes and frequencies
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const A4 = 440; // Reference frequency for A4
const C0 = A4 * Math.pow(2, -4.75); // Frequency of C0

// DOM elements
const startButton = document.getElementById('startButton');
const frequencyDisplay = document.getElementById('frequency');
const noteDisplay = document.getElementById('note');
const centsDisplay = document.getElementById('cents');
const statusDisplay = document.getElementById('status');
const needle = document.querySelector('.needle');

// Audio context and variables
let audioContext;
let analyser;
let microphone;
let isListening = false;
let animationFrameId;

// Initialize the audio context
async function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        
        statusDisplay.textContent = 'Ready to tune';
        startButton.disabled = false;
    } catch (error) {
        statusDisplay.textContent = 'Error accessing microphone: ' + error.message;
        console.error('Error accessing microphone:', error);
    }
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
    
    if (bestR > 0.1) { // Threshold for valid pitch
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
    
    animationFrameId = requestAnimationFrame(processAudio);
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

// Initialize audio when the page loads
initAudio(); 