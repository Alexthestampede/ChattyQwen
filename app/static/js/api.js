const BASE = '';

async function request(url, options = {}) {
  const res = await fetch(BASE + url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Models
  getModels: () => request('/api/models'),
  selectModel: (model_key) => request('/api/models/select', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model_key }),
  }),
  downloadModel: (model_key) => request('/api/models/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model_key }),
  }),
  unloadModel: () => request('/api/models/unload', { method: 'POST' }),

  // TTS
  generate: async (formData) => {
    const res = await fetch(BASE + '/api/tts/generate', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    return res.blob();
  },
  getSpeakers: (model_key) => request(`/api/tts/speakers?model_key=${encodeURIComponent(model_key)}`),

  // Settings
  getSettings: () => request('/api/settings'),
  checkUpdates: () => request('/api/settings/updates/check'),
  applyUpdate: () => request('/api/settings/updates/apply', { method: 'POST' }),
};
