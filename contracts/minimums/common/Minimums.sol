// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./MinimumsBase.sol";

/**
 * Realization a restriction limits for user transfer
 * 
 */
contract Minimums is MinimumsBase, Ownable {
    
    constructor (
        uint256 interval_
    ) 
        MinimumsBase(interval_)
    {
        
    }
    
    /**
    * @dev viewing minimum holding in addr sener during period from now to timestamp.
    */
    function minimumsView(
        address addr
    ) 
        public 
        view
        returns (uint256)
    {
        return _getMinimum(addr);
    }
    
    /**
    * @dev adding minimum holding at sender during period from now to timestamp.
    *
    * @param addr address which should be restricted
    * @param amount amount.
    * @param duration duration in count of intervals defined before
    * @param gradual true if the limitation can gradually decrease
    */
    function minimumsAdd(
        address addr,
        uint256 amount, 
        uint256 duration,
        bool gradual
    ) 
        public 
        onlyOwner()
        returns (bool)
    {
        return _minimumsAdd(addr, amount, duration, gradual);
    }
    
    /**
     * @dev removes all minimums from this address
     * so all tokens are unlocked to send
     * @param addr address which should be clear restrict
     */
    function minimumsClear(
        address addr
    )
        public 
        onlyOwner()
        returns (bool)
    {
        return _minimumsClear(addr, true);
    }
    
    /**
     * @param from will add automatic lockup for destination address sent address from
     * @param duration duration in count of intervals defined before
     */
    function automaticLockupAdd(
        address from,
        uint256 duration
    )
        public 
        onlyOwner()
        
    {
        _automaticLockupAdd(from, duration);
    }
    
    /**
     * @param from remove automaticLockup from address 
     */
    function automaticLockupRemove(
        address from
    )
        public 
        onlyOwner()
    {
        automaticLockupRemove(from);
    }
    
}
