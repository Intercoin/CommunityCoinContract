// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IStakingContract.sol";

contract StakingFactory is Ownable {
    using Clones for address;

    /**
    * @custom:shortd StakingContract implementation address
    * @notice StakingContract implementation address
    */
    address public immutable stakingContractImplementation;
    /**
    * @custom:shortd StakingPool implementation address
    * @notice StakingPool implementation address
    */
    address public immutable stakingPoolImplementation;

    address[] public instances;
    
    event InstanceCreated(address instance, uint instancesCount);

    /**
    * @param stakingContractImpl address of StakingContract implementation
    * @param stakingPoolImpl address of StakingPool implementation
    */
    constructor(
        address stakingContractImpl,
        address stakingPoolImpl
    ) 
    {
        stakingContractImplementation = stakingContractImpl;
        stakingPoolImplementation = stakingPoolImpl;
    }

    ////////////////////////////////////////////////////////////////////////
    // external section ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    /**
    * @dev view amount of created instances
    * @return amount amount instances
    * @custom:shortd view amount of created instances
    */
    function instancesCount()
        external 
        view 
        returns (uint256 amount) 
    {
        amount = instances.length;
    }

    ////////////////////////////////////////////////////////////////////////
    // public section //////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    /**
    * @param hook address of contract implemented IHook interface and used to calculation bonus tokens amount
    * @param discountSensitivity discountSensitivity value that manage amount tokens in redeem process. multiplied by `FRACTION`(10**5 by default)
    * @return instance address of created instance pool `StakingContract`
    * @custom:shortd creation instance
    */
    function produce(
        address hook,
        uint256 discountSensitivity
    ) 
        public 
        onlyOwner()
        returns (address instance) 
    {
        
        instance = stakingContractImplementation.clone();

        require(instance != address(0), "StakingFactory: INSTANCE_CREATION_FAILED");

        instances.push(instance);
        
        emit InstanceCreated(instance, instances.length);

        IStakingContract(instance).initialize(stakingPoolImplementation, hook, discountSensitivity);
        
        Ownable(instance).transferOwnership(_msgSender());
        
    }

    ////////////////////////////////////////////////////////////////////////
    // internal section ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    
}