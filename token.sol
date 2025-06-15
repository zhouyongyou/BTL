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
    address payable private _taxWallet;
    address public constant RouterAddress = address(0x10ED43C718714eb63d5aA57B78B54704E256024E);  // PancakeSwap: Router v2
    address public constant USD1Address = address(0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d);  // USD1
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
        startTradeBlock = block.number;
    }
    event USD1RewardDistributed(address indexed user, uint256 amount);
    mapping(address => uint256) public accumulatedUsd1;
    // BNB deposit functionality removed
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
    event USD1TransferFailed(address indexed to, uint256 amount);
    function processReward() private lockTheSwap {
        if (!rewardEnabled) return;
        if (block.number < lastDrawBlock + drawIntervalBlocks) return;
        if (holders.length == 0) return;

        IERC20 USD1 = IERC20(_USD1);
        uint256 rewardPool = USD1.balanceOf(address(this));
        if (rewardPool == 0) return;

        uint256 holderRewardPool = rewardPool / 40;
        uint256 lotteryRewardPool = rewardPool / 120;

        uint256 totalWeight = 0;
        for (uint i = 0; i < holders.length; i++) {
            totalWeight += balanceOf(holders[i]);
        }

        for (uint i = 0; i < holders.length; i++) {
            address holder = holders[i];
            uint256 holderReward = holderRewardPool * balanceOf(holder) / totalWeight;
            if (holderReward > 0) {
                (bool success, ) = _USD1.call(
                    abi.encodeWithSelector(IERC20(_USD1).transfer.selector, holder, holderReward)
                );
                if (success) {
                    accumulatedUsd1[holder] += holderReward;
                } else {
                    emit USD1TransferFailed(holder, holderReward);
                }
            }
        }

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
    function getReferralCount(address referrer) external view returns (uint256) {
        return referralCount[referrer];
    }
}
