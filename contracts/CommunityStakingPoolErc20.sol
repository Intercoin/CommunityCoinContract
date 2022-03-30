// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

// import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
// //import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777SenderUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
// import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "./CommunityStakingPoolBase.sol";
import "./interfaces/ICommunityStakingPoolErc20.sol";


//import "hardhat/console.sol";

contract CommunityStakingPoolErc20 is CommunityStakingPoolBase, ICommunityStakingPoolErc20 {
 
//    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    
    /**
    * @custom:shortd address of ERC20 token.
    * @notice address of ERC20 token. ie investor token - ITR
    */
    address public erc20Token;
    /**
    * @custom:shortd fraction of ERC20 token multiplied by `FRACTION`
    * @notice fraction of ERC20 token multiplied by `FRACTION`
    */
    uint64 public erc20TokenClaimFraction;
    
    ////////////////////////////////////////////////////////////////////////
    // external section ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    /**
    * @notice Special function receive ether
    */
    receive() external payable {
        revert("DENIED");
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
    * @notice initialize method. Called once by the factory at time of deployment
    * @param stakingProducedBy_ address of Community Coin token. 
    * @param erc20Token_ address of ERC20 token.
    * @custom:shortd initialize method. Called once by the factory at time of deployment
    */
    function initialize(
        address stakingProducedBy_,
        address erc20Token_
    ) 
        initializer 
        external 
        override 
    {
        CommunityStakingPoolBase_init(stakingProducedBy_);
        
        (erc20Token) = (erc20Token_);
        
    }

    ////////////////////////////////////////////////////////////////////////
    // public section //////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    /**
    * @notice way to redeem via approve/transferFrom. Another way is send directly to contract.
    * @param account account address will redeemed from
    * @param amount The number of shares that will be redeemed
    * @custom:calledby staking contract
    * @custom:shortd redeem erc20 tokens
    */
    function redeem(
        address account,
        uint256 amount
    ) 
        external
        //override 
        onlyStaking
    {
        _redeem(account, amount);
    }

    
    /**
    * @notice left for compatible 
    * @param account account address will redeemed from
    * @param amount The number of shares that will be redeemed.
    * @custom:calledby staking contract
    * @custom:shortd redeem erc20 tokens
    */
    function redeemAndRemoveLiquidity(
        address account,
        uint256 amount
    ) 
        external
//        override 
        onlyStaking 
    {
        _redeem(account, amount);
    }

    
    /** 
    * @notice method will receive erc20 tokens and stake it. Sender will obtain shares 
    * @custom:shortd  the way to stake tokens
    */
    function buyAndStake(
        uint256 tokenAmount
    ) 
        public 
        nonReentrant
    {

        address account = _msgSender();
        IERC20Upgradeable(erc20Token).transferFrom(account, address(this), tokenAmount);
        _stake(account, tokenAmount, 0);
    }
    
    /** 
    * @notice method will receive reserveToken token then will add to liquidity pool and stake it. Beneficiary will obtain shares 
    * @custom:shortd  the way to buy liquidity and stake via reserveToken. Beneficiary will obtain shares 
    */
    function buyAndStake(
        uint256 tokenAmount,
        address beneficiary
    ) 
        public 
        nonReentrant
    {
        address account = _msgSender();
        IERC20Upgradeable(erc20Token).transferFrom(account, address(this), tokenAmount);
        _stake(beneficiary, tokenAmount, 0);
    }
   
    ////////////////////////////////////////////////////////////////////////
    // internal section ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////
    function _redeem(
        address account,
        uint256 amount
    )
        internal 
    {
        uint256 amount2Redeem = __redeem(account, amount);
        IERC20Upgradeable(erc20Token).transfer(account, amount2Redeem);
    }
    ////////////////////////////////////////////////////////////////////////
    // private section /////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////
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
        amount2Redeem = _fractionAmountSend(erc20Token, amount, erc20TokenClaimFraction, stakingProducedBy, address(0));
    }
    
}
