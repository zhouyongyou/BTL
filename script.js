// script.js

let contract;
let userAccount;
let web3;
const BSC_MAINNET_RPC = "https://bsc-dataseed1.binance.org:443"; // BSC 主網的 RPC 地址

// 初始化 Web3
async function initWeb3() {
    if (window.ethereum) {
        web3 = new Web3(window.ethereum);
        await window.ethereum.enable();  // 請求用戶授權
        contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);
        console.log("Web3 initialized");
    } else {
        alert("Please install MetaMask!");
    }
}

// 連接錢包並檢查是否在 BSC 主網
async function connectWallet() {
    if (web3) {
        const accounts = await web3.eth.getAccounts();
        userAccount = accounts[0];

        const network = await web3.eth.net.getId();
        if (network !== 56) {   // 56 是 BSC 主網的 chainId
            alert('請切換到 BSC 主網 (Binance Smart Chain Mainnet)');
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x38' }] // 0x38 是 BSC 主網的鏈 ID，16 進制 56
                });
            } catch (error) {
                console.error(error);
                alert('無法切換到 BSC 主網，請手動切換');
            }
            return;
        }

        contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);
        document.getElementById("userBtlBalance").innerText = await getUserBtlBalance(userAccount);
        document.getElementById("userUsd1Deposits").innerText = await getUserUsd1Deposits(userAccount);

        // 顯示當前網絡
        const networkName = await web3.eth.net.getNetworkType();
        document.getElementById('networkInfo').innerText = `Connected to ${networkName}`;
    } else {
        alert("Web3 is not initialized. Please connect MetaMask.");
    }
}

// 取得用戶的 BTL 餘額
async function getUserBtlBalance(account) {
    return await contract.methods.balanceOf(account).call();
}

// 取得用戶的 USD1 存款
async function getUserUsd1Deposits(account) {
    return await contract.methods.getUserBNBDeposits(account).call();
}

// 存入 BNB
async function depositBNB() {
    const depositAmount = document.getElementById("depositAmount").value;
    if (!depositAmount || depositAmount < 0.02) {
        alert("Minimum deposit is 0.02 BNB.");
        return;
    }

    await contract.methods.depositBNB().send({ from: userAccount, value: web3.utils.toWei(depositAmount, "ether") });
    alert("Deposit successful!");
}

// 複製到剪貼板的功能
function copyToClipboard(id) {
    const element = document.getElementById(id);
    navigator.clipboard.writeText(element.innerText);
    alert("Copied to clipboard!");
}

// 複製推薦鏈接
function copyReferralLink() {
    const referralLink = document.getElementById("referralLink").value;
    navigator.clipboard.writeText(referralLink);
    alert("Referral link copied!");
}

// 更新倒計時
async function updateCountdowns() {
    const usd1Countdown = await contract.methods.getUSD1RewardCountdown().call();
    const bnbCountdown = await contract.methods.getBNBRewardCountdown().call();
    
    document.getElementById("usd1RewardCountdown").innerText = usd1Countdown;
    document.getElementById("bnbRewardCountdown").innerText = bnbCountdown;
}

// 每秒更新倒計時
setInterval(updateCountdowns, 1000);

// 更新網頁的基本信息
async function updateContractInfo() {
    const totalBnbDeposited = await contract.methods.totalBnbDeposited().call();
    document.getElementById("totalBnbDeposited").innerText = web3.utils.fromWei(totalBnbDeposited, 'ether');
    
    const holderThreshold = await contract.methods.getHolderThreshold().call();
    document.getElementById("holderThreshold").innerText = web3.utils.fromWei(holderThreshold, 'ether');
    
    const minDeposit = await contract.methods.minDeposit().call();
    document.getElementById("minDepositAmount").innerText = web3.utils.fromWei(minDeposit, 'ether');
}

window.onload = () => {
    initWeb3();
    updateContractInfo();
};
