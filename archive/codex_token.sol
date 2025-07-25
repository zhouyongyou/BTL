// SPDX-License-Identifier: MIT

/*

DApp: https://www.btluck.fun/

Overview: https://bitluck.notion.site/

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
    event OwnershipRenounced(address indexed previousOwner);
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
        emit OwnershipRenounced(_owner);
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
        IERC20(token).approve(msg.sender, type(uint256).max);
    }
}

contract TOKEN is Context, IERC20, Ownable {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    mapping(address => bool) private _isExcludedFromFee;
    address payable private immutable _taxWallet = payable(_msgSender());
    address public constant RouterAddress = address(0x10ED43C718714eb63d5aA57B78B54704E256024E);  // PancakeSwap: Router v2
    address public constant _USD1 = address(0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d);  // USD1
    uint256 public constant _buyFundFee = 100;
    uint256 public constant _buyRewardFee = 300;
    uint256 public constant _sellRewardFee = 300;
    uint256 public constant _sellFundFee = 100;
    uint8 private constant _decimals = 9;
    uint256 private constant _tTotal = 1000000000000 * 10**_decimals;
    string private constant _name = unicode"BitLuck";
    string private constant _symbol = unicode"BTL";
    uint256 public constant holderCondition = 1000000000 * 10**_decimals; // 0.1%
    uint256 public drawIntervalBlocks = 1200; // 30 mins
    uint256 public lastDrawBlock;
    IUniswapV2Router02 private immutable uniswapV2Router;
    mapping(address => bool) public _swapPairList;
    uint256 private constant MAX = type(uint256).max;
    TokenDistributor public immutable _tokenDistributor;
    uint256 public startTradeBlock;

    uint256 private constant ACC_PRECISION = 1e18;
    uint256 public totalDividendPerShare;
    uint256 private accDividendBalance;
    mapping(address => uint256) private lastDividendPerShare;

    bool private inSwap;
    modifier lockTheSwap {
        inSwap = true;
        _;
        inSwap = false;
    }
    constructor () {
        IUniswapV2Router02 swapRouter = IUniswapV2Router02(RouterAddress);
        uniswapV2Router = swapRouter;

        IUniswapV2Factory swapFactory = IUniswapV2Factory(swapRouter.factory());
        address swapPair = swapFactory.createPair(address(this), _USD1);
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
    function transferFrom(address sender, address recipient, uint256 amount) public override lockTheSwap returns (bool) {
        _transfer(sender, recipient, amount);
        if (_allowances[sender][msg.sender] != MAX) {
            unchecked {
                _allowances[sender][msg.sender] = _allowances[sender][msg.sender] - amount;
            }
        }
        return true;
    }
    function _approve(address owner, address spender, uint256 amount) internal {
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
    function _updateRewards(address account) private lockTheSwap {
        uint256 owed = _balances[account] * (totalDividendPerShare - lastDividendPerShare[account]) / ACC_PRECISION;
        if (owed > 0) {
            safeTransfer(_USD1, account, owed);
            accumulatedUsd1[account] += owed;
            accDividendBalance -= owed;
        }
        lastDividendPerShare[account] = totalDividendPerShare;
    }
    function _transfer(address from, address to, uint256 amount) private lockTheSwap {
        uint256 balance = balanceOf(from);
        require(balance >= amount, "balanceNotEnough");
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
            processReward();
        }
    }
    function _tokenTransfer (
        address sender,
        address recipient,
        uint256 tAmount,
        bool takeFee,
        bool isSell
    ) internal {
        unchecked {
            _balances[sender] = _balances[sender] - tAmount;
        }
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
        unchecked {
            _takeTransfer(sender, recipient, tAmount - feeAmount);
        }
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
        unchecked {
            _balances[to] = _balances[to] + tAmount;
        }
        emit Transfer(sender, to, tAmount);
    }
    function openTrading() external onlyOwner {
        require(0 == startTradeBlock, "Trading has already started");
        lastDrawBlock = block.number;
        startTradeBlock = block.number;
    }
    event USD1RewardDistributed(address indexed user, uint256 amount);
    mapping(address => uint256) public accumulatedUsd1;
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
    uint256 public batchSize = 100;
    uint256 public minGas = 400000;
    uint256 public lastProcessedIndex = 0;
    function processReward() private lockTheSwap {
        if (block.number < lastDrawBlock + drawIntervalBlocks) return;
        IERC20 USD1 = IERC20(_USD1);
        uint256 balance = USD1.balanceOf(address(this));
        uint256 available = balance > accDividendBalance ? balance - accDividendBalance : 0;
        if (available == 0) return;

        uint256 holderRewardPool = available / 40;
        uint256 lotteryRewardPool = available / 120;

        totalDividendPerShare += holderRewardPool * ACC_PRECISION / _tTotal;
        accDividendBalance += holderRewardPool;
        lastDrawBlock = block.number;

        uint256 len = holders.length;
        uint256 processed = 0;
        for (uint i = lastProcessedIndex;
             i < len && processed < batchSize && gasleft() > minGas;
             i++) {
            _updateRewards(holders[i]);
            processed++;
            lastProcessedIndex = i + 1;
        }
        if (lastProcessedIndex >= len) {
            lastProcessedIndex = 0;
        }

        if (lotteryRewardPool > 0 && len > 0) {
            uint256 randIndex = random(0) % len;
            address winner = holders[randIndex];
            safeTransfer(_USD1, winner, lotteryRewardPool);
            accumulatedUsd1[winner] += lotteryRewardPool;
            emit USD1RewardDistributed(winner, lotteryRewardPool);
        }
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
    fallback() external payable {
    }
    receive() external payable {
    }
    function blocksUntilNextDraw() public view returns (uint256) { // getUSD1RewardCountdown
        if (block.number >= lastDrawBlock + drawIntervalBlocks) return 0;
        return (lastDrawBlock + drawIntervalBlocks) - block.number;
    }
    function getUSD1Balance() external view returns (uint256) {
        IERC20 usd1Token = IERC20(_USD1);
        return usd1Token.balanceOf(address(this));
    }
}
