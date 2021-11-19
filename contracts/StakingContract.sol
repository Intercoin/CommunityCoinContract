// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@uniswap/v2-periphery/contracts/interfaces/IWETH.sol';
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import '@uniswap/lib/contracts/libraries/TransferHelper.sol';

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777SenderUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC777/ERC777Upgradeable.sol";
import "./minimums/upgradeable/MinimumsBase.sol";
import "./interfaces/IStakingContract.sol";

contract StakingContract is OwnableUpgradeable, ERC777Upgradeable, IERC777RecipientUpgradeable, IERC777SenderUpgradeable, MinimumsBase, IStakingContract {
    using SafeMathUpgradeable for uint256;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    
    address public factory;
    // tradedToken
    address public token0;
    // reserveToken
    address public token1;
    uint256 public lockupIntervalCount;
    uint256 public token0ClaimFraction;
    uint256 public token1ClaimFraction;
    uint256 public lpClaimFraction;
    uint256 internal constant MULTIPLIER = 100000;
    
    address private constant deadAddress = 0x000000000000000000000000000000000000dEaD;
    
    address internal constant uniswapRouter = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address internal constant uniswapRouterFactory = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    
    address internal WETH;

    IUniswapV2Router02 internal UniswapV2Router02;
    IUniswapV2Pair internal uniswapV2Pair;
    EnumerableSetUpgradeable.AddressSet private rewardTokensList;
    
    event rewardGranted(address indexed token, address indexed account, uint256 amount);
    event Staked(address indexed account, uint256 amount);
    event Redeemed(address indexed account, uint256 amount);
   
    constructor() {
        factory = msg.sender;
    }
    ////////////////////////////////////////////////////////////////////////
    // external section ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////
    receive() external payable {
    }
    // called once by the factory at time of deployment
    function initialize(
        address token0_, 
        address token1_,
        uint256 lockupInterval_, //  interval 
        uint256 lockupIntervalCount_, 
        uint256 token0ClaimFraction_, 
        uint256 token1ClaimFraction_,
        uint256 lpClaimFraction_
    )
    
        initializer
        external 
        // override
    {
        require(msg.sender == factory, 'StakingContract: FORBIDDEN'); // sufficient check
        
        token0 = token0_;
        token1 = token1_;
        
        lockupIntervalCount = lockupIntervalCount_;
        token0ClaimFraction = token0ClaimFraction_;
        token1ClaimFraction = token1ClaimFraction_;
        lpClaimFraction = lpClaimFraction_;
        
        __Ownable_init();
        __ERC777_init("StakingToken","ST",(new address[](0)));
        
        MinimumsBase_init(lockupInterval_);
        
        UniswapV2Router02 = IUniswapV2Router02(uniswapRouter);
        WETH = UniswapV2Router02.WETH();
        
        address pair =  IUniswapV2Factory(uniswapRouterFactory).getPair(token0, token1);
        require(pair != address(0), "Pair could not exist");
        uniswapV2Pair = IUniswapV2Pair(pair);

    }
    
    function tokensToSend(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    )   override
        virtual
        external
    {
    }
    
    function tokensReceived(
        address /*operator*/,
        address from,
        address /*to*/,
        uint256 amount,
        bytes calldata /*userData*/,
        bytes calldata /*operatorData*/
    ) 
        override
        virtual
        external
    {
        
    }
    
    ////////////////////////////////////////////////////////////////////////
    // public section //////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////
    function buyLiquidityAndStake() public payable {
        
        require(msg.value>0, "insufficient balance");
        
        uint256 amountETH = msg.value;
        IWETH(WETH).deposit{value: amountETH}();
        
        uint256 amountReverveToken = uniswapExchange(WETH, token1, amountETH);
                           // msg.sender, amountReverveToken
        _buyLiquidityAndStake(msg.sender, amountReverveToken);
        
    }
    
    function buyLiquidityAndStake(address payingToken, uint256 amount) public {
        
        IERC20Upgradeable(payingToken).transferFrom(msg.sender, address(this), amount);
        
        uint256 amountReverveToken = uniswapExchange(payingToken, token1, amount);
            
        _buyLiquidityAndStake(msg.sender, amountReverveToken);
    }
    
    /**
     * way to redeem via approve/transferFrom.
     * another wat is send directly to contract
     */
    // default, called when own shares are sent back to contract using transfer(), otherwise does _transfer() if called manually
    function buyLiquidityAndStake(uint256 tokenBAmount) public {
        
        IERC20Upgradeable(token1).transferFrom(msg.sender, address(this), tokenBAmount);
        _buyLiquidityAndStake(msg.sender, tokenBAmount);
    }
    
    function redeemAndRemoveLiquidity(uint256 amount) public {
        
        (uint256 senderSharesBalance, uint256 totalSharesBalance) = _beforeRedeem(amount);
        
        // make redeem
        _redeemAndRemoveLiquidity(msg.sender, amount);
        
        grantReward(msg.sender, senderSharesBalance, totalSharesBalance);
    }
    
    /**
     * // removes liquidity and sends LP tokens, removeLiquidity yourself
     */
    function redeem(uint256 amount) public {
        
        (uint256 senderSharesBalance, uint256 totalSharesBalance) = _beforeRedeem(amount);
        
        uint256 amount2Redeem = _redeem(msg.sender, amount);
        
        uniswapV2Pair.transfer(msg.sender, amount2Redeem);
        
        grantReward(msg.sender, senderSharesBalance, totalSharesBalance);
    }

    function addRewardToken(address addr) public onlyOwner() {
        rewardTokensList.add(addr);
    }
    
    function removeRewardToken(address addr) public onlyOwner() {
        rewardTokensList.remove(addr);
    }
    
    function viewRewardTokensList() public view returns(address[] memory) {
        return rewardTokensList.values();
    }
    
    // if already added liquidity earlier, goes into same pool    
    function stakeLiquidity(uint256 liquidityTokenAmount) public {
        require (liquidityTokenAmount > 0, "liquidityTokenAmount need > 0" );
        
        // checking lp token approve and make transferFrom
        IERC20Upgradeable(address(uniswapV2Pair)).transferFrom(msg.sender, address(this), liquidityTokenAmount);
        
        // stake tokens
        _stake(msg.sender, liquidityTokenAmount);
    }


    ////////////////////////////////////////////////////////////////////////
    // internal section ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    function _beforeRedeem(uint256 amount) internal returns(uint256 senderBalance, uint256 totalBalance) {
        senderBalance = balanceOf(msg.sender);
        totalBalance = totalSupply();

        // !!!!! be carefull.  not transferFrom, but IERC20Upgradeable(address(this)).transferFrom.
        // because in this case tokens will be allow to this contract and contract must be THIS but not MSG.SENDER
        //transferFrom(msg.sender, address(this), amount);
        IERC20Upgradeable(address(this)).transferFrom(msg.sender, address(this), amount);
        //------
    }
    
    
    /**
     * when user redeem token we will additionally grant percent of
     * token's reward by formula
     * usershares/totalShares * Whitelisttoken[X]
    */
    function grantReward(address to, uint256 balance, uint256 total) internal {
        
        uint256 ratio = MULTIPLIER.mul(balance).div(total);
        
        if (ratio > 0) {
            uint256 reward2Send;
            for (uint256 i=0; i<rewardTokensList.length(); i++) {
                reward2Send = IERC20Upgradeable(rewardTokensList.at(i)).balanceOf(address(this)).mul(ratio).div(MULTIPLIER);
                if (reward2Send > 0) {
                    IERC20Upgradeable(rewardTokensList.at(i)).transfer(to, reward2Send);
                    emit rewardGranted(rewardTokensList.at(i), to, reward2Send);
                }
            }
        }
    }
    
    /**
     * transfer `fraction_` of `amount_` to `fractionAddr_`, all the left transfer to address`to_`. return `left` as left. usual is zero
     */
    function fractionAmountSend(address token_, uint256 amount_, uint256 fraction_, address fractionAddr_, address to_) internal returns(uint256 left) {
        return _fractionAmountSend(token_, amount_, fraction_, fractionAddr_, to_, false);
    }
    
    /**
     * transfer `fraction_` of `amount_` to `fractionAddr_`, all the left transfer to address`to_`. return `left` as `amount_` without `fraction_` part
     */
    function fractionAmountSend(address token_, uint256 amount_, uint256 fraction_, address fractionAddr_) internal returns(uint256 left) {
        return _fractionAmountSend(token_, amount_, fraction_, fractionAddr_, address(0), true);
    }
    
    /**
     * method will send `fraction_` of `amount_` of token `token_` to address `fractionAddr_`.
     * if `fractionSendOnly_` == false , all that left will send to address `to`
     */
    function _fractionAmountSend(address token_, uint256 amount_, uint256 fraction_, address fractionAddr_, address to_, bool fractionSendOnly_) internal returns(uint256 leftAfterFractionSend) {
        leftAfterFractionSend = 0;
        if (fraction_ == MULTIPLIER) {
            IERC20Upgradeable(token_).transfer(fractionAddr_, amount_);
            // if (fractionSendOnly_) {} else {}
        } else if (fraction_ == 0) {
            if (fractionSendOnly_) {
                leftAfterFractionSend = amount_;
            } else {
                IERC20Upgradeable(token_).transfer(to_, amount_);
            }
        } else {
            uint256 adjusted = amount_.mul(fraction_).div(MULTIPLIER);
            IERC20Upgradeable(token_).transfer(fractionAddr_, adjusted);
            leftAfterFractionSend = amount_.sub(adjusted);
            if (fractionSendOnly_) {
            } else {
                IERC20Upgradeable(token_).transfer(to_, leftAfterFractionSend);
                leftAfterFractionSend = 0;
            }
        }
    }
    
    function _stake(address addr, uint256 amount) internal {
        _mint(addr, amount, "", "");
        emit Staked(addr, amount);
        _minimumsAdd(addr, amount, lockupIntervalCount, false);
    }
    
    function _beforeTokenTransfer(
        address /*operator*/,
        address from,
        address to,
        uint256 amount
    ) internal override {
        if (from == address(0)){
           // minting
        } else {

            // main goals are
            // - prevent transfer amount if locked more then available FOR REDEEM only (then to == address(this))
            // - transfer minimums applicable only for minimums. 
            // - also prevent burn locked token
            // so example
            //  total=100; locked=40;(for 1 year) amount2send=70
            //  if it's redeem - revert
            //  if usual transfer from user1 to user2 - we will tranfer 70 and 10 will lockup
            //  so tokens balance 
            //          was                         will be
            //  user1(total=100;locked=40)      user1(total=30;locked=30)
            //  user2(total=0;locked=0)         user2(total=70;locked=10)
            
            
            uint256 balance = balanceOf(from);
            if (balance >= amount) {
                uint256 locked = _getMinimum(from);
                uint256 leftAmount = balance.sub(amount);
                if (locked > leftAmount) {
                     require(to != address(this), "insufficient amount to redeem");
                     minimumsTransfer(from, to, locked.sub(leftAmount));
                }
            } else {
                // insufficient balance error would be in {ERC777::_move}
            }


        }
    }
    
    function uniswapExchange(address tokenIn, address tokenOut, uint256 amountIn) internal returns(uint256 amountOut) {
        require(IERC20Upgradeable(tokenIn).approve(address(uniswapRouter), amountIn), 'approve failed.');
        // amountOutMin must be retrieved from an oracle of some kind
        address[] memory path = new address[](2);
        path[0] = address(tokenIn);
        path[1] = address(tokenOut);
        uint256[] memory outputAmounts = UniswapV2Router02.swapExactTokensForTokens(amountIn, 0/*amountOutMin*/, path, address(this), block.timestamp);
        amountOut = outputAmounts[1];
    }
    
    function _buyLiquidityAndStake(address from, uint256 incomeToken1) internal {

        (uint256 reserve0, uint256 reserve1,) = uniswapV2Pair.getReserves();
        require (reserve0 != 0 && reserve1 != 0, "empty reserves");
        
        
        //Then the amount they would want to swap is
        // r3 = sqrt( (r1 + r2) * r1 ) - r1
        // where 
        //  r1 - reserve at uniswap(reserve1)
        //  r2 - incoming reserver token (incomeToken1)
        uint256 r3 = sqrt( (reserve1.add(incomeToken1)).mul(reserve1)).sub(reserve1); //    
        require(r3>0 && incomeToken1 > r3, "wrong calculation");
        
        // left (incomeToken1-r3) we will exchange at uniswap to traded token
        
        uint256 amountToken0 = uniswapExchange(token1, token0, incomeToken1.sub(r3));

        require(IERC20Upgradeable(token1).approve(uniswapRouter, r3), 'approve failed.');
        require(IERC20Upgradeable(token0).approve(uniswapRouter, amountToken0), 'approve failed.');

        (,, uint256 lpTokens) = UniswapV2Router02.addLiquidity(
            token0,
            token1,
            amountToken0,
            r3,
            0, // slippage is unavoidable
            0, // slippage is unavoidable
            address(this),
            block.timestamp
        );

        require (lpTokens > 0, "lpTokens need > 0" );
        
        // stake tokens
        _stake(from, lpTokens);
        
    }
    
    function _redeemAndRemoveLiquidity(address sender, uint256 amount) private {
        
        uint256 amount2Redeem = _redeem(sender, amount);
        
        require(uniswapV2Pair.approve(uniswapRouter, amount2Redeem), 'approve failed.');
        
        (uint amountA, uint amountB) = UniswapV2Router02.removeLiquidity(
            token0,//address tokenA,
            token1,//address tokenB,
            amount2Redeem,//uint liquidity,
            0,//uint amountAMin,
            0,//uint amountBMin,
            address(this),//address to,
            block.timestamp//uint deadline
        );
        
        fractionAmountSend(token0, amountA, token0ClaimFraction, owner(), sender);
        fractionAmountSend(token1, amountB, token1ClaimFraction, owner(), sender);
    }
    
    function _redeem(address sender, uint256 amount) private returns(uint256 amount2Redeem){
        emit Redeemed(sender, amount);
        // transfer to dead address 
        IERC20Upgradeable(address(this)).transfer(deadAddress, amount);

        // validate free amount to redeem was moved to method _beforeTokenTransfer
        amount2Redeem = fractionAmountSend(address(uniswapV2Pair), amount, lpClaimFraction, owner());
    }
    
    
    function sqrt(uint256 x) private pure returns (uint256 result) {
        if (x == 0) {
            return 0;
        }
    
        // Calculate the square root of the perfect square of a power of two that is the closest to x.
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
    
        // The operations can never overflow because the result is max 2^127 when it enters this block.
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
