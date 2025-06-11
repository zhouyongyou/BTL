// ===== Web3 / Ethers Setup =====
let provider, web3, signer, contract;
let userAccount;
const CONTRACT_ADDRESS = "0xf852944F411632E799cDFBb2d1545c8909406271"; // BTL 合约地址
let ABI = [];

// 页面加载时，加载 ABI 并初始化 Web3
window.onload = async () => {
  // 加载 ABI
  try {
    const res = await fetch('contract.json');  // 从 contract.json 获取 ABI
    const json = await res.json();
    ABI = json.abi;  // 获取 ABI

    // 初始化 Web3 和合约
    if (window.ethereum) {
      web3 = new Web3(window.ethereum);
      await window.ethereum.enable();
      contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);
      updateContractInfo(); // 更新合约信息
    } else {
      alert("请安装 MetaMask 或其他 Web3 钱包");
    }
  } catch (err) {
    console.error("加载 ABI 失败：", err);
  }

  // 更新 UI（语言、连接按钮等）
  updateLanguage();
  setInterval(updateCountdowns, 1000);  // 每秒更新倒计时
};

// ===== Connect Wallet & Network Check =====
async function connectWallet() {
  try {
    provider = await web3Modal.connect();   // 打开钱包选择框
    web3 = new Web3(provider);  // 初始化 Web3

    const networkId = await web3.eth.net.getId();  // 获取网络 ID
    if (networkId !== 56) {  // 56 是 BSC 主网的 ID
      alert("请切换到 BSC 主网");
      return;
    }
    signer = provider;  // 用于监听事件
    contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);

    const accounts = await web3.eth.getAccounts();
    userAccount = accounts[0];
    document.getElementById("userAccount").innerText = userAccount;  // 显示用户地址

    // 监听账户变化
    provider.on("accountsChanged", (accounts) => {
      userAccount = accounts[0];
      updateUserInfo();  // 更新用户信息
    });

    // 监听网络变化
    provider.on("chainChanged", (chainIdHex) => {
      const chainId = parseInt(chainIdHex, 16);
      if (chainId !== 56) {
        alert("请切换到 BSC 主网");
      }
    });

    updateUserInfo();  // 更新用户信息
    updateContractInfo();  // 更新合约信息
  } catch (e) {
    console.error("connectWallet 错误:", e);
  }
}

// ===== 更新用户信息 =====
async function updateUserInfo() {
  // 获取用户的 BTL 余额
  const bal = await contract.methods.balanceOf(userAccount).call();
  document.getElementById("userBalance").innerText = bal;

  // 获取用户的 USD1 存款
  const dep = await contract.methods.getUserBNBDeposits(userAccount).call();
  document.getElementById("userBNBDeposit").innerText = web3.utils.fromWei(dep, "ether");

  // 获取用户的推荐链接
  const ref = await contract.methods.getReferralLink(userAccount).call();
  document.getElementById("referralUrl").innerText = ref;
}

// ===== 存款 BNB =====
async function depositBNB() {
  const amt = document.getElementById("depositAmount").value;
  if (!amt || parseFloat(amt) < 0.02) {
    alert("最低存入 0.02 BNB。");
    return;
  }
  try {
    await contract.methods.depositBNB().send({
      from: userAccount,
      value: web3.utils.toWei(amt, "ether")
    });
    alert("存款成功！");
    updateUserInfo();  // 更新用户信息
  } catch (e) {
    console.error("depositBNB 错误:", e);
    alert("存款失败。");
  }
}

// ===== 倒计时更新 =====
async function updateCountdowns() {
  const usd1Countdown = await contract.methods.getUSD1RewardCountdown().call();
  const bnbCountdown = await contract.methods.getBNBRewardCountdown().call();
  document.getElementById("usd1Time").innerText = usd1Countdown;
  document.getElementById("bnbTime").innerText = bnbCountdown;
}
