// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

/**
@title Presale the msa as MockPresaleBad2 but fallback is payable
*/
contract MockPresaleBad3 {
    fallback() external payable {

    }

}