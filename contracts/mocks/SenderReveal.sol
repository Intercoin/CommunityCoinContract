pragma solidity ^0.8.11;
import "hardhat/console.sol";
// used to reveal sender when calling from library. And be sure that contract make delegate call to lib
contract SenderReveal {
    function callme() public view {
        console.log("SenderReveal::callme::msg.sender", msg.sender);
    }
}