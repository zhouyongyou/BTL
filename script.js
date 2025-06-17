/* ===== Web3Modal Multi-wallet setup ===== */
const RPC_ENDPOINTS = [
  "https://bsc-dataseed1.binance.org",
  "https://bsc-dataseed.binance.org",
  "https://bsc.publicnode.com",
  "https://bsc-rpc.publicnode.com",
  "https://bscrpc.com"
];
let currentRpcIndex = 0;

function buildProviderOptions() {
  return {
    injected: {
      display: {
        name: "MetaMask",
        description: "Connect with the MetaMask browser extension"
      },
      package: null
    },
    walletconnect: {
      package: window.WalletConnectProvider?.default,
      options: {
        rpc: { 56: RPC_ENDPOINTS[currentRpcIndex] },
      },
      chainId: 56
    }
  };
}

function initWeb3Modal() {
  return typeof window !== "undefined"
    ? new window.Web3Modal.default({
        network: "bsc",
        cacheProvider: true,
        providerOptions: buildProviderOptions(),
      })
    : null;
}

let web3Modal = initWeb3Modal();
/* ===== State ===== */
let provider, web3, contract, roastPadContract;
let userAccount = "";
let depositContract;
let updateUserInfo = () => {};
let btlRoastPadContract;
let updateBtlUserInfo = () => {};
const CONTRACT_ADDRESS = "0xb1b8ea6e684603f328ed401426c465f55d064444";
let ABI = []; // 从 contract.json 动态加载
let timeUnits = [];
const BTL_DECIMALS = 18; // Number of decimals for BTL token
const ROASTPAD_ADDRESS = "0xdb3ED962B99Cb8934Ba14Bc55447419578a5b299";
// Toggle to enable/disable RoastPad (BNB deposit) interactions
const ROASTPAD_LIVE = true;
const AUTO_REFRESH_INTERVAL = 5000;
let refreshIntervalId = null;
const COOLDOWN_MS = 1500;
let cooldownActive = false;
const ROASTPAD_ABI = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"referrer","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"ReferralReward","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Withdraw","type":"event"},{"inputs":[],"name":"COOLDOWN_PERIOD","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"DAILY_RATE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MAX_SINGLE_DEPOSIT","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MIN_DEPOSIT","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"REFERRAL_RATE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"claimReferralRewards","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_referrer","type":"address"}],"name":"deposit","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getCooldownRemaining","outputs":[{"internalType":"uint256","name":"depositCooldownRemaining","type":"uint256"},{"internalType":"uint256","name":"withdrawalCooldownRemaining","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getLastDepositTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getLastWithdrawalTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getReferralRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getTotalClaimedReferralRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getYield","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"lastDepositTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"lastWithdrawalTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"launchTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"platformFees","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"recoverAssets","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"totalClaimedReferralRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalDeposits","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"users","outputs":[{"internalType":"uint256","name":"deposit","type":"uint256"},{"internalType":"uint256","name":"lastAction","type":"uint256"},{"internalType":"uint256","name":"referralRewards","type":"uint256"},{"internalType":"address","name":"referrer","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}];

const BTL_ROASTPAD_ADDRESS = "0xFAFFaD91E2bA05F16A43b09E94430dd0c4417686";
const BTL_ROASTPAD_ABI = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"referrer","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"ReferralReward","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Withdraw","type":"event"},{"inputs":[],"name":"COOLDOWN_PERIOD","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"DAILY_RATE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MAX_SINGLE_DEPOSIT","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MIN_DEPOSIT","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"REFERRAL_RATE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"claimReferralRewards","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_referrer","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"deposit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getCooldownRemaining","outputs":[{"internalType":"uint256","name":"depositCooldownRemaining","type":"uint256"},{"internalType":"uint256","name":"withdrawalCooldownRemaining","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getLastDepositTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getLastWithdrawalTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getReferralRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getTotalClaimedReferralRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getYield","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"lastDepositTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"lastWithdrawalTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"launchTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"platformFees","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"targetToken","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"recoverAssets","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"token","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"totalClaimedReferralRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalDeposits","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"users","outputs":[{"internalType":"uint256","name":"deposit","type":"uint256"},{"internalType":"uint256","name":"lastAction","type":"uint256"},{"internalType":"uint256","name":"referralRewards","type":"uint256"},{"internalType":"address","name":"referrer","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"}];

function formatBTLBalance(balance) {
  try {
    const factor = 10n ** BigInt(BTL_DECIMALS);
    return (BigInt(balance) / factor).toLocaleString("en-US");
  } catch (e) {
    console.error(e);
    return balance;
  }
}

function formatNumber(value, decimals = 11) {
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  const fixed = num.toFixed(decimals);
  return fixed.replace(/0+$/, "").replace(/\.$/, "");
}

function fromWeiFormatted(value, decimals = 11) {
  return formatNumber(web3.utils.fromWei(value, "ether"), decimals);
}

const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
];

// Backwards compatibility wrapper for older method names
function getAccumulatedUsd1(addr) {
  if (!contract || !addr) return Promise.resolve("0");
  const m = contract.methods.getAccumulatedUsd1 || contract.methods.accumulatedUsd1;
  return m ? m(addr).call() : Promise.resolve("0");
}

function formatAddress(addr) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function applyContractAddress() {
  const addr = CONTRACT_ADDRESS;
  const link = `https://pancakeswap.finance/swap?outputCurrency=${addr}&chain=bsc`;
  const menuBuyBtn = document.getElementById("menuBuyBtn");
  if (menuBuyBtn) menuBuyBtn.onclick = () => window.open(link, "_blank");
  const buyBtlBtn = document.getElementById("buyBtlBtn");
  if (buyBtlBtn) buyBtlBtn.onclick = () => window.open(link, "_blank");
  const contractAddr = document.getElementById("contractAddr");
  if (contractAddr) contractAddr.innerText = addr;
}

/* ===== Placeholder helpers ===== */
function setPlaceholder(id, value = "-") {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}

function resetPlaceholders() {
  // no placeholders to reset after removing USD1 sections
}

function formatDuration(seconds) {
  seconds = Number(seconds);
  if (isNaN(seconds) || seconds <= 0) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m || h) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}
function startAutoRefresh() {
  stopAutoRefresh();
  refreshIntervalId = setInterval(() => {
    if (userAccount) {
      if (typeof updateUserInfo === "function") updateUserInfo();
      if (typeof updateBtlUserInfo === "function") updateBtlUserInfo();
    }
  }, AUTO_REFRESH_INTERVAL);
}

function stopAutoRefresh() {
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId);
    refreshIntervalId = null;
  }
}


/* ===== Toast ===== */
function toast(msg) {
  const t = document.getElementById("toast");
  t.innerText = msg;
  t.style.display = "block";
  clearTimeout(t.timer);
  t.timer = setTimeout(() => (t.style.display = "none"), 3000);
}

/* ===== Loading helpers ===== */
function activateCooldown() {
  cooldownActive = true;
  setTimeout(() => (cooldownActive = false), COOLDOWN_MS);
}

function showLoading(btnId) {
  const b = document.getElementById(btnId);
  b.classList.add("loading");
  b.dataset.loading = "true";
  activateCooldown();
}
function hideLoading(btnId) {
  const b = document.getElementById(btnId);
  b.classList.remove("loading");
  b.dataset.loading = "false";
}

/* ===== Language ===== */
let currentLanguage = localStorage.getItem("language") || "en";

function setLabel(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  const icon = el.querySelector("img");
  el.innerHTML = text + (icon ? icon.outerHTML : "");
}
function switchLanguage() {
  currentLanguage = currentLanguage === "en" ? "zh" : "en";
  localStorage.setItem("language", currentLanguage);
  updateLanguage();
}
function updateLanguage() {
  const lang = currentLanguage === "en";

  // 根據語言設置時間單位
  if (currentLanguage === "en") {
    timeUnits = ["h", "m", "s"];
  } else {
    timeUnits = ["小時", "分鐘", "秒"];
  }

  // Header
  const networkInfo = document.getElementById("networkInfo");
  if (networkInfo) {
    if (userAccount) {
      networkInfo.innerText = lang ? "Connected" : "已連接";
    } else {
      networkInfo.innerText = lang ? "Not connected" : "未連接";
    }
  }
  const connectWalletBtn = document.getElementById("connectWalletBtn");
  if (connectWalletBtn) {
    if (userAccount) {
      connectWalletBtn.innerText = lang ? "Disconnect" : "斷開錢包";
    } else {
      connectWalletBtn.innerText = lang ? "Connect Wallet" : "連接錢包";
    }
  }
  // 按鈕的切換文字
  const langBtn = document.getElementById("langBtn");
  if (langBtn) langBtn.innerText = lang ? "🌐 中文" : "🌐 EN";

  // Side menu texts
  const menuMainInfo = document.getElementById("menuMainInfo");
  if (menuMainInfo) menuMainInfo.innerText = lang ? "Main Info" : "主信息";

  const menuReferral = document.getElementById("menuReferral");
  if (menuReferral) menuReferral.innerText = lang ? "Referral" : "推薦";

  const menuWallet = document.getElementById("menuWallet");
  if (menuWallet) menuWallet.innerText = lang ? "Wallet" : "錢包";

  const menuConnect = document.getElementById("menuConnectBtn");
  if (menuConnect) {
    menuConnect.innerText = userAccount
      ? lang
        ? "Disconnect"
        : "斷開錢包"
      : lang
        ? "Connect Wallet"
        : "連接錢包";
  }

  const menuBuyBtn = document.getElementById("menuBuyBtn");
  if (menuBuyBtn) menuBuyBtn.innerText = lang ? "BUY $BTL" : "購買 $BTL";

  const buyBtlBtn = document.getElementById("buyBtlBtn");
  if (buyBtlBtn) buyBtlBtn.innerText = lang ? "BUY $BTL" : "購買 $BTL";

  const menuInvite = document.getElementById("menuInvite");
  if (menuInvite) menuInvite.innerText = lang ? "Invite" : "邀請";

  const depositBnbBtn = document.getElementById("depositBnbBtn");
  if (depositBnbBtn) depositBnbBtn.innerText = lang ? "Deposit BNB" : "存入 BNB";
  const withdrawBnbBtn = document.getElementById("withdrawBnbBtn");
  if (withdrawBnbBtn) withdrawBnbBtn.innerText = lang ? "Withdraw All" : "提取全部";
  const claimReferralBtn = document.getElementById("claimReferralBtn");
  if (claimReferralBtn)
    claimReferralBtn.innerText = lang
      ? "Claim Referral Rewards"
      : "領取推薦獎勵";
  const refreshBnbBtn = document.getElementById("refreshBnbBtn");
  if (refreshBnbBtn)
    refreshBnbBtn.innerText = lang ? "Refresh BNB Pool" : "刷新 BNB 礦池";
  const depositBtlBtn = document.getElementById("depositBtlBtn");
  if (depositBtlBtn) depositBtlBtn.innerText = lang ? "Deposit BTL" : "存入 BTL";
  const withdrawBtlBtn = document.getElementById("withdrawBtlBtn");
  if (withdrawBtlBtn) withdrawBtlBtn.innerText = lang ? "Withdraw All" : "提取全部";
  const claimBtlReferralBtn = document.getElementById("claimBtlReferralBtn");
  if (claimBtlReferralBtn)
    claimBtlReferralBtn.innerText = lang
      ? "Claim Referral Rewards"
      : "領取推薦獎勵";

  const refreshBtlBtn = document.getElementById("refreshBtlBtn");
  if (refreshBtlBtn)
    refreshBtlBtn.innerText = lang ? "Refresh BTL Pool" : "刷新 BTL 礦池";

  const refreshInfoBtn = document.getElementById("refreshInfoBtn");
  if (refreshInfoBtn) refreshInfoBtn.innerText = lang ? "Refresh Pools" : "刷新礦池資訊";

  const depositAmountInput = document.getElementById("depositAmount");
  if (depositAmountInput)
    depositAmountInput.placeholder = lang
      ? "Amount (BNB)"
      : "金額 (BNB)";
  const btlDepositAmountInput = document.getElementById("btlDepositAmount");
  if (btlDepositAmountInput)
    btlDepositAmountInput.placeholder = lang
      ? "Amount (BTL)"
      : "金額 (BTL)";
  const referralContainer = document.getElementById("referralContainer");
  if (referralContainer) {
    const firstNode = referralContainer.childNodes[0];
    if (firstNode) firstNode.nodeValue = lang ? "Your Referral Link: " : "你的推薦連結：";
  }
  const copyReferralBtn = document.getElementById("copyReferralBtn");
  if (copyReferralBtn) copyReferralBtn.innerText = lang ? "Copy" : "複製";

  const BtlDepositRules = document.getElementById("BtlDepositRules");
  if (BtlDepositRules)
    BtlDepositRules.innerText = lang
      ? "Daily yield is 8%. Deposits and withdrawals have a 15-seconds cooldown. Each action settles your rewards. Deposit at least 100000000 $BTL (0.01%) daily to settle without withdrawing all."
      : "每日收益率為 8%。存款和提款有 15 秒的冷卻時間。每次操作會結算您的獎勳。每日至少存入 100000000 $BTL（0.01%）以便結算，而無需全部提領。";
  
  const depositRules = document.getElementById("depositRules");
  if (depositRules)
    depositRules.innerText = lang
      ? "Daily yield is 8%. Deposits and withdrawals have a 3-minutes cooldown. Each action settles your rewards. Deposit at least 0.01 BNB daily to settle without withdrawing all."
      : "每日收益 8%。存款與提領需間隔 3 分鐘。每次操作都會自動結算收益，如不想一次提領全部，可每天存入至少 0.01 BNB 以結算前一日收益。每次存款與提款平台會收取 3% 手續費。";
  const testingNote = document.getElementById("testingNote");
  if (testingNote)
    testingNote.innerText = lang
      ? "The pool contract code below is still in testing. Please do not deposit. Deposits cannot be recovered if errors occur."
      : "下方的礦池代碼都還在測試中，請用戶不要存入，因為存入我們這邊如果有出錯是無法復原的。";
  const userDepositLabel = document.getElementById("userDepositLabel");
  if (userDepositLabel)
    userDepositLabel.innerText = lang ? "Total Deposit:" : "總存款:";
  const userYieldLabel = document.getElementById("userYieldLabel");
  if (userYieldLabel)
    userYieldLabel.innerText = lang ? "Total Yield:" : "總收益:";
  const userReferralLabel = document.getElementById("userReferralLabel");
  if (userReferralLabel)
    userReferralLabel.innerText = lang
      ? "Claimable Referral Rewards:"
      : "可領推薦獎勵:";
  const userReferralClaimedLabel = document.getElementById(
    "userReferralClaimedLabel"
  );
  if (userReferralClaimedLabel)
    userReferralClaimedLabel.innerText = lang
      ? "Claimed Referral Rewards:"
      : "已領取推薦獎勵:";
  const depositCooldownLabel = document.getElementById("depositCooldownLabel");
  if (depositCooldownLabel)
    depositCooldownLabel.innerText = lang
      ? "Deposit Cooldown:"
      : "存款冷卻時間:";
  const withdrawCooldownLabel = document.getElementById("withdrawCooldownLabel");
  if (withdrawCooldownLabel)
    withdrawCooldownLabel.innerText = lang
      ? "Withdraw Cooldown:"
      : "提領冷卻時間:";
  const btlUserDepositLabel = document.getElementById("btlUserDepositLabel");
  if (btlUserDepositLabel)
    btlUserDepositLabel.innerText = lang ? "Total Deposit:" : "總存款:";
  const btlUserYieldLabel = document.getElementById("btlUserYieldLabel");
  if (btlUserYieldLabel)
    btlUserYieldLabel.innerText = lang ? "Total Yield:" : "總收益:";
  const btlUserReferralLabel = document.getElementById("btlUserReferralLabel");
  if (btlUserReferralLabel)
    btlUserReferralLabel.innerText = lang ? "Referral Rewards:" : "可領推薦獎勵:";
  const btlUserReferralClaimedLabel = document.getElementById(
    "btlUserReferralClaimedLabel"
  );
  if (btlUserReferralClaimedLabel)
    btlUserReferralClaimedLabel.innerText = lang
      ? "Claimed Referral Rewards:"
      : "已領取推薦獎勵:";
  const btlDepositCooldownLabel = document.getElementById("btlDepositCooldownLabel");
  if (btlDepositCooldownLabel)
    btlDepositCooldownLabel.innerText = lang
      ? "Deposit Cooldown:"
      : "存款冷卻時間:";
  const btlWithdrawCooldownLabel = document.getElementById("btlWithdrawCooldownLabel");
  if (btlWithdrawCooldownLabel)
    btlWithdrawCooldownLabel.innerText = lang
      ? "Withdraw Cooldown:"
      : "提領冷卻時間:";
  const referrerInput = document.getElementById("referrer");
  if (referrerInput)
    referrerInput.placeholder = lang
      ? "Referrer (optional)"
      : "推薦地址 (選填)";
  const btlReferrerInput = document.getElementById("btlReferrer");
  if (btlReferrerInput)
    btlReferrerInput.placeholder = lang
      ? "Referrer (optional)"
      : "推薦地址 (選填)";


  const menuDocs = document.getElementById("menuDocs");
  if (menuDocs) {
    menuDocs.innerText = lang ? "Docs" : "文檔";
    menuDocs.href = lang
      ? "https://bitluck.notion.site/"
      : "https://bitluck.notion.site/overview-cn";
    menuDocs.target = "_blank";
  }

  const menuTelegramText = document.getElementById("menuTelegramText");
  if (menuTelegramText) menuTelegramText.innerText = lang ? "Telegram" : "電報";

  const menuTwitterText = document.getElementById("menuTwitterText");
  if (menuTwitterText) menuTwitterText.innerText = lang ? "Twitter" : "推特";

  // Main Info
  const contractInfoTitle = document.getElementById("contractInfoTitle");
  if (contractInfoTitle)
    contractInfoTitle.innerText = lang ? "Contract Information" : "合約信息";

  const btlAddressLabel = document.getElementById("btlAddressLabel");
  if (btlAddressLabel)
    btlAddressLabel.innerText = lang
      ? "$BTL Contract Address:"
      : "$BTL 合約地址:";

  const copyAddressBtn = document.getElementById("copyAddressBtn");
  if (copyAddressBtn)
    copyAddressBtn.innerText = lang ? "Copy Address" : "複製地址";

  const poolAddressLabel = document.getElementById("poolAddressLabel");
  if (poolAddressLabel)
    poolAddressLabel.innerText = lang
      ? "BNB Pool Contract:"
      : "BNB 礦池合約:";

  const footerText = document.getElementById("footerText");
  if (footerText)
    footerText.innerText = lang
      ? "© 2025 BitLuck | All rights reserved"
      : "© 2025 BitLuck | 版權所有";

  const contractAddrEl = document.getElementById("contractAddr");
  if (contractAddrEl) contractAddrEl.innerText = CONTRACT_ADDRESS;
  const bscScanLink = document.getElementById("bscScanLink");
  if (bscScanLink)
    bscScanLink.href = `https://bscscan.com/token/${CONTRACT_ADDRESS}`;

  const poolAddrEl = document.getElementById("poolAddr");
  if (poolAddrEl) poolAddrEl.innerText = ROASTPAD_ADDRESS;
  const poolBscScanLink = document.getElementById("poolBscScanLink");
  if (poolBscScanLink)
    poolBscScanLink.href = `https://bscscan.com/address/${ROASTPAD_ADDRESS}`;
  const btlRoastAddrEl = document.getElementById("btlRoastAddr");
  if (btlRoastAddrEl) btlRoastAddrEl.innerText = BTL_ROASTPAD_ADDRESS;
  const btlRoastScanLink = document.getElementById("btlRoastScanLink");
  if (btlRoastScanLink)
    btlRoastScanLink.href = `https://bscscan.com/address/${BTL_ROASTPAD_ADDRESS}`;

  // Footer
  const networkInfoFooter = document.getElementById("networkInfoFooter");
  if (networkInfoFooter)
    networkInfoFooter.innerText = lang
      ? "This DApp only supports the BSC mainnet. Please make sure your wallet is switched to the Binance Smart Chain mainnet."
      : "本 DApp 僅支持 BSC 主網，請確保你的錢包已切換至 Binance Smart Chain 主網。";


  const telegramText = document.getElementById("telegramText");
  if (telegramText) {
    telegramText.innerText = lang ? "Telegram" : "電報";
  }

  const twitterText = document.getElementById("twitterText");
  if (twitterText) {
    twitterText.innerText = lang ? "Twitter" : "推特";
  }

  updateReferralLink();
  updateMyReferralLink();
}

/* ===== Connect wallet ===== */
async function connectWallet() {
  if (userAccount) {
    return disconnectWallet();
  }

  if (cooldownActive) return;

  const btn = document.getElementById("connectWalletBtn");
  if (btn.dataset.loading === "true") return;

  if (web3Modal && web3Modal.cachedProvider) {
    await web3Modal.clearCachedProvider();
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  showLoading("connectWalletBtn");

  try {
    await tryConnect();
  } finally {
    hideLoading("connectWalletBtn");
  }
}

async function tryConnect() {
  try {
    provider = await web3Modal.connect();
    web3 = new Web3(provider);
const netId = await web3.eth.net.getId();
if (netId !== 56) {
  const switched = await switchToBSC();
  if (!switched) {
    toast("Please switch to BSC mainnet in your wallet");
    return;
  }
}
    contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);
    roastPadContract = new web3.eth.Contract(ROASTPAD_ABI, ROASTPAD_ADDRESS);
    btlRoastPadContract = new web3.eth.Contract(BTL_ROASTPAD_ABI, BTL_ROASTPAD_ADDRESS);
    userAccount = (await web3.eth.getAccounts())[0];
    document.getElementById("userAccount").innerText = userAccount;
    updateReferralLink();
    updateMyReferralLink();
    resetPlaceholders();
    const connectBtn = document.getElementById("connectWalletBtn");
    if (connectBtn)
      connectBtn.innerText =
        currentLanguage === "en" ? "Disconnect" : "斷開錢包";
    const menuConnectBtn = document.getElementById("menuConnectBtn");
    if (menuConnectBtn)
      menuConnectBtn.innerText =
        currentLanguage === "en" ? "Disconnect" : "斷開錢包";
    const networkInfo = document.getElementById("networkInfo");
    if (networkInfo)
      networkInfo.innerText = currentLanguage === "en" ? "Connected" : "已連接";
    updateReferralLink();
    updateMyReferralLink();
    // updateUserInfo = () => getUserInfo(userAccount);
    // updateBtlUserInfo = () => getBtlUserInfo(userAccount);
    toast(
      currentLanguage === "en"
        ? "Wallet connected. Pool info will auto refresh shortly."
        : "錢包已連接，礦池資訊將自動刷新"
    );
    setTimeout(() => {
      if (typeof updateUserInfo === "function") updateUserInfo();
      if (typeof updateBtlUserInfo === "function") updateBtlUserInfo();
      startAutoRefresh();
    }, AUTO_REFRESH_INTERVAL);

    provider.on("accountsChanged", (acc) => {
      userAccount = acc[0];
      updateReferralLink();
      updateMyReferralLink();
    });
    provider.on("chainChanged", (id) => {
      if (parseInt(id, 16) !== 56) toast("Please switch back to BSC mainnet");
    });

  } catch (e) {
    console.error(e);
    if (e && e.message && e.message.includes("502") && currentRpcIndex < RPC_ENDPOINTS.length - 1) {
      currentRpcIndex++;
      if (web3Modal && web3Modal.cachedProvider) {
        await web3Modal.clearCachedProvider();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      web3Modal = initWeb3Modal();
      return tryConnect();
    }
    const msg = e && e.message && e.message.includes("502")
      ? "RPC error, please try again later."
      : "Connection failed";
    toast(msg);
  }
}

async function switchToBSC() {
  try {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: "0x38",
        chainName: "Binance Smart Chain",
        rpcUrls: [RPC_ENDPOINTS[0]],
        nativeCurrency: {
          name: "BNB",
          symbol: "BNB",
          decimals: 18
        },
        blockExplorerUrls: ["https://bscscan.com"]
      }]
    });
    return true;
  } catch (err) {
    console.error("Failed to switch network:", err);
    return false;
  }
}

async function disconnectWallet() {
  if (provider && provider.disconnect) {
    try {
      await provider.disconnect();
    } catch (e) {
      console.error(e);
    }
  }
  if (provider && provider.close) {
    try {
      await provider.close();
    } catch (e) {
      console.error(e);
    }
  }
  await web3Modal.clearCachedProvider();
  await new Promise(resolve => setTimeout(resolve, 500));
  provider = null;
  web3 = null;
  btlRoastPadContract = null;
  contract = null;
  userAccount = "";
  document.getElementById("userAccount").innerText = "";
  updateReferralLink();
  updateMyReferralLink();
  resetPlaceholders();
  const connectBtn = document.getElementById("connectWalletBtn");
  if (connectBtn)
    connectBtn.innerText =
      currentLanguage === "en" ? "Connect Wallet" : "連接錢包";
  const menuConnectBtn = document.getElementById("menuConnectBtn");
  if (menuConnectBtn)
    menuConnectBtn.innerText =
      currentLanguage === "en" ? "Connect Wallet" : "連接錢包";
  const networkInfo = document.getElementById("networkInfo");
  if (networkInfo)
    networkInfo.innerText =
      currentLanguage === "en" ? "Not connected" : "未連接";
  updateReferralLink();
  updateMyReferralLink();
  stopAutoRefresh();
  toast("Wallet disconnected");
}

async function getUserInfo(addr) {
  if (!roastPadContract || !web3 || !addr) return;
  let info, yieldAmount, claimed, cooldowns;

  try {
    info = await roastPadContract.methods.users(addr).call();
  } catch (e) {
    console.error("Failed to get user data", e);
    toast(
      currentLanguage === "en"
        ? `Failed to get user info: ${e.message}`
        : `獲取用戶資訊失敗: ${e.message}`
    );
    return;
  }

  try {
    yieldAmount = await roastPadContract.methods.getYield(addr).call();
  } catch (e) {
    console.error("Failed to get yield", e);
    toast(
      currentLanguage === "en" ? `Failed to get yield: ${e.message}` : `獲取收益失敗: ${e.message}`
    );
  }

  try {
    claimed = await roastPadContract.methods
      .getTotalClaimedReferralRewards(addr)
      .call();
  } catch (e) {
    console.error("Failed to get claimed rewards", e);
    toast(
      currentLanguage === "en"
        ? `Failed to get claimed rewards: ${e.message}`
        : `獲取已領取獎勵失敗: ${e.message}`
    );
  }

  try {
    cooldowns = await roastPadContract.methods.getCooldownRemaining(addr).call();
  } catch (e) {
    console.error("Failed to get cooldowns", e);
    toast(
      currentLanguage === "en"
        ? `Failed to get cooldown info: ${e.message}`
        : `獲取冷卻時間失敗: ${e.message}`
    );
  }

  if (info) {
    setPlaceholder("userDeposit", fromWeiFormatted(info.deposit));
    setPlaceholder("userReferral", fromWeiFormatted(info.referralRewards));
  }
  if (yieldAmount) {
    setPlaceholder("userYield", fromWeiFormatted(yieldAmount));
  }
  if (claimed) {
    setPlaceholder("userReferralClaimed", fromWeiFormatted(claimed));
  }
  if (cooldowns) {
    const { depositCooldownRemaining, withdrawalCooldownRemaining } = cooldowns;
    setPlaceholder("depositCooldown", formatDuration(depositCooldownRemaining));
    setPlaceholder(
      "withdrawCooldown",
      formatDuration(withdrawalCooldownRemaining)
    );
  }
}


/* ===== RoastPad ===== */
async function depositBNB() {
  if (!ROASTPAD_LIVE) {
    toast(currentLanguage === "en" ? "BNB deposit not available" : "BNB\u5b58\u6b3e\u672a\u555f\u7528");
    return;
  }
  if (!web3 || !userAccount) {
    toast(currentLanguage === "en" ? "Please connect wallet" : "請連接錢包");
    return;
  }
  if (cooldownActive) return;
  const amount = document.getElementById("depositAmount").value;
  const ref = document.getElementById("referrer")?.value.trim() || "";

  if (!amount || parseFloat(amount) <= 0) {
    toast(currentLanguage === "en" ? "Enter deposit amount" : "請輸入存款數量");
    return;
  }
  if (parseFloat(amount) < 0.01) {
    toast(
      currentLanguage === "en"
        ? "Minimum deposit is 0.01 BNB"
        : "最低存入金額為 0.01 BNB"
    );
    return;
  }
  const btnId = "depositBnbBtn";
  const btn = document.getElementById(btnId);
  if (btn && btn.dataset.loading === "true") return;
  showLoading(btnId);
  try {
    const refAddr =
      web3 &&
      web3.utils &&
      typeof web3.utils.isAddress === "function" &&
      web3.utils.isAddress(referrer)
        ? referrer
        : "0x0000000000000000000000000000000000000000";
    await roastPadContract.methods
      .deposit(refAddr)
      .send({ from: userAccount, value: web3.utils.toWei(amount, "ether"), gas: 300000 });
    if (typeof updateUserInfo === "function") updateUserInfo();
    toast(currentLanguage === "en" ? "Deposit successful!" : "存款成功!");
  } catch (e) {
    console.error(e);
    toast(currentLanguage === "en" ? "Transaction failed" : "交易失敗");
  } finally {
    hideLoading(btnId);
  }
}

async function withdrawBNB() {
  if (!ROASTPAD_LIVE) {
    toast(currentLanguage === "en" ? "BNB deposit not available" : "BNB\u5b58\u6b3e\u672a\u555f\u7528");
    return;
  }
  if (!web3 || !userAccount) {
    toast(currentLanguage === "en" ? "Please connect wallet" : "請連接錢包");
    return;
  }
  if (cooldownActive) return;
  const btnId = "withdrawBnbBtn";
  const btn = document.getElementById(btnId);
  if (btn && btn.dataset.loading === "true") return;
  showLoading(btnId);
  try {
    await roastPadContract.methods.withdraw().send({ from: userAccount, gas: 300000 });
    if (typeof updateUserInfo === "function") updateUserInfo();
    toast(currentLanguage === "en" ? "Withdraw all successful!" : "提取全部成功!");
  } catch (e) {
    console.error(e);
    toast(currentLanguage === "en" ? "Transaction failed" : "交易失敗");
  } finally {
    hideLoading(btnId);
  }
}

async function claimReferralRewards() {
  if (!ROASTPAD_LIVE) {
    toast(currentLanguage === "en" ? "BNB deposit not available" : "BNB\u5b58\u6b3e\u672a\u555f\u7528");
    return;
  }
  if (!web3 || !userAccount) {
    toast(currentLanguage === "en" ? "Please connect wallet" : "請連接錢包");
    return;
  }
  if (cooldownActive) return;
  const btnId = "claimReferralBtn";
  const btn = document.getElementById(btnId);
  if (btn && btn.dataset.loading === "true") return;
  showLoading(btnId);
  try {
    await roastPadContract.methods
      .claimReferralRewards()
      .send({ from: userAccount, gas: 300000 });
    if (typeof updateUserInfo === "function") updateUserInfo();
    toast(currentLanguage === "en" ? "Rewards claimed!" : "獎勵已領取!");
  } catch (e) {
    console.error(e);
    toast(currentLanguage === "en" ? "Transaction failed" : "交易失敗");
  } finally {
    hideLoading(btnId);
  }
}

async function depositBTLRoast() {
  if (!web3 || !userAccount) {
    toast(currentLanguage === "en" ? "Please connect wallet" : "請連接錢包");
    return;
  }
  if (cooldownActive) return;
  const amount = document.getElementById("btlDepositAmount").value;
  const ref = document.getElementById("btlReferrer")?.value.trim() || "";
  if (!amount || parseFloat(amount) <= 0) {
    toast(currentLanguage === "en" ? "Enter deposit amount" : "請輸入存款數量");
    return;
  }
  const btnId = "depositBtlBtn";
  const btn = document.getElementById(btnId);
  if (btn && btn.dataset.loading === "true") return;
  showLoading(btnId);
  try {
    const weiAmount = web3.utils.toWei(amount, "ether");
    const token = new web3.eth.Contract(ERC20_ABI, CONTRACT_ADDRESS);
    await token.methods
      .approve(BTL_ROASTPAD_ADDRESS, weiAmount)
      .send({ from: userAccount });
    const refAddr =
      web3 &&
      web3.utils &&
      typeof web3.utils.isAddress === "function" &&
      web3.utils.isAddress(ref)
        ? ref
        : "0x0000000000000000000000000000000000000000";
    await btlRoastPadContract.methods
      .deposit(refAddr, weiAmount)
      .send({ from: userAccount, gas: 300000 });
    if (typeof updateBtlUserInfo === "function") updateBtlUserInfo();
    toast(currentLanguage === "en" ? "Deposit successful!" : "存款成功!");
  } catch (e) {
    console.error(e);
    toast(currentLanguage === "en" ? "Transaction failed" : "交易失敗");
  } finally {
    hideLoading(btnId);
  }
}

async function withdrawBTLRoast() {
  if (!web3 || !userAccount) {
    toast(currentLanguage === "en" ? "Please connect wallet" : "請連接錢包");
    return;
  }
  if (cooldownActive) return;
  const btnId = "withdrawBtlBtn";
  const btn = document.getElementById(btnId);
  if (btn && btn.dataset.loading === "true") return;
  showLoading(btnId);
  try {
    await btlRoastPadContract.methods
      .withdraw()
      .send({ from: userAccount, gas: 300000 });
    if (typeof updateBtlUserInfo === "function") updateBtlUserInfo();
    toast(currentLanguage === "en" ? "Withdraw all successful!" : "提取全部成功!");
  } catch (e) {
    console.error(e);
    toast(currentLanguage === "en" ? "Transaction failed" : "交易失敗");
  } finally {
    hideLoading(btnId);
  }
}

async function claimBtlReferralRewards() {
  if (!web3 || !userAccount) {
    toast(currentLanguage === "en" ? "Please connect wallet" : "請連接錢包");
    return;
  }
  if (cooldownActive) return;
  const btnId = "claimBtlReferralBtn";
  const btn = document.getElementById(btnId);
  if (btn && btn.dataset.loading === "true") return;
  showLoading(btnId);
  try {
    await btlRoastPadContract.methods
      .claimReferralRewards()
      .send({ from: userAccount, gas: 300000 });
    if (typeof updateBtlUserInfo === "function") updateBtlUserInfo();
    toast(currentLanguage === "en" ? "Rewards claimed!" : "獎勵已領取!");
  } catch (e) {
    console.error(e);
    toast(currentLanguage === "en" ? "Transaction failed" : "交易失敗");
  } finally {
    hideLoading(btnId);
  }
}

async function getBtlUserInfo(addr) {
  if (!btlRoastPadContract || !web3 || !addr) return;
  let info, yieldAmount, claimed, cooldowns;

  try {
    info = await btlRoastPadContract.methods.users(addr).call();
  } catch (e) {
    console.error("Failed to get BTL user data", e);
    toast(
      currentLanguage === "en"
        ? `Failed to get user info: ${e.message}`
        : `獲取用戶資訊失敗: ${e.message}`
    );
    return;
  }

  try {
    yieldAmount = await btlRoastPadContract.methods.getYield(addr).call();
  } catch (e) {
    console.error("Failed to get BTL yield", e);
    toast(
      currentLanguage === "en" ? `Failed to get yield: ${e.message}` : `獲取收益失敗: ${e.message}`
    );
  }

  try {
    claimed = await btlRoastPadContract.methods
      .getTotalClaimedReferralRewards(addr)
      .call();
  } catch (e) {
    console.error("Failed to get claimed BTL rewards", e);
    toast(
      currentLanguage === "en"
        ? `Failed to get claimed rewards: ${e.message}`
        : `獲取已領取獎勵失敗: ${e.message}`
    );
  }

  try {
    cooldowns = await btlRoastPadContract.methods.getCooldownRemaining(addr).call();
  } catch (e) {
    console.error("Failed to get BTL cooldowns", e);
    toast(
      currentLanguage === "en"
        ? `Failed to get cooldown info: ${e.message}`
        : `獲取冷卻時間失敗: ${e.message}`
    );
  }

  if (info) {
    setPlaceholder("btlUserDeposit", fromWeiFormatted(info.deposit));
    setPlaceholder("btlUserReferral", fromWeiFormatted(info.referralRewards));
  }
  if (yieldAmount) {
    setPlaceholder("btlUserYield", fromWeiFormatted(yieldAmount));
  }
  if (claimed) {
    setPlaceholder("btlUserReferralClaimed", fromWeiFormatted(claimed));
  }
  if (cooldowns) {
    const { depositCooldownRemaining, withdrawalCooldownRemaining } = cooldowns;
    setPlaceholder("btlDepositCooldown", formatDuration(depositCooldownRemaining));
    setPlaceholder(
      "btlWithdrawCooldown",
      formatDuration(withdrawalCooldownRemaining)
    );
  }
}

async function refreshInfo() {
  const btnId = "refreshInfoBtn";
  const btn = document.getElementById(btnId);
  if (btn && btn.dataset.loading === "true") return;
  showLoading(btnId);
  try {
    if (typeof updateUserInfo === "function") await updateUserInfo();
    if (typeof updateBtlUserInfo === "function") await updateBtlUserInfo();
  } catch (e) {
    console.error("Failed to refresh info", e);
    toast(
      currentLanguage === "en"
        ? `Failed to refresh: ${e.message}`
        : `刷新失敗: ${e.message}`
    );
  } finally {
    hideLoading(btnId);
  }
}
/* ===== PancakeSwap Link ===== */
function openPancakeSwap() {
  const url = `https://pancakeswap.finance/swap?outputCurrency=${CONTRACT_ADDRESS}&chain=bsc`;
  window.open(url, "_blank");
}

async function depositBTL() {
  const amountEl = document.getElementById("depositAmount");
  const refEl = document.getElementById("referrer");
  if (!amountEl || !depositContract || !web3) return;
  const amountStr = amountEl.value.trim();
  const amount = parseFloat(amountStr);
  if (!amountStr || isNaN(amount) || amount < 0.05) {
    toast("请输入存款数量");
    return;
  }
  if (cooldownActive) return;
  const btn = document.getElementById("depositBtn");
  if (btn && btn.dataset.loading === "true") return;
  showLoading("depositBtn");
  try {
    const weiAmount = web3.utils.toWei(amountStr, "ether");
    const referrer = refEl ? refEl.value.trim() : "";
    const refAddr =
      web3 &&
      web3.utils &&
      typeof web3.utils.isAddress === "function" &&
      web3.utils.isAddress(referrer)
        ? referrer
        : "0x0000000000000000000000000000000000000000";
    await depositContract.methods
      .depositBTL(weiAmount, refAddr)
      .send({ from: userAccount, gas: 300000 });
    if (typeof updateUserInfo === "function") updateUserInfo();
    toast(currentLanguage === "en" ? "Deposit successful" : "存款成功");
  } catch (e) {
    console.error(e);
    const msg = e && e.message ? e.message : currentLanguage === "en" ? "Deposit failed" : "存款失败";
    toast(msg);
  } finally {
    hideLoading("depositBtn");
  }
}

function updateMyReferralLink() {
  const myLink = document.getElementById("myReferralLink");
  const refLink = document.getElementById("referralLink");
  if (userAccount) {
    const url = new URL(window.location.href);
    url.searchParams.set("ref", userAccount);
    const link = url.toString();
    if (myLink) {
      myLink.innerText =
        currentLanguage === "en"
          ? `Your referral link: ${link}`
          : `你的推薦連結: ${link}`;
      myLink.dataset.full = link;
    }
    if (refLink) {
      refLink.innerText = link;
      refLink.dataset.full = link;
    }
  } else {
    if (myLink) myLink.innerText = "";
    if (refLink) {
      refLink.innerText = "";
      refLink.dataset.full = "";
    }
  }
}

/* ===== Copy helper ===== */
function copyToClipboard(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const text = el.dataset.full || el.innerText;
  navigator.clipboard
    .writeText(text)
    .then(() =>
      toast(currentLanguage === "en" ? "Copied!" : "已複製！")
    );
}

function updateReferralLink() {
  const el = document.getElementById("referralLink");
  if (!el) return;
  if (!userAccount) {
    el.innerText = "";
    el.dataset.full = "";
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.set("ref", userAccount);
  el.innerText = url.toString();
  el.dataset.full = url.toString();
}

function applyReferrerFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  if (ref) {
    const input = document.getElementById("referrer");
    if (input && !input.value) input.value = ref;
    const btlInput = document.getElementById("btlReferrer");
    if (btlInput && !btlInput.value) btlInput.value = ref;
  }
}

/* ===== Dark mode ===== */
if (typeof window !== "undefined" && window)
  window.onload = async () => {
    document.body.classList.add("dark-mode"); // 預設啟用深色模式
    applyContractAddress();
    updateLanguage();
    updateReferralLink();
    updateMyReferralLink();
    applyReferrerFromUrl();
    // 動態加載 ABI
    ABI = (await fetch("contract.json").then((r) => r.json())).abi;

    // Automatically reconnect if provider was cached
    if (web3Modal && web3Modal.cachedProvider) {
      tryConnect().catch(console.error);
    }
  };

// 放在 script.js 的結尾
if (typeof window !== "undefined" && window.addEventListener)
  window.addEventListener("DOMContentLoaded", (event) => {
    applyContractAddress();
    applyReferrerFromUrl();
    updateReferralLink();
    updateMyReferralLink();

    // Side menu controls
    const menuToggle = document.getElementById("menuToggle");
    const sideMenu = document.getElementById("sideMenu");
    const menuOverlay = document.getElementById("menuOverlay");
    if (menuToggle && sideMenu && menuOverlay) {
      const openMenu = () => {
        sideMenu.classList.add("open");
        menuOverlay.classList.add("active");
      };
      const closeMenu = () => {
        sideMenu.classList.remove("open");
        menuOverlay.classList.remove("active");
      };
      menuToggle.addEventListener("click", openMenu);
      menuOverlay.addEventListener("click", closeMenu);
      sideMenu
        .querySelectorAll("a, button")
        .forEach((a) => a.addEventListener("click", closeMenu));
    }

});

// Expose functions for testing
function __setWeb3(w) { web3 = w; }
function __setContract(c) { depositContract = c; }
function __setUpdateUserInfo(fn) { updateUserInfo = fn; }
function __setUpdateBtlUserInfo(fn) { updateBtlUserInfo = fn; }

if (typeof module !== 'undefined') {
  module.exports = {
    depositBTL,
    depositBNB,
    depositBTLRoast,
    withdrawBNB,
    withdrawBTLRoast,
    withdraw: withdrawBNB,
    claimReferralRewards,
    claimBtlReferralRewards,
    refreshInfo,
    getUserInfo,
    getBtlUserInfo,
    __setContract,
    __setWeb3,
    __setUpdateUserInfo,
    __setUpdateBtlUserInfo,
  };
}
