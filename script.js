/* ===== Web3Modal Multi-wallet setup ===== */
const providerOptions =
  typeof window !== "undefined"
    ? {
        walletconnect: {
          package: window.WalletConnectProvider?.default,
          options: {
            rpc: { 56: "https://bsc-dataseed1.binance.org:443" },
          },
        },
      }
    : {};
const web3Modal =
  typeof window !== "undefined"
    ? new window.Web3Modal.default({
        network: "bsc",
        cacheProvider: true,
        providerOptions,
      })
    : null;
/* ===== State ===== */
let provider, web3, contract;
let userAccount = "";
const CONTRACT_ADDRESS = "0xb9167Fc8B91EdeEee8a03627be20b057Ad9D7316";
let ABI = []; // 从 contract.json 动态加载
let timeUnits = [];
const BTL_DECIMALS = 9; // Number of decimals for BTL token

function formatBTLBalance(balance) {
  try {
    const factor = 10n ** BigInt(BTL_DECIMALS);
    return (BigInt(balance) / factor).toLocaleString("en-US");
  } catch (e) {
    console.error(e);
    return balance;
  }
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
  const fullHistory = document.getElementById("fullHistory");
  if (fullHistory) {
    fullHistory.href = `https://bscscan.com/address/${addr}#events`;
    fullHistory.target = "_blank";
  }
  const bnbScanBtn = document.getElementById("bnbScanBtn");
  if (bnbScanBtn)
    bnbScanBtn.onclick = () =>
      window.open(`https://bscscan.com/address/${addr}`, "_blank");
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
    "bnbTime",
    "userBalance",
    "usd1Earnings",
    "userBNBDeposit",
    "bnbEarnings",
    "walletBnb",
    "walletUsd1",
    "referralUrl",
    "referralCount",
    "referralBNB",
    "poolAmount",
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

  const menuWhitepaper = document.getElementById("menuWhitepaper");
  if (menuWhitepaper) {
    menuWhitepaper.innerText = lang ? "Whitepaper" : "白皮書";
    menuWhitepaper.href = lang
      ? "https://bitluck.notion.site/whitepaper-en"
      : "https://bitluck.notion.site/whitepaper-cn";
    menuWhitepaper.target = "_blank";
  }

  const menuDocs = document.getElementById("menuDocs");
  if (menuDocs) {
    menuDocs.innerText = lang ? "Docs" : "文檔";
    menuDocs.href = lang
      ? "https://bitluck.notion.site/"
      : "https://bitluck.notion.site/overview-cn";
    menuDocs.target = "_blank";
  }

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
    lang ? "Next USD1 Reward:" : "下次 USD1 分紅:",
  );

  setLabel("bnbCountdownLabel", lang ? "Next BNB Reward:" : "下次 BNB 分紅:");

  const userInfoTitle = document.getElementById("userInfoTitle");
  if (userInfoTitle)
    userInfoTitle.innerText = lang ? "Your Asset Status" : "你的資產狀況";

  setLabel("userBalanceLabel", lang ? "Your BTL Balance:" : "你的 BTL 餘額:");

  setLabel(
    "usd1EarningsLabel",
    lang ? "Your USD1 Earnings:" : "你的 USD1 累計收益:",
  );

  setLabel(
    "userBNBDepositLabel",
    lang ? "Your BNB Deposit:" : "你的 BNB 累計存款:",
  );

  setLabel(
    "bnbEarningsLabel",
    lang ? "Estimated Daily BNB:" : "預估每日 BNB 收益:",
  );

  setLabel("walletBnbLabel", lang ? "Wallet BNB:" : "錢包 BNB：");

  setLabel("walletUsd1Label", lang ? "Wallet USD1:" : "錢包 USD1：");

  setLabel("depositLabel", lang ? "Deposit BNB" : "存入 BNB");

  const footerText = document.getElementById("footerText");
  if (footerText)
    footerText.innerText = lang
      ? "© 2025 BitLuck | All rights reserved"
      : "© 2025 BitLuck | 版權所有";

  // Form placeholders and buttons
  const depositAmount = document.getElementById("depositAmount");
  if (depositAmount)
    depositAmount.setAttribute(
      "placeholder",
      lang ? "Enter BNB to deposit" : "輸入要存入的 BNB 金額",
    );

  const referrer = document.getElementById("referrer");
  if (referrer)
    referrer.setAttribute(
      "placeholder",
      lang ? "Enter referrer address (optional)" : "輸入推薦人地址（可選）",
    );

  const depositBtn = document.getElementById("depositBtn");
  if (depositBtn) depositBtn.innerText = lang ? "Deposit" : "存入";

  // Referral section
  const referralLink = document.getElementById("referralLink");
  if (referralLink)
    referralLink.innerText = lang ? "Your Referral Link:" : "你的推薦鏈接：";

  const copyLinkBtn = document.getElementById("copyLinkBtn");
  if (copyLinkBtn) copyLinkBtn.innerText = lang ? "Copy Link" : "複製鏈接";

  const referralUrlLabel = document.getElementById("referralUrlLabel");
  if (referralUrlLabel)
    referralUrlLabel.innerText = lang ? "Referral URL:" : "推薦鏈接:";

  const referralCountLabel = document.getElementById("referralCountLabel");
  if (referralCountLabel)
    referralCountLabel.innerText = lang ? "Total Referrals:" : "推薦總數:";

  setLabel("referralBNBLabel", lang ? "BNB from Referrals:" : "推薦收益 BNB:");

  const referralCountUnit = document.getElementById("referralCountUnit");
  if (referralCountUnit) referralCountUnit.innerText = lang ? " times" : " 次";

  setLabel("minDepositUnit", lang ? "BNB minimum" : "BNB 起");

  // Pool statistics section
  const poolStatsTitle = document.getElementById("poolStatsTitle");
  if (poolStatsTitle)
    poolStatsTitle.innerText = lang ? "Pool Statistics" : "獎池統計";

  setLabel("currentPoolLabel", lang ? "Current BNB Pool:" : "當前 BNB 獎池:");

  setLabel("usd1PoolLabel", lang ? "Current USD1 Pool:" : "當前 USD1 獎池:");

  const lastWinnerLabel = document.getElementById("lastWinnerLabel");
  if (lastWinnerLabel)
    lastWinnerLabel.innerText = lang ? "Last Winner:" : "上一位贏家：";

  const fullHistory = document.getElementById("fullHistory");
  if (fullHistory) {
    fullHistory.innerText = lang ? "Full History" : "完整記錄";
    fullHistory.href = `https://bscscan.com/address/${CONTRACT_ADDRESS}#events`;
    fullHistory.target = "_blank";
  }

  const bnbScanBtn = document.getElementById("bnbScanBtn");
  if (bnbScanBtn)
    bnbScanBtn.innerText = lang ? "View on BscScan" : "在 BscScan 查看";

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

  const whitepaperLink = document.getElementById("whitepaperLink");
  if (whitepaperLink) {
    whitepaperLink.innerText = lang ? "Whitepaper" : "白皮書";
    whitepaperLink.href = lang
      ? "https://bitluck.notion.site/whitepaper-en"
      : "https://bitluck.notion.site/whitepaper-cn";
    whitepaperLink.target = "_blank";
  }

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
  if (document.getElementById("connectWalletBtn").dataset.loading === "true")
    return;
  showLoading("connectWalletBtn");
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
      updateUserInfo();
    });
    provider.on("chainChanged", (id) => {
      if (parseInt(id, 16) !== 56) toast("Please switch back to BSC mainnet");
    });

    updateUserInfo();
    updateContractInfo();
  } catch (e) {
    console.error(e);
    toast("Connection failed");
  } finally {
    hideLoading("connectWalletBtn");
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

/* ===== Update user info ===== */
async function updateUserInfo() {
  if (!userAccount) return;
  resetPlaceholders();
  const bal = await contract.methods.balanceOf(userAccount).call();
  document.getElementById("userBalance").innerText = formatBTLBalance(bal);

  const dep = await contract.methods.getUserBNBDeposits(userAccount).call();
  document.getElementById("userBNBDeposit").innerText = web3.utils.fromWei(
    dep,
    "ether",
  );

  const bnbEarnings = await contract.methods.dailyBnbReward(userAccount).call();
  document.getElementById("bnbEarnings").innerText = bnbEarnings
    ? web3.utils.fromWei(bnbEarnings, "ether")
    : "0";

  const walletBnb = await web3.eth.getBalance(userAccount);
  document.getElementById("walletBnb").innerText = web3.utils.fromWei(
    walletBnb,
    "ether",
  );

  const usd1Earnings = await contract.methods
    .getAccumulatedUsd1(userAccount)
    .call();
  document.getElementById("usd1Earnings").innerText = usd1Earnings
    ? web3.utils.fromWei(usd1Earnings, "ether")
    : "0";

  const usd1Addr = await contract.methods.USD1Address().call();
  const usd1Contract = new web3.eth.Contract(ERC20_ABI, usd1Addr);
  const walletUsd1 = await usd1Contract.methods.balanceOf(userAccount).call();
  document.getElementById("walletUsd1").innerText = web3.utils.fromWei(
    walletUsd1,
    "ether",
  );

  const ref = await contract.methods.getReferralLink(userAccount).call();
  console.log("Referral link:", ref);
  document.getElementById("referralUrl").innerText = ref || "No referral link";

  const count = await contract.methods.getReferralCount(userAccount).call();
  document.getElementById("referralCount").innerText = count;

  const refBnb = await contract.methods
    .getReferralBNBIncome(userAccount)
    .call();
  document.getElementById("referralBNB").innerText = web3.utils.fromWei(
    refBnb,
    "ether",
  );
}

/* ===== Deposit BNB ===== */
async function depositBNB() {
  const btn = "depositBtn";
  if (document.getElementById(btn).dataset.loading === "true") return;
  const amt = document.getElementById("depositAmount").value;
  let ref = document.getElementById("referrer").value; // 取得推薦人地址
  if (!amt || parseFloat(amt) < 0.018) return toast("最低存入 0.02 BNB");
  if (!ref) {
    ref = "0x0000000000000000000000000000000000000000";
  }
  showLoading(btn);
  try {
    await contract.methods.depositBNB(ref).send({
      from: userAccount,
      value: web3.utils.toWei(amt, "ether"),
    });
    toast("存款成功！");
    updateUserInfo();
  } catch (e) {
    console.error(e);
    toast("存款失败");
  } finally {
    hideLoading(btn);
  }
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
  setPlaceholder("bnbTime");
  const u = await contract.methods.getUSD1RewardCountdown().call();
  const b = await contract.methods.getBNBRewardCountdown().call();

  // 假設每個區塊大約 1.5 秒
  const blockTime = 1.5;

  // 轉換倒數區塊數為秒數
  const usd1Countdown = u * blockTime; // USD1獎金倒數時間（秒）
  const bnbCountdown = b * blockTime; // BNB獎金倒數時間（秒）

  // 將秒數轉換為 時：分：秒 格式
  function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600); // 計算小時
    const minutes = Math.floor((seconds % 3600) / 60); // 計算分鐘
    const remainingSeconds = Math.floor(seconds % 60); // 計算秒數
    return `${hours}${timeUnits[0]} ${minutes}${timeUnits[1]} ${remainingSeconds}${timeUnits[2]}`;
  }

  // 更新顯示的時間（倒數時間格式：時：分：秒）
  document.getElementById("usd1Time").innerText = formatTime(usd1Countdown);
  document.getElementById("bnbTime").innerText = formatTime(bnbCountdown);
}

/* ===== Contract overview ===== */
async function updateContractInfo() {
  if (!contract) return;
  const total = await contract.methods.totalBnbDeposited().call();
  const totalBnbElement = document.getElementById("totalBnbDeposited");
  if (totalBnbElement) {
    totalBnbElement.innerText = web3.utils.fromWei(total, "ether");
  }

  const th = await contract.methods.getHolderThreshold().call();
  const thresholdElement = document.getElementById("holderThreshold");
  if (thresholdElement) {
    thresholdElement.innerText = web3.utils.fromWei(th, "ether");
  }

  const min = await contract.methods.minDeposit().call();
  const minDepositElement = document.getElementById("minDepositAmount");
  if (minDepositElement) {
    minDepositElement.innerText = web3.utils.fromWei(min, "ether");
  }
}

/* ===== Pool statistics ===== */
async function updatePoolInfo() {
  if (!contract) return;
  setPlaceholder("poolAmount");
  setPlaceholder("usd1PoolAmount");
  const bal = await contract.methods.getBnbPoolBalance().call();
  const amountEl = document.getElementById("poolAmount");
  if (amountEl) amountEl.innerText = web3.utils.fromWei(bal, "ether");

  const usd1Bal = await contract.methods.getUSD1Balance().call();
  const usd1El = document.getElementById("usd1PoolAmount");
  if (usd1El) usd1El.innerText = web3.utils.fromWei(usd1Bal, "ether");

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
    setInterval(updateUserInfo, USER_INFO_INTERVAL_MS);
  };

// 放在 script.js 的結尾
if (typeof window !== "undefined" && window.addEventListener)
  window.addEventListener("DOMContentLoaded", (event) => {
    applyContractAddress();
    // 自動填充推薦人地址
    const urlParams = new URLSearchParams(window.location.search);
    const referrer = urlParams.get("ref");
    if (referrer) {
      document.getElementById("referrer").value = referrer; // 將 ref 參數填充到推薦人輸入框
    }

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
    updateContractInfo();
  });
