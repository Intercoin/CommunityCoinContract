// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


//import "./erc777/ERC777Layer.sol";
import "./interfaces/IStakingFactory.sol";
import "./StakingContract.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StakingFactory is IStakingFactory, Ownable {
    
    uint256 lockupInterval = 24*60*60; // day in seconds
    // //uint256 lockupDuration = 365; // duration of intervals = 365 intervals(days)
    uint256 internal constant MULTIPLIER = 100000;
        
    // //create LiquidityMiningERC777 and become an owner
    mapping(address => mapping(address => mapping(uint256 => address))) public  override  getPair;
    address[] public override allPairs;
    
    mapping(address => address) private pairCreator;
    
    struct Pair {
        address tokenA;
        address tokenB;
        uint256 lockupIntervalCount;
        uint256 tokenAClaimFraction;
        uint256 tokenBClaimFraction;
        uint256 lpClaimFraction;
    }
    mapping(address => Pair) private pairTokens;
    // //constructor() {}
    
    function allPairsLength() external override view returns (uint) {
        return allPairs.length;
    }


    function produce(address tokenA, address tokenB, uint256 lockupIntervalCount) public returns (address pair) {
         // 1% from LP tokens should move to owner while user try to redeem
        return _produce(tokenA, tokenB, lockupIntervalCount, 0, 0, 1000);
        
    }
    
    function produce(address tokenA, address tokenB, uint256 lockupIntervalCount, uint256 tokenAClaimFraction, uint256 tokenBClaimFraction, uint256 lpClaimFraction) public onlyOwner() returns (address pair) {
        return _produce(tokenA, tokenB, lockupIntervalCount, tokenAClaimFraction, tokenBClaimFraction, lpClaimFraction);
    }
    
    function getInstance(address tokenA, address tokenB, uint256 lockupIntervalCount) public view returns(Pair memory) {
        address pair = getPair[tokenA][tokenB][lockupIntervalCount];
        return pairTokens[pair];
    }
    
    
    function _produce(address tokenA, address tokenB, uint256 lockupIntervalCount, uint256 tokenAClaimFraction, uint256 tokenBClaimFraction, uint256 lpClaimFraction) internal returns (address pair) {
        pair = _createPairValidate(tokenA, tokenB, lockupIntervalCount, tokenAClaimFraction, tokenBClaimFraction);
        
        address payable pairCreated = _createPair(tokenA, tokenB, lockupIntervalCount, tokenAClaimFraction, tokenBClaimFraction, lpClaimFraction);    
        require(pairCreated != address(0), "StakingFactory: PAIR_CREATION_FAILED");
        StakingContract(pairCreated).initialize(tokenA, tokenB, lockupInterval, lockupIntervalCount, tokenAClaimFraction, tokenBClaimFraction, lpClaimFraction);
        StakingContract(pairCreated).transferOwnership(_msgSender());
        pair = pairCreated;
        
    }
    
    function _createPairValidate(address tokenA, address tokenB, uint256 lockupIntervalCount, uint256 tradedClaimFraction, uint256 reserveClaimFraction) internal view returns (address pair) {
        require(tokenA != tokenB, 'StakingFactory: IDENTICAL_ADDRESSES');
        
        require(tokenA != address(0), 'StakingFactory: ZERO_ADDRESS');
        require(tokenB != address(0), 'StakingFactory: ZERO_ADDRESS');
        
        require(tradedClaimFraction <= MULTIPLIER && reserveClaimFraction <= MULTIPLIER, "StakingFactory: WRONG_CLAIM_FRACTION");

        pair = getPair[tokenA][tokenB][lockupIntervalCount];
        
        require(pair == address(0), "StakingFactory: PAIR_ALREADY_EXISTS");
        
    }
        
    function _createPair(address tokenA, address tokenB, uint256 lockupIntervalCount, uint256 tokenAClaimFraction, uint256 tokenBClaimFraction, uint256 lpClaimFraction) internal returns (address payable pair) {
        
        bytes memory bytecode = type(StakingContract).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(address(this), tokenA, tokenB, lockupIntervalCount));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
    
        //StakingContract(pair).initialize(token0, token1, lockupInterval, lockupDuration, tradedClaimFraction, reserveClaimFraction);
        
        getPair[tokenA][tokenB][lockupIntervalCount] = pair;
        getPair[tokenB][tokenA][lockupIntervalCount] = pair; // populate mapping in the reverse direction
        allPairs.push(pair);
        pairCreator[pair] = msg.sender;
        
        pairTokens[pair].tokenA = tokenA;
        pairTokens[pair].tokenB = tokenB;
        pairTokens[pair].lockupIntervalCount = lockupIntervalCount;
        pairTokens[pair].tokenAClaimFraction = tokenAClaimFraction;
        pairTokens[pair].tokenBClaimFraction = tokenBClaimFraction;
        pairTokens[pair].lpClaimFraction = lpClaimFraction;
        
        
        emit PairCreated(tokenA, tokenB, pair, allPairs.length);
        
    }

}
