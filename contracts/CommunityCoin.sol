// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.11;

import "./CommunityCoinBase.sol";

contract CommunityCoin is CommunityCoinBase {

    /**
    * @param impl address of StakingPool implementation
    * @param implErc20 address of StakingPoolErc20 implementation
    * @param hook_ address of contract implemented IHook interface and used to calculation bonus tokens amount
    * @param communityCoinInstanceAddr address of contract that managed and cloned pools
    * @param discountSensitivity_ discountSensitivity value that manage amount tokens in redeem process. multiplied by `FRACTION`(10**5 by default)
    * @param rolesManagementAddr_ contract that would will manage roles(admin,redeem,circulate)
    * @param reserveToken_ address of reserve token. like a WETH, USDT,USDC, etc.
    * @param tradedToken_ address of traded token. usual it intercoin investor token
    * @custom:calledby StakingFactory contract 
    * @custom:shortd initializing contract. called by StakingFactory contract
    */
    function initialize(
        address impl,
        address implErc20,
        address hook_,
        address communityCoinInstanceAddr,
        uint256 discountSensitivity_,
        address rolesManagementAddr_,
        address reserveToken_,
        address tradedToken_,
        address costManager_
    ) 
        initializer 
        external 
        virtual
        override 
    {
        CommunityCoinBase__init(
            // "Staking Tokens", 
            // "STAKE", 
            string(abi.encodePacked(IERC777Upgradeable(tradedToken_).name(), " commnunity")), 
            string(abi.encodePacked(IERC777Upgradeable(tradedToken_).symbol(), " c")), 
            impl, 
            implErc20, 
            hook_, 
            communityCoinInstanceAddr, 
            discountSensitivity_, 
            rolesManagementAddr_, 
            reserveToken_, 
            tradedToken_,
            costManager_
        );
    }
}