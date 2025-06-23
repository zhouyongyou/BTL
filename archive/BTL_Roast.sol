// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

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

contract BtlRoastPad is ReentrancyGuard {
    IERC20 public token;

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
    uint256 public constant MIN_DEPOSIT = 1000000000 * 10 ** 18; // 0.1%
    uint256 public constant MAX_SINGLE_DEPOSIT = 100000000000 * 10 ** 18; // 10%
    uint256 public constant COOLDOWN_PERIOD = 15 seconds;

    address public owner;
    uint256 public platformFees;

    mapping(address => uint256) public lastDepositTime;
    mapping(address => uint256) public lastWithdrawalTime;

    mapping(address => uint256) public totalClaimedReferralRewards;

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event ReferralReward(address indexed referrer, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier hasCooldown(address _user) {
        require(block.timestamp >= lastDepositTime[_user] + COOLDOWN_PERIOD, "Cooldown period not passed yet");
        require(block.timestamp >= lastWithdrawalTime[_user] + COOLDOWN_PERIOD, "Withdrawal cooldown period not passed yet");
        _;
    }

    modifier checkMaxDeposit(uint256 _amount) {
        require(_amount <= MAX_SINGLE_DEPOSIT, "Deposit exceeds maximum allowed amount");
        _;
    }

    constructor(address _tokenAddress) {
        token = IERC20(_tokenAddress);
        owner = msg.sender;
    }

    function deposit(address _referrer, uint256 _amount) public hasCooldown(msg.sender) checkMaxDeposit(_amount) {
        require(_amount >= MIN_DEPOSIT, "Minimum deposit not met");
        User storage user = users[msg.sender];

        if (user.deposit == 0 && _referrer != address(0) && _referrer != msg.sender) {
            user.referrer = _referrer;
        }

        _claimYield(msg.sender);

        token.transferFrom(msg.sender, address(this), _amount);
        user.deposit += _amount;
        user.lastAction = block.timestamp;
        totalDeposits += _amount;

        lastDepositTime[msg.sender] = block.timestamp;

        if (user.referrer != address(0)) {
            uint256 reward = (_amount * REFERRAL_RATE) / 100;
            users[user.referrer].referralRewards += reward;
            emit ReferralReward(user.referrer, reward);

            platformFees += (_amount * 3) / 100;
            token.transfer(owner, platformFees);
            platformFees = 0;
        } else {
            platformFees += (_amount * REFERRAL_RATE) / 100;
            token.transfer(owner, platformFees);
            platformFees = 0;
        }

        emit Deposit(msg.sender, _amount);
    }

    function withdraw() external hasCooldown(msg.sender) {
        _claimYield(msg.sender);
        User storage user = users[msg.sender];
        uint256 amount = user.deposit;
        require(amount > 0, "Nothing to withdraw");

        uint256 platformFee = (amount * 3) / 100;
        uint256 amountAfterFee = amount - platformFee;

        lastWithdrawalTime[msg.sender] = block.timestamp;

        user.deposit = 0;
        totalDeposits -= amount;
        token.transfer(msg.sender, amountAfterFee);
        token.transfer(owner, platformFee);
        platformFees = 0;
        emit Withdraw(msg.sender, amount);
    }

    function claimReferralRewards() external {
        uint256 reward = users[msg.sender].referralRewards;
        require(reward > 0, "No rewards");
        users[msg.sender].referralRewards = 0;
        totalClaimedReferralRewards[msg.sender] += reward;
        token.transfer(msg.sender, reward);
        emit ReferralReward(msg.sender, reward);
    }

    function _claimYield(address _user) internal {
        User storage user = users[_user];
        if (user.deposit > 0) {
            uint256 timeElapsed = block.timestamp - user.lastAction;
            uint256 yield = (user.deposit * DAILY_RATE * timeElapsed) / (100 * 1 days);

            user.lastAction = block.timestamp;
            token.transfer(_user, yield);
        }
    }

    function getYield(address _user) external view returns (uint256) {
        User storage user = users[_user];
        if (user.deposit == 0) return 0;
        uint256 timeElapsed = block.timestamp - user.lastAction;
        uint256 yield = (user.deposit * DAILY_RATE * timeElapsed) / (100 * 1 days);
        return yield;
    }

    function getReferralRewards(address _user) external view returns (uint256) {
        return users[_user].referralRewards;
    }

    function getTotalClaimedReferralRewards(address _user) external view returns (uint256) {
        return totalClaimedReferralRewards[_user];
    }
    
    function getLastDepositTime(address _user) external view returns (uint256) {
        return lastDepositTime[_user];
    }

    function getLastWithdrawalTime(address _user) external view returns (uint256) {
        return lastWithdrawalTime[_user];
    }

    function getCooldownRemaining(address _user) external view returns (uint256 depositCooldownRemaining, uint256 withdrawalCooldownRemaining) {
        uint256 depositTime = lastDepositTime[_user];
        uint256 withdrawalTime = lastWithdrawalTime[_user];

        if (block.timestamp < depositTime + COOLDOWN_PERIOD) {
            depositCooldownRemaining = (depositTime + COOLDOWN_PERIOD) - block.timestamp;
        } else {
            depositCooldownRemaining = 0;
        }
        if (block.timestamp < withdrawalTime + COOLDOWN_PERIOD) {
            withdrawalCooldownRemaining = (withdrawalTime + COOLDOWN_PERIOD) - block.timestamp;
        } else {
            withdrawalCooldownRemaining = 0;
        }
        return (depositCooldownRemaining, withdrawalCooldownRemaining);
    }
}
