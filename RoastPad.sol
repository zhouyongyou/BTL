// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract RoastPad {
    struct User {
        uint256 deposit;
        uint256 lastAction;
        uint256 referralRewards;
        address referrer;
    }

    mapping(address => User) public users;
    uint256 public totalDeposits;
    uint256 public constant DAILY_RATE = 8; // 8% daily
    uint256 public constant REFERRAL_RATE = 10; // 10% of referred deposit
    uint256 public constant MIN_DEPOSIT = 0.01 ether;
    uint256 public constant MAX_DEPOSIT = 100 ether;
    address public owner;
    uint256 public platformFees;

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event ReferralReward(address indexed referrer, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    receive() external payable {
        deposit(address(0));
    }

    function deposit(address _referrer) public payable {
        require(msg.value >= MIN_DEPOSIT, "Minimum deposit not met");
        require(msg.value <= MAX_DEPOSIT, "Deposit exceeds max limit");
        User storage user = users[msg.sender];

        if (user.deposit == 0 && _referrer != address(0) && _referrer != msg.sender) {
            user.referrer = _referrer;
        }

        _claimYield(msg.sender);

        user.deposit += msg.value;
        user.lastAction = block.timestamp;
        totalDeposits += msg.value;

        if (user.referrer != address(0)) {
            uint256 reward = (msg.value * REFERRAL_RATE) / 100;
            users[user.referrer].referralRewards += reward;
            emit ReferralReward(user.referrer, reward);
        } else {
            platformFees += (msg.value * REFERRAL_RATE) / 100;
        }

        emit Deposit(msg.sender, msg.value);
    }

    function withdraw() external {
        User storage user = users[msg.sender];
        require(block.timestamp > user.lastAction + 1 days, "Lock time not passed");
        _claimYield(msg.sender);
        uint256 amount = user.deposit;
        require(amount > 0, "Nothing to withdraw");

        user.deposit = 0;
        totalDeposits -= amount;
        payable(msg.sender).transfer(amount);
        emit Withdraw(msg.sender, amount);
    }

    function claimReferralRewards() external {
        uint256 reward = users[msg.sender].referralRewards;
        require(reward > 0, "No rewards");
        users[msg.sender].referralRewards = 0;
        payable(msg.sender).transfer(reward);
        emit ReferralReward(msg.sender, reward);
    }

    function _claimYield(address _user) internal {
        User storage user = users[_user];
        if (user.deposit > 0) {
            uint256 timeElapsed = block.timestamp - user.lastAction;
            uint256 yield = (user.deposit * DAILY_RATE * timeElapsed) / (100 * 1 days);
            user.lastAction = block.timestamp;
            payable(_user).transfer(yield);
        }
    }

    function withdrawPlatformFees() external onlyOwner {
        uint256 amount = platformFees;
        platformFees = 0;
        payable(owner).transfer(amount);
    }

    function getYield(address _user) external view returns (uint256) {
        User storage user = users[_user];
        if (user.deposit == 0) return 0;
        uint256 timeElapsed = block.timestamp - user.lastAction;
        return (user.deposit * DAILY_RATE * timeElapsed) / (100 * 1 days);
    }
}
