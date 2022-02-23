// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.11;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ICommunityCoin.sol";

contract CommunityCoinFactory is Ownable {
    using Clones for address;

    /**
    * @custom:shortd CommunityCoin implementation address
    * @notice CommunityCoin implementation address
    */
    address public immutable communityCoinImplementation;
    
    /**
    * @custom:shortd CommunityStakingPoolFactory implementation address
    * @notice CommunityStakingPoolFactory implementation address
    */
    address public immutable communityStakingPoolFactoryImplementation;
    
    /**
    * @custom:shortd StakingPool implementation address
    * @notice StakingPool implementation address
    */
    address public immutable stakingPoolImplementation;

    address[] public instances;
    
    event InstanceCreated(address instance, uint instancesCount);

    /**
    * @param communityCoinImpl address of CommunityCoin implementation
    * @param communityStakingPoolFactoryImpl address of CommunityStakingPoolFactory implementation
    * @param stakingPoolImpl address of StakingPool implementation
    */
    constructor(
        address communityCoinImpl,
        address communityStakingPoolFactoryImpl,
        address stakingPoolImpl
    ) 
    {
        communityCoinImplementation = communityCoinImpl;
        communityStakingPoolFactoryImplementation = communityStakingPoolFactoryImpl;
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
    * @return instance address of created instance pool `CommunityCoin`
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
        
        instance = communityCoinImplementation.clone();
        address coinInstancesClone = communityStakingPoolFactoryImplementation.clone();

        require(instance != address(0), "CommunityCoinFactory: INSTANCE_CREATION_FAILED");

        instances.push(instance);
        
        emit InstanceCreated(instance, instances.length);

        ICommunityCoin(instance).initialize(stakingPoolImplementation, hook, coinInstancesClone, discountSensitivity);
        
        Ownable(instance).transferOwnership(_msgSender());
        
    }

    ////////////////////////////////////////////////////////////////////////
    // internal section ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    
}