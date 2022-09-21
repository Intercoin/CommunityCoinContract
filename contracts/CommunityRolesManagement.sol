// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.11;

import "./interfaces/ICommunityRolesManagement.sol";
import "@artman325/community/contracts/interfaces/ICommunity.sol";

import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract CommunityRolesManagement is ICommunityRolesManagement, Initializable {
    using StringsUpgradeable for *;
    
    //left for back compatible with Community contract. here no invitedBy addresses. so no commissions even if was setup in CommunityCoin
    mapping(address => address) public invitedBy;
    
    struct Roles {
        address communityAddr;
        uint8 adminRole;
        uint8 redeemRole;
        uint8 circulationRole;
    }

    Roles internal roles;

    function initialize(
        CommunitySettings calldata communitySettings_
    ) 
        initializer 
        external 
        override 
    {
        require(communitySettings_.addr != address(0));
        //setup 
        roles.communityAddr = communitySettings_.addr;
                
        roles.adminRole = communitySettings_.adminRole;
        roles.redeemRole = communitySettings_.redeemRole;
        roles.circulationRole = communitySettings_.circulationRole;
        
    }

    function getRedeemRole(
    ) 
        external 
        view
        returns(uint8)
    {
        return roles.redeemRole;
    }

    function checkRedeemRole(
        address account
    ) 
        external 
        view
    {
        _checkRole(roles.redeemRole, account);
    }

    function checkCirculationRole(
        address account
    ) 
        external
        view 
    {
        _checkRole(roles.circulationRole, account);
    }

    function _checkRole(uint8 role, address account) internal view virtual {
        if (!hasRole(role, account)) {
            revert(
                string(
                    abi.encodePacked(
                        "AccessControl: account ",
                        StringsUpgradeable.toHexString(uint160(account), 20),
                        " is missing role ",
                        StringsUpgradeable.toHexString(uint256(role), 32)
                    )
                )
            );
        }
    }

    /**
     * @dev Returns `true` if `account` has been granted `role`.
     */
    function hasRole(
        uint8 role, 
        address account
    ) 
        public 
        view 
        returns (bool) 
    {
        
        if (roles.communityAddr != address(0)) {

            // external call to community contract
            
            uint8[] memory communityRoles = ICommunity(roles.communityAddr).getRoles(account);

            for (uint256 i = 0; i < communityRoles.length; i++) {
                if (role == communityRoles[i]) {
                    return true;
                }
            }

        }
        return false;
        
    }

}