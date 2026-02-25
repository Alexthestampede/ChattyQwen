import { api } from './api.js';

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// --- Device Info ---
async function loadDeviceInfo() {
  const el = document.getElementById('device-info');
  try {
    const data = await api.getSettings();
    const d = data.device;
    el.innerHTML = `
      <div class="setting-row"><span class="setting-label">Platform</span><span class="setting-value">${d.platform} ${d.arch}</span></div>
      <div class="setting-row"><span class="setting-label">Python</span><span class="setting-value">${d.python}</span></div>
      <div class="setting-row"><span class="setting-label">PyTorch</span><span class="setting-value">${d.torch}</span></div>
      <div class="setting-row"><span class="setting-label">Device</span><span class="setting-value">${d.device_name}</span></div>
      ${d.vram_gb ? `<div class="setting-row"><span class="setting-label">VRAM</span><span class="setting-value">${d.vram_gb} GB</span></div>` : ''}
    `;
  } catch (e) {
    el.innerHTML = `<div class="setting-row"><span class="setting-label" style="color:var(--error)">Failed to load device info</span></div>`;
  }
}

// --- Models ---
async function loadModels() {
  const el = document.getElementById('models-list');
  try {
    const data = await api.getModels();
    el.innerHTML = '';
    data.models.forEach(m => {
      const item = document.createElement('div');
      item.className = `model-item${m.loaded ? ' loaded' : ''}`;
      item.innerHTML = `
        <div class="model-info">
          <div class="model-name">${m.label}</div>
          <div class="model-meta">${m.repo_id} &middot; ${m.type}</div>
        </div>
        <div>
          ${m.loaded ? '<span class="model-badge">Loaded</span>' : `<button class="btn btn-sm btn-secondary" data-load="${m.key}">Load</button>`}
        </div>
      `;
      el.appendChild(item);
    });

    el.querySelectorAll('[data-load]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const key = btn.dataset.load;
        btn.disabled = true;
        btn.textContent = 'Loading...';
        try {
          await api.selectModel(key);
          showToast('Model loading started', 'success');
          setTimeout(loadModels, 2000);
        } catch (e) {
          showToast(`Failed to load model: ${e.message}`, 'error');
          btn.disabled = false;
          btn.textContent = 'Load';
        }
      });
    });
  } catch (e) {
    el.innerHTML = `<div class="setting-row"><span class="setting-label" style="color:var(--error)">Failed to load models</span></div>`;
  }
}

// --- Updates ---
async function checkUpdates() {
  const statusEl = document.getElementById('update-status');
  const applyBtn = document.getElementById('apply-update-btn');
  const checkBtn = document.getElementById('check-updates-btn');

  checkBtn.disabled = true;
  checkBtn.textContent = 'Checking...';
  statusEl.innerHTML = '<span>Checking for updates...</span>';

  try {
    const data = await api.checkUpdates();
    if (data.error) {
      statusEl.innerHTML = `<span>Could not check: ${data.error}</span>`;
    } else if (data.up_to_date) {
      statusEl.innerHTML = `<span>Up to date (${data.local})</span>`;
      statusEl.className = 'update-status';
      applyBtn.style.display = 'none';
    } else {
      statusEl.className = 'update-status has-update';
      let html = `<span>${data.commits_behind} commit${data.commits_behind > 1 ? 's' : ''} behind (${data.local} → ${data.remote})</span>`;
      if (data.commits && data.commits.length > 0) {
        html += '<ul class="update-commits">' + data.commits.map(c => `<li>${c}</li>`).join('') + '</ul>';
      }
      statusEl.innerHTML = html;
      applyBtn.style.display = '';
    }
  } catch (e) {
    statusEl.innerHTML = `<span style="color:var(--error)">Check failed: ${e.message}</span>`;
  } finally {
    checkBtn.disabled = false;
    checkBtn.textContent = 'Check for Updates';
  }
}

async function applyUpdate() {
  const applyBtn = document.getElementById('apply-update-btn');
  const statusEl = document.getElementById('update-status');

  applyBtn.disabled = true;
  applyBtn.textContent = 'Updating...';

  try {
    const data = await api.applyUpdate();
    if (data.success) {
      statusEl.innerHTML = '<span>Updated successfully. Restart the server to apply changes.</span>';
      statusEl.className = 'update-status';
      applyBtn.style.display = 'none';
      showToast('Update applied. Restart the server.', 'success');
    } else {
      showToast(`Update failed: ${data.error}`, 'error');
    }
  } catch (e) {
    showToast(`Update failed: ${e.message}`, 'error');
  } finally {
    applyBtn.disabled = false;
    applyBtn.textContent = 'Update Now';
  }
}

// --- Init ---
function init() {
  document.getElementById('check-updates-btn').addEventListener('click', checkUpdates);
  document.getElementById('apply-update-btn').addEventListener('click', applyUpdate);

  loadDeviceInfo();
  loadModels();
}

init();
