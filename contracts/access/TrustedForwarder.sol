// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts v4.4.1 (access/Ownable.sol)

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

abstract contract TrustedForwarder is OwnableUpgradeable {

    address private _trustedForwarder;

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    function __TrustedForwarder_init() internal onlyInitializing {
        __Ownable_init();
        _trustedForwarder = address(0);

    }


    /**
    * @dev setup trusted forwarder address
    * @param forwarder trustedforwarder's address to set
    */
    function setTrustedForwarder(
        address forwarder
    ) 
        public 
        onlyOwner 
        //excludeTrustedForwarder 
    {
        require(owner() != forwarder, "FORWARDER_CAN_NOT_BE_OWNER");
        _trustedForwarder = forwarder;
    }
        
    /**
    * @dev checking if forwarder is trusted
    * @param forwarder trustedforwarder's address to check
    *
    */
    function isTrustedForwarder(
        address forwarder
    ) 
        public 
        view 
        returns(bool) 
    {
        return forwarder == _trustedForwarder;
    }

    /**
    * @dev implemented EIP-2771
    */
    function _msgSender(
    ) 
        internal 
        virtual
        override
        view 
        returns (address signer) 
    {
        signer = msg.sender;
        if (msg.data.length>=20 && isTrustedForwarder(signer)) {
            assembly {
                signer := shr(96,calldataload(sub(calldatasize(),20)))
            }
        }    
    }

    function transferOwnership(
        address newOwner
    ) public 
        virtual 
        override 
        onlyOwner 
    {
        require(msg.sender != _trustedForwarder, "DENIED_FOR_FORWARDER");
        if (newOwner == _trustedForwarder) {
            _trustedForwarder = address(0);
        }
        super.transferOwnership(newOwner);
        
    }

  

}
