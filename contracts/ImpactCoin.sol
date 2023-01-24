// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract ImpactCoin is ERC20, Ownable, AccessControl {
    bytes32 public constant REWARD_ROLE = keccak256("REWARD_ROLE");

    constructor(
    ) 
        ERC20("ImpactCoin", "ICoin") 
    {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(REWARD_ROLE, _msgSender());
    }

    /**
     * @dev Creates `amount` new tokens for `to`.
     *
     * See {ERC20-_mint}.
     *
     * Requirements:
     *
     * - the caller must be owner.
     */
    function mint(
        address to, 
        uint256 amount
    ) 
        public 
        virtual 
        onlyRole(REWARD_ROLE)
    {
        _mint(to, amount);
    }

}

