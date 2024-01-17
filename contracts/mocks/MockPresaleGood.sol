// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../interfaces/IPresale.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
/**
@title Presale contract with IPresale interface but without registered in intercoin ecosystem
*/
contract MockPresaleGood is IPresale {

    address internal contractAddr;
    uint64 internal _endTime;

    function endTime() external view returns (uint64) {
        return _endTime;
    }

    function buy() external payable {
        uint256 amountToSend = msg.value;
        IERC20(contractAddr).transfer(msg.sender, amountToSend);
    }

    function setTokenAddress(address addr) public {
        contractAddr = addr;
    }
    function setEndTime(uint64 endTs) public {
        _endTime = endTs;
    }

}