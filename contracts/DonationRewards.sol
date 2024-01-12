// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;

import "./ImpactCoin.sol";
import "@intercoin/nonfungibletokencontract/contracts/NFT.sol";

import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";

import "./interfaces/IDonationRewards.sol";

// import "hardhat/console.sol";
interface Community{
    function invitedBy(address addr) external view returns(address);
    function revokeRoles(
        address[] memory accounts, 
        uint8[] memory roleIndexes
    ) 
    external;

    function grantRoles(
        address[] memory accounts, 
        uint8[] memory roleIndexes
    ) 
    external;
}
contract DonationRewards is Initializable, ContextUpgradeable, OwnableUpgradeable, AccessControlUpgradeable, IDonationRewards, IERC777RecipientUpgradeable {

    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
 
    EnumerableSetUpgradeable.AddressSet internal tokensWhitelist;

    address internal caller;

    error AccessDenied();
    error AlreadySetup();

    event Claimed(address indexed token, address indexed account, uint256 amount);

    struct TokenData {
        //      [user]
        mapping (address => UserStruct) users;
        uint256 available;
        uint256 ratio;
        uint256 fractionPerSec;
    }
    mapping(address => TokenData) tokensData;
    //////////////////////////
    // struct Lockup {
    //     uint64 duration;
    //     bool exists;
    // }
    struct Deposit {
        uint256 amount;
        uint256 fractionPerSec;
    }
    struct UserStruct {
        EnumerableSetUpgradeable.UintSet minimumsIndexes;
        //[minimum index] => [value]
        mapping(uint256 => Deposit) minimums;
        //Lockup lockup;
        uint64 duration;
        bool exists;
    }
    
    uint32 private interval;
    ///////////////////////////


    bytes32 internal constant BONUS_CALLER = keccak256("BONUS_CALLER");
    uint64 constant FRACTION = 100000;
    
    struct CommunityRoles {
        uint8 roleindex;
        uint256 growcap;
    }
    struct CommunitySettings {
        CommunityRoles[] roles;
        Community addr;
    }

    struct Multipliers {
        uint64 timestamp;
        uint64 multiplier;
    }
    struct ImpactSettings {
        address token;
        Multipliers[] multipliers;
    }

    struct NFTSettings {
        address token;
        address currency;
        uint64 seriesId;
        uint256 price;
    }

    struct Settings {
        ImpactSettings impactSettings;
        CommunitySettings community;
        NFTSettings nft;
    }

    Settings internal settings;

    struct ImpactCounter {
        CommunityRoles currentRole;
        uint256 amount;
    }
    mapping(address => ImpactCounter) impactCoinCounter;
    
    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) external {
        // from(sender), token    amount
        _donate(from, msg.sender, amount);
    }


    receive() external payable {
        _donate(_msgSender(), address(0), msg.value);
    }


    modifier onlyCaller() {
        if (_msgSender() != caller) {
            revert AccessDenied();
        }
        _;
    }

    function setupCaller() external override {
        if (caller != address(0)) {
            revert AlreadySetup();
        }
        caller = _msgSender();
    }
    
// mint amount of ImpactCoin to account
// mint NFT to account with series seriesId
// calculate total ImpactCoin granted to account and move account to the appropriate role. Remember that user's role would be the one at the moment from this set.
// method will return extraTokenAmount
// for example.
// in beginning user have 0.
// user obtain 150 ICoin, Total=150 ICoin - contract grant "Role-100",
// user obtain 200 ICoin, Total=350 ICoin - contract revoke "Role-100" and grant "Role-200",
// user obtain 700 ICoin, Total=1050 ICoin - contract revoke "Role-200" and grant "Role-800", (here we pass role "Role-500")

    function bonus(
        address instance, 
        address account, 
        uint64 duration, 
        uint256 amount
    ) 
        external 
    {

        require(hasRole(BONUS_CALLER, _msgSender()), "DISABLED");

        proceedImpact(account, amount);
        proceedNft(account, amount);
        proceedCommunity(account, amount);
        proceedBonuses(instance, account, duration, amount);
        
    }

    function transferHook(
        address operator, 
        address from, 
        address to, 
        uint256 amount
    ) 
        external 
        returns(bool)
    {
        return true;
    }

    function viewSettings() public view returns(Settings memory) {
        return settings;
    }
    
    function updateNftSettings(
        address currency,
        uint64 seriesId,
        uint256 price
    ) 
        public 
        onlyOwner 
    {
        settings.nft.currency = currency;
        settings.nft.seriesId = seriesId;
        settings.nft.price = price;
    }

    function updateCommunitySettings(
        CommunityRoles[] memory roles
    ) 
        public 
        onlyOwner 
    {
        delete settings.community.roles;
        for(uint256 i = 0; i < roles.length; i++) {
            settings.community.roles.push(CommunityRoles(roles[i].roleindex, roles[i].growcap));
        }
    }

    function init(
        ImpactSettings memory impactSettings,
        NFTSettings memory nftSettings,
        CommunitySettings memory communitySettings
    ) 
        public
        virtual
        initializer
    {
        __Reward_init(impactSettings, nftSettings, communitySettings);
    }

    function whitelistAdd(
        address token,
        uint256 ratio,
        uint256 fractionPerSec

    ) 
        public
        onlyOwner 
    {
        require(token != address(0), "not allowed");

        bool justAdded = tokensWhitelist.add(token);
        if (justAdded) { // if just added
    
            tokensData[token].available = 0;
            tokensData[token].ratio = ratio;
            tokensData[token].fractionPerSec = fractionPerSec;
        }

    }

    // before uncomment answer the question what need to do with locked up tokens in whitelist?
    // function whitelistRemove(
    //     address token
    // ) 
    //     public
    //     onlyOwner 
    // {
    //     tokensWhitelist.remove(token);
    // }

    function whitelistExists(
        address token
    ) 
        public
        view 
        returns(bool, uint256, uint256, uint256)
    {
        return (
            tokensWhitelist.contains(token),
            tokensData[token].available,
            tokensData[token].ratio,
            tokensData[token].fractionPerSec
        );
    }

    function donate(
        address token, 
        uint256 amount
    ) 
        public
        payable 
    {
        
        _donate(_msgSender(), token, amount);
    }

    function claim(

    )
        public
    {

        uint256 mapIndex;
        uint256 toClaim;
        uint256 extra;
        address token;
        address account = _msgSender();

        for (uint256 j=0; j < tokensWhitelist.length(); j++) {
            token = tokensWhitelist.at(j);
            toClaim = 0;
            for (uint256 i=0; i < tokensData[token].users[account].minimumsIndexes.length(); i++) {
                mapIndex = tokensData[token].users[account].minimumsIndexes.at(i);

                // calculate extra
                extra = (block.timestamp >= mapIndex) 
                    ? 
                    tokensData[token].users[account].minimums[mapIndex].fractionPerSec * (block.timestamp - mapIndex) 
                    : 
                    0
                ;

                toClaim = toClaim + extra + (tokensData[token].users[account].minimums[mapIndex].amount);
                
            }
            
            require(toClaim <= ERC20(token).balanceOf(address(this)), "insufficient funds");
            
            if (toClaim <= ERC20(token).balanceOf(address(this))) {
                ERC20(token).transfer(account, toClaim);

                emit Claimed(token, account, toClaim);

                _minimumsClear(token, account, false);
            }

        }

        

    }

    function onDonate(address token, address who, uint256 amount) external {
         // to be implemented
    }

    function _donate(
        address sender,
        address token, 
        uint256 amount
    ) 
        internal
    {
        require(tokensWhitelist.contains(token), "not in whitelist");

        if (token == address(0)) {
            require(msg.value >= amount, "insufficient funds");
            uint256 refund = msg.value - amount;
            if (refund > 0) {
                (bool transferSuccess, ) = sender.call{gas: 3000, value: (refund)}(new bytes(0));
                require(transferSuccess, "REFUND_FAILED");
            }
            //refund

        } else {
            IERC20(token).transferFrom(sender, address(this), amount);
        }

        tokensData[token].available += amount;

    }
    

    function __Reward_init(
        ImpactSettings memory impactSettings,
        NFTSettings memory nftSettings,
        CommunitySettings memory communitySettings
    ) 
        internal
        onlyInitializing 
    {
        settings.nft.token = nftSettings.token;
        settings.nft.currency = nftSettings.currency;
        settings.nft.seriesId = nftSettings.seriesId;
        settings.nft.price = nftSettings.price;
        
        settings.impactSettings.token = impactSettings.token;
        //settings.impactSettings.multipliers = impactSettings.multipliers;
        for(uint256 i = 0; i < impactSettings.multipliers.length; i++) {
            settings.impactSettings.multipliers.push(Multipliers(impactSettings.multipliers[i].timestamp, impactSettings.multipliers[i].multiplier));
        }

        settings.community.addr = Community(communitySettings.addr);
        for(uint256 i = 0; i < communitySettings.roles.length; i++) {
            settings.community.roles.push(CommunityRoles(communitySettings.roles[i].roleindex, communitySettings.roles[i].growcap));
        }

        __Ownable_init();

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(BONUS_CALLER, _msgSender());
        
        interval = 86400; // day in seconds
    }

    function _transferOwnership(address newOwner) internal virtual override {

        _setupRole(DEFAULT_ADMIN_ROLE, newOwner);
        _setupRole(BONUS_CALLER, newOwner);

        super._transferOwnership(newOwner);
        
    }

    function proceedImpact(
        address account, 
        uint256 amount
    ) 
        internal 
    {   
        
        amount = calculateImpactAmount(amount);

        address[2] memory sendto = [account, address(0)];
        uint256[2] memory amountto = [amount, 0];

        // 10% minted to user who invite 
        try (settings.community.addr).invitedBy(
            account
        )
            returns(address addr)
        {
            if (addr != address(0)) {
                sendto[1] = addr;
                amountto[1] = amount / 10;
                amountto[0] -= amountto[1];
            }
        } catch Error(string memory reason) {
            // This is executed in case revert() was called with a reason
            revert(reason);
        } catch {
            revert("Errors while invitedBy");
        }


        for (uint256 i = 0; i < sendto.length; i++) {
            if (sendto[i] != address(0)) {
                    
                try ImpactCoin(settings.impactSettings.token).mint(
                    sendto[i], amountto[i]
                )
                {
                    // if error is not thrown, we are fine
                } catch Error(string memory reason) {
                    // This is executed in case revert() was called with a reason
                    revert(reason);
                } catch {
                    revert("Errors while minting ICoin");
                }
        
            }
        }
    }

    function calculateImpactAmount(
        uint256 amount
    ) 
        internal 
        view 
        returns(uint256)
    {
        uint256 len = settings.impactSettings.multipliers.length;
        if (len > 0) {

            // find max timestamp from all that less then now.
            // there will not a lot multipliers so we can use loop here
            uint256 multiplier = FRACTION;
            uint256 tmpTimestamp = 0;
            for (uint256 i = 0; i < len; i++) {

                if (
                    (tmpTimestamp <= settings.impactSettings.multipliers[i].timestamp) && 
                    (block.timestamp >= settings.impactSettings.multipliers[i].timestamp)
                ) {

                    tmpTimestamp = settings.impactSettings.multipliers[i].timestamp;
                    multiplier = settings.impactSettings.multipliers[i].multiplier;
                }
            }

            amount = amount * multiplier / FRACTION;
        }
        return amount;
    }

    function proceedNft(
        address account, 
        uint256 amount
    ) 
        internal 
    {
        // trying call with trusted forward
        bytes memory data = abi.encodeWithSelector(
            NFT.mintAndDistributeAuto.selector,
            settings.nft.seriesId,
            account, 
            1
        );
        // using a meta transaction.  expect that rewardContract is a trusted forwarder for NFT so it can call any method as owner
        // get owner address
        address nftContractOwner = NFT(settings.nft.token).owner();
        data = abi.encodePacked(data,nftContractOwner);    

        (bool success, bytes memory result) = address(settings.nft.token).call(data);
        if (!success) {
            // Next 5 lines from https://ethereum.stackexchange.com/a/83577
            if (result.length < 68) revert("Errors while minting NFT"); //silently
            assembly {
                result := add(result, 0x04)
            }
            revert(abi.decode(result, (string)));
        }
    }

    function proceedCommunity(
        address account, 
        uint256 amount
    ) 
        internal 
    {
        uint256 amountWas = impactCoinCounter[account].amount;
        uint256 amountCurrent = amountWas + amount;
        
        uint256 amountNearToCurrent = type(uint256).max;
        uint256 j;

        uint256 indexMax = 0;
        for(uint256 i = 0; i < settings.community.roles.length; i++) {
            if (
                amountCurrent <= settings.community.roles[i].growcap &&
                amountNearToCurrent >= settings.community.roles[i].growcap
            ) {
                amountNearToCurrent = settings.community.roles[i].growcap;
                j = i;
            }

            if (settings.community.roles[indexMax].growcap <= settings.community.roles[i].growcap) {
                indexMax = i;
            }

        }

        // if role changed by grow up usercap  OR roles can be changed by owner and any donation should recalculated(custom case when cap the same but role are different)
        bool needToUpdate = false;
        uint256 indexToUpdate = 0;

        if (type(uint256).max != amountNearToCurrent) {
            indexToUpdate = j;
            needToUpdate = true;
        } else if (impactCoinCounter[account].currentRole.roleindex != settings.community.roles[indexMax].roleindex) {
            indexToUpdate = indexMax;
            needToUpdate = true;
        }

        if (needToUpdate) {
            _changeCommunityRole(account, impactCoinCounter[account].currentRole.roleindex, settings.community.roles[indexToUpdate].roleindex);
            
            impactCoinCounter[account].currentRole.roleindex = settings.community.roles[indexToUpdate].roleindex;
            impactCoinCounter[account].currentRole.growcap = settings.community.roles[indexToUpdate].growcap;
            impactCoinCounter[account].amount = amountCurrent;
        }
    }

    
    function proceedBonuses(
        address instance, 
        address account, 
        uint64 duration,
        uint256 amount
    ) 
        internal 
    {
        
        // get Traded token
        bytes memory data = abi.encodeWithSelector(bytes4(keccak256(bytes("tradedToken()"))));
        (bool success, bytes memory returndata) = instance.call(data);

        address token = abi.decode(returndata,(address));
        if (tokensWhitelist.contains(token)) {
            // todo: check current balance? 
            _minimumsAdd(token, account, amount*tokensData[token].ratio/FRACTION, duration);
            // note that here are duration is in count of intervals
            // if duration = 3 it means that 3 * interval  = 3 * 86400 = 3 days
        }

    }

    function _changeCommunityRole(address account, uint8 from, uint8 to) internal {
        address[] memory members = new address[](1);
        members[0] = account;

        uint8[] memory roles = new uint8[](1);
        
        //@dev 
        // deprecated in community. 
        // now there are no need to add members in some default role before grant role. 

        // try (settings.community.addr).addMembers(
        //     members
        // )
        // {
        //     // if error is not thrown, we are fine
        // } catch Error(string memory reason) {
        //     // This is executed in case revert() was called with a reason
        //     revert(reason);
        // } catch {
        //     revert("Errors while addMembers");
        // }

        if (from != to) {
            if (from != 0) {
                roles[0] = from;
                try (settings.community.addr).revokeRoles(
                    members, roles
                )
                {
                    // if error is not thrown, we are fine
                } catch Error(string memory reason) {
                    // This is executed in case revert() was called with a reason
                    revert(reason);
                } catch {
                    revert("Errors while revokeRoles");
                }
            }

            roles[0] = to;
            try (settings.community.addr).grantRoles(
                members, roles
            )
            {
                // if error is not thrown, we are fine
            } catch Error(string memory reason) {
                // This is executed in case revert() was called with a reason
                revert(reason);
            } catch {
                revert("Errors while grantRoles");
            }

        }

    }

    /**
    * @dev adding minimum holding at sender during period from now to timestamp.
    *
    * @param addr address which should be restricted
    * @param amount amount.
    * @param intervalCount duration in count of intervals defined before
    */
    function _minimumsAdd(
        address token,
        address addr,
        uint256 amount, 
        uint256 intervalCount
    ) 
        // public 
        // onlyOwner()
        internal
        returns (bool)
    {
        uint256 timestampStart = getIndexInterval(block.timestamp);
        uint256 timestampEnd = timestampStart + (intervalCount * interval);
        require(timestampEnd > timestampStart, "TIMESTAMP_INVALID");

        //_minimumsClear(token, addr, false);
        // we will delete only while claiming
        
        _minimumsAddLow(token, addr, timestampEnd, amount);
    
        return true;
        
    }
    
    /**
     * @dev removes all minimums from this address
     * so all tokens are unlocked to send
     * @param addr address which should be clear restrict
     */
    function _minimumsClear(
        address token,
        address addr
    )
        internal
        returns (bool)
    {
        return _minimumsClear(token, addr, true);
    }

    /**
    * @dev clear expired items from mapping. used while addingMinimum
    *
    * @param addr address.
    * @param deleteAnyway if true when delete items regardless expired or not
    */
    function _minimumsClear(
        address token,
        address addr,
        bool deleteAnyway
    ) 
        internal 
        returns (bool) 
    {
        uint256 mapIndex = 0;
        uint256 len = tokensData[token].users[addr].minimumsIndexes.length();
        if (len > 0) {
            for (uint256 i=len; i>0; i--) {
                mapIndex = tokensData[token].users[addr].minimumsIndexes.at(i-1);
                if (
                    (deleteAnyway == true) ||
                    (getIndexInterval(block.timestamp) > mapIndex)
                ) {
                    delete tokensData[token].users[addr].minimums[mapIndex];
                    tokensData[token].users[addr].minimumsIndexes.remove(mapIndex);
                }
                
            }
        }
        return true;
    }


        
    /**
     * added minimum if not exist by timestamp else append it
     * @param addr destination address
     * @param timestampEnd "until time"
     * @param amount amount
     */
    //function _appendMinimum(
    function _minimumsAddLow(
        address token,
        address addr,
        uint256 timestampEnd, 
        uint256 amount
    )
        private
    {
        tokensData[token].users[addr].minimumsIndexes.add(timestampEnd);
        
        tokensData[token].users[addr].minimums[timestampEnd].amount = tokensData[token].users[addr].minimums[timestampEnd].amount + amount;
        tokensData[token].users[addr].minimums[timestampEnd].fractionPerSec = tokensData[token].fractionPerSec;
        
        
    }

    function getMinimum(
        address token,
        address addr
    ) 
        public
        view
        returns (uint256 amountLocked) 
    {
        return _getMinimum(token, addr);
    }
    /**
    * @dev get sum minimum and sum gradual minimums from address for period from now to timestamp.
    *
    * @param addr address.
    */
    function _getMinimum(
        address token,
        address addr
    ) 
        internal 
        view
        returns (uint256 amountLocked) 
    {
        uint256 mapIndex;
        uint256 extra;

        if (tokensWhitelist.contains(token)) {
            for (uint256 i=0; i < tokensData[token].users[addr].minimumsIndexes.length(); i++) {
                mapIndex = tokensData[token].users[addr].minimumsIndexes.at(i);
               
                if (block.timestamp >= mapIndex) { // calculate extra
                    extra = tokensData[token].users[addr].minimums[mapIndex].fractionPerSec * (block.timestamp - mapIndex);
                } else {
                    extra = 0;
                }

                amountLocked = amountLocked + extra + (tokensData[token].users[addr].minimums[mapIndex].amount);
                
            }
        }
    }


    /**
    * @dev gives index interval. here we deliberately making a loss precision(div before mul) to get the same index during interval.
    * @param ts unixtimestamp
    */
    function getIndexInterval(uint256 ts) internal view returns(uint256) {
        return ts / interval * interval;
    }
    
    // useful method to sort native memory array 
    function sortAsc(uint256[] memory data) private returns(uint[] memory) {
       quickSortAsc(data, int(0), int(data.length - 1));
       return data;
    }
    
    function quickSortAsc(uint[] memory arr, int left, int right) private {
        int i = left;
        int j = right;
        if(i==j) return;
        uint pivot = arr[uint(left + (right - left) / 2)];
        while (i <= j) {
            while (arr[uint(i)] < pivot) i++;
            while (pivot < arr[uint(j)]) j--;
            if (i <= j) {
                (arr[uint(i)], arr[uint(j)]) = (arr[uint(j)], arr[uint(i)]);
                i++;
                j--;
            }
        }
        if (left < j)
            quickSortAsc(arr, left, j);
        if (i < right)
            quickSortAsc(arr, i, right);
    }
    
}

