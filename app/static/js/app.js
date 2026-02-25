import { api } from './api.js';
import { playAudio, downloadAudio } from './audio.js';

let currentMode = 'custom_voice';
let models = [];

// --- Recording state ---
let mediaRecorder = null;
let recordingChunks = [];
let recordedBlob = null;
let recordingStream = null;
let recordingTimerInterval = null;
let recordingStartTime = 0;

// --- Toast ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// --- Models ---
async function loadModels() {
  try {
    const data = await api.getModels();
    models = data.models;
    renderModelSelect(data.loaded);
  } catch (e) {
    showToast('Failed to load models', 'error');
  }
}

function renderModelSelect(loaded) {
  const sel = document.getElementById('model-select');
  sel.innerHTML = '';

  const compatibleModels = models.filter(m => {
    if (currentMode === 'custom_voice') return m.type === 'custom_voice';
    if (currentMode === 'voice_clone') return m.type === 'base';
    if (currentMode === 'voice_design') return m.type === 'voice_design';
    return true;
  });

  if (compatibleModels.length === 0) {
    sel.innerHTML = '<option value="">No compatible models</option>';
    return;
  }

  compatibleModels.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.key;
    opt.textContent = m.label + (m.loaded ? ' (loaded)' : '');
    if (m.loaded) opt.selected = true;
    sel.appendChild(opt);
  });

  // If none loaded, select first
  if (!sel.value) {
    sel.selectedIndex = 0;
  }
}

// --- Speakers ---
async function loadSpeakers() {
  const modelKey = document.getElementById('model-select').value;
  const speakerSel = document.getElementById('speaker-select');

  if (currentMode !== 'custom_voice' || !modelKey) {
    speakerSel.innerHTML = '<option value="">N/A</option>';
    return;
  }

  try {
    const data = await api.getSpeakers(modelKey);
    speakerSel.innerHTML = '';
    if (data.speakers.length === 0) {
      speakerSel.innerHTML = '<option value="">No speakers available</option>';
      return;
    }
    data.speakers.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s.charAt(0).toUpperCase() + s.slice(1);
      speakerSel.appendChild(opt);
    });
  } catch (e) {
    speakerSel.innerHTML = '<option value="">Failed to load</option>';
  }
}

// --- Mode switching ---
function switchMode(mode) {
  currentMode = mode;

  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.mode === mode);
  });

  document.getElementById('custom-voice-controls').style.display = mode === 'custom_voice' ? '' : 'none';
  document.getElementById('voice-clone-controls').style.display = mode === 'voice_clone' ? '' : 'none';
  document.getElementById('voice-design-controls').style.display = mode === 'voice_design' ? '' : 'none';

  renderModelSelect(models.find(m => m.loaded)?.key);
  if (mode === 'custom_voice') loadSpeakers();
}

// --- Recording ---
function formatTimer(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

async function startRecording() {
  try {
    recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    showToast('Microphone access denied', 'error');
    return;
  }

  recordingChunks = [];
  recordedBlob = null;

  mediaRecorder = new MediaRecorder(recordingStream);
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordingChunks.push(e.data);
  };
  mediaRecorder.onstop = () => {
    recordedBlob = new Blob(recordingChunks, { type: mediaRecorder.mimeType });
    recordingStream.getTracks().forEach(t => t.stop());
    recordingStream = null;

    // Show preview
    const preview = document.getElementById('recording-preview');
    const playback = document.getElementById('recording-playback');
    playback.src = URL.createObjectURL(recordedBlob);
    preview.style.display = '';
  };

  mediaRecorder.start();
  recordingStartTime = Date.now();

  // UI updates
  const btn = document.getElementById('record-btn');
  btn.classList.add('recording');
  btn.querySelector('.record-icon-mic').style.display = 'none';
  btn.querySelector('.record-icon-stop').style.display = '';

  const status = document.getElementById('recording-status');
  status.querySelector('.recording-label').textContent = 'Recording';
  const timer = document.getElementById('recording-timer');
  timer.textContent = '00:00';
  recordingTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    timer.textContent = formatTimer(elapsed);
  }, 1000);

  // Hide preview from previous recording
  document.getElementById('recording-preview').style.display = 'none';
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
  clearInterval(recordingTimerInterval);

  const btn = document.getElementById('record-btn');
  btn.classList.remove('recording');
  btn.querySelector('.record-icon-mic').style.display = '';
  btn.querySelector('.record-icon-stop').style.display = 'none';

  const status = document.getElementById('recording-status');
  status.querySelector('.recording-label').textContent = 'Ready to record';
  document.getElementById('recording-timer').textContent = '';
}

function discardRecording() {
  recordedBlob = null;
  recordingChunks = [];
  document.getElementById('recording-preview').style.display = 'none';
  const playback = document.getElementById('recording-playback');
  if (playback.src) {
    URL.revokeObjectURL(playback.src);
    playback.removeAttribute('src');
  }
}

function switchRefSource(source) {
  document.querySelectorAll('.ref-source-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.source === source);
  });
  document.getElementById('ref-upload-container').style.display = source === 'upload' ? '' : 'none';
  document.getElementById('ref-record-container').style.display = source === 'record' ? '' : 'none';
}

// --- Generate ---
async function generate() {
  const btn = document.getElementById('generate-btn');
  const btnText = btn.querySelector('.btn-text');
  const btnLoading = btn.querySelector('.btn-loading');
  const errorDisplay = document.getElementById('error-display');
  const errorMessage = document.getElementById('error-message');

  const text = document.getElementById('text-input').value.trim();
  if (!text) {
    showToast('Please enter text to speak', 'error');
    return;
  }

  const modelKey = document.getElementById('model-select').value;
  if (!modelKey) {
    showToast('Please select a model', 'error');
    return;
  }

  btn.disabled = true;
  btnText.style.display = 'none';
  btnLoading.style.display = '';
  errorDisplay.style.display = 'none';

  try {
    const fd = new FormData();
    fd.append('mode', currentMode);
    fd.append('text', text);
    fd.append('language', document.getElementById('language-select').value);
    fd.append('model_key', modelKey);

    if (currentMode === 'custom_voice') {
      fd.append('speaker', document.getElementById('speaker-select').value);
      fd.append('instruct', document.getElementById('instruct-input').value);
    } else if (currentMode === 'voice_clone') {
      const fileInput = document.getElementById('ref-audio-input');
      if (fileInput.files.length > 0) {
        fd.append('ref_audio', fileInput.files[0]);
      } else if (recordedBlob) {
        fd.append('ref_audio', recordedBlob, 'recording.webm');
      }
      fd.append('ref_text', document.getElementById('ref-text-input').value);
    } else if (currentMode === 'voice_design') {
      fd.append('instruct', document.getElementById('design-instruct-input').value);
    }

    const blob = await api.generate(fd);
    playAudio(blob);
    showToast('Audio generated successfully', 'success');
  } catch (e) {
    errorMessage.textContent = e.message;
    errorDisplay.style.display = '';
    showToast('Generation failed', 'error');
  } finally {
    btn.disabled = false;
    btnText.style.display = '';
    btnLoading.style.display = 'none';
  }
}

// --- Init ---
function init() {
  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchMode(tab.dataset.mode));
  });

  // Generate
  document.getElementById('generate-btn').addEventListener('click', generate);

  // Download
  document.getElementById('download-btn').addEventListener('click', downloadAudio);

  // Model change
  document.getElementById('model-select').addEventListener('change', () => {
    if (currentMode === 'custom_voice') loadSpeakers();
  });

  // Show HTTPS warning if not in a secure context
  if (!window.isSecureContext) {
    document.getElementById('mic-https-warning').style.display = '';
  }

  // Ref source toggle (Upload / Record)
  document.querySelectorAll('.ref-source-btn').forEach(btn => {
    btn.addEventListener('click', () => switchRefSource(btn.dataset.source));
  });

  // Record button
  document.getElementById('record-btn').addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      stopRecording();
    } else {
      startRecording();
    }
  });

  // Discard recording
  document.getElementById('discard-recording-btn').addEventListener('click', discardRecording);

  // File upload display
  document.getElementById('ref-audio-input').addEventListener('change', (e) => {
    const nameEl = document.getElementById('ref-audio-name');
    const zone = document.getElementById('file-upload-zone');
    if (e.target.files.length > 0) {
      nameEl.textContent = e.target.files[0].name;
      zone.classList.add('has-file');
    } else {
      nameEl.textContent = '';
      zone.classList.remove('has-file');
    }
  });

  // Load data
  loadModels().then(() => {
    if (currentMode === 'custom_voice') loadSpeakers();
  });

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

init();
