const toggle = document.getElementById('toggle');
const status = document.getElementById('status');

chrome.storage.sync.get(['enabled'], (result) => {
  const enabled = result.enabled !== false; // default to true
  toggle.classList.toggle('active', enabled);
  status.textContent = enabled ? 'Enabled — AI tweets are hidden' : 'Disabled — showing all tweets';
});

toggle.addEventListener('click', () => {
  const isActive = toggle.classList.toggle('active');
  chrome.storage.sync.set({ enabled: isActive });
  status.textContent = isActive ? 'Enabled — AI tweets are hidden' : 'Disabled — showing all tweets';
});
