// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Lightweight OpenZeppelin-style reentrancy guard
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
        uint256 deposit;           // 用户的存款金额
        uint256 lastAction;        // 用户最后一次操作时间
        uint256 referralRewards;   // 用户的推荐奖励
        address referrer;          // 用户的推荐人地址
    }

    mapping(address => User) public users;

    uint256 public totalDeposits;
    uint256 public constant DAILY_RATE = 8; // 每日收益率为 8%
    uint256 public constant REFERRAL_RATE = 10; // 推荐奖励为存款的 10%
    uint256 public constant MIN_DEPOSIT = 0.01 ether;
    uint256 public constant MAX_SINGLE_DEPOSIT = 100 ether; // 每次存款的最大金额（100 ETH）
    uint256 public constant DEPOSIT_COOLDOWN = 1 days;  // 存款冷却期（24小时）
    uint256 public constant COOLDOWN_PERIOD = 24 hours;  // 存款和提现的冷却期（24小时）

    address public owner;             // 合约所有者地址
    uint256 public platformFees;      // 平台费用，用于存储平台收取的费用

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
        _;
    }

    // 提现冷却期限制：检查用户是否满足提现冷却期条件
    modifier hasWithdrawalCooldown(address _user) {
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

    // 存款函数：用户可以存款并指定推荐人
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

        // 处理推荐奖励，如果有推荐人，支付推荐奖励
        if (user.referrer != address(0)) {
            uint256 reward = (msg.value * REFERRAL_RATE) / 100;
            users[user.referrer].referralRewards += reward;
            emit ReferralReward(user.referrer, reward);
        } else {
            platformFees += (msg.value * REFERRAL_RATE) / 100;
        }

        emit Deposit(msg.sender, msg.value);
    }

    function withdraw() external hasWithdrawalCooldown(msg.sender) {
        _claimYield(msg.sender);
        User storage user = users[msg.sender];
        uint256 amount = user.deposit;
        require(amount > 0, "Nothing to withdraw");

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

    // 提取平台费用：仅合约所有者可以调用
    function withdrawPlatformFees() external onlyOwner {
        uint256 amount = platformFees;
        platformFees = 0;
        payable(owner).transfer(amount); // 提取平台费用
    }

    // 查询某个用户的收益
    function getYield(address _user) external view returns (uint256) {
        User storage user = users[_user];
        if (user.deposit == 0) return 0;
        uint256 timeElapsed = block.timestamp - user.lastAction; // 计算时间差
        uint256 yield = (user.deposit * DAILY_RATE * timeElapsed) / (100 * 1 days); // 计算收益
        
        return yield; // 返回计算后的收益
    }
}
