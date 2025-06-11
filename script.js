// Web3Modal 配置
const providerOptions = {
  walletconnect: {
    package: WalletConnectProvider, // required
    options: {
      rpc: {
        56: "https://bsc-dataseed1.binance.org:443", // BSC 主网 RPC
      },
    },
  },
  // 更多钱包提供商
};

const web3Modal = new Web3Modal({
  network: "bsc",            // 可选: "mainnet", "ropsten" 等
  cacheProvider: true,       // 保持用户钱包缓存
  providerOptions,           // 必需的
});

// 设置当前语言，默认为英文
let currentLanguage = "en"; // 默认英文，语言选择切换功能已去除

// 更新页面中的语言
function updateLanguage() {
  // 只支持英文和中文，默认为英文
  document.getElementById("networkInfo").innerText = currentLanguage === "en" ? "Connecting..." : "連接中...";
  document.getElementById("connectWalletBtn").innerText = currentLanguage === "en" ? "Connect Wallet" : "連接錢包";
  document.getElementById("contractInfoTitle").innerText = currentLanguage === "en" ? "Contract Information" : "合約信息";
  document.getElementById("btlAddressLabel").innerText = currentLanguage === "en" ? "BTL Contract Address:" : "BTL 合約地址：";
  document.getElementById("usd1CountdownLabel").innerText = currentLanguage === "en" ? "Next USD1 Reward:" : "下次 USD1 分紅：";
  document.getElementById("bnbCountdownLabel").innerText = currentLanguage === "en" ? "Next BNB Reward:" : "下次 BNB 分紅：";
  document.getElementById("depositLabel").innerText = currentLanguage === "en" ? "Deposit BNB" : "存入 BNB";
  document.getElementById("depositBtn").innerText = currentLanguage === "en" ? "Deposit" : "存入";
  document.getElementById("footerText").innerText = currentLanguage === "en" ? "© 2025 BitLuck | All rights reserved" : "© 2025 BitLuck | 版權所有";
  document.getElementById("referrerLabel").innerText = currentLanguage === "en" ? "Referral (optional)" : "推薦人（可選）";
  document.getElementById("copyContractBtn").innerText = currentLanguage === "en" ? "Copy Address" : "複製地址";
  document.getElementById("copyReferralBtn").innerText = currentLanguage === "en" ? "Copy Link" : "複製鏈接";
}

// 强制应用深色模式
function applyDarkMode() {
  document.body.classList.add("dark-mode"); // 强制应用深色模式
}

// 获取 URL 中的 ref 参数并填充推荐地址
const urlParams = new URLSearchParams(window.location.search);
const referrer = urlParams.get("ref");
if (referrer) {
  document.getElementById("referrer").value = referrer;
}

// 复制文本到剪贴板
function copyToClipboard(id) {
  const textToCopy = document.getElementById(id).innerText;
  navigator.clipboard.writeText(textToCopy).then(() => {
    alert("Copied to clipboard!");
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
    if (networkId !== 56) {  // 56 是 BSC 主网的链 ID
      alert("Please switch to BSC Mainnet");
      return;
    }

    // 监听账户变化
    provider.on("accountsChanged", (accounts) => {
      userAccount = accounts[0];
      updateUserInfo();
    });

    // 监听网络变化
    provider.on("chainChanged", (chainIdHex) => {
      const chainId = parseInt(chainIdHex, 16);
      if (chainId !== 56) {
        alert("Please switch back to BSC Mainnet");
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
    alert("Minimum deposit is 0.02 BNB.");
    return;
  }
  try {
    await contract.methods.depositBNB(referrer).send({
      from: userAccount,
      value: web3.utils.toWei(amt, "ether")
    });
    alert("Deposit successful!");
    updateUserInfo();
  } catch (e) {
    console.error("depositBNB error:", e);
    alert("Deposit failed.");
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

window.onload = () => {
  applyDarkMode();  // 强制应用深色模式
  updateLanguage();  // 更新语言
};
