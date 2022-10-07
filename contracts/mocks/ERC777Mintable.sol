// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import "@openzeppelin/contracts/token/ERC777/ERC777.sol";
/**
 * @dev Extension of {ERC20} that allows token holders to destroy both their own
 * tokens and those that they have an allowance for, in a way that can be
 * recognized off-chain (via event analysis).
 */
contract ERC777Mintable is ERC777 {
    
    /**
     * @param name Token name
     * @param symbol Token symbol
     * 
     */
    constructor (
        string memory name, 
        string memory symbol
    ) 
        ERC777(name, symbol, (new address[](0)))
    {
        
    }
    
    /**
     * @dev Creates `amount` tokens and send to account.
     *
     * See {ERC20-_mint}.
     */
    function mint(address account, uint256 amount) public virtual {
        _mint(account, amount, "", "");
    }
 
}