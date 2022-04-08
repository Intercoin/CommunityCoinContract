// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

//import "@uniswap/v2-periphery/contracts/interfaces/IWETH.sol";
//import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
//import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
//import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
//import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777SenderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "./interfaces/ICommunityCoin.sol";
import "./interfaces/ITrustedForwarder.sol";

//import "hardhat/console.sol";

abstract contract CommunityStakingPoolBase is Initializable, ContextUpgradeable, IERC777RecipientUpgradeable, ReentrancyGuardUpgradeable/*, IERC777SenderUpgradeable*/ {
 
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    uint64 public constant FRACTION = 100000;

    //bytes32 private constant TOKENS_SENDER_INTERFACE_HASH = keccak256("ERC777TokensSender");
    bytes32 private constant TOKENS_RECIPIENT_INTERFACE_HASH = keccak256("ERC777TokensRecipient");

    // CommunityCoin address
    address internal stakingProducedBy;

    // if !address(0) then after staking any tokens will obtain donationAddress
    address internal donationAddress;

    modifier onlyStaking() {
        require(stakingProducedBy == msg.sender);
        _;
    }
    event RewardGranted(address indexed token, address indexed account, uint256 amount);
    event Staked(address indexed account, uint256 amount, uint256 priceBeforeStake);
    event Redeemed(address indexed account, uint256 amount);
    
    event Donated(address indexed from, address indexed to, uint256 amount);
    ////////////////////////////////////////////////////////////////////////
    // external section ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

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
    }
    
    
    /**
    * @notice initialize method. Called once by the factory at time of deployment
    * @param stakingProducedBy_ address of Community Coin token. 
    * @param donationAddress_ address if setup then all coins move to this instead sender
    * @custom:shortd initialize method. Called once by the factory at time of deployment
    */
    function CommunityStakingPoolBase_init(
        address stakingProducedBy_,
        address donationAddress_
    ) 
        onlyInitializing
        internal
    {
        stakingProducedBy = stakingProducedBy_; //it's should ne community coin token

        donationAddress = donationAddress_; 

        __ReentrancyGuard_init();

    }

    ////////////////////////////////////////////////////////////////////////
    // public section //////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    ////////////////////////////////////////////////////////////////////////
    // internal section ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////
    
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
        if (fraction_ == FRACTION) {
            IERC20Upgradeable(token_).transfer(fractionAddr_, amount_);
            // if (fractionSendOnly_) {} else {}
        } else if (fraction_ == 0) {
            if (fractionSendOnly_) {
                remainingAfterFractionSend = amount_;
            } else {
                IERC20Upgradeable(token_).transfer(to_, amount_);
            }
        } else {
            uint256 adjusted = amount_ * fraction_ / FRACTION;
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
        if (donationAddress != address(0)) {
            addr = donationAddress;
            emit Donated(addr, donationAddress, amount);
        }
        
        ICommunityCoin(stakingProducedBy).issueWalletTokens(addr, amount, priceBeforeStake);
    }
    
    
    ////////////////////////////////////////////////////////////////////////
    // private section /////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    /**
    * @dev implemented EIP-2771
    */
    function _msgSender(
    ) 
        internal 
        virtual
        override
        view 
        returns (address signer) 
    {
        signer = msg.sender;
        if (msg.data.length>=20 && ITrustedForwarder(stakingProducedBy).isTrustedForwarder(signer)) {
            assembly {
                signer := shr(96,calldataload(sub(calldatasize(),20)))
            }
        }    
    }
   
}
