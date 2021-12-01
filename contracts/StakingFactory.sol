// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


//import "./erc777/ERC777Layer.sol";
import "./interfaces/IStakingFactory.sol";
import "./StakingContract.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StakingFactory is IStakingFactory, Ownable {
    
    uint256 internal constant LOCKUP_INTERVAL = 24*60*60; // day in seconds
    uint256 internal constant FRACTION = 100000; // fractions are expressed as portions of this

    mapping(address => mapping(
        address => mapping(
            uint256 => address
        )
    )) public override getInstance;
    address[] public override instances;
    
    mapping(address => address) private _instanceCreators;
    
    struct InstanceInfo {
        address reserveToken;
        address tradedToken;
        uint256 duration;
        uint256 reserveTokenClaimFraction;
        uint256 tradedTokenClaimFraction;
        uint256 lpClaimFraction;
    }
    mapping(address => InstanceInfo) private _instanceInfos;
    
    function instancesCount()
    external override view returns (uint) {
        return instances.length;
    }

    function produce(
        address reserveToken, 
        address tradedToken, 
        uint256 duration
    ) public returns (address instance) {
         // 1% from LP tokens should move to owner while user try to redeem
        return _produce(reserveToken, tradedToken, duration, 0, 0, 1000);
    }
    
    function produce(
        address reserveToken, 
        address tradedToken, 
        uint256 duration, 
        uint256 reserveTokenClaimFraction, 
        uint256 tradedTokenClaimFraction, 
        uint256 lpClaimFraction
    ) public onlyOwner() returns (address instance) {
        return _produce(reserveToken, tradedToken, duration, reserveTokenClaimFraction, tradedTokenClaimFraction, lpClaimFraction);
    }
    
    function getInstanceInfo(
        address reserveToken, 
        address tradedToken, 
        uint256 duration
    ) public view returns(InstanceInfo memory) {
        address instance = getInstance[reserveToken][tradedToken][duration];
        return _instanceInfos[instance];
    }
    
    function _produce(
        address reserveToken,
        address tradedToken,
        uint256 duration,
        uint256 reserveTokenClaimFraction,
        uint256 tradedTokenClaimFraction,
        uint256 lpClaimFraction
    ) internal returns (address instance) {
        instance = _createInstanceValidate(
            reserveToken, tradedToken, duration, 
            reserveTokenClaimFraction, tradedTokenClaimFraction
        );
        address payable instanceCreated = _createInstance(reserveToken, tradedToken, duration, reserveTokenClaimFraction, tradedTokenClaimFraction, lpClaimFraction);    
        require(instanceCreated != address(0), "StakingFactory: INSTANCE_CREATION_FAILED");
        StakingContract(instanceCreated).initialize(
            reserveToken,  tradedToken,  LOCKUP_INTERVAL, duration, 
            reserveTokenClaimFraction, tradedTokenClaimFraction, lpClaimFraction
        );
        StakingContract(instanceCreated).transferOwnership(_msgSender());
        instance = instanceCreated;        
    }
    
    function _createInstanceValidate(
        address reserveToken, 
        address tradedToken, 
        uint256 duration, 
        uint256 tradedClaimFraction, 
        uint256 reserveClaimFraction
    ) internal view returns (address instance) {
        require(reserveToken != tradedToken, "StakingFactory: IDENTICAL_ADDRESSES");
        require(reserveToken != address(0) && tradedToken != address(0), "StakingFactory: ZERO_ADDRESS");
        require(tradedClaimFraction <= FRACTION && reserveClaimFraction <= FRACTION, "StakingFactory: WRONG_CLAIM_FRACTION");
        instance = getInstance[reserveToken][tradedToken][duration];
        require(instance == address(0), "StakingFactory: PAIR_ALREADY_EXISTS");
    }
        
    function _createInstance(
        address reserveToken, 
        address tradedToken, 
        uint256 duration, 
        uint256 reserveTokenClaimFraction, 
        uint256 tradedTokenClaimFraction, 
        uint256 lpClaimFraction
    ) internal returns (address payable instance) {
        bytes memory bytecode = type(StakingContract).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(address(this), reserveToken, tradedToken, duration));
        assembly {
            instance := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        getInstance[reserveToken][tradedToken][duration] = instance;
        instances.push(instance);
        _instanceCreators[instance] = msg.sender;
        _instanceInfos[instance] = InstanceInfo(
            reserveToken,
            tradedToken,
            duration, 
            reserveTokenClaimFraction,
            tradedTokenClaimFraction,
            lpClaimFraction
        );
        emit InstanceCreated(reserveToken, tradedToken, instance, instances.length);
    }

}
