// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

/**
@title Presale the msa as MockPresaleBad2 but fallback is payable
*/
contract MockPresaleBad4 {
    uint64 internal _endTime;
    fallback() external payable {

    }

    function endTime() public view returns(uint64) {
        return _endTime;
    }

    function setEndTime(uint64 endTs) public{
        _endTime = endTs;
    }

}