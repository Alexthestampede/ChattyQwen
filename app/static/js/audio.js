let currentBlob = null;

export function playAudio(blob) {
  currentBlob = blob;
  const player = document.getElementById('audio-player');
  const resultCard = document.getElementById('audio-result');
  const url = URL.createObjectURL(blob);

  player.src = url;
  resultCard.style.display = '';
  player.play();
}

export function downloadAudio() {
  if (!currentBlob) return;
  const url = URL.createObjectURL(currentBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chattyqwen_${Date.now()}.wav`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
