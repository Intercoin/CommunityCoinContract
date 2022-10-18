// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;

import "../CommunityCoin.sol";

contract MockCommunityCoin is CommunityCoin {
    function getUnstakeableMap(address account) public view returns(uint256) {
        return users[account].unstakeable;
    }

    function getInstanceStakedMap(address instance) public view returns(uint256) {
        return _instances[instance]._instanceStaked;
    }
    
    function getInstanceUnstakeableMap(address instance, address account) public view returns(uint256) {
        return _instances[instance].unstakeable[account];
    }
            
}