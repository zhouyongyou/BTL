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
const CONTRACT_ADDRESS = '0xFcAD17815627356EfE237D3bA2c863f63B78845D'; // Updated contract address
let ABI = []; // From contract.json dynamically load

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
  document.body.classList.toggle('dark-mode');
}

/* ===== Init ===== */
window.onload = async () => {
  updateLanguage();
  // Dynamically load ABI
  ABI = (await fetch('contract.json').then(r => r.json())).abi;
  if (web3Modal.cachedProvider) connectWallet();
  setInterval(updateCountdowns, 1000);
};

/* ===== Connect wallet ===== */
async function connectWallet() {
  if (document.getElementById('connectWalletBtn').dataset.loading === 'true') return;
  showLoading('connectWalletBtn');
  try {
    provider = await web3Modal.connect();
    web3 = new Web3(provider);
    const netId = await web3.eth.net.getId();
    if (netId !== 56) {
      toast('Please switch to BSC mainnet');
      return;
    }
    contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);
    userAccount = (await web3.eth.getAccounts())[0];
    document.getElementById('userAccount').innerText = userAccount;
    toast('Wallet connected successfully!');

    provider.on('accountsChanged', acc => {
      userAccount = acc[0];
      updateUserInfo();
    });
    provider.on('chainChanged', id => {
      if (parseInt(id, 16) !== 56) toast('Please switch back to BSC mainnet');
    });

    updateUserInfo();
    updateContractInfo();
  } catch (e) {
    console.error(e);
    toast('Connection failed');
  } finally {
    hideLoading('connectWalletBtn');
  }
}
