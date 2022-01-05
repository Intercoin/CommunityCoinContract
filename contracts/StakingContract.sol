// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./minimums/upgradeable/MinimumsBase.sol";
import "./interfaces/IStakingContract.sol";
import "./StakingBase.sol";
//import "hardhat/console.sol";

contract StakingContract is StakingBase, MinimumsBase, IStakingContract {

    // @notice count of lockupIntervals. Represented how long wallet tokens will be staked. 
    uint64 public duration;
    
    /**
    * @notice initialize method. Called once by the factory at time of deployment
    * @param reserveToken_ address of reserve token. ie WETH,USDC,USDT,etc
    * @param tradedToken_ address of traded token. ie investor token - ITR
    * @param lockupInterval_ interval in seconds. ie `duration tick`. day in seconds by default
    * @param duration_ count of lockupIntervals. Represented how long wallet tokens will be staked. 
    * @param tradedTokenClaimFraction_ fraction of traded token multiplied by `MULTIPLIER`. 
    * @param reserveTokenClaimFraction_ fraction of reserved token multiplied by `MULTIPLIER`. 
    * @param lpClaimFraction_ fraction of LP token multiplied by `MULTIPLIER`. 
    */
    function initialize(
        address reserveToken_,
        address tradedToken_, 
        uint32 lockupInterval_,
        uint64 duration_, 
        uint64 tradedTokenClaimFraction_, 
        uint64 reserveTokenClaimFraction_,
        uint64 lpClaimFraction_
    ) 
        initializer 
        external 
        override 
    {
        duration = duration_;
        StakingBase_init(
            reserveToken_,
            tradedToken_, 
            tradedTokenClaimFraction_, 
            reserveTokenClaimFraction_,
            lpClaimFraction_
        );

        MinimumsBase_init(lockupInterval_);
    }
      
    ////////////////////////////////////////////////////////////////////////
    // public section //////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////
    
    /**
    * @notice returns wallet tokens that locked at account
    * @param account account's address
    * @return amount locked wallet tokens
    */
    function viewLockedWalletTokens(
        address account
    ) 
        public 
        view 
        returns (uint256 amount) 
    {
        amount = _getMinimum(account);
    }

    ////////////////////////////////////////////////////////////////////////
    // internal section ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    
    function _stake(
        address addr, 
        uint256 amount, 
        uint256 priceBeforeStake
    ) 
        internal 
        override 
    {
        super._stake(addr, amount, priceBeforeStake);
        _minimumsAdd(addr, amount, duration, false);
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
        if (from !=address(0)) { // otherwise minted

            // main goals are
            // - prevent transfer amount if locked more then available FOR REDEEM only (then to == address(this))
            // - transfer minimums applicable only for minimums. (in transfer first of all consume free `token`, then if enough using `locked`)
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
                uint256 remainingAmount = balance - amount;
                if (locked > remainingAmount) {
                    if (
                        (/*from == address(this) && */to == address(0)) || // burnt
                        to == address(this) // if send directly to contract
                    )  {
                        revert("STAKE_NOT_UNLOCKED_YET");
                    }
        
                    minimumsTransfer(from, to, (locked - remainingAmount));
                }
            } else {
                // insufficient balance error would be in {ERC777::_move}
            }
        }
        super._beforeTokenTransfer(operator, from, to, amount);
    }
    
}
