// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "@openzeppelin/contracts/token/ERC777/IERC777Recipient.sol";
import "@openzeppelin/contracts/token/ERC777/ERC777.sol";
//import "hardhat/console.sol";
import "./minimums/common/MinimumsBase.sol";
abstract contract WalletTokensContract is/* Ownable,*/ ERC777, MinimumsBase, IERC777Recipient/*, IERC777SenderUpgradeable*/ {

    using EnumerableSet for EnumerableSet.AddressSet;
    
    
    // slot 2
    address private _token0;
    uint64 public lpClaimFraction;
    // slot 3
    address private _token1;
    uint64 internal constant MULTIPLIER = 100000;
    
    //address private constant deadAddress = 0x000000000000000000000000000000000000dEaD;
    
    
    //bytes32 private constant TOKENS_SENDER_INTERFACE_HASH = keccak256("ERC777TokensSender");
    bytes32 private constant TOKENS_RECIPIENT_INTERFACE_HASH = keccak256("ERC777TokensRecipient");
    
    // slot 9
    EnumerableSet.AddressSet private rewardTokensList;
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
//            _redeem(from, amount, totalSharesBalanceBefore);
        }
    }
    
    ////////////////////////////////////////////////////////////////////////
    // public section //////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    
   
    ////////////////////////////////////////////////////////////////////////
    // internal section ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    constructor(
        string memory name,
        string memory symbol,
        uint32 lockupInterval
    )
        ERC777(name, symbol, (new address[](0)))
        MinimumsBase(lockupInterval)
    {

        // register interfaces
        _ERC1820_REGISTRY.setInterfaceImplementer(address(this), TOKENS_RECIPIENT_INTERFACE_HASH, address(this));

    }
     
    
    function _stake(
        address addr, 
        uint256 amount, 
        uint256 duration, 
        uint256 priceBeforeStake
    ) 
        internal 
        virtual 
    {
        // TODO 0: keep to undestand where i should to store reward 
        // for (uint256 i=0; i<rewardTokensList.length(); i++) {
        //     address rewardToken = rewardTokensList.at(i);
        //     uint256 ratio = rewardTokenRatios[rewardToken];
        //     if (ratio > 0) {
        //         uint256 limit = 
        //             (
        //                 IERC20Upgradeable(rewardToken).balanceOf(address(this))
        //             ) * ratio / MULTIPLIER;
                
        //         // here is a trick. totalSupply() actually should be IERC20Upgradeable(uniswapV2Pair).totalSupply().
        //         // but ratio exchange lp to shares are 1to1. so we avoiding external call and use internal count of shares
        //         require (
        //             totalSupply() + amount <= limit, 
        //             "NO_MORE_STAKES_UNTIL_REWARDS_ADDED"
        //         );
        //     }
        // }
        _mint(addr, amount, "", "");


        emit Staked(addr, amount, priceBeforeStake);
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
    
    
    ////////////////////////////////////////////////////////////////////////
    // private section /////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

}
