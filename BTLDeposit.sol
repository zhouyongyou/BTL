// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IERC20Deposit {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract BTLDeposit {
    IERC20Deposit public immutable btlToken;
    address public taxWallet;
    uint256 public minDepositAmount;

    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public referralCount;
    mapping(address => uint256) public referralBTLIncome;
    mapping(address => bool) public isEligibleForReferral;

    event Deposit(address indexed user, uint256 amount);

    constructor(address tokenAddress, address tax, uint256 minAmount) {
        btlToken = IERC20Deposit(tokenAddress);
        taxWallet = tax;
        minDepositAmount = minAmount;
    }

    function depositBTL(uint256 amount, address referrer) external {
        require(amount >= minDepositAmount, "Minimum deposit not met");
        require(btlToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        uint256 referralBonus = amount / 10;
        uint256 refundAmount = amount / 10;
        uint256 taxAmount = amount / 10;

        if (referrer != address(0) && referrer != msg.sender && isEligibleForReferral[referrer]) {
            isEligibleForReferral[msg.sender] = true;
            btlToken.transfer(referrer, referralBonus);
            btlToken.transfer(msg.sender, refundAmount);
            referralCount[referrer] += 1;
            referralBTLIncome[referrer] += referralBonus;
        } else {
            isEligibleForReferral[msg.sender] = true;
        }

        btlToken.transfer(taxWallet, taxAmount);
        userDeposits[msg.sender] += amount;
        emit Deposit(msg.sender, amount);
    }

    function totalDeposited() external view returns (uint256) {
        return btlToken.balanceOf(address(this));
    }
}
