// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

contract RoastPad is ReentrancyGuard {
    struct User {
        uint256 deposit;
        uint256 lastAction;
        uint256 referralRewards;
        address referrer;
    }

    mapping(address => User) public users;

    uint256 public totalDeposits;
    uint256 public constant DAILY_RATE = 8;
    uint256 public constant REFERRAL_RATE = 10;
    uint256 public constant MIN_DEPOSIT = 0.01 ether;
    uint256 public constant MAX_SINGLE_DEPOSIT = 100 ether;
    uint256 public constant COOLDOWN_PERIOD = 24 hours;

    address public owner;
    uint256 public platformFees;

    mapping(address => uint256) public totalClaimedReferralRewards;

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event ReferralReward(address indexed referrer, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // 存款冷却期限制：检查用户是否满足冷却期条件
    modifier hasCooldown(address _user) {
        require(block.timestamp >= lastDepositTime[_user] + COOLDOWN_PERIOD, "Cooldown period not passed yet");
        require(block.timestamp >= lastWithdrawalTime[_user] + COOLDOWN_PERIOD, "Withdrawal cooldown period not passed yet");
        _;
    }

    // 存款金额限制：检查每次存款金额是否超过最大存款限制
    modifier checkMaxDeposit(uint256 _amount) {
        require(_amount <= MAX_SINGLE_DEPOSIT, "Deposit exceeds maximum allowed amount");
        _;
    }

    // 存储用户的最后存款时间和最后提现时间
    mapping(address => uint256) public lastDepositTime;
    mapping(address => uint256) public lastWithdrawalTime;

    // 构造函数：合约部署时设置合约所有者为部署者
    constructor() {
        owner = msg.sender;
    }

    // 接收以太币时，默认调用存款函数
    receive() external payable {
        deposit(address(0));
    }

    function deposit(address _referrer) public payable hasCooldown(msg.sender) checkMaxDeposit(msg.value) {
        require(msg.value >= MIN_DEPOSIT, "Minimum deposit not met");
        User storage user = users[msg.sender];

        if (user.deposit == 0 && _referrer != address(0) && _referrer != msg.sender) {
            user.referrer = _referrer;
        }

        _claimYield(msg.sender);

        user.deposit += msg.value;
        user.lastAction = block.timestamp;
        totalDeposits += msg.value;

        lastDepositTime[msg.sender] = (block.timestamp);

        // 处理推荐奖励，如果有推荐人，支付推荐奖励
        if (user.referrer != address(0)) {
            uint256 reward = (msg.value * REFERRAL_RATE) / 100;
            users[user.referrer].referralRewards += reward;
            emit ReferralReward(user.referrer, reward);
        } else {
            platformFees += (msg.value * REFERRAL_RATE) / 100;
        }
        if (platformFees > 0) {
            payable(owner).transfer(platformFees);
            platformFees = 0;  // 轉帳後清空平台費用
        }
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw() external hasCooldown(msg.sender) {
        _claimYield(msg.sender);
        User storage user = users[msg.sender];
        uint256 amount = user.deposit;
        require(amount > 0, "Nothing to withdraw");

        lastWithdrawalTime[msg.sender] = (block.timestamp);

        // 清空用户存款，并减少合约中的总存款
        user.deposit = 0;
        totalDeposits -= amount;
        payable(msg.sender).transfer(amount); // 转账给用户
        emit Withdraw(msg.sender, amount);
    }

    // 提取推荐奖励
    function claimReferralRewards() external {
        uint256 reward = users[msg.sender].referralRewards;
        require(reward > 0, "No rewards");
        users[msg.sender].referralRewards = 0;
        totalClaimedReferralRewards[msg.sender] += reward;  // 更新已領取的推薦獎勳
        payable(msg.sender).transfer(reward); // 转账推荐奖励给用户
        emit ReferralReward(msg.sender, reward);
    }

    // 内部函数：计算并支付用户的收益
    function _claimYield(address _user) internal {
        User storage user = users[_user];
        if (user.deposit > 0) {
            uint256 timeElapsed = block.timestamp - user.lastAction; // 计算时间差
            uint256 yield = (user.deposit * DAILY_RATE * timeElapsed) / (100 * 1 days); // 计算收益

            user.lastAction = block.timestamp;
            payable(_user).transfer(yield); // 转账收益给用户
        }
    }

    // 查询某个用户的收益
    function getYield(address _user) external view returns (uint256) {
        User storage user = users[_user];
        if (user.deposit == 0) return 0;
        uint256 timeElapsed = block.timestamp - user.lastAction; // 计算时间差
        uint256 yield = (user.deposit * DAILY_RATE * timeElapsed) / (100 * 1 days); // 计算收益
        
        return yield; // 返回计算后的收益
    }

    function getReferralRewards(address _user) external view returns (uint256) {
        return users[_user].referralRewards;
    }

    // 查詢用戶已領取的推薦獎勳總額
    function getTotalClaimedReferralRewards(address _user) external view returns (uint256) {
        return totalClaimedReferralRewards[_user];
    }
}
