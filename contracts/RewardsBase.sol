// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

//import "./access/TrustedForwarder.sol";
import "@intercoin/trustedforwarder/contracts/TrustedForwarder.sol";
import "@intercoin/sales/contracts/SalesBase.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

abstract contract RewardsBase is TrustedForwarder, SalesBase{

    function __Rewards_init(
        address _sellingToken,
        uint64[] memory _timestamps,
        uint256[] memory _prices,
        uint256[] memory _amountRaised,
        uint64 _endTs,
        uint256[] memory _thresholds,
        uint256[] memory _bonuses,
        address costManager,
        address producedBy
    ) internal onlyInitializing {

        __CostManagerHelper_init(msg.sender, costManager);

        __TrustedForwarder_init(); // check need?

        __Ownable_init();
        __ReentrancyGuard_init();
        
        require(_sellingToken != address(0), "Sales: _sellingToken can not be zero");
        
        sellingToken = _sellingToken;
        timestamps = _timestamps;
        prices = _prices;
        amountRaised = _amountRaised;
        _endTime = _endTs;
        thresholds = _thresholds;
        bonuses = _bonuses;
        withdrawOption = ISalesStructs.EnumWithdraw.afterEndTime;

        whitelistInit(IWhitelist.WhitelistStruct(
            address(0), //address contractAddress; // 160
            bytes4(0),  //bytes4 method; // 32
            0,          //uint8 role; // 8
            false       //bool useWhitelist;
        ));

    }

     
    function _msgSender(
    ) 
        internal 
        view 
        virtual
        override(SalesBase, TrustedForwarder)
        returns (address signer) 
    {
        return SalesBase._msgSender();
        
    }

/////////////////////////////
   
    // [deprecated] used then need toi calculate "how much user will obtain tokens when send ETH(or erc20) into contract"
    // function _exchange(uint256 inputAmount) internal {
    //     uint256 tokenPrice = getTokenPrice();
    //     uint256 amount2send = _getTokenAmount(inputAmount, tokenPrice);
    //     require(amount2send > 0, "Sales: Can not calculate amount of tokens");

    //     uint256 tokenBalance = IERC20(sellingToken).balanceOf(address(this));
    //     require(tokenBalance >= amount2send, "Sales: Amount exceeds allowed balance");

    //     bool success = IERC20(sellingToken).transfer(_msgSender(), amount2send);
    //     require(success == true, "Transfer tokens were failed");

    //     // bonus calculation
    //     _addBonus(_msgSender(), (inputAmount));
    // }


     
    /**
     * @param amount amount of eth
     * @param addr address to send
     */
    function _claim(uint256 amount, address addr) internal virtual override {
 
        require(address(this).balance >= amount, "Amount exceeds allowed balance");
        require(addr != address(0), "address can not be empty");
        
        address payable addr1 = payable(addr); // correct since Solidity >= 0.6.0
        bool success = addr1.send(amount);
        require(success == true, "Transfer ether was failed"); 
    }
    
    function getContractTotalAmount() internal view virtual override returns(uint256) {
        return address(this).balance;
    }

    /**
    * @param tokenAmount amount in selling tokens
    * @param price token price it current period time. can be calculated in getTokenPrice method
    * @return amount of input tokens(eth or erc20) that user should send into contract to obtain selling token
    */
    function _getNeededInputAmount(uint256 tokenAmount, uint256 price) internal pure returns(uint256) {
        return (tokenAmount * price / priceDenom);
    }


}
