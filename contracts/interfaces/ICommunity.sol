// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICommunity {
    //function memberCount(string calldata role) external view returns(uint256);
    function getRoles(address member)external view returns(string[] memory);
    //function getMember(string calldata role) external view returns(address[] memory);
}