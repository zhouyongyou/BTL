// ===== Multi-Wallet Support via Web3Modal =====
const providerOptions = {
  walletconnect: {
    package: WalletConnectProvider, // required
    options: {
      rpc: {
        56: "https://bsc-dataseed1.binance.org:443"
      }
    }
  },
  // You can add more providers here (e.g., Binance Chain Wallet, Coinbase Wallet)
  // For injected wallets (MetaMask, Rabby, OKX), Web3Modal will detect window.ethereum automatically
};

const web3Modal = new Web3Modal({
  network: "bsc",            // optional: "mainnet", "ropsten", etc.
  cacheProvider: true,       // optional: keep user wallet cached
  providerOptions           // required
});

// ===== Language Switching =====
let currentLanguage = localStorage.getItem("language") || "en";

function switchLanguage() {
  currentLanguage = currentLanguage === "en" ? "zh" : "en";
  localStorage.setItem("language", currentLanguage);
  updateLanguage();
}

function updateLanguage() {
  // Header
  document.getElementById("networkInfo").innerText =
    currentLanguage === "en" ? "Connecting..." : "連接中...";
  // Buttons & Labels
  document.getElementById("connectWalletBtn").innerText =
    currentLanguage === "en" ? "Connect Wallet" : "連接錢包";
  document.getElementById("contractInfoTitle").innerText =
    currentLanguage === "en" ? "Contract Information" : "合約信息";
  document.getElementById("btlAddressLabel").innerText =
    currentLanguage === "en" ? "BTL Contract Address:" : "BTL 合約地址：";
  document.getElementById("usd1CountdownLabel").innerText =
    currentLanguage === "en" ? "Next USD1 Reward:" : "下次 USD1 分紅：";
  document.getElementById("bnbCountdownLabel").innerText =
    currentLanguage === "en" ? "Next BNB Reward:" : "下次 BNB 分紅：";
  document.getElementById("depositLabel").innerText =
    currentLanguage === "en" ? "Deposit BNB" : "存入 BNB";
  document.getElementById("depositBtn").innerText =
    currentLanguage === "en" ? "Deposit" : "存入";
  document.getElementById("footerText").innerText =
    currentLanguage === "en"
      ? "© 2025 BitLuck | All rights reserved"
      : "© 2025 BitLuck | 版權所有";
  // ...add more elements as needed
}

// ===== Web3 / Ethers Setup =====
let provider, web3, signer, contract;
let userAccount;
const CONTRACT_ADDRESS = "0xf852944F411632E799cDFBb2d1545c8909406271";
const ABI = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"totalAmount","type":"uint256"}],"name":"BNBRewardDistributed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"USD1RewardDistributed","type":"event"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"BNBholders","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"RouterAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"USD1Address","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"_USD1","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"_buyFundFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"_buyRewardFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"_sellFundFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"_sellRewardFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"_swapPairList","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"_tokenDistributor","outputs":[{"internalType":"contract TokenDistributor","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"blocksUntilNextDraw","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"checkBNBEligibility","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"checkUSD1Eligibility","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"currentBlock","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"referrer","type":"address"}],"name":"depositBNB","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"drawIntervalBNBBlocks","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"drawIntervalBlocks","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getBNBRewardCountdown","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getBnbPoolBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getHolderThreshold","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getReferralLink","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getTotalBNBHolders","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getTotalThresholdHolders","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getUSD1Balance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getUSD1RewardCountdown","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getUserBNBDeposits","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"holderCondition","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"holders","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"isEligibleForReferral","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"lastDrawBNBBlock","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"lastDrawBlock","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"minDeposit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"minDepositAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"openTrading","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"recoverAssets","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"referralBaseUrl","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"newBaseUrl","type":"string"}],"name":"setReferralBaseUrl","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"startTradeBlock","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"totalBnbDeposited","outputs":[{"internalType":"uint256","name":"sum","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userBNBDeposits","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"userBtlBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"stateMutability":"payable","type":"receive"}];

// Initialize on load
window.onload = async () => {
  updateLanguage();
  if (web3Modal.cachedProvider) {
    await connectWallet(); // auto-connect if user used before
  }
};

// ===== Connect Wallet & Network Check =====
async function connectWallet() {
  try {
    provider = await web3Modal.connect();                  // open wallet modal
    web3 = new Web3(provider);                             // initialize Web3
    const networkId = await web3.eth.net.getId();
    if (networkId !== 56) {                                 // 56 = BSC Mainnet
      alert(currentLanguage === "en"
        ? "Please switch to BSC Mainnet"
        : "請切換到 BSC 主網");
      return;
    }
    signer = provider;                                      // for event listeners
    contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);

    const accounts = await web3.eth.getAccounts();
    userAccount = accounts[0];
    document.getElementById("userAccount").innerText = userAccount;

    // Listen for account changes
    provider.on("accountsChanged", (accounts) => {
      userAccount = accounts[0];
      updateUserInfo();
    });
    // Listen for network changes
    provider.on("chainChanged", (chainIdHex) => {
      const chainId = parseInt(chainIdHex, 16);
      if (chainId !== 56) {
        alert(currentLanguage === "en"
          ? "Please switch back to BSC Mainnet"
          : "請切回 BSC 主網");
      }
    });

    updateUserInfo();
    updateContractInfo();
  } catch (e) {
    console.error("connectWallet error:", e);
  }
}

// ===== Update User Info =====
async function updateUserInfo() {
  // User BTL balance
  const bal = await contract.methods.balanceOf(userAccount).call();
  document.getElementById("userBalance").innerText = bal;

  // User USD1 deposits
  const dep = await contract.methods.getUserBNBDeposits(userAccount).call();
  document.getElementById("userBNBDeposit").innerText = web3.utils.fromWei(dep, "ether");

  // User referral link
  const ref = await contract.methods.getReferralLink(userAccount).call();
  document.getElementById("referralUrl").innerText = ref;
}

// ===== Deposit BNB =====
async function depositBNB() {
  const amt = document.getElementById("depositAmount").value;
  if (!amt || parseFloat(amt) < 0.02) {
    alert(currentLanguage === "en"
      ? "Minimum deposit is 0.02 BNB."
      : "最低存入 0.02 BNB。");
    return;
  }
  try {
    await contract.methods.depositBNB().send({
      from: userAccount,
      value: web3.utils.toWei(amt, "ether")
    });
    alert(currentLanguage === "en"
      ? "Deposit successful!"
      : "存款成功！");
    updateUserInfo();
  } catch (e) {
    console.error("depositBNB error:", e);
    alert(currentLanguage === "en"
      ? "Deposit failed."
      : "存款失敗。");
  }
}

// ===== Countdown Updates =====
async function updateCountdowns() {
  const u = await contract.methods.getUSD1RewardCountdown().call();
  const b = await contract.methods.getBNBRewardCountdown().call();
  document.getElementById("usd1Time").innerText = u;
  document.getElementById("bnbTime").innerText = b;
}
setInterval(updateCountdowns, 1000);

// ===== General Contract Info =====
async function updateContractInfo() {
  // Total BNB deposited
  const total = await contract.methods.totalBnbDeposited().call();
  document.getElementById("totalBnbDeposited").innerText = web3.utils.fromWei(total, "ether");

  // Holder threshold
  const th = await contract.methods.getHolderThreshold().call();
  document.getElementById("holderThreshold").innerText = web3.utils.fromWei(th, "ether");

  // Min deposit
  const min = await contract.methods.minDeposit().call();
  document.getElementById("minDepositAmount").innerText = web3.utils.fromWei(min, "ether");
}

// ===== Utility: Copy Text =====
function copyToClipboard(id) {
  const txt = document.getElementById(id).innerText;
  navigator.clipboard.writeText(txt).then(() => {
    alert(currentLanguage === "en"
      ? "Copied to clipboard!"
      : "已複製到剪貼板！");
  });
}

// ===== Extension Points =====
// TODO: Add event listeners for reward events and display history
// e.g. contract.events.BNBRewardDistributed(...)
// TODO: Support additional UI themes or dark mode
// TODO: Add error handling UI (modals/toasts)
