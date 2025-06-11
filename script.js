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
  // 可以添加更多钱包提供商
};

// 创建 Web3Modal 实例
const web3Modal = new Web3Modal({
  network: "bsc",            // 可选: "mainnet", "ropsten" 等
  cacheProvider: true,       // 保持用户钱包缓存
  providerOptions,           // 必需的
});

// 连接钱包并初始化 Web3
async function connectWallet() {
  try {
    // 获取钱包提供商
    provider = await web3Modal.connect(); 
    web3 = new Web3(provider); // 初始化 Web3

    // 获取当前网络 ID
    const networkId = await web3.eth.net.getId();
    if (networkId !== 56) {  // 56 是 BSC 主网的链 ID
      alert("Please switch to BSC Mainnet");
      return;
    }

    // 获取当前账户
    const accounts = await web3.eth.getAccounts();
    userAccount = accounts[0];
    document.getElementById("userAccount").innerText = userAccount;

    // 获取合约实例
    contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);

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

    updateUserInfo(); // 更新用户信息
    updateContractInfo(); // 更新合约信息
  } catch (error) {
    console.error("Error connecting wallet:", error);
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

// 切换深色模式
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
}

// 初始加载时判断是否开启深色模式
if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark-mode");
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
