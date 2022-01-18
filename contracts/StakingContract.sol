// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@uniswap/v2-periphery/contracts/interfaces/IWETH.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
//import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777SenderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/ERC777Upgradeable.sol";
import "./interfaces/IStakingContract.sol";
import "./interfaces/IStakingFactory.sol";
//import "hardhat/console.sol";

contract StakingContract is ERC777Upgradeable, IERC777RecipientUpgradeable, IStakingContract/*, IERC777SenderUpgradeable*/ {

    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    
    // slot 0
    address public tradedToken;
    uint64 public tradedTokenClaimFraction;
    // slot 1
    address public reserveToken;
    uint64 public reserveTokenClaimFraction;
    // slot 2
    address private _token0;
    uint64 public lpClaimFraction;
    // slot 3
    address private _token1;
    uint64 internal constant MULTIPLIER = 100000;
    
    //address private constant deadAddress = 0x000000000000000000000000000000000000dEaD;
    // slot 4
    address internal constant uniswapRouter = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    // slot 5
    address internal constant uniswapRouterFactory = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    // slot 6
    address internal WETH;
    
    //bytes32 private constant TOKENS_SENDER_INTERFACE_HASH = keccak256("ERC777TokensSender");
    bytes32 private constant TOKENS_RECIPIENT_INTERFACE_HASH = keccak256("ERC777TokensRecipient");
    // slot 7
    IUniswapV2Router02 internal UniswapV2Router02;
    // slot 8
    IUniswapV2Pair internal uniswapV2Pair;
    // // slot 9
    // EnumerableSetUpgradeable.AddressSet private rewardTokensList;
    // mapping(address => uint256) public rewardTokenRatios;
        
    // factory address
    address factory;
    

    modifier onlyFactory() {
        require(factory == msg.sender);
        _;
    }
    event RewardGranted(address indexed token, address indexed account, uint256 amount);
    event Staked(address indexed account, uint256 amount, uint256 priceBeforeStake);
    event Redeemed(address indexed account, uint256 amount);
    constructor() {
        factory = msg.sender;
    }

    ////////////////////////////////////////////////////////////////////////
    // external section ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    /// @notice Special function receive ether
    receive() external payable {
    }

    // left when will be implemented
    // function tokensToSend(
    //     address operator,
    //     address from,
    //     address to,
    //     uint256 amount,
    //     bytes calldata userData,
    //     bytes calldata operatorData
    // )   override
    //     virtual
    //     external
    // {
    // }

    
    /**
    * @notice used to catch when used try to redeem by sending shares directly to contract
    * see more in {IERC777RecipientUpgradeable::tokensReceived}
    */
    function tokensReceived(
        address /*operator*/,
        address from,
        address to,
        uint256 amount,
        bytes calldata /*userData*/,
        bytes calldata /*operatorData*/
    ) 
        external 
        override
    {
        // if (_msgSender() == address(this) && to == address(this)) {
        //     uint256 totalSharesBalanceBefore = totalSupply();
        //     _burn(address(this), amount, "", "");
        //     _redeem(from, amount, totalSharesBalanceBefore);
        // }
    }
    
    ////////////////////////////////////////////////////////////////////////
    // public section //////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    /**
    * @notice way to redeem via approve/transferFrom. Another way is send directly to contract. User will obtain uniswap-LP tokens
    * @param amount The number of shares that will be redeemed.
    */
    function redeem(
        address account,
        uint256 amount
    ) 
        external
        override 
        onlyFactory
    {
        uint256 amount2Redeem = __redeem(account, amount);
        uniswapV2Pair.transfer(account, amount2Redeem);
    }

    /**
    * @notice way to redeem and remove liquidity via approve/transferFrom shares. User will obtain reserve and traded tokens back
    * @param amount The number of shares that will be redeemed.
    */
    function redeemAndRemoveLiquidity(
        address account,
        uint256 amount
    ) 
        external
        override 
        onlyFactory 
    {
        __redeemAndRemoveLiquidity(account, amount);
    }

    /** 
    * @notice payble method will receive ETH, convert it to WETH, exchange to reserve token via uniswap. 
    * Finally will add to liquidity pool and stake it. User will obtain shares 
    */
    function buyLiquidityAndStake(
    ) 
        public 
        payable 
    {
        require(msg.value>0, "INSUFFICIENT_BALANCE");
        uint256 amountETH = msg.value;
        IWETH(WETH).deposit{value: amountETH}();
        uint256 amountReserveToken = doSwapOnUniswap(WETH, reserveToken, amountETH);
        _buyLiquidityAndStake(msg.sender, amountReserveToken);
    }
    
    /** 
    * @notice method will receive payingToken token, exchange to reserve token via uniswap. 
    * Finally will add to liquidity pool and stake it. User will obtain shares 
    */
    function buyLiquidityAndStake(
        address payingToken, 
        uint256 amount
    ) 
        public 
    {
        IERC20Upgradeable(payingToken).transferFrom(msg.sender, address(this), amount);
        uint256 amountReserveToken = doSwapOnUniswap(payingToken, reserveToken, amount);
        _buyLiquidityAndStake(msg.sender, amountReserveToken);
    }
    
    /** 
    * @notice method will receive reserveToken token then will add to liquidity pool and stake it. User will obtain shares 
    */
    function buyLiquidityAndStake(
        uint256 tokenBAmount
    ) 
        public 
    {
        IERC20Upgradeable(reserveToken).transferFrom(msg.sender, address(this), tokenBAmount);
        _buyLiquidityAndStake(msg.sender, tokenBAmount);
    }
       
    /**
    * @notice way to stake LP tokens of current pool(traded/reserve tokens)
    * @dev keep in mind that user can redeem lp token from other staking contract with same pool but different duration and use here.
    * @param lpAmount liquidity tokens's amount
    */
    function stakeLiquidity(
        uint256 lpAmount
    ) public {
        require (lpAmount > 0, "AMOUNT_EMPTY" );
        IERC20Upgradeable(address(uniswapV2Pair)).transferFrom(
            msg.sender, address(this), lpAmount
        );
        (uint256 reserve0, uint256 reserve1,) = uniswapV2Pair.getReserves();
        uint256 priceBeforeStake = (
            _token0 == reserveToken
                ? MULTIPLIER * reserve0 / reserve1
                : MULTIPLIER * reserve1 / reserve0
        );
        _stake(msg.sender, lpAmount, priceBeforeStake);
    }

    ////////////////////////////////////////////////////////////////////////
    // internal section ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////


    /**
    * @notice initialize method. Called once by the factory at time of deployment
    * @param reserveToken_ address of reserve token. ie WETH,USDC,USDT,etc
    * @param tradedToken_ address of traded token. ie investor token - ITR
    * @param tradedTokenClaimFraction_ fraction of traded token multiplied by `MULTIPLIER`. 
    * @param reserveTokenClaimFraction_ fraction of reserved token multiplied by `MULTIPLIER`. 
    * @param lpClaimFraction_ fraction of LP token multiplied by `MULTIPLIER`. 
    */
    function initialize(
        address reserveToken_,
        address tradedToken_, 
        uint64 tradedTokenClaimFraction_, 
        uint64 reserveTokenClaimFraction_,
        uint64 lpClaimFraction_
    ) 
        initializer 
        external 
        override 
    {
        
        string memory otherName = ERC777Upgradeable(tradedToken_).name();
        string memory otherSymbol = ERC777Upgradeable(tradedToken_).symbol();

        string memory name = string(abi.encodePacked(otherName, " Staking Token"));
        string memory symbol = string(abi.encodePacked(otherSymbol, ".STAKE"));

        __ERC777_init(name, symbol, (new address[](0)));

        // register interfaces
        _ERC1820_REGISTRY.setInterfaceImplementer(address(this), TOKENS_RECIPIENT_INTERFACE_HASH, address(this));

        (tradedToken, reserveToken, tradedTokenClaimFraction, reserveTokenClaimFraction, lpClaimFraction)
        = (tradedToken_, reserveToken_, tradedTokenClaimFraction_, reserveTokenClaimFraction_, lpClaimFraction_);
        
        UniswapV2Router02 = IUniswapV2Router02(uniswapRouter);
        WETH = UniswapV2Router02.WETH();
        
        address pair =  IUniswapV2Factory(uniswapRouterFactory).getPair(tradedToken, reserveToken);
        require(pair != address(0), "NO_UNISWAP_V2_PAIR");
        uniswapV2Pair = IUniswapV2Pair(pair);
        _token0 = uniswapV2Pair.token0();
        _token1 = uniswapV2Pair.token1();

    }

    function _redeem(
        address sender, 
        uint256 amount
    ) 
        internal 
    {  
        
    }
    
    /**
     * method will send `fraction_` of `amount_` of token `token_` to address `fractionAddr_`.
     * if `fractionSendOnly_` == false , all that remaining will send to address `to`
     */
    function _fractionAmountSend(
        address token_, 
        uint256 amount_, 
        uint256 fraction_, 
        address fractionAddr_, 
        address to_
    ) 
        internal 
        returns(uint256 remainingAfterFractionSend) 
    {
        bool fractionSendOnly_ = (to_ == address(0));
        remainingAfterFractionSend = 0;
        if (fraction_ == MULTIPLIER) {
            IERC20Upgradeable(token_).transfer(fractionAddr_, amount_);
            // if (fractionSendOnly_) {} else {}
        } else if (fraction_ == 0) {
            if (fractionSendOnly_) {
                remainingAfterFractionSend = amount_;
            } else {
                IERC20Upgradeable(token_).transfer(to_, amount_);
            }
        } else {
            uint256 adjusted = amount_ * fraction_ / MULTIPLIER;
            IERC20Upgradeable(token_).transfer(fractionAddr_, adjusted);
            remainingAfterFractionSend = amount_ - adjusted;
            if (!fractionSendOnly_) {
                IERC20Upgradeable(token_).transfer(to_, remainingAfterFractionSend);
                remainingAfterFractionSend = 0;
            }
        }
    }
    
    function _stake(
        address addr, 
        uint256 amount, 
        uint256 priceBeforeStake
    ) 
        internal 
        virtual 
    {
        IStakingFactory(factory).issueWalletTokens(addr, amount, priceBeforeStake);
    }
    
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256 amount
    ) 
        internal 
        virtual 
        override 
    {
        //---
    }
    
    function doSwapOnUniswap(
        address tokenIn, 
        address tokenOut, 
        uint256 amountIn
    ) 
        internal 
        returns(uint256 amountOut) 
    {
        require(IERC20Upgradeable(tokenIn).approve(address(uniswapRouter), amountIn), "approve failed.");
        address[] memory path = new address[](2);
        path[0] = address(tokenIn);
        path[1] = address(tokenOut);
        // amountOutMin is set to 0, so only do this with pairs that have deep liquidity
        uint256[] memory outputAmounts = UniswapV2Router02.swapExactTokensForTokens(
            amountIn, 0, path, address(this), block.timestamp
        );
        amountOut = outputAmounts[1];
    }
    
    function _buyLiquidityAndStake(
        address from, 
        uint256 incomingReserveToken
    ) 
        internal 
    {
        (uint256 reserve0, uint256 reserve1,) = uniswapV2Pair.getReserves();
        require (reserve0 != 0 && reserve1 != 0, "RESERVES_EMPTY");
        uint256 priceBeforeStake = (
            _token0 == reserveToken
                ? MULTIPLIER * reserve0 / reserve1
                : MULTIPLIER * reserve1 / reserve0
        );
        //Then the amount they would want to swap is
        // r3 = sqrt( (r1 + r2) * r1 ) - r1
        // where 
        //  r1 - reserve at uniswap(reserve1)
        //  r2 - incoming amount of reserve token
        uint256 r3 = 
            sqrt(
                (reserve1 + incomingReserveToken)*(reserve1)
            ) - reserve1; //    
        require(r3 > 0 && incomingReserveToken > r3, "BAD_AMOUNT");
        // remaining (r2-r3) we will exchange at uniswap to traded token
        uint256 amountTradedToken = doSwapOnUniswap(reserveToken, tradedToken, r3);
        uint256 amountReserveToken = incomingReserveToken - r3;
        require(
            IERC20Upgradeable(tradedToken).approve(uniswapRouter, amountTradedToken)
            && IERC20Upgradeable(reserveToken).approve(uniswapRouter, amountReserveToken),
            "APPROVE_FAILED"
        );
        (,, uint256 lpTokens) = UniswapV2Router02.addLiquidity(
            tradedToken,
            reserveToken,
            amountTradedToken,
            amountReserveToken,
            0, // there may be some slippage
            0, // there may be some slippage
            address(this),
            block.timestamp
        );
        require (lpTokens > 0, "NO_LIQUIDITY");
        _stake(from, lpTokens, priceBeforeStake);
    }
    
    ////////////////////////////////////////////////////////////////////////
    // private section /////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    function __redeemAndRemoveLiquidity(
        address sender, 
        uint256 amount
    ) 
        private 
    {
        
        uint256 amount2Redeem = __redeem(sender, amount);

        require(uniswapV2Pair.approve(uniswapRouter, amount2Redeem), "APPROVE_FAILED");
        (uint amountA, uint amountB) = UniswapV2Router02.removeLiquidity(
            tradedToken,//address tokenA,
            reserveToken,//address tokenB,
            amount2Redeem,//uint liquidity,
            0,//uint amountAMin,
            0,//uint amountBMin,
            address(this),//address to,
            block.timestamp//uint deadline
        );
        _fractionAmountSend(tradedToken, amountA, tradedTokenClaimFraction, factory, sender);
        _fractionAmountSend(reserveToken, amountB, reserveTokenClaimFraction, factory, sender);
    }
    
    function __redeem(
        address sender, 
        uint256 amount
    ) 
        private 
        returns(uint256 amount2Redeem)
    {
        emit Redeemed(sender, amount);

        // validate free amount to redeem was moved to method _beforeTokenTransfer
        // transfer and burn moved to upper level
        amount2Redeem = _fractionAmountSend(address(uniswapV2Pair), amount, lpClaimFraction, factory, address(0));
    }
    
    function sqrt(
        uint256 x
    ) 
        internal 
        pure 
        returns(uint256 result) 
    {
        if (x == 0) {
            return 0;
        }
        // Calculate the square root of the perfect square of a
        // power of two that is the closest to x.
        uint256 xAux = uint256(x);
        result = 1;
        if (xAux >= 0x100000000000000000000000000000000) {
            xAux >>= 128;
            result <<= 64;
        }
        if (xAux >= 0x10000000000000000) {
            xAux >>= 64;
            result <<= 32;
        }
        if (xAux >= 0x100000000) {
            xAux >>= 32;
            result <<= 16;
        }
        if (xAux >= 0x10000) {
            xAux >>= 16;
            result <<= 8;
        }
        if (xAux >= 0x100) {
            xAux >>= 8;
            result <<= 4;
        }
        if (xAux >= 0x10) {
            xAux >>= 4;
            result <<= 2;
        }
        if (xAux >= 0x8) {
            result <<= 1;
        }
        // The operations can never overflow because the result is
        // max 2^127 when it enters this block.
        unchecked {
            result = (result + x / result) >> 1;
            result = (result + x / result) >> 1;
            result = (result + x / result) >> 1;
            result = (result + x / result) >> 1;
            result = (result + x / result) >> 1;
            result = (result + x / result) >> 1;
            result = (result + x / result) >> 1; // Seven iterations should be enough
            uint256 roundedDownResult = x / result;
            return result >= roundedDownResult ? roundedDownResult : result;
        }
    }
}
