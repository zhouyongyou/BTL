function shortAddress(addr) {
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

async function loadLeaderboard() {
  try {
    const res = await fetch('leaderboard.json');
    const data = await res.json();
    data.sort((a, b) => b.eth - a.eth);
    const tbody = document.getElementById('leaderboardBody');
    data.forEach((item, idx) => {
      const tr = document.createElement('tr');
      const rank = idx + 1;
      tr.innerHTML = `
        <td>${rank}</td>
        <td data-full="${item.address}">${shortAddress(item.address)}</td>
        <td>${item.referrals}</td>
        <td>${item.eth}</td>`;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error('Failed to load leaderboard', e);
  }
}

function setupMenu() {
  const menuToggle = document.getElementById('menuToggle');
  const sideMenu = document.getElementById('sideMenu');
  const menuOverlay = document.getElementById('menuOverlay');
  if (!menuToggle || !sideMenu || !menuOverlay) return;
  const openMenu = () => {
    sideMenu.classList.add('open');
    menuOverlay.classList.add('active');
  };
  const closeMenu = () => {
    sideMenu.classList.remove('open');
    menuOverlay.classList.remove('active');
  };
  menuToggle.addEventListener('click', openMenu);
  menuOverlay.addEventListener('click', closeMenu);
  sideMenu.querySelectorAll('a, button').forEach((el) => el.addEventListener('click', closeMenu));
}

window.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('dark-mode');
  setupMenu();
  loadLeaderboard();
});
