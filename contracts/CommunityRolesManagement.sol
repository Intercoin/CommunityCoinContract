// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.11;

import "./interfaces/ICommunityRolesManagement.sol";
import "./interfaces/ICommunity.sol";

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract CommunityRolesManagement is ICommunityRolesManagement, Initializable, AccessControlUpgradeable {

    bytes32 internal constant ADMIN_ROLE = "admin";
    bytes32 internal constant REDEEM_ROLE = "redeem";
    bytes32 internal constant CIRCULATION_ROLE = "circulate";

    //left for back compatible with Community contract. here no invitedBy addresses. so no commissions even if was setup in CommunityCoin
    mapping(address => address) public invitedBy;
    
    struct Roles {
        address communityAddr;
        bytes32 adminRole;
        bytes32 redeemRole;
        bytes32 circulationRole;
    }

    Roles internal roles;

    function initialize(
        CommunitySettings calldata communitySettings_,
        address admin
    ) 
        initializer 
        external 
        override 
    {

        //setup 
        roles.communityAddr = communitySettings_.addr;
                
        if (roles.communityAddr == address(0)) {
            roles.adminRole = ADMIN_ROLE;
            roles.redeemRole = REDEEM_ROLE;
            roles.circulationRole = CIRCULATION_ROLE;
        } else {
            roles.adminRole = stringToBytes32(communitySettings_.adminRole);
            roles.redeemRole = stringToBytes32(communitySettings_.redeemRole);
            roles.circulationRole = stringToBytes32(communitySettings_.circulationRole);
        }
        
        _grantRole(roles.adminRole, admin);
        _setRoleAdmin(roles.redeemRole, roles.adminRole);
        _setRoleAdmin(roles.circulationRole, roles.adminRole);

        
    }

    function getRedeemRole(
    ) 
        external 
        view
        returns(bytes32)
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

    /**
     * @dev Returns `true` if `account` has been granted `role`.
     */
    function hasRole(
        bytes32 role, 
        address account
    ) 
        public 
        view 
        virtual 
        override 
        returns (bool) 
    {
        
        if (roles.communityAddr != address(0)) {

            // external call to community contract
            bytes32 keccakRole = keccak256(abi.encodePacked(role));
            bytes32 iKeccakRole;
            string[] memory communityRoles = ICommunity(roles.communityAddr).getRoles(account);

            for (uint256 i = 0; i < communityRoles.length; i++) {
                iKeccakRole = keccak256(abi.encodePacked(stringToBytes32(communityRoles[i])));
                if (keccakRole == iKeccakRole) {
                    return true;
                }
            }

        }
        return super.hasRole(role, account);
        
    }

    /**
     * convert string to bytes32
     * @param source string variable
     */
    function stringToBytes32(string memory source) internal pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }

        assembly {
            result := mload(add(source, 32))
        }
    }


}