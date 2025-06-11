
/* ===== Web3Modal Multi-wallet setup ===== */
const providerOptions = {
  walletconnect: {
    package: window.WalletConnectProvider.default,
    options: {
      rpc: { 56: 'https://bsc-dataseed1.binance.org:443' }
    }
  }
};
const web3Modal = new window.Web3Modal.default({
  network: 'bsc',
  cacheProvider: true,
  providerOptions
});

/* ===== State ===== */
let provider, web3, contract;
let userAccount = '';
const CONTRACT_ADDRESS = '0x633413269fe349413c1B1c1a34A5AdcC1BDd8f88';
let ABI = []; // 从 contract.json 动态加载

/* ===== Toast ===== */
function toast(msg) {
  const t = document.getElementById('toast');
  t.innerText = msg;
  t.style.display = 'block';
  clearTimeout(t.timer);
  t.timer = setTimeout(() => (t.style.display = 'none'), 3000);
}

/* ===== Loading helpers ===== */
function showLoading(btnId) {
  const b = document.getElementById(btnId);
  b.classList.add('loading');
  b.dataset.loading = 'true';
}
function hideLoading(btnId) {
  const b = document.getElementById(btnId);
  b.classList.remove('loading');
  b.dataset.loading = 'false';
}

/* ===== Language ===== */
let currentLanguage = localStorage.getItem('language') || 'en';
function switchLanguage() {
  currentLanguage = currentLanguage === 'en' ? 'zh' : 'en';
  localStorage.setItem('language', currentLanguage);
  updateLanguage();
}
function updateLanguage() {
  const lang = currentLanguage === 'en';
  document.getElementById('networkInfo').innerText = lang ? 'Connecting...' : '連接中...';
  document.getElementById('connectWalletBtn').innerText = lang ? 'Connect Wallet' : '連接錢包';
  document.getElementById('contractInfoTitle').innerText = lang ? 'Contract Information' : '合約信息';
  document.getElementById('btlAddressLabel').innerText = lang ? 'BTL Contract Address:' : 'BTL 合約地址：';
  document.getElementById('usd1CountdownLabel').innerText = lang ? 'Next USD1 Reward:' : '下次 USD1 分紅：';
  document.getElementById('bnbCountdownLabel').innerText = lang ? 'Next BNB Reward:' : '下次 BNB 分紅：';
  document.getElementById('depositLabel').innerText = lang ? 'Deposit BNB' : '存入 BNB';
  document.getElementById('footerText').innerText = lang ? '© 2025 BitLuck | All rights reserved' : '© 2025 BitLuck | 版權所有';
}

/* ===== Dark mode ===== */
function toggleDarkMode() {
  document.body.classList.add('dark-mode');  // Always apply dark mode
}

/* ===== Init ===== */
window.onload = async () => {
  updateLanguage();
  // 动态加载 ABI
  ABI = (await fetch('contract.json').then(r => r.json())).abi;
  if (web3Modal.cachedProvider) connectWallet();
  setInterval(updateCountdowns, 1000);
};
