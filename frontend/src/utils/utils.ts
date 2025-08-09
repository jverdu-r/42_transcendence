// frontend/src/utils.ts

export function showNotification(message: string, type: string = 'toast', duration: number = 5000) {
  const toast = document.createElement('div');
  toast.className = `notification ${type}`;
  toast.innerHTML = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, duration);
}

export async function checkRankingChange() {
  try {
    const response = await fetch('/auth/profile/stats');
    const data = await response.json();
    const oldRank = localStorage.getItem('userRank');
    const newRank = data.ranking;

    if (oldRank && newRank !== parseInt(oldRank)) {
      const diff = parseInt(oldRank) - newRank;
      const verb = diff > 0 ? 'subido' : 'bajado';
      showNotification(`Has ${verb} ${Math.abs(diff)} posiciones en el ranking. Ahora estás en la posición ${newRank}`, 'snackbar', 6000);
    }

    localStorage.setItem('userRank', newRank.toString());
  } catch (err) {
    console.error('Error al verificar ranking:', err);
  }
}
