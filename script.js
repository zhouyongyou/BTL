/* ===== Web3Modal Multi-wallet setup ===== */
const RPC_ENDPOINTS = [
  "https://bsc-dataseed1.binance.org:443"
];
let currentRpcIndex = 0;

function buildProviderOptions() {
  return {
    walletconnect: {
      package: window.WalletConnectProvider?.default,
      options: {
        rpc: { 56: RPC_ENDPOINTS[currentRpcIndex] },
      },
    },
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
let provider, web3, contract;
let userAccount = "";
const CONTRACT_ADDRESS = "0xac3789a484f4585bc7e30ec25b167a51ea2211d0";
let ABI = []; // 从 contract.json 动态加载
let timeUnits = [];
const BTL_DECIMALS = 9; // Number of decimals for BTL token
const IS_UPGRADING = false; // Flag to disable contract interactions during upgrade

function handleUpgradeNotice() {
  if (!IS_UPGRADING) return;
  const msg =
    currentLanguage === "en"
      ? "Contract is upgrading. Please try again later."
      : "合約升級中，請稍後再試。";
  toast(msg);
}

function formatBTLBalance(balance) {
  try {
    const factor = 10n ** BigInt(BTL_DECIMALS);
    return (BigInt(balance) / factor).toLocaleString("en-US");
  } catch (e) {
    console.error(e);
    return balance;
  }
}

function formatNumber(value, decimals = 4) {
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  const fixed = num.toFixed(decimals);
  return fixed.replace(/0+$/, "").replace(/\.$/, "");
}

function fromWeiFormatted(value, decimals = 4) {
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
];

function formatAddress(addr) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function applyContractAddress() {
  const addr = CONTRACT_ADDRESS;
  const link = `https://pancakeswap.finance/swap?outputCurrency=${addr}&chain=bsc&inputCurrency=0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d`;
  const menuBuyBtn = document.getElementById("menuBuyBtn");
  if (menuBuyBtn) menuBuyBtn.onclick = () => window.open(link, "_blank");
  const buyBtlBtn = document.getElementById("buyBtlBtn");
  if (buyBtlBtn) buyBtlBtn.onclick = () => window.open(link, "_blank");
  const contractAddr = document.getElementById("contractAddr");
  if (contractAddr) contractAddr.innerText = addr;
  const usd1History = document.getElementById("usd1History");
  if (usd1History) {
    usd1History.href =
      `https://bscscan.com/advanced-filter?tkn=0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d&txntype=2&fadd=${addr}&tadd=!${addr}`;
    usd1History.target = "_blank";
  }
  const usd1ScanBtn = document.getElementById("usd1ScanBtn");
  if (usd1ScanBtn)
    usd1ScanBtn.onclick = () =>
      window.open(`https://bscscan.com/token/0x8d0d000ee44948fc98c9b98a4fa4921476f08b0d?a=${addr}`, "_blank");
}

/* ===== Placeholder helpers ===== */
function setPlaceholder(id, value = "-") {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}

function resetPlaceholders() {
  [
    "usd1Time",
    "usd1Earnings",
    "usd1PoolAmount",
  ].forEach((id) => setPlaceholder(id));
}

// 可調整的更新頻率（毫秒）
const COUNTDOWN_INTERVAL_MS = 1000; // 倒數更新間隔
const POOL_INFO_INTERVAL_MS = 30000; // 池子資訊更新間隔
const USER_INFO_INTERVAL_MS = 30000; // 用戶資訊更新間隔
/* ===== Toast ===== */
function toast(msg) {
  const t = document.getElementById("toast");
  t.innerText = msg;
  t.style.display = "block";
  clearTimeout(t.timer);
  t.timer = setTimeout(() => (t.style.display = "none"), 3000);
}

/* ===== Loading helpers ===== */
function showLoading(btnId) {
  const b = document.getElementById(btnId);
  b.classList.add("loading");
  b.dataset.loading = "true";
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

  const countdownTitle = document.getElementById("countdownTitle");
  if (countdownTitle)
    countdownTitle.innerText = lang ? "Reward Countdowns" : "分紅倒數";

  setLabel(
    "usd1CountdownLabel",
    lang ? " Next USD1 Reward:" : " 下次 USD1 分紅:",
  );

  const footerText = document.getElementById("footerText");
  if (footerText)
    footerText.innerText = lang
      ? "© 2025 BitLuck | All rights reserved"
      : "© 2025 BitLuck | 版權所有";


  // Pool statistics section
  const poolStatsTitle = document.getElementById("poolStatsTitle");
  if (poolStatsTitle)
    poolStatsTitle.innerText = lang ? "Pool Statistics" : "獎池統計";

  setLabel("usd1PoolLabel", lang ? "Current USD1 Pool:" : "當前 USD1 獎池:");

  const lastWinnerLabel = document.getElementById("lastWinnerLabel");
  if (lastWinnerLabel)
    lastWinnerLabel.innerText = lang ? "Last Winner:" : "上一位贏家：";
  const usd1History = document.getElementById("usd1History");
  if (usd1History) {
    usd1History.innerText = lang ? "USD1 Pool History" : "USD1 獎池發放紀錄";
    usd1History.href = `https://bscscan.com/advanced-filter?tkn=0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d&txntype=2&fadd=${CONTRACT_ADDRESS}&tadd=!${CONTRACT_ADDRESS}`;
    usd1History.target = "_blank";
  }
  const usd1ScanBtn = document.getElementById("usd1ScanBtn");
  if (usd1ScanBtn)
    usd1ScanBtn.innerText = lang ? "View on BscScan" : "在 BscScan 查看";

  const contractAddrEl = document.getElementById("contractAddr");
  if (contractAddrEl) contractAddrEl.innerText = CONTRACT_ADDRESS;
  const bscScanLink = document.getElementById("bscScanLink");
  if (bscScanLink)
    bscScanLink.href = `https://bscscan.com/token/${CONTRACT_ADDRESS}`;

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
}

/* ===== Connect wallet ===== */
async function connectWallet() {
  if (userAccount) {
    return disconnectWallet();
  }
  const btn = document.getElementById("connectWalletBtn");
  if (btn.dataset.loading === "true") return;
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
      toast("Please switch to BSC mainnet");
      return;
    }
    contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);
    userAccount = (await web3.eth.getAccounts())[0];
    document.getElementById("userAccount").innerText = userAccount;
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
    toast("Wallet connected successfully!");

    provider.on("accountsChanged", (acc) => {
      userAccount = acc[0];
      updatePoolInfo();
    });
    provider.on("chainChanged", (id) => {
      if (parseInt(id, 16) !== 56) toast("Please switch back to BSC mainnet");
    });

    updatePoolInfo();
  } catch (e) {
    console.error(e);
    if (e && e.message && e.message.includes("502") && currentRpcIndex < RPC_ENDPOINTS.length - 1) {
      currentRpcIndex++;
      web3Modal = initWeb3Modal();
      return tryConnect();
    }
    const msg = e && e.message && e.message.includes("502")
      ? "RPC error, please try again later."
      : "Connection failed";
    toast(msg);
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
  provider = null;
  web3 = null;
  contract = null;
  userAccount = "";
  document.getElementById("userAccount").innerText = "";
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
  toast("Wallet disconnected");
}


/* ===== PancakeSwap Link ===== */
function openPancakeSwap() {
  const url = `https://pancakeswap.finance/swap?outputCurrency=${CONTRACT_ADDRESS}&chain=bsc&inputCurrency=0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d`;
  window.open(url, "_blank");
}

/* ===== Countdown ===== */
async function updateCountdowns() {
  if (!contract) return;
  setPlaceholder("usd1Time");
  const u = await contract.methods.blocksUntilNextDraw().call();

  // 假設每個區塊大約 1.5 秒
  const blockTime = 1.5;

  // 轉換倒數區塊數為秒數
  const usd1Countdown = u * blockTime; // USD1獎金倒數時間（秒）

  // 將秒數轉換為 時：分：秒 格式
  function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600); // 計算小時
    const minutes = Math.floor((seconds % 3600) / 60); // 計算分鐘
    const remainingSeconds = Math.floor(seconds % 60); // 計算秒數
    return `${hours}${timeUnits[0]} ${minutes}${timeUnits[1]} ${remainingSeconds}${timeUnits[2]}`;
  }

  // 更新顯示的時間（倒數時間格式：時：分：秒）
  document.getElementById("usd1Time").innerText = formatTime(usd1Countdown);
}


/* ===== Pool statistics ===== */
async function updatePoolInfo() {
  if (!contract) return;
  setPlaceholder("usd1PoolAmount");

  const usd1Bal = await contract.methods.getUSD1Balance().call();
  const usd1El = document.getElementById("usd1PoolAmount");
  if (usd1El) usd1El.innerText = fromWeiFormatted(usd1Bal);

  try {
  } catch (e) {
    console.error(e);
  }
}

/* ===== Copy helper ===== */
function copyToClipboard(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const text = el.dataset.full || el.innerText;
  navigator.clipboard.writeText(text).then(() => toast("Copied!"));
}

/* ===== Dark mode ===== */
if (typeof window !== "undefined" && window)
  window.onload = async () => {
    document.body.classList.add("dark-mode"); // 預設啟用深色模式
    applyContractAddress();
    updateLanguage();
    // 動態加載 ABI
    ABI = (await fetch("contract.json").then((r) => r.json())).abi;
    if (web3Modal.cachedProvider) connectWallet();
    setInterval(updateCountdowns, COUNTDOWN_INTERVAL_MS);
    updatePoolInfo();
    setInterval(updatePoolInfo, POOL_INFO_INTERVAL_MS);
  };

// 放在 script.js 的結尾
if (typeof window !== "undefined" && window.addEventListener)
  window.addEventListener("DOMContentLoaded", (event) => {
    applyContractAddress();

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

  // 更新其他信息
  updatePoolInfo();
});

// Expose functions for testing
function __setWeb3(w) { web3 = w; }

if (typeof module !== 'undefined') {
  module.exports = { __setWeb3 };
}
