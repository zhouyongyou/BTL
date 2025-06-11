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
const CONTRACT_ADDRESS = '0xFcAD17815627356EfE237D3bA2c863f63B78845D';
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
  document.body.classList.toggle('dark-mode');
}

/* ===== Init ===== */
window.onload = async () => {
  updateLanguage();
  // 动态加载 ABI
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
      toast('请切换 BSC 主网');
      return;
    }
    contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);
    userAccount = (await web3.eth.getAccounts())[0];
    document.getElementById('userAccount').innerText = userAccount;
    toast('钱包已连接');

    provider.on('accountsChanged', acc => {
      userAccount = acc[0];
      updateUserInfo();
    });
    provider.on('chainChanged', id => {
      if (parseInt(id, 16) !== 56) toast('请切换回 BSC 主网');
    });

    updateUserInfo();
    updateContractInfo();
  } catch (e) {
    console.error(e);
    toast('连接失败');
  } finally {
    hideLoading('connectWalletBtn');
  }
}

/* ===== Update user info ===== */
async function updateUserInfo() {
  if (!userAccount) return;
  const bal = await contract.methods.balanceOf(userAccount).call();
  document.getElementById('userBalance').innerText = bal;

  const dep = await contract.methods.getUserBNBDeposits(userAccount).call();
  document.getElementById('userBNBDeposit').innerText = web3.utils.fromWei(dep, 'ether');

  const ref = await contract.methods.getReferralLink(userAccount).call();
  document.getElementById('referralUrl').innerText = ref;
}

/* ===== Deposit BNB ===== */
async function depositBNB() {
  const btn = 'depositBtn';
  if (document.getElementById(btn).dataset.loading === 'true') return;
  const amt = document.getElementById('depositAmount').value;
  const ref = document.getElementById('referrer').value; // 推荐人
  if (!amt || parseFloat(amt) < 0.02) return toast('最低存入 0.02 BNB');
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
  document.getElementById('usd1Time').innerText = u;
  document.getElementById('bnbTime').innerText = b;
}

/* ===== Contract overview ===== */
async function updateContractInfo() {
  if (!contract) return;
  const total = await contract.methods.totalBnbDeposited().call();
  document.getElementById('totalBnbDeposited').innerText = web3.utils.fromWei(total, 'ether');

  const th = await contract.methods.getHolderThreshold().call();
  document.getElementById('holderThreshold').innerText = web3.utils.fromWei(th, 'ether');

  const min = await contract.methods.minDeposit().call();
  document.getElementById('minDepositAmount').innerText = web3.utils.fromWei(min, 'ether');
}

/* ===== Copy helper ===== */
function copyToClipboard(id) {
  navigator.clipboard.writeText(document.getElementById(id).innerText).then(() => toast('Copied!'));
}
