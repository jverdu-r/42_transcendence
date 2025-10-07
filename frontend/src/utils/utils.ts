// frontend/src/utils.ts

import { getTranslation } from '../i18n';

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
      const verb = diff > 0 ? getTranslation('utils', 'risen') : getTranslation('utils', 'dropped');
      showNotification(`${getTranslation('utils', 'youHave')} ${verb} ${Math.abs(diff)} ${getTranslation('utils', 'positionsInRanking')}. ${getTranslation('utils', 'nowYouAreAt')} ${newRank}`, 'snackbar', 6000);
    }

    localStorage.setItem('userRank', newRank.toString());
  } catch (err) {
    console.error(getTranslation('utils', 'errorCheckingRanking'), err);
  }
}
