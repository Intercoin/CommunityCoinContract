// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
/**
 * Realization a restriction limits for user transfer
 * 
 */
contract MinimumsBaseUpgradeable is Initializable, ContextUpgradeable{

	using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
	
    address internal constant ZERO_ADDRESS = address(0);
	struct Lockup {
        uint64 duration;
        //bool gradual; // does not used 
        bool exists;
    }
    
    struct Minimum {
     //   uint256 timestampStart; //ts start no need 
        //uint256 timestampEnd;   //ts end
        uint256 speedGradualUnlock;    
        uint256 amountGradualWithdrawn;
        //uint256 amountGradual;
        uint256 amountNoneGradual;
        //bool gradual;
    }
    
    /*
0-100 200 tokens
speed 2

40-100 40 tokens
speed 0.666
    
timex = 70    
locked1 = 200/(100-0)*(100-70) = 60
locked2 = 40/(100-40)*(100-70) = 20

    
    */
    struct UserStruct {
        EnumerableSetUpgradeable.UintSet minimumsIndexes;
        mapping(uint256 => Minimum) minimums;
        //mapping(uint256 => uint256) dailyAmounts;
        Lockup lockup;
    }
    
    mapping (address => UserStruct) private users;
    uint32 private interval;
    
    function __MinimumsBaseUpgradeable_init(
        uint32 interval_
    ) 
        internal 
        onlyInitializing 
    {
        if (interval_ == 0) {
            // set default via dayInSeconds
            interval = 86400;
        } else {
            interval = interval_;
        }
        
    }

    
    /**
    * @dev adding minimum holding at sender during period from now to timestamp.
    *
    * @param addr address which should be restricted
    * @param amount amount.
    * @param intervalCount duration in count of intervals defined before
    * @param gradual true if the limitation can gradually decrease
    */
    function _minimumsAdd(
        address addr,
        uint256 amount, 
        uint256 intervalCount,
        bool gradual
    ) 
        // public 
        // onlyOwner()
        internal
        returns (bool)
    {
        uint256 timestampStart = getIndexInterval(block.timestamp);
        uint256 timestampEnd = timestampStart + (intervalCount * interval);
        require(timestampEnd > timestampStart, "TIMESTAMP_INVALID");
        
        _minimumsClear(addr, false);
        
        _minimumsAddLow(addr, timestampStart, timestampEnd, amount, gradual);
    
        return true;
        
    }
    
    /**
     * @dev removes all minimums from this address
     * so all tokens are unlocked to send
     * @param addr address which should be clear restrict
     */
    function _minimumsClear(
        address addr
    )
        internal
        returns (bool)
    {
        return _minimumsClear(addr, true);
    }
    
    /**
     * @param from will add automatic lockup for destination address sent address from
     * @param duration duration in count of intervals defined before
     */
    function _automaticLockupAdd(
        address from,
        uint32 duration
    )
        internal
    {
        users[from].lockup.duration = duration * interval;
        users[from].lockup.exists = true;
    }
    
    /**
     * @param from remove automaticLockup from address 
     */
    function _automaticLockupRemove(
        address from
    )
        internal
    {
        users[from].lockup.exists = false;
    }
    
    /**
    * @dev get sum minimum and sum gradual minimums from address for period from now to timestamp.
    *
    * @param addr address.
    */
    function _getMinimum(
        address addr
    ) 
        internal 
        view
        returns (uint256 amountLocked) 
    {
        
        uint256 mapIndex;
        uint256 tmp;
        for (uint256 i=0; i<users[addr].minimumsIndexes.length(); i++) {
            mapIndex = users[addr].minimumsIndexes.at(i);
            
            if (block.timestamp <= mapIndex) { // block.timestamp<timestampEnd
                tmp = users[addr].minimums[mapIndex].speedGradualUnlock * (mapIndex - block.timestamp);
                
                amountLocked = amountLocked +
                                    (
                                        tmp < users[addr].minimums[mapIndex].amountGradualWithdrawn 
                                        ? 
                                        0 
                                        : 
                                        tmp - (users[addr].minimums[mapIndex].amountGradualWithdrawn)
                                    ) +
                                    (users[addr].minimums[mapIndex].amountNoneGradual);
            }
        }
    }

    function _getMinimumList(
        address addr
    ) 
        internal 
        view
        returns (uint256[][] memory ) 
    {
        
        uint256 mapIndex;
        uint256 tmp;
        uint256 len = users[addr].minimumsIndexes.length();

        uint256[][] memory ret = new uint256[][](len);


        for (uint256 i=0; i<len; i++) {
            mapIndex = users[addr].minimumsIndexes.at(i);
            
            if (block.timestamp <= mapIndex) { // block.timestamp<timestampEnd
                tmp = users[addr].minimums[mapIndex].speedGradualUnlock * (mapIndex - block.timestamp);
                ret[i] = new uint256[](2);
                ret[i][1] = mapIndex;
                ret[i][0] = (
                                tmp < users[addr].minimums[mapIndex].amountGradualWithdrawn 
                                ? 
                                0 
                                : 
                                tmp - (users[addr].minimums[mapIndex].amountGradualWithdrawn)
                            ) +
                            (users[addr].minimums[mapIndex].amountNoneGradual);
            }
        }

        return ret;
    }
    
    /**
    * @dev clear expired items from mapping. used while addingMinimum
    *
    * @param addr address.
    * @param deleteAnyway if true when delete items regardless expired or not
    */
    function _minimumsClear(
        address addr,
        bool deleteAnyway
    ) 
        internal 
        returns (bool) 
    {
        uint256 mapIndex = 0;
        uint256 len = users[addr].minimumsIndexes.length();
        if (len > 0) {
            for (uint256 i=len; i>0; i--) {
                mapIndex = users[addr].minimumsIndexes.at(i-1);
                if (
                    (deleteAnyway == true) ||
                    (getIndexInterval(block.timestamp) > mapIndex)
                ) {
                    delete users[addr].minimums[mapIndex];
                    users[addr].minimumsIndexes.remove(mapIndex);
                }
                
            }
        }
        return true;
    }


        
    /**
     * added minimum if not exist by timestamp else append it
     * @param addr destination address
     * @param timestampStart if empty get current interval or currente time. Using only for calculate gradual
     * @param timestampEnd "until time"
     * @param amount amount
     * @param gradual if true then lockup are gradually
     */
    //function _appendMinimum(
    function _minimumsAddLow(
        address addr,
        uint256 timestampStart, 
        uint256 timestampEnd, 
        uint256 amount, 
        bool gradual
    )
        private
    {
        users[addr].minimumsIndexes.add(timestampEnd);
        if (gradual == true) {
            // gradual
            users[addr].minimums[timestampEnd].speedGradualUnlock = users[addr].minimums[timestampEnd].speedGradualUnlock + 
                (
                amount / (timestampEnd - timestampStart)
                );
            //users[addr].minimums[timestamp].amountGradual = users[addr].minimums[timestamp].amountGradual.add(amount);
        } else {
            // none-gradual
            users[addr].minimums[timestampEnd].amountNoneGradual = users[addr].minimums[timestampEnd].amountNoneGradual + amount;
        }
    }
    
    /**
     * @dev reduce minimum by value  otherwise remove it 
     * @param addr destination address
     * @param timestampEnd "until time"
     * @param value amount
     */
    function _reduceMinimum(
        address addr,
        uint256 timestampEnd, 
        uint256 value,
        bool gradual
    )
        internal
    {
        
        if (users[addr].minimumsIndexes.contains(timestampEnd) == true) {
            
            if (gradual == true) {
                
                users[addr].minimums[timestampEnd].amountGradualWithdrawn = users[addr].minimums[timestampEnd].amountGradualWithdrawn + value;
                
                uint256 left = (users[addr].minimums[timestampEnd].speedGradualUnlock) * (timestampEnd - block.timestamp);
                if (left <= users[addr].minimums[timestampEnd].amountGradualWithdrawn) {
                    users[addr].minimums[timestampEnd].speedGradualUnlock = 0;
                    // delete users[addr].minimums[timestampEnd];
                    // users[addr].minimumsIndexes.remove(timestampEnd);
                }
            } else {
                if (users[addr].minimums[timestampEnd].amountNoneGradual > value) {
                    users[addr].minimums[timestampEnd].amountNoneGradual = users[addr].minimums[timestampEnd].amountNoneGradual - value;
                } else {
                    users[addr].minimums[timestampEnd].amountNoneGradual = 0;
                    // delete users[addr].minimums[timestampEnd];
                    // users[addr].minimumsIndexes.remove(timestampEnd);
                }
                    
            }
            
            if (
                users[addr].minimums[timestampEnd].speedGradualUnlock == 0 &&
                users[addr].minimums[timestampEnd].amountNoneGradual == 0
            ) {
                delete users[addr].minimums[timestampEnd];
                users[addr].minimumsIndexes.remove(timestampEnd);
            }
                
                
            
        }
    }
    
    /**
     * 
     * @param from sender address
     * @param to destination address
     * @param value amount
     */
    function minimumsTransfer(
        address from, 
        address to, 
        uint256 value
    )
        internal
    {
        

        uint256 len = users[from].minimumsIndexes.length();
        uint256[] memory _dataList;
        //uint256 recieverTimeLeft;
    
        if (len > 0) {
            _dataList = new uint256[](len);
            for (uint256 i=0; i<len; i++) {
                _dataList[i] = users[from].minimumsIndexes.at(i);
            }
            _dataList = sortAsc(_dataList);
            
            uint256 iValue;
            uint256 tmpValue;
        
            for (uint256 i=0; i<len; i++) {
                
                if (block.timestamp <= _dataList[i]) {
                    
                    // try move none-gradual
                    if (value >= users[from].minimums[_dataList[i]].amountNoneGradual) {
                        iValue = users[from].minimums[_dataList[i]].amountNoneGradual;
                        value = value - iValue;
                    } else {
                        iValue = value;
                        value = 0;
                    }
                    
                    // remove from sender
                    _reduceMinimum(
                        from,
                        _dataList[i],//timestampEnd,
                        iValue,
                        false
                    );

                    // shouldn't add miniums for zero account.
                    // that feature using to drop minimums from sender
                    if (to != ZERO_ADDRESS) {
                        _minimumsAddLow(to, block.timestamp, _dataList[i], iValue, false);
                    }
                    
                    if (value == 0) {
                        break;
                    }
                    
                    
                    // try move gradual
                    
                    // amount left in current minimums
                    tmpValue = users[from].minimums[_dataList[i]].speedGradualUnlock * (_dataList[i] - block.timestamp);
                        
                        
                    if (value >= tmpValue) {
                        iValue = tmpValue;
                        value = value - tmpValue;

                    } else {
                        iValue = value;
                        value = 0;
                    }
                    // remove from sender
                    _reduceMinimum(
                        from,
                        _dataList[i],//timestampEnd,
                        iValue,
                        true
                    );
                    // uint256 speed = iValue.div(
                        //     users[from].minimums[_dataList[i]].timestampEnd.sub(block.timestamp);
                        // );

                    // shouldn't add miniums for zero account.
                    // that feature using to drop minimums from sender
                    if (to != ZERO_ADDRESS) {
                        _minimumsAddLow(to, block.timestamp, _dataList[i], iValue, true);
                    }
                    if (value == 0) {
                        break;
                    }
                    


                } // if (block.timestamp <= users[from].minimums[_dataList[i]].timestampEnd) {
            } // end for
            
   
        }
        
        // if (value != 0) {
            // todo 0: what this?
            // _appendMinimum(
            //     to,
            //     block.timestamp,//block.timestamp.add(minTimeDiff),
            //     value,
            //     false
            // );
        // }
     
        
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
