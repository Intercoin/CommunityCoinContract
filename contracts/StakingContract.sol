// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./minimums/upgradeable/MinimumsBase.sol";

import "./interfaces/IStakingContract.sol";

import "./StakingBase.sol";
//import "hardhat/console.sol";

contract StakingContract is StakingBase, MinimumsBase, IStakingContract {

    uint256 public duration;

    // called once by the factory at time of deployment
    function initialize(
        address reserveToken_,
        address tradedToken_, 
        uint256 lockupInterval_, //  interval 
        uint256 duration_, 
        uint256 tradedTokenClaimFraction_, 
        uint256 reserveTokenClaimFraction_,
        uint256 lpClaimFraction_
    ) initializer external override {

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
  
    ////////////////////////////////////////////////////////////////////////
    // internal section ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    
    function _stake(
        address addr, 
        uint256 amount, 
        uint priceBeforeStake
    ) internal override {
        super._stake(addr, amount, duration);
        _minimumsAdd(addr, amount, duration, false);
    }
    
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
// console.log("operator=",operator);
// console.log("from=",from);
// console.log("to=",to);
// console.log("amount=",amount);
        if (from != address(0)) { // otherwise minting
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
//console.log("balance=",balance);        
            if (balance >= amount) {
                uint256 locked = _getMinimum(from);
//console.log("locked=",locked);        
                uint256 remainingAmount = balance - amount;
                if (locked > remainingAmount) {
                    if (
                        (operator == address(this)) || // transferFrom sender to deadaddress through approve
                        to == address(this) // if send directly to contract
                    )  {
                        revert("STAKE_NOT_UNLOCKED_YET");
                    }

                    
                    //  require(
                    //      to != address(this), 
                    //      "STAKE_NOT_UNLOCKED_YET"
                    //     );
                     minimumsTransfer(from, to, (locked - remainingAmount));
                }
            } else {
                // insufficient balance error would be in {ERC777::_move}
            }
        }
        super._beforeTokenTransfer(operator, from, to, amount);
    }
    
}
