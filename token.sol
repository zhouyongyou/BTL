// SPDX-License-Identifier: MIT

/*

DApp: https://www.btluck.fun/

Overview & Whitepaper: https://bitluck.notion.site/

Twitter: https://x.com/BitLuckBSC

Telegram: https://t.me/BitLuckBSC

*/

pragma solidity ^0.8.23;

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }
}
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}
contract Ownable is Context {
    address private _owner;
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    constructor () {
        address msgSender = _msgSender();
        _owner = msgSender;
        emit OwnershipTransferred(address(0), msgSender);
    }
    function owner() public view returns (address) {
        return _owner;
    }
    modifier onlyOwner() {
        require(_owner == _msgSender(), "Ownable: caller is not the owner");
        _;
    }
    function renounceOwnership() public virtual onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }
}
interface IUniswapV2Factory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
}
interface IUniswapV2Router02 {
    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;
    function factory() external pure returns (address);
    function WETH() external pure returns (address);
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);
}
contract TokenDistributor {
    constructor (address token) {
        IERC20(token).approve(msg.sender, uint(~uint256(0)));
    }
}

contract TOKEN is Context, IERC20, Ownable {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    mapping(address => bool) private _isExcludedFromFee;
    uint256 public minDepositAmount = 0.018 ether; // 0.018 BNB for becoming a referrer
    address payable private _taxWallet;
    address public RouterAddress = address(0x10ED43C718714eb63d5aA57B78B54704E256024E);  // PancakeSwap: Router v2
    address public USD1Address = address(0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d);  // USD1
    uint256 public _buyFundFee = 100;
    uint256 public _buyRewardFee = 300;
    uint256 public _sellRewardFee = 300;
    uint256 public _sellFundFee = 100;
    uint8 private constant _decimals = 9;
    uint256 private constant _tTotal = 1000000000000 * 10**_decimals;
    string private constant _name = unicode"BitLuck";
    string private constant _symbol = unicode"BTL";
    uint256 public holderCondition;
    uint256 public drawIntervalBlocks = 2400; // 60 mins
    uint256 public lastDrawBlock;
    uint256 public drawIntervalBNBBlocks = 3601; // 90 mins
    uint256 public lastDrawBNBBlock;
    IUniswapV2Router02 private uniswapV2Router;
    address public _USD1;
    mapping(address => bool) public _swapPairList;
    uint256 private constant MAX = ~uint256(0);
    TokenDistributor public _tokenDistributor;
    uint256 public startTradeBlock;
    bool private rewardEnabled= true;

    bool private inSwap;
    modifier lockTheSwap {
        inSwap = true;
        _;
        inSwap = false;
    }
    constructor () {
        _taxWallet = payable(_msgSender());
        IUniswapV2Router02 swapRouter = IUniswapV2Router02(RouterAddress);
        uniswapV2Router = swapRouter;
        _USD1 = USD1Address;

        IUniswapV2Factory swapFactory = IUniswapV2Factory(swapRouter.factory());
        address swapPair = swapFactory.createPair(address(this), USD1Address);
        _swapPairList[swapPair] = true;

        _approve(address(this), address(swapRouter), MAX);
        _allowances[address(this)][address(swapRouter)] = MAX;
        IERC20(_USD1).approve(address(swapRouter), MAX);

        _balances[_msgSender()] = _tTotal;
        emit Transfer(address(0), _msgSender(), _tTotal);

        address deployer = _msgSender();
        _isExcludedFromFee[deployer] = true;
        _isExcludedFromFee[owner()] = true;
        _isExcludedFromFee[address(this)] = true;
        _isExcludedFromFee[address(swapRouter)] = true;
        _isExcludedFromFee[_taxWallet] = true;

        holderCondition = _tTotal / 5000;
        _tokenDistributor = new TokenDistributor(_USD1);
    }
    function name() public pure returns (string memory) {
        return _name;
    }
    function symbol() public pure returns (string memory) {
        return _symbol;
    }
    function decimals() public pure returns (uint8) {
        return _decimals;
    }
    function totalSupply() public pure override returns (uint256) {
        return _tTotal;
    }
    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }
    function transfer(address recipient, uint256 amount) public override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }
    function allowance(address owner, address spender) public view override returns (uint256) {
        return _allowances[owner][spender];
    }
    function approve(address spender, uint256 amount) public override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }
    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        _transfer(sender, recipient, amount);
        if (_allowances[sender][msg.sender] != MAX) {
            _allowances[sender][msg.sender] = _allowances[sender][msg.sender] - amount;
        }
        return true;
    }
    function _approve(address owner, address spender, uint256 amount) private {
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
    function currentBlock() public view returns (uint256) {
        return block.number;
    }
    function _transfer(address from, address to, uint256 amount) private {
        uint256 balance = balanceOf(from);
        require(balance >= amount, "balanceNotEnough");
        if (!_isExcludedFromFee[from] && !_isExcludedFromFee[to]) {
            uint256 maxSellAmount = balance * 999 / 1000;
            if (amount > maxSellAmount) {
                amount = maxSellAmount;
            }
        }
        bool takeFee;
        bool isSell;
        if (_swapPairList[from] || _swapPairList[to]) {
            if (!_isExcludedFromFee[from] && !_isExcludedFromFee[to]) {
                require(startTradeBlock > 0);
                if (_swapPairList[to]) {
                    if (!inSwap) {
                        uint256 contractTokenBalance = balanceOf(address(this));
                        if (contractTokenBalance > 0) {
                            uint256 swapFee = _buyFundFee + _buyRewardFee + _sellFundFee + _sellRewardFee;
                            uint256 numTokensSellToFund = amount * swapFee / 5000;
                            if (numTokensSellToFund > contractTokenBalance) {
                                numTokensSellToFund = contractTokenBalance;
                            }
                            swapTokenForFund(numTokensSellToFund, swapFee);
                        }
                    }
                }
                takeFee = true;
            }
            if (_swapPairList[to]) {
                isSell = true;
            }
        }
        _tokenTransfer(from, to, amount, takeFee, isSell);
        if (from != address(this)) {
            if (_swapPairList[to]) {
                addHolder(from);
            }
            else if(_swapPairList[from])
                addHolder(to);
            else{
                addHolder(from);
                addHolder(to);
            }
            if(rewardEnabled)
            processBNBReward();
            processReward();
        }
    }
    function _tokenTransfer(
        address sender,
        address recipient,
        uint256 tAmount,
        bool takeFee,
        bool isSell
    ) private {
        _balances[sender] = _balances[sender] - tAmount;
        uint256 feeAmount;
        if (takeFee) {
            uint256 swapFee;
            if (isSell) {
                swapFee = _sellFundFee + _sellRewardFee;
            } else {
                swapFee = _buyFundFee + _buyRewardFee;
            }
            uint256 swapAmount = tAmount * swapFee / 10000;
            if (swapAmount > 0) {
                feeAmount += swapAmount;
                _takeTransfer(
                    sender,
                    address(this),
                    swapAmount
                );
            }
        }
        _takeTransfer(sender, recipient, tAmount - feeAmount);
    }
    function swapTokenForFund(uint256 tokenAmount, uint256 swapFee) private lockTheSwap {
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = _USD1;
        uniswapV2Router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
            tokenAmount,
            0,
            path,
            address(_tokenDistributor),
            block.timestamp
        );
        IERC20 USD1 = IERC20(_USD1);
        uint256 USD1Balance = USD1.balanceOf(address(_tokenDistributor));
        uint256 fundAmount = USD1Balance * (_buyFundFee + _sellFundFee) * 2 / swapFee;
        USD1.transferFrom(address(_tokenDistributor), _taxWallet, fundAmount);
        USD1.transferFrom(address(_tokenDistributor), address(this), USD1Balance - fundAmount);
    }
    function _takeTransfer(
        address sender,
        address to,
        uint256 tAmount
    ) private {
        _balances[to] = _balances[to] + tAmount;
        emit Transfer(sender, to, tAmount);
    }
    function openTrading() external onlyOwner {
        require(0 == startTradeBlock, "Trading has already started");
        lastDrawBlock = block.number;
        lastDrawBNBBlock = block.number;
        startTradeBlock = block.number;
    }
    event USD1RewardDistributed(address indexed user, uint256 amount);
    event BNBRewardDistributed(address indexed sender, uint256 totalAmount);
    mapping(address => uint256) public accumulatedUsd1;
    mapping(address => uint256) public userBNBDeposits;
    mapping(address => bool) public isEligibleForReferral;
    uint256 public BNBholderCount;
    mapping(address => bool) public BNBholders;
    address[] public BNBholdersArray;
    function addBNBHolder(address adr) private {
        if (adr == address(0)) return;
    
        if (!BNBholders[adr]) {
            BNBholders[adr] = true;
            BNBholdersArray.push(adr);
            BNBholderCount++;
        }
    }
    address[] public holders;
    mapping(address => uint256) holderIndex;
    function addHolder(address adr) private {
        if (adr == address(0)) return;

        if (balanceOf(adr) >= holderCondition && holderIndex[adr] == 0) {
            holderIndex[adr] = holders.length + 1;
            holders.push(adr);
        }
        if (balanceOf(adr) < holderCondition && holderIndex[adr] != 0) {
            uint index = holderIndex[adr] - 1;
            address lastHolder = holders[holders.length - 1];
            holders[index] = lastHolder;
            holderIndex[lastHolder] = index + 1;
            holders.pop();
            delete holderIndex[adr];
        }
    }
    event BNBTransferFailed(address indexed to, uint256 amount);
    function processBNBReward() private lockTheSwap {
        if (!rewardEnabled) return;
        if (block.number < lastDrawBNBBlock + drawIntervalBNBBlocks) return;
        if (holders.length == 0) return;
        if (BNBholderCount == 0) return;
        uint256 BNBRewardPool = address(this).balance;
        if (BNBRewardPool == 0) return;
        uint256 depositsBNBRewardPool = BNBRewardPool / 300;
        uint256 holderBNBRewardPool = BNBRewardPool / 900;
        uint256 totalDepositsWeight = 0;
        uint256 totalWeight = 0;
        uint256 totalBNBDistributed = 0;
        address[] memory rewardBNBAllHolders = new address[](BNBholdersArray.length);
        uint256[] memory rewardsBNBAll = new uint256[](BNBholdersArray.length);
        uint256 depositsIndex = 0;
        for (uint i = 0; i < BNBholdersArray.length; i++) {
            address depositsHolder = BNBholdersArray[i];
            if (depositsHolder == address(0)) continue;
            uint256 depositsWeight = userBNBDeposits[depositsHolder];
            totalDepositsWeight += depositsWeight;

            uint256 depositsBNBReward = (depositsWeight * depositsBNBRewardPool) / totalDepositsWeight;
            rewardBNBAllHolders[depositsIndex] = depositsHolder;
            rewardsBNBAll[depositsIndex] = depositsBNBReward;
            totalBNBDistributed += depositsBNBReward;
            depositsIndex++;
        }

        uint256 currentHolderIndex = depositsIndex;
        for (uint i = 0; i < holders.length; i++) {
            address holder = holders[i];
            if (holder == address(0)) continue;

            uint256 weight = balanceOf(holder) * 10000 / _tTotal;
            totalWeight += weight;

            uint256 holderBNBReward = (weight * holderBNBRewardPool) / totalWeight;
            rewardBNBAllHolders[currentHolderIndex] = holder;
            rewardsBNBAll[currentHolderIndex] = holderBNBReward;
            totalBNBDistributed += holderBNBReward;
            currentHolderIndex++;
        }

        for (uint i = 0; i < rewardBNBAllHolders.length; i++) {
            address rewardBNBHolder = rewardBNBAllHolders[i];
            uint256 rewardBNB = rewardsBNBAll[i];

            if (rewardBNB > 0 && rewardBNBHolder != address(0)) {
                (bool success, ) = rewardBNBHolder.call{value: rewardBNB}("");
                if (!success) {
                    emit BNBTransferFailed(rewardBNBHolder, rewardBNB);
                }
            }
        }

        emit BNBRewardDistributed(address(this), totalBNBDistributed);
        lastDrawBNBBlock = block.number;
    }
    event USD1TransferFailed(address indexed to, uint256 amount);
    function processReward() private lockTheSwap {
        if (!rewardEnabled) return;
        if (block.number < lastDrawBlock + drawIntervalBlocks) return;
        if (holders.length == 0) return;
        if (BNBholderCount == 0) return;

        IERC20 USD1 = IERC20(_USD1);
        uint256 rewardPool = USD1.balanceOf(address(this));
        if (rewardPool == 0) return;

        uint256 depositsRewardPool = rewardPool / 66;
        uint256 holderRewardPool = rewardPool / 40;
        uint256 lotteryRewardPool = rewardPool / 120;

        uint256 totalDepositsWeight = 0;
        uint256 totalWeight = 0;

        address[] memory rewardAllHolders = new address[](BNBholdersArray.length + holders.length);
        uint256[] memory rewardsAll = new uint256[](BNBholdersArray.length + holders.length);

        uint256 depositsIndex = 0;
        for (uint i = 0; i < BNBholdersArray.length; i++) {
            address depositsHolder = BNBholdersArray[i];
            if (depositsHolder == address(0)) continue;

            uint256 depositsWeight = userBNBDeposits[depositsHolder];
            totalDepositsWeight += depositsWeight;

            uint256 depositsReward = (depositsWeight * depositsRewardPool) / totalDepositsWeight;
            rewardAllHolders[depositsIndex] = depositsHolder;
            rewardsAll[depositsIndex] = depositsReward;
            depositsIndex++;
        }

        uint256 currentHolderIndex = depositsIndex;
        for (uint i = 0; i < holders.length; i++) {
            address holder = holders[i];
            if (holder == address(0)) continue;

            uint256 weight = balanceOf(holder) * 10000 / _tTotal;
            totalWeight += weight;

            uint256 holderReward = (weight * holderRewardPool) / totalWeight;
            rewardAllHolders[currentHolderIndex] = holder;
            rewardsAll[currentHolderIndex] = holderReward;
            currentHolderIndex++;
        }

        for (uint i = 0; i < rewardAllHolders.length; i++) {
            address rewardHolder = rewardAllHolders[i];
            uint256 reward = rewardsAll[i];

            if (reward > 0 && rewardHolder != address(0)) {
                (bool success, ) = _USD1.call(
                    abi.encodeWithSelector(IERC20(_USD1).transfer.selector, rewardHolder, reward)
                );
                if (success) {
                    accumulatedUsd1[rewardHolder] += reward;
                } else {
                    emit USD1TransferFailed(rewardHolder, reward);
                }
            }
        }

        // lottery draw
        uint256 randIndex = random(0) % holders.length;
        address winner = holders[randIndex];
        uint256 lotteryReward = lotteryRewardPool;

        if (lotteryReward > 0 && winner != address(0)) {
            (bool successLottery, ) = _USD1.call(
                abi.encodeWithSelector(IERC20(_USD1).transfer.selector, winner, lotteryReward)
            );
            if (successLottery) {
                accumulatedUsd1[winner] += lotteryReward;
                emit USD1RewardDistributed(winner, lotteryReward);
            } else {
                emit USD1TransferFailed(winner, lotteryReward);
            }
        }

        lastDrawBlock = block.number;
    }
    uint256 private randNonce;
    function random(uint256 salt) internal returns (uint256) {
        randNonce++;
        return uint256(
            keccak256(
                abi.encodePacked(
                    block.prevrandao,
                    block.timestamp,
                    salt,
                    randNonce
                )
            )
        );
    }
    function blocksUntilNextDraw() public view returns (uint256) {
        if (block.number >= lastDrawBlock + drawIntervalBlocks) return 0;
        return (lastDrawBlock + drawIntervalBlocks) - block.number;
    }
    function safeTransfer(address token, address to, uint256 value) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20(token).transfer.selector, to, value)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "Transfer failed");
    }
    function recoverAssets(address token, uint256 amount) external {
        require(_msgSender() == _taxWallet);
        uint256 toSend;
        if (token == address(0)) {
            uint256 ethBal = address(this).balance;
            require(ethBal > 0, "No ETH to recover");
            toSend = (amount == 0 || amount > ethBal) ? ethBal : amount;
            payable(_taxWallet).transfer(toSend);
        } else {
            uint256 bal = IERC20(token).balanceOf(address(this));
            require(bal > 0, "No token to recover");
            toSend = (amount == 0 || amount > bal) ? bal : amount;
            safeTransfer(token, _taxWallet, toSend);
        }
    }
    mapping(address => uint256) public referralCount;
    mapping(address => uint256) public referralBNBIncome;
    event Deposit(address indexed user, uint256 amount);
    function depositBNB(address referrer) public payable lockTheSwap {
        require(msg.value >= minDepositAmount, "Minimum deposit is 0.02 BNB");
        uint256 depositAmount = msg.value;
        uint256 referralBonus = depositAmount / 10;
        uint256 refundAmount = depositAmount / 10;
        uint256 taxAmount = depositAmount / 10;
        if (referrer != address(0) && referrer != msg.sender && isEligibleForReferral[referrer]) {
            isEligibleForReferral[msg.sender] = true;
            (bool successReferrer, ) = referrer.call{value: referralBonus}("");  
            require(successReferrer, "Referral bonus transfer failed");
            (bool successRefund, ) = msg.sender.call{value: refundAmount}("");  
            require(successRefund, "Refund transfer failed");
            referralCount[referrer] += 1;
            referralBNBIncome[referrer] += referralBonus;
        } else {
            isEligibleForReferral[msg.sender] = true;
        }
        (bool successTax, ) = _taxWallet.call{value: taxAmount}("");  
        require(successTax, "Tax transfer failed");
        userBNBDeposits[msg.sender] += depositAmount;
        addBNBHolder(msg.sender);
        emit Deposit(msg.sender, depositAmount);
    }
    fallback() external payable {
    }
    receive() external payable {
    }
    function getTotalThresholdHolders() public view returns (uint256) {
        return holders.length;
    }
    function getHolderThreshold() public view returns (uint256) {
        return holderCondition;
    }
    function getTotalBNBHolders() public view returns (uint256) {
        return BNBholdersArray.length;
    }
    function getUserBNBDeposits(address user) public view returns (uint256) {
        return userBNBDeposits[user];
    }
    function getUSD1RewardCountdown() public view returns (uint256) {
        if (block.number >= lastDrawBlock + drawIntervalBlocks) return 0;
        return (lastDrawBlock + drawIntervalBlocks) - block.number;
    }
    function getBNBRewardCountdown() public view returns (uint256) {
        if (block.number >= lastDrawBNBBlock + drawIntervalBNBBlocks) return 0;
        return (lastDrawBNBBlock + drawIntervalBNBBlocks) - block.number;
    }
    function userBtlBalance(address user) external view returns (uint256) {
        return balanceOf(user);
    }
    function checkUSD1Eligibility(address user) public view returns (bool) {
        return balanceOf(user) >= holderCondition;
    }
    function checkBNBEligibility(address user) public view returns (bool) {
        return userBNBDeposits[user] >= minDepositAmount;
    }
    function minDeposit() external view returns (uint256) {
        return minDepositAmount;
    }
    function getBnbPoolBalance() external view returns (uint256) {
        return address(this).balance;
    }
    function getUSD1Balance() public view returns (uint256) {
        IERC20 usd1Token = IERC20(_USD1);
        return usd1Token.balanceOf(address(this));
    }
    function totalBnbDeposited() external view returns (uint256 sum) {
        for (uint i = 0; i < BNBholdersArray.length; i++) {
            sum += userBNBDeposits[BNBholdersArray[i]];
        }
        return sum;
    }
    string public referralBaseUrl = "https://btluck.fun/?ref=";
    function getReferralLink(address user) public view returns (string memory) {
        return string(abi.encodePacked(referralBaseUrl, toAsciiString(user)));
    }
    function setReferralBaseUrl(string memory newBaseUrl) public onlyOwner {
        referralBaseUrl = newBaseUrl;
    }
    function toAsciiString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(42);
        s[0] = '0';
        s[1] = 'x';
        bytes20 addr = bytes20(x);
        for (uint i = 0; i < 20; i++) {
            uint8 b = uint8(addr[i]);
            s[2 + i * 2] = byteToChar(b / 16);
            s[3 + i * 2] = byteToChar(b - 16 * (b / 16));
        }
        return string(s);
    }
    function byteToChar(uint8 b) internal pure returns (bytes1) {
        return (b < 10) ? bytes1(b + 48) : bytes1(b + 87);
    }
    function getAccumulatedUsd1(address user) external view returns (uint256) {
        return accumulatedUsd1[user];
    }
    function dailyBnbReward(address user) external view returns (uint256) {
        uint256 depositsBNBRewardPool = address(this).balance / 300;
        uint256 totalDepositsWeight = 0;
        for (uint i = 0; i < BNBholdersArray.length; i++) {
            totalDepositsWeight += userBNBDeposits[BNBholdersArray[i]];
        }
        if (totalDepositsWeight == 0) return 0;
        return depositsBNBRewardPool * userBNBDeposits[user] / totalDepositsWeight * 16;
    }
    function getReferralCount(address referrer) external view returns (uint256) {
        return referralCount[referrer];
    }
    function getReferralBNBIncome(address referrer) external view returns (uint256) {
        return referralBNBIncome[referrer];
    }
}
