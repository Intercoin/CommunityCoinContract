// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;



import "../interfaces/ICommunity.sol";

contract MockCommunity is ICommunity {
    uint256 private count = 5;

    string[5] list;

    function setRoles(string[5] memory list_) public {
        for (uint256 i=0; i<count; i++) {
            list[i] = list_[i];
        }
    }

    function getRoles(address/* member*/)public override view returns(string[] memory){
        string[] memory listOut = new string[](5);
        for (uint256 i=0; i<count; i++) {
            listOut[i] = list[i];
        }
        return listOut;
        
    }
    
    
}