// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./RewardsBase.sol";
import "./interfaces/IHook.sol";
import "./interfaces/IRewards.sol";

//import "hardhat/console.sol";

contract Rewards is RewardsBase, IHook, IRewards {
    // caller which can call methods `bonus`
    address internal caller;

    error AccessDenied();
    error AlreadySetup();

    function initialize(
        address _sellingToken,
        uint64[] memory _timestamps,
        uint256[] memory _prices,
        uint256[] memory _amountRaised,
        uint64 _endTs,
        uint256[] memory _thresholds,
        uint256[] memory _bonuses,
        address costManager,
        address producedBy
    ) external initializer {
        __Rewards_init(_sellingToken, _timestamps, _prices, _amountRaised, _endTs, _thresholds, _bonuses, costManager, producedBy);
    }

    modifier onlyCaller() {
        if (_msgSender() != caller) {
            revert AccessDenied();
        }
        _;
    }

    function setupCaller() external override {
        if (caller != address(0)) {
            revert AlreadySetup();
        }
        caller = _msgSender();
    }

    function onClaim(address account) external onlyCaller {
        
        if (participants[account].exists == true) {
            //_claim(account, participants[account].groupName);
            //// send tokens
            uint256 groupBonus = _getGroupBonus(participants[account].groupName);
            uint256 tokenPrice = getTokenPrice();

            uint256 participantTotalBonusTokens = (_getTokenAmount(participants[account].totalAmount, tokenPrice) *
                groupBonus) / 1e2;

            if (participantTotalBonusTokens > participants[account].contributed) {
                uint256 amount2Send = participantTotalBonusTokens - participants[account].contributed;
                participants[account].contributed = participantTotalBonusTokens;

                _sendTokens(amount2Send, account, true);
            }
        }

    }

    /**
    @param amount amount in sellingtokens that need to add to `account`
    */
    function onUnstake(
        address, /*instance*/
        address account,
        uint64, /*duration*/
        uint256 amount,
        uint64 rewardsFraction
    ) external onlyCaller {
        
        uint256 tokenPrice = getTokenPrice();
        
        uint256 inputAmount = _getNeededInputAmount(amount*rewardsFraction/FRACTION, tokenPrice);
        
        // here we didn't claim immediately. contract may not contains enough tokens and can revert all transactions.
        //_addBonus(account, inputAmount, false); 
        // BUT WE changed this. bonuses will accomulate successfully and if tokens are enough - try to send. if not - tx will NOT revert
        _addRewards(
            account, 
            inputAmount,
            tokenPrice
        );

    }

    // copy from SalesBase with simple changes: 
    // - WE dont need revert when trying to send bonus tokens, just add bonus, that's all
    // - renamed from _addBonus to _addRewards
    function _addRewards(
        address addr, 
        uint256 ethAmount,
        uint256 tokenPrice
    ) 
        internal 
        virtual
    {

        if (participants[addr].exists == true) {
            
            string memory groupName = participants[addr].groupName;
            
            groups[groupName].totalAmount +=  ethAmount;
            participants[addr].totalAmount += ethAmount;    
            
            //// send tokens
            uint256 groupBonus = _getGroupBonus(groupName);
            address participantAddr;
            uint256 participantTotalBonusTokens;
            for (uint256 i = 0; i < groups[groupName].participants.length; i++) {
                participantAddr = groups[groupName].participants[i];

                participantTotalBonusTokens = _getTokenAmount(
                                                                participants[participantAddr].totalAmount, 
                                                                tokenPrice
                                                            ) * groupBonus / 1e2;

                if (participantTotalBonusTokens > participants[participantAddr].contributed) {
                    uint256 participantContributed = participants[participantAddr].contributed;
                    uint256 amount2Send = participantTotalBonusTokens - participantContributed;
                    participants[participantAddr].contributed = participantTotalBonusTokens;

                    bool success = _sendTokensWithoutRevert(amount2Send, participantAddr);
                    if (!success) {
                        // revert values
                        participants[participantAddr].contributed = participantContributed;
                    }
                    
                }
            }

            emit GroupBonusAdded(groupName, ethAmount, tokenPrice);
               
        } else {
            totalInvestedGroupOutside[addr] += ethAmount;    
        }
    }

     /**
     * @param amount amount of tokens
     * @param addr address to send
     */
    function _sendTokensWithoutRevert(uint256 amount, address addr) internal returns(bool) {
        
        // require(amount>0, "Amount can not be zero");
        // require(addr != address(0), "address can not be empty");
       
        // uint256 tokenBalance = IERC20Upgradeable(sellingToken).balanceOf(address(this));
        // require(tokenBalance >= amount, "Amount exceeds allowed balance");
        
        // bool success = IERC20Upgradeable(sellingToken).transfer(addr, amount);
        // require(success == true, "Transfer tokens were failed"); 

        if (amount == 0 || addr == address(0)) {
            return false;
        }
        uint256 tokenBalance = IERC20Upgradeable(sellingToken).balanceOf(address(this));
        if (tokenBalance < amount) {
            return false;
        }

        bool success = IERC20Upgradeable(sellingToken).transfer(addr, amount);
        return success;
    }

}

