// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;
import "@intercoin/community/contracts/interfaces/ICommunity.sol";
import "../maps/CommunityAccessMap.sol";

contract MockCommunity is CommunityAccessMap, ICommunity {
    mapping(address => uint8[]) roles;

    uint256 count = 5;
    
    function initialize(
        address implState,
        address implView,
        address hook, 
        address costManager, 
        string memory name, 
        string memory symbol
    ) external {

    }

    function setInvitedBy(address who, address whom) public {
        invitedBy[whom] = who;
    }

    function addressesCount(uint8/* roleIndex*/) public override view returns(uint256) {
        return count;
    }
    function setMemberCount(uint256 _count) public {
        count = _count;
    }
    
    function setRoles(address member, uint8[] memory _roles) public {
        uint256 len;
        for(uint256 i = 0; i < _roles.length; i++) {
            len = roles[member].length;
            roles[member].push(_roles[i]);
        }
        
        
    }
    
    function getRoles(address[] calldata members)public override view returns(uint8[][] memory list){
        // string[] memory list = new string[](5);
        // list[0] = 'owners';
        // list[1] = 'admins';
        // list[2] = 'members';
        // list[3] = 'sub-admins';
        // list[4] = 'unkwnowns';
        
        list = new uint8[][](members.length);

        for(uint256 i = 0; i < members.length; i++) {
            list[i] = roles[members[i]];
        }

        return list;
        
    }

    function getAddresses(uint8[] memory/* rolesIndex*/) public override pure returns(address[][] memory){
        address[][]memory list = new address[][](0);
        return list;
    }

    function hasRole(address account, uint8 roleIndex) external view returns(bool) {
        
        for(uint256 i = 0; i < roles[account].length; i++) {
            if (roles[account][i] == roleIndex) {
                return true;
            }
        }
        return false;
    }


    ////////////////////////////////////////////////////////////

     function initialize(
        address hook,
        address invitedHook,
        address costManager,
        address authorizedInviteManager,
        string memory name,
        string memory symbol,
        string memory contractUri
    ) external {
        
    }

    function getRolesWhichAccountCanGrant(
        address accountWhichWillGrant,
        string[] memory roleNames
    ) external view returns (uint8[] memory) {
        // just method
    }


    function grantRoles(
        address[] memory accounts,
        uint8[] memory roleIndexes
    ) external {
        // just method
    }

    function revokeRoles(
        address[] memory accounts,
        uint8[] memory roleIndexes
    ) external {
        // just method
    }
    ////////////////////////////////////////////
}