// 语言切换功能
let currentLanguage = localStorage.getItem("language") || "en";

function switchLanguage() {
  currentLanguage = currentLanguage === "en" ? "zh" : "en";
  localStorage.setItem("language", currentLanguage);
  updateLanguage();
}

function updateLanguage() {
  // 更新页面中所有需要翻译的内容
  document.getElementById("networkInfo").innerText =
    currentLanguage === "en" ? "Connecting..." : "連接中...";

  document.getElementById("connectWalletBtn").innerText =
    currentLanguage === "en" ? "Connect Wallet" : "連接錢包";
  document.getElementById("contractInfoTitle").innerText =
    currentLanguage === "en" ? "Contract Information" : "合約信息";
  document.getElementById("depositLabel").innerText =
    currentLanguage === "en" ? "Deposit BNB" : "存入 BNB";
  document.getElementById("depositBtn").innerText =
    currentLanguage === "en" ? "Deposit" : "存入";
  document.getElementById("footerText").innerText =
    currentLanguage === "en" ? "© 2025 BitLuck | All rights reserved" : "© 2025 BitLuck | 版權所有";
  // 可以继续添加更多需要翻译的内容
}

// 切换深色模式
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
}

// 初始加载时判断是否开启深色模式
if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark-mode");
}

// 通过 URL 参数自动填充推荐链接
const urlParams = new URLSearchParams(window.location.search);
const referrer = urlParams.get("ref");
if (referrer) {
  document.getElementById("referrer").value = referrer;
}

// 复制文本到剪贴板
function copyToClipboard(id) {
  const textToCopy = document.getElementById(id).innerText;
  navigator.clipboard.writeText(textToCopy).then(() => {
    alert(currentLanguage === "en" ? "Copied to clipboard!" : "已複製到剪貼板！");
  });
}

// 连接钱包并验证网络
async function connectWallet() {
  if (window.ethereum) {
    provider = new Web3(window.ethereum);
    await window.ethereum.enable();
    contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);
    const accounts = await web3.eth.getAccounts();
    userAccount = accounts[0];
    document.getElementById("userAccount").innerText = userAccount;

    const networkId = await web3.eth.net.getId();
    if (networkId !== 56) {
      alert(currentLanguage === "en" ? "Please switch to BSC Mainnet" : "請切換到 BSC 主網");
      return;
    }

    // Listen for account changes
    provider.on("accountsChanged", (accounts) => {
      userAccount = accounts[0];
      updateUserInfo();
    });

    // Listen for network changes
    provider.on("chainChanged", (chainIdHex) => {
      const chainId = parseInt(chainIdHex, 16);
      if (chainId !== 56) {
        alert(currentLanguage === "en" ? "Please switch back to BSC Mainnet" : "請切回 BSC 主網");
      }
    });

    updateUserInfo();
    updateContractInfo();
  } else {
    alert("Please install MetaMask or another Web3 wallet.");
  }
}

// 更新用户信息
async function updateUserInfo() {
  const bal = await contract.methods.balanceOf(userAccount).call();
  document.getElementById("userBalance").innerText = bal;

  const dep = await contract.methods.getUserBNBDeposits(userAccount).call();
  document.getElementById("userBNBDeposit").innerText = web3.utils.fromWei(dep, "ether");

  const ref = await contract.methods.getReferralLink(userAccount).call();
  document.getElementById("referralUrl").innerText = ref;
}

// 存入 BNB
async function depositBNB() {
  const amt = document.getElementById("depositAmount").value;
  const referrer = document.getElementById("referrer").value;  // 获取推荐人地址
  if (!amt || parseFloat(amt) < 0.02) {
    alert(currentLanguage === "en" ? "Minimum deposit is 0.02 BNB." : "最低存入 0.02 BNB。");
    return;
  }
  try {
    await contract.methods.depositBNB(referrer).send({
      from: userAccount,
      value: web3.utils.toWei(amt, "ether")
    });
    alert(currentLanguage === "en" ? "Deposit successful!" : "存款成功！");
    updateUserInfo();
  } catch (e) {
    console.error("depositBNB error:", e);
    alert(currentLanguage === "en" ? "Deposit failed." : "存款失敗。");
  }
}

// 获取用户累计的 USD1 奖励
async function getAccumulatedUsd1(user) {
  const accumulated = await contract.methods.getAccumulatedUsd1(user).call();
  document.getElementById("usd1Earnings").innerText = accumulated;
}

// 获取用户每日可获得的 BNB 奖励
async function getDailyBnbReward(user) {
  const dailyReward = await contract.methods.dailyBnbReward(user).call();
  document.getElementById("dailyBnbReward").innerText = web3.utils.fromWei(dailyReward, "ether");
}

// 更新倒计时
async function updateCountdowns() {
  const u = await contract.methods.getUSD1RewardCountdown().call();
  const b = await contract.methods.getBNBRewardCountdown().call();
  document.getElementById("usd1Time").innerText = u;
  document.getElementById("bnbTime").innerText = b;
}
setInterval(updateCountdowns, 1000);

// 更新合约信息
async function updateContractInfo() {
  const total = await contract.methods.totalBnbDeposited().call();
  document.getElementById("totalBnbDeposited").innerText = web3.utils.fromWei(total, "ether");

  const th = await contract.methods.getHolderThreshold().call();
  document.getElementById("holderThreshold").innerText = web3.utils.fromWei(th, "ether");

  const min = await contract.methods.minDeposit().call();
  document.getElementById("minDepositAmount").innerText = web3.utils.fromWei(min, "ether");
}
