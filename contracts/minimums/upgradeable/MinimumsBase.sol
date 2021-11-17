// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * Realization a restriction limits for user transfer
 * 
 */
abstract contract MinimumsBase is Initializable, ContextUpgradeable {
    
    using SafeMathUpgradeable for uint256;
	using MathUpgradeable for uint256;
	using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
	
	struct Lockup {
        uint256 duration;
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
    uint256 private interval;
    
    
    function MinimumsBase_init (
        uint256 interval_
    ) 
        internal
        initializer 
    {
        __Context_init_unchained();
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
    * @param duration duration in count of intervals defined before
    * @param gradual true if the limitation can gradually decrease
    */
    function _minimumsAdd(
        address addr,
        uint256 amount, 
        uint256 duration,
        bool gradual
    ) 
        // public 
        // onlyOwner()
        internal
        returns (bool)
    {
        uint256 timestampStart = getIndexInterval(block.timestamp);
        uint256 timestampEnd = timestampStart.add(duration.mul(interval));
        require(timestampEnd > timestampStart, 'timestamp is less then current block.timestamp');
        
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
        uint256 duration
    )
        internal
    {
        users[from].lockup.duration = duration.mul(interval);
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
                tmp = users[addr].minimums[mapIndex].speedGradualUnlock.mul(mapIndex.sub(block.timestamp));
                
                amountLocked = amountLocked.
                                    add(tmp < users[addr].minimums[mapIndex].amountGradualWithdrawn ? 0 : tmp.sub(users[addr].minimums[mapIndex].amountGradualWithdrawn)).
                                    add(users[addr].minimums[mapIndex].amountNoneGradual);
            }
        }
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
            users[addr].minimums[timestampEnd].speedGradualUnlock = users[addr].minimums[timestampEnd].speedGradualUnlock.add(
                (amount).div(timestampEnd.sub(timestampStart))
            );
            //users[addr].minimums[timestamp].amountGradual = users[addr].minimums[timestamp].amountGradual.add(amount);
        } else {
            // none-gradual
            users[addr].minimums[timestampEnd].amountNoneGradual = users[addr].minimums[timestampEnd].amountNoneGradual.add(amount);
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
        
        // /revert("TBD");
        
        if (users[addr].minimumsIndexes.contains(timestampEnd) == true) {
            
            if (gradual == true) {
                
                users[addr].minimums[timestampEnd].amountGradualWithdrawn = users[addr].minimums[timestampEnd].amountGradualWithdrawn.add(value);
                
                uint256 left = (users[addr].minimums[timestampEnd].speedGradualUnlock).mul(timestampEnd.sub(block.timestamp));
                if (left <= users[addr].minimums[timestampEnd].amountGradualWithdrawn) {
                    users[addr].minimums[timestampEnd].speedGradualUnlock = 0;
                    // delete users[addr].minimums[timestampEnd];
                    // users[addr].minimumsIndexes.remove(timestampEnd);
                }
            } else {
                if (users[addr].minimums[timestampEnd].amountNoneGradual > value) {
                    users[addr].minimums[timestampEnd].amountNoneGradual = users[addr].minimums[timestampEnd].amountNoneGradual.sub(value);
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
                        value = value.sub(iValue);
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
                    _minimumsAddLow(to, block.timestamp, _dataList[i], iValue, false);
                    
                    if (value == 0) {
                        break;
                    }
                    
                    
                    // try move gradual
                    
                    // amount left in current minimums
                    tmpValue = users[from].minimums[_dataList[i]].speedGradualUnlock.mul(
                        _dataList[i].sub(block.timestamp)
                    );
                        
                        
                    if (value >= tmpValue) {
                        iValue = tmpValue;
                        value = value.sub(tmpValue);

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
                    _minimumsAddLow(to, block.timestamp, _dataList[i], iValue, true);
                    
                    if (value == 0) {
                        break;
                    }
                    


                } // if (block.timestamp <= users[from].minimums[_dataList[i]].timestampEnd) {
            } // end for
            
   
        }
        
        if (value != 0) {
            
            // todo 0: what this?
            // _appendMinimum(
            //     to,
            //     block.timestamp,//block.timestamp.add(minTimeDiff),
            //     value,
            //     false
            // );
        }
     
        
    }
    
    function getIndexInterval(uint256 ts) internal view returns(uint256) {
        return (ts).div(interval).mul(interval);
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
