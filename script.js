/* ===== Web3Modal Multi-wallet setup ===== */
const providerOptions = typeof window !== 'undefined' ? {
  // MetaMask
  metamask: {
    package: window.ethereum, // 支持 MetaMask
  },
  // OKX Wallet
  okexchain: {
    package: window.okex, // 支持 OKX Wallet
  },
  // TokenPocket Wallet
  tokenpocket: {
    package: window.tokenPocket, // TokenPocket錢包
    options: {
      // 可以根據需求進一步設置
    }
  },
  // WalletConnect (已經有)
  walletconnect: {
    package: window.WalletConnectProvider?.default,
    options: {
      rpc: { 56: 'https://bsc-dataseed1.binance.org:443' }
    }
  }
} : {};
const web3Modal = typeof window !== 'undefined' ? new window.Web3Modal.default({
  network: 'bsc',
  cacheProvider: true,
  providerOptions
}) : null;
/* ===== State ===== */
let provider, web3, contract;
let userAccount = '';
const CONTRACT_ADDRESS = '0xbF3fAD4C7353240F563a13A14959E68098d992E6';
let ABI = []; // 从 contract.json 动态加载
let timeUnits = [];
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

    // 根據語言設置時間單位
  if (currentLanguage === 'en') {
    timeUnits = ['h', 'm', 's'];
  } else {
    timeUnits = ['小時', '分鐘', '秒'];
  }
  
  // Header
  const networkInfo = document.getElementById('networkInfo');
  if (networkInfo) {
    if (userAccount) {
      networkInfo.innerText = lang ? 'Connected' : '已連接';
    } else {
      networkInfo.innerText = lang ? 'Not connected' : '未連接';
    }
  }
  const connectWalletBtn = document.getElementById('connectWalletBtn');
  if (connectWalletBtn) {
    if (userAccount) {
      connectWalletBtn.innerText = lang ? 'Disconnect' : '斷開錢包';
    } else {
      connectWalletBtn.innerText = lang ? 'Connect Wallet' : '連接錢包';
    }
  }
  // 按鈕的切換文字
  const langBtn = document.getElementById('langBtn');
  if (langBtn) langBtn.innerText = lang ? '🌐 中文' : '🌐 EN';
  
  // Main Info
  const contractInfoTitle = document.getElementById('contractInfoTitle');
  if (contractInfoTitle) contractInfoTitle.innerText = lang ? 'Contract Information' : '合約信息';
  
  const btlAddressLabel = document.getElementById('btlAddressLabel');
  if (btlAddressLabel) btlAddressLabel.innerText = lang ? 'BTL Contract Address:' : 'BTL 合約地址：';

  const copyAddressBtn = document.getElementById('copyAddressBtn');
  if (copyAddressBtn) copyAddressBtn.innerText = lang ? 'Copy Address' : '複製地址';
  
  const usd1CountdownLabel = document.getElementById('usd1CountdownLabel');
  if (usd1CountdownLabel) usd1CountdownLabel.innerText = lang ? 'Next USD1 Reward:' : '下次 USD1 分紅：';

  const bnbCountdownLabel = document.getElementById('bnbCountdownLabel');
  if (bnbCountdownLabel) bnbCountdownLabel.innerText = lang ? 'Next BNB Reward:' : '下次 BNB 分紅：';

  const userBalanceLabel = document.getElementById('userBalanceLabel');
  if (userBalanceLabel) userBalanceLabel.innerText = lang ? 'Your BTL Balance' : '你的 BTL 餘額';

  const usd1EarningsLabel = document.getElementById('usd1EarningsLabel');
  if (usd1EarningsLabel) usd1EarningsLabel.innerText = lang ? 'Your USD1 Earnings' : '你的 USD1 收益';

  const userBNBDepositLabel = document.getElementById('userBNBDepositLabel');
  if (userBNBDepositLabel) userBNBDepositLabel.innerText = lang ? 'Your BNB Deposit' : '你的 BNB 存款';
  
  const depositLabel = document.getElementById('depositLabel');
  if (depositLabel) depositLabel.innerText = lang ? 'Deposit BNB' : '存入 BNB';

  const footerText = document.getElementById('footerText');
  if (footerText) footerText.innerText = lang ? '© 2025 BitLuck | All rights reserved' : '© 2025 BitLuck | 版權所有';
  
  // Form placeholders and buttons
  const depositAmount = document.getElementById('depositAmount');
  if (depositAmount) depositAmount.setAttribute('placeholder', lang ? 'Enter BNB to deposit' : '輸入要存入的 BNB 金額');

  const referrer = document.getElementById('referrer');
  if (referrer) referrer.setAttribute('placeholder', lang ? 'Enter referrer address (optional)' : '輸入推薦人地址（可選）');

  const depositBtn = document.getElementById('depositBtn');
  if (depositBtn) depositBtn.innerText = lang ? 'Deposit' : '存入';

  // Referral section
  const referralLink = document.getElementById('referralLink');
  if (referralLink) referralLink.innerText = lang ? 'Your Referral Link:' : '你的推薦鏈接：';
  
  const copyLinkBtn = document.getElementById('copyLinkBtn');
  if (copyLinkBtn) copyLinkBtn.innerText = lang ? 'Copy Link' : '複製鏈接';

  const referralUrlLabel = document.getElementById('referralUrlLabel');
  if (referralUrlLabel) referralUrlLabel.innerText = lang ? 'Referral URL:' : '推薦鏈接：';
  
  // Footer
  const networkInfoFooter = document.getElementById('networkInfoFooter');
  if (networkInfoFooter) networkInfoFooter.innerText = lang 
    ? 'This DApp only supports the BSC mainnet. Please make sure your wallet is switched to the Binance Smart Chain mainnet.'
    : '本 DApp 僅支持 BSC 主網，請確保你的錢包已切換至 Binance Smart Chain 主網。';

  const whitepaperLink = document.getElementById('whitepaperLink');
  if (whitepaperLink) whitepaperLink.innerText = lang ? 'Whitepaper' : '白皮書';

  const telegramLink = document.getElementById('telegramLink');
  if (telegramLink) telegramLink.innerText = lang ? 'Telegram' : '電報';

  const twitterLink = document.getElementById('twitterLink');
  if (twitterLink) twitterLink.innerText = lang ? 'Twitter' : '推特';
}

/* ===== Connect wallet ===== */
async function connectWallet() {
  if (userAccount) {
    return disconnectWallet();
  }
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
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) connectBtn.innerText = currentLanguage === 'en' ? 'Disconnect' : '斷開錢包';
    const networkInfo = document.getElementById('networkInfo');
    if (networkInfo) networkInfo.innerText = currentLanguage === 'en' ? 'Connected' : '已連接';
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

async function disconnectWallet() {
  if (provider && provider.disconnect) {
    try { await provider.disconnect(); } catch (e) { console.error(e); }
  }
  if (provider && provider.close) {
    try { await provider.close(); } catch (e) { console.error(e); }
  }
  await web3Modal.clearCachedProvider();
  provider = null;
  web3 = null;
  contract = null;
  userAccount = '';
  document.getElementById('userAccount').innerText = '';
  const connectBtn = document.getElementById('connectWalletBtn');
  if (connectBtn) connectBtn.innerText = currentLanguage === 'en' ? 'Connect Wallet' : '連接錢包';
  const networkInfo = document.getElementById('networkInfo');
  if (networkInfo) networkInfo.innerText = currentLanguage === 'en' ? 'Not connected' : '未連接';
  toast('Wallet disconnected');
}

/* ===== Update user info ===== */
async function updateUserInfo() {
  if (!userAccount) return;
  const bal = await contract.methods.balanceOf(userAccount).call();
  document.getElementById('userBalance').innerText = bal;

  const dep = await contract.methods.getUserBNBDeposits(userAccount).call();
  document.getElementById('userBNBDeposit').innerText = web3.utils.fromWei(dep, 'ether');

  const usd1Earnings = await contract.methods.getAccumulatedUsd1(userAccount).call();
  document.getElementById('usd1Earnings').innerText = usd1Earnings ? web3.utils.fromWei(usd1Earnings, 'ether') : '0';
  
  const ref = await contract.methods.getReferralLink(userAccount).call();
  console.log("Referral link:", ref);
  document.getElementById('referralUrl').innerText = ref || 'No referral link';
}

/* ===== Deposit BNB ===== */
async function depositBNB() {
  const btn = 'depositBtn';
  if (document.getElementById(btn).dataset.loading === 'true') return;
  const amt = document.getElementById('depositAmount').value;
  let ref = document.getElementById('referrer').value;  // 取得推薦人地址
  if (!amt || parseFloat(amt) < 0.018) return toast('最低存入 0.02 BNB');
  if (!ref) {
    ref = "0x0000000000000000000000000000000000000000";
  }
  showLoading(btn);
  try {
    await contract.methods.depositBNB(ref).send({
      from: userAccount,
      value: web3.utils.toWei(amt, 'ether')
    });
    toast('存款成功！');
    updateUserInfo();
  } catch (e) {
    console.error(e);
    toast('存款失败');
  } finally {
    hideLoading(btn);
  }
}

/* ===== Countdown ===== */
async function updateCountdowns() {
  if (!contract) return;
  const u = await contract.methods.getUSD1RewardCountdown().call();
  const b = await contract.methods.getBNBRewardCountdown().call();

  // 假設每個區塊大約 1.5 秒
  const blockTime = 1.5;
  
  // 轉換倒數區塊數為秒數
  const usd1Countdown = u * blockTime;  // USD1獎金倒數時間（秒）
  const bnbCountdown = b * blockTime;  // BNB獎金倒數時間（秒）

  // 將秒數轉換為 時：分：秒 格式
  function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);  // 計算小時
    const minutes = Math.floor((seconds % 3600) / 60);  // 計算分鐘
    const remainingSeconds = Math.floor(seconds % 60);  // 計算秒數
    return `${hours}${timeUnits[0]} ${minutes}${timeUnits[1]} ${remainingSeconds}${timeUnits[2]}`;
  }
  
  // 更新顯示的時間（倒數時間格式：時：分：秒）
  document.getElementById('usd1Time').innerText = formatTime(usd1Countdown);
  document.getElementById('bnbTime').innerText = formatTime(bnbCountdown);
}

/* ===== Contract overview ===== */
async function updateContractInfo() {
  if (!contract) return;
  const total = await contract.methods.totalBnbDeposited().call();
  const totalBnbElement = document.getElementById('totalBnbDeposited');
  if (totalBnbElement) {
    totalBnbElement.innerText = web3.utils.fromWei(total, 'ether');
  }

  const th = await contract.methods.getHolderThreshold().call();
  const thresholdElement = document.getElementById('holderThreshold');
  if (thresholdElement) {
    thresholdElement.innerText = web3.utils.fromWei(th, 'ether');
  }

  const min = await contract.methods.minDeposit().call();
  const minDepositElement = document.getElementById('minDepositAmount');
  if (minDepositElement) {
    minDepositElement.innerText = web3.utils.fromWei(min, 'ether');
  }
}

/* ===== Copy helper ===== */
function copyToClipboard(id) {
  navigator.clipboard.writeText(document.getElementById(id).innerText).then(() => toast('Copied!'));
}

/* ===== Dark mode ===== */
window.onload = async () => {
  document.body.classList.add('dark-mode');  // 預設啟用深色模式
  updateLanguage();
  // 動態加載 ABI
  ABI = (await fetch('contract.json').then(r => r.json())).abi;
  if (web3Modal.cachedProvider) connectWallet();
  setInterval(updateCountdowns, 1000);
};

// 放在 script.js 的結尾
window.addEventListener('DOMContentLoaded', (event) => {
  // 自動填充推薦人地址
  const urlParams = new URLSearchParams(window.location.search);
  const referrer = urlParams.get('ref');
  if (referrer) {
    document.getElementById('referrer').value = referrer; // 將 ref 參數填充到推薦人輸入框
  }

  // Side menu controls
  const menuToggle = document.getElementById('menuToggle');
  const sideMenu = document.getElementById('sideMenu');
  const menuOverlay = document.getElementById('menuOverlay');
  if (menuToggle && sideMenu && menuOverlay) {
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
  }
  
  // 更新其他信息
  updateContractInfo();
});
