// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.11;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ICommunityCoin.sol";
import "./interfaces/ICommunityRolesManagement.sol";

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
    address public immutable stakingPoolErc20Implementation;

    /**
    * @custom:shortd RolesManagement implementation address
    * @notice RolesManagement implementation address
    */
    address public immutable rolesManagementImplementation;

    address[] public instances;
    
    event InstanceCreated(address instance, uint instancesCount);

    /**
    * @param communityCoinImpl address of CommunityCoin implementation
    * @param communityStakingPoolFactoryImpl address of CommunityStakingPoolFactory implementation
    * @param stakingPoolImpl address of StakingPool implementation
    * @param stakingPoolImplErc20 address of StakingPoolErc20 implementation
    * @param rolesManagementImpl address of RolesManagement implementation
    */
    constructor(
        address communityCoinImpl,
        address communityStakingPoolFactoryImpl,
        address stakingPoolImpl,
        address stakingPoolImplErc20,
        address rolesManagementImpl
    ) 
    {
        communityCoinImplementation = communityCoinImpl;
        communityStakingPoolFactoryImplementation = communityStakingPoolFactoryImpl;
        stakingPoolImplementation = stakingPoolImpl;
        stakingPoolErc20Implementation = stakingPoolImplErc20;
        rolesManagementImplementation = rolesManagementImpl;

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
    * @param reserveToken address of reserve token. like a WETH, USDT,USDC, etc.
    * @param tradedToken address of traded token. usual it intercoin investor token
    * @param hook address of contract implemented IHook interface and used to calculation bonus tokens amount
    * @param discountSensitivity discountSensitivity value that manage amount tokens in redeem process. multiplied by `FRACTION`(10**5 by default)
    * @param communitySettings tuple of community settings (address of contract and roles(admin,redeem,circulate))
    * @return instance address of created instance pool `CommunityCoin`
    * @custom:shortd creation instance
    */
    function produce(
        address reserveToken,
        address tradedToken,
        address hook,
        uint256 discountSensitivity,
        ICommunityRolesManagement.CommunitySettings memory communitySettings
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

        address rolesManagementClone = rolesManagementImplementation.clone();

        ICommunityRolesManagement(rolesManagementClone).initialize(communitySettings, instance);

        ICommunityCoin(instance).initialize(stakingPoolImplementation, stakingPoolErc20Implementation, hook, coinInstancesClone, discountSensitivity, rolesManagementClone, reserveToken, tradedToken);
        
        Ownable(instance).transferOwnership(_msgSender());
        
    }

    ////////////////////////////////////////////////////////////////////////
    // internal section ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    
}