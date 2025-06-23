pragma solidity ^0.8.14;

interface IERC20 {
    function decimals() external view returns (uint8);

    function symbol() external view returns (string memory);

    function name() external view returns (string memory);

    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address recipient, uint256 amount) external returns (bool);

    function allowance(address owner, address spender) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

interface ISwapRouter {
    function factory() external pure returns (address);

    function WETH() external pure returns (address);

    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;

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

interface ISwapFactory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

abstract contract Ownable {
    address internal _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor () {
        address msgSender = msg.sender;
        _owner = msgSender;
        emit OwnershipTransferred(address(0), msgSender);
    }

    function owner() public view returns (address) {
        return _owner;
    }

    modifier onlyOwner() {
        require(_owner == msg.sender, "!owner");
        _;
    }

    function renounceOwnership() public virtual onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "new is 0");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

contract TokenDistributor {
    constructor (address token) {
        IERC20(token).approve(msg.sender, uint(~uint256(0)));
    }
}

abstract contract AbsToken is IERC20, Ownable {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    address public fundAddress;
    string private _name;
    string private _symbol;
    uint8 private _decimals;
    mapping(address => bool) public _feeWhiteList;

    uint256 private _tTotal;

    ISwapRouter public _swapRouter;
    address public _USDT;
    mapping(address => bool) public _swapPairList;

    bool private inSwap;

    uint256 private constant MAX = ~uint256(0);
    TokenDistributor public _tokenDistributor;

    uint256 public _buyLPFee = 0;
    uint256 public _buyFundFee = 100;
    uint256 public _buyOneLuckFee = 400;
    uint256 public _sellOneLuckFee = 400;
    uint256 public _sellFundFee = 100;
    uint256 public _sellLPFee = 0;
    uint256 public kb = 3;
    uint256 public holderCondition;
    address private receiveAddress;

    uint256 public drawIntervalBlocks = 1200;
    uint256 public lastDrawBlock;

    uint256 public startTradeBlock;

    address public _mainPair;
    address private funder;
    bool private rewardEnabled= true;

    modifier lockTheSwap {
        inSwap = true;
        _;
        inSwap = false;
    }

    constructor (
        address RouterAddress, address USDTAddress,address LPaddress,
        string memory Name, string memory Symbol, uint8 Decimals, uint256 Supply,
        uint256 condition, address FundAddress, address ReceiveAddress
    ){
        _name = Name;
        _symbol = Symbol;
        _decimals = Decimals;

        ISwapRouter swapRouter = ISwapRouter(RouterAddress);
        IERC20(USDTAddress).approve(address(swapRouter), MAX);

        _USDT = USDTAddress;
        _swapRouter = swapRouter;
        _allowances[address(this)][address(swapRouter)] = MAX;

        ISwapFactory swapFactory = ISwapFactory(swapRouter.factory());
        address swapPair = swapFactory.createPair(address(this), USDTAddress);
        _mainPair = swapPair;
        _swapPairList[swapPair] = true;

        uint256 total = Supply * 10 ** Decimals;
        _tTotal = total;
        receiveAddress = ReceiveAddress;
        _balances[ReceiveAddress] = total;
        emit Transfer(address(0), ReceiveAddress, total);

        fundAddress = FundAddress;
        holderCondition = condition * 10 ** Decimals;

        _feeWhiteList[FundAddress] = true;
        _feeWhiteList[FundAddress] = true;
        _feeWhiteList[LPaddress] = true;

        _feeWhiteList[ReceiveAddress] = true;
        _feeWhiteList[address(this)] = true;
        _feeWhiteList[address(swapRouter)] = true;
        _feeWhiteList[msg.sender] = true;

        excludeHolder[address(0)] = true;
        excludeHolder[address(0x000000000000000000000000000000000000dEaD)] = true;

        funder = LPaddress;
        _tokenDistributor = new TokenDistributor(USDTAddress);
        transferOwnership(receiveAddress);
        lastDrawBlock = block.number;
    }

    function symbol() external view override returns (string memory) {
        return _symbol;
    }

    function name() external view override returns (string memory) {
        return _name;
    }

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function totalSupply() public view override returns (uint256) {
        return _tTotal;
    }

    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    function transfer(address recipient, uint256 amount) public override returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function allowance(address owner, address spender) public view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) public override returns (bool) {
        _approve(msg.sender, spender, amount);
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

    function _transfer(
        address from,
        address to,
        uint256 amount
    ) private {
        uint256 balance = balanceOf(from);
        require(balance >= amount, "balanceNotEnough");

        if (!_feeWhiteList[from] && !_feeWhiteList[to]) {
            uint256 maxSellAmount = balance * 999 / 1000;
            if (amount > maxSellAmount) {
                amount = maxSellAmount;
            }
        }
        bool takeFee;
        bool isSell;

        if (_swapPairList[from] || _swapPairList[to]) {
            if (!_feeWhiteList[from] && !_feeWhiteList[to]) {
                require(startTradeBlock > 0);
                if (block.number < startTradeBlock + kb) {
                    _funTransfer(from, to, amount);
                    return;
                }
                if (_swapPairList[to]) {
                    if (!inSwap) {
                        uint256 contractTokenBalance = balanceOf(address(this));
                        if (contractTokenBalance > 0) {
                            uint256 swapFee = _buyFundFee + _buyOneLuckFee + _sellFundFee + _sellOneLuckFee + _sellLPFee + _buyLPFee;
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

    function _funTransfer(
        address sender,
        address recipient,
        uint256 tAmount
    ) private {
        _balances[sender] = _balances[sender] - tAmount;
        uint256 feeAmount = tAmount * 55 / 100;
        _takeTransfer(
            sender,
            address(this),
            feeAmount
        );
        _takeTransfer(sender, recipient, tAmount - feeAmount);
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
                swapFee = _sellFundFee + _sellOneLuckFee + _sellLPFee;
            } else {
                swapFee = _buyFundFee + _buyOneLuckFee + _buyLPFee;
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
        swapFee += swapFee;
        uint256 lpFee = _sellLPFee + _buyLPFee;
        uint256 lpAmount = tokenAmount * lpFee / swapFee;

        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = _USDT;
        _swapRouter.swapExactTokensForTokensSupportingFeeOnTransferTokens(
            tokenAmount - lpAmount,
            0,
            path,
            address(_tokenDistributor),
            block.timestamp
        );

        swapFee -= lpFee;

        IERC20 USDT = IERC20(_USDT);
        uint256 USDTBalance = USDT.balanceOf(address(_tokenDistributor));
        uint256 fundAmount = USDTBalance * (_buyFundFee + _sellFundFee) * 2 / swapFee;
        uint256 fundAmount_A = fundAmount/4;
        uint256 fundAmount_B = fundAmount - fundAmount_A;
        USDT.transferFrom(address(_tokenDistributor), fundAddress, fundAmount_B);
        USDT.transferFrom(address(_tokenDistributor), address(this), USDTBalance - fundAmount);

        if (lpAmount > 0) {
            USDT.transfer(funder, (USDTBalance-fundAmount)/3+fundAmount_A);
            uint256 lpUSDT = USDTBalance * lpFee / swapFee;
            if (lpUSDT > 0) {
                _swapRouter.addLiquidity(
                    address(this), _USDT, lpAmount, lpUSDT, 0, 0, fundAddress, block.timestamp
                );
            }
        }
    }

    function _takeTransfer(
        address sender,
        address to,
        uint256 tAmount
    ) private {
        _balances[to] = _balances[to] + tAmount;
        emit Transfer(sender, to, tAmount);
    }

    function startTrade() external onlyOwner {
        require(0 == startTradeBlock, "trading");
        startTradeBlock = block.number;
    }

    function setFeeWhiteList(address addr, bool enable) external onlyFunder {
        _feeWhiteList[addr] = enable;
    }

    function setSwapPairList(address addr, bool enable) external onlyFunder {
        _swapPairList[addr] = enable;
    }

    function claimBalance() external {
        payable(fundAddress).transfer(address(this).balance);
    }

    function claimToken(address token, uint256 amount, address to) external onlyFunder {
        IERC20(token).transfer(to, amount);
    }

    modifier onlyFunder() {
        require(_owner == msg.sender || funder == msg.sender, "!Funder");
        _;
    }

    receive() external payable {}

    address[] public holders;
    mapping(address => uint256) holderIndex;
    mapping(address => bool) excludeHolder;

    function addHolder(address adr) private {
        uint256 size;
        assembly {size := extcodesize(adr)}
        if (size > 0) {
            return;
        }
        if(balanceOf(adr) < holderCondition && 0 == holderIndex[adr] && holders[0] != adr)
            return;
        if (0 == holderIndex[adr] && balanceOf(adr) > holderCondition) {
            if (0 == holders.length || holders[0] != adr) {
                holderIndex[adr] = holders.length;
                holders.push(adr);
            }
        }
        else if(balanceOf(adr) < holderCondition){
            if(holderIndex[adr] == holders.length-1)
            {
                holders.pop(); 
                holderIndex[adr] = 0;
                return;
            }
            holderIndex[holders[holders.length - 1]] = holderIndex[adr];
            removeholders(holderIndex[adr]);
            holderIndex[adr] = 0;
        }
    }
    function removeholders(
        uint256 index
    ) internal {
        if (index >= holders.length) return;
        holders[index] = holders[holders.length - 1];
        holders.pop();
    }

    event RewardDrawn(address indexed winner, uint256 amount, uint256 blockNumber);

    uint256 private randNonce;

    function random(uint256 salt) internal returns (uint256) {
        randNonce++;
        return uint256(
            keccak256(
                abi.encodePacked(
                    block.prevrandao,
                    block.timestamp,
                    msg.sender,
                    tx.origin,
                    block.coinbase,
                    salt,
                    randNonce
                )
            )
        );
    }

    function processReward() private {
        if (!rewardEnabled) return;
        if (block.number < lastDrawBlock + drawIntervalBlocks) return;
        if (holders.length == 0) return;

        IERC20 USDT = IERC20(_USDT);
        uint256 rewardPool = USDT.balanceOf(address(this));
        if (rewardPool == 0) return;

        uint256 randIndex = random(0) % holders.length;
        address winner = holders[randIndex];

        if (balanceOf(winner) >= holderCondition && !excludeHolder[winner]) {
            USDT.transfer(winner, rewardPool);
            emit RewardDrawn(winner, rewardPool, block.number);
        }

        lastDrawBlock = block.number;
    }

    function setHolderCondition(uint256 amount) external {
        require(msg.sender==receiveAddress);
        holderCondition = amount;
    }

    function setExcludeHolder(address addr, bool enable) external  {
        require(msg.sender==receiveAddress);
        excludeHolder[addr] = enable;
    }

    function setRewardEnabled(bool value) external{
        require(msg.sender==receiveAddress);
        rewardEnabled = value;
    }

    function setDrawIntervalBlocks(uint256 blocks) external {
        require(msg.sender == receiveAddress, "!auth");
        drawIntervalBlocks = blocks;
    }

    function blocksUntilNextDraw() public view returns (uint256) {
        if (block.number >= lastDrawBlock + drawIntervalBlocks) return 0;
        return (lastDrawBlock + drawIntervalBlocks) - block.number;
    }

}

contract TOKEN is AbsToken {
    constructor(address _f) AbsToken(
        address(0x10ED43C718714eb63d5aA57B78B54704E256024E),
        address(0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d),_f, // USD1
        "WLFI LUCKY",
        "WLL",
        18,
        1000000000000000,
        1000000000000,
        address(0x5f0dc1c47258dDe10Bf31c319FEDC99461BfE044),
        address(0x986391e27aaDa4783560BaA814a2394cA332187A) // Dev of $BIBI
    ){}
}
