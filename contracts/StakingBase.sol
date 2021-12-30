// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@uniswap/v2-periphery/contracts/interfaces/IWETH.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
//import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777SenderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/ERC777Upgradeable.sol";
//import "hardhat/console.sol";

abstract contract StakingBase is OwnableUpgradeable, ERC777Upgradeable, IERC777RecipientUpgradeable/*, IERC777SenderUpgradeable*/ {

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
    // slot 9
    EnumerableSetUpgradeable.AddressSet private rewardTokensList;
    mapping(address => uint256) public rewardTokenRatios;
    
    event RewardGranted(address indexed token, address indexed account, uint256 amount);
    event Staked(address indexed account, uint256 amount, uint256 priceBeforeStake);
    event Redeemed(address indexed account, uint256 amount);
   
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
        if (_msgSender() == address(this) && to == address(this)) {
            uint256 totalSharesBalanceBefore = totalSupply();
            _burn(address(this), amount, "", "");
            _redeem(from, amount, totalSharesBalanceBefore);
        }
    }
    
    ////////////////////////////////////////////////////////////////////////
    // public section //////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

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
    * @notice way to redeem via approve/transferFrom. Another way is send directly to contract. User will obtain uniswap-LP tokens
    * @param amount The number of shares that will be redeemed.
    */
    function redeem(
        uint256 amount
    ) 
        public 
    {
        uint256 totalSharesBalanceBefore = totalSupply();
        require(allowance(msg.sender, address(this)) >= amount, "Redeem amount exceeds allowance");
        _burn(msg.sender, amount, "", "");
        _redeem(msg.sender, amount, totalSharesBalanceBefore);
    }

    /**
    * @notice way to redeem and remove liquidity via approve/transferFrom shares. User will obtain reserve and traded tokens back
    * @param amount The number of shares that will be redeemed.
    */
    function redeemAndRemoveLiquidity(
        uint256 amount
    ) 
        public 
    {
        uint256 totalSharesBalanceBefore = totalSupply();
        require(allowance(msg.sender, address(this))  >= amount, "Redeem amount exceeds allowance");
        _burn(msg.sender, amount, "", "");
        _redeemAndRemoveLiquidity(amount, totalSharesBalanceBefore);
    }

    /**
    * @notice adding token that will be used as reward for staking. Reward will obtain during user redeem
    * @param token token rewards's address 
    * @param ratioToLP ratio to lp token multipleid by `MULTIPLIER`
    */
    function addRewardToken(
        address token,
        uint256 ratioToLP
    )
        public 
        onlyOwner 
    {
        rewardTokensList.add(token);
        rewardTokenRatios[token] = ratioToLP;
    }

    /**
    * @notice removing token that early used as reward for staking. 
    * @param token token rewards's address 
    */
    function removeRewardToken(
        address token
    ) 
        public 
        onlyOwner
    {
        rewardTokensList.remove(token);
        delete rewardTokenRatios[token];
    }
    
    /**
    * @notice return reward token's list
    * @return array of reward tokens
    */
    function viewRewardTokensList() public view returns(address[] memory) {
        return rewardTokensList.values();
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

    function StakingBase_init(
        address reserveToken_,
        address tradedToken_, 
        uint64 tradedTokenClaimFraction_, 
        uint64 reserveTokenClaimFraction_,
        uint64 lpClaimFraction_
    ) onlyInitializing internal {

        string memory otherName = ERC777Upgradeable(tradedToken_).name();
        string memory otherSymbol = ERC777Upgradeable(tradedToken_).symbol();

        string memory name = string(abi.encodePacked(otherName, " Staking Token"));
        string memory symbol = string(abi.encodePacked(otherSymbol, ".STAKE"));

        __Ownable_init();
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
        uint256 amount,
        uint256 totalSharesBalance
    ) 
        internal 
    {  
        
        uint256 amount2Redeem = __redeem(sender, amount);
        
        uniswapV2Pair.transfer(sender, amount2Redeem);
        _grantReward(sender, amount, totalSharesBalance);
    }

    function _redeemAndRemoveLiquidity(
        uint256 amount,
        uint256 totalSharesBalance
    ) internal {
        
        __redeemAndRemoveLiquidity(msg.sender, amount);
        _grantReward(msg.sender, amount, totalSharesBalance);
    }
        
    /**
     * when user redeem token we will additionally grant percent of
     * token's reward by formula
     * usershares/totalShares * Whitelisttoken[X]
    */
    function _grantReward(
        address to, 
        uint256 amount, 
        uint256 total
    ) internal {
        if (total > 0 && amount > 0) {
            uint256 ratio = MULTIPLIER * amount / total;
            uint256 reward2Send;
            for(uint256 i = 0; i < rewardTokensList.length(); i++) {
                address rewardToken = rewardTokensList.at(i);
                reward2Send = 
                    (
                        IERC20Upgradeable(rewardToken).balanceOf(address(this))
                    ) * ratio / MULTIPLIER;
                    
                if (reward2Send > 0) {
                    IERC20Upgradeable(rewardTokensList.at(i)).transfer(to, reward2Send);
                    emit RewardGranted(rewardTokensList.at(i), to, reward2Send);
                }
            }
        }
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
        for (uint256 i=0; i<rewardTokensList.length(); i++) {
            address rewardToken = rewardTokensList.at(i);
            uint256 ratio = rewardTokenRatios[rewardToken];
            if (ratio > 0) {
                uint256 limit = 
                    (
                        IERC20Upgradeable(rewardToken).balanceOf(address(this))
                    ) * ratio / MULTIPLIER;
                
                // here is a trick. totalSupply() actually should be IERC20Upgradeable(uniswapV2Pair).totalSupply().
                // but ratio exchange lp to shares are 1to1. so we avoiding external call and use internal count of shares
                require (
                    totalSupply() + amount <= limit, 
                    "NO_MORE_STAKES_UNTIL_REWARDS_ADDED"
                );
            }
        }
        _mint(addr, amount, "", "");
        emit Staked(addr, amount, priceBeforeStake);
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
        _fractionAmountSend(tradedToken, amountA, tradedTokenClaimFraction, owner(), sender);
        _fractionAmountSend(reserveToken, amountB, reserveTokenClaimFraction, owner(), sender);
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
        amount2Redeem = _fractionAmountSend(address(uniswapV2Pair), amount, lpClaimFraction, owner(), address(0));
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
