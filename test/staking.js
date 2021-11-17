const BigNumber = require('bignumber.js');
const truffleAssert = require('truffle-assertions');

var StakingFactory = artifacts.require("StakingFactory");
var StakingContract = artifacts.require("StakingContract");

var IUniswapV2Factory = artifacts.require("IUniswapV2Factory");
var IUniswapRouter = artifacts.require("IUniswapRouter");


const ERC20Mintable = artifacts.require("ERC20Mintable");

// const ERC777Mintable = artifacts.require("ERC777Mintable");

const helper = require("../helpers/truffleTestHelper");

require('@openzeppelin/test-helpers/configure')({ web3 });
const { singletons } = require('@openzeppelin/test-helpers');

contract('staking', (accounts) => {
    
    // Setup accounts.
    var accountOne = accounts[0];
    var accountTwo = accounts[1];
    var accountThree = accounts[2];
    var accountFourth = accounts[3];
    var accountFive = accounts[4];
    var accountSix = accounts[5];
    var accountSeven = accounts[6];
    var accountEight = accounts[7];
    var accountNine = accounts[8];
    var accountTen = accounts[9];
    
    // accountOne = accountOne;
    // accountTwo = accountOne;
    // accountFive = accountOne;
    
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    
    const uniswapRouterFactory = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
    const uniswapRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    
    //const noneExistTokenID = '99999999';
    const oneToken = "1000000000000000000";
    const twoToken = "2000000000000000000";
    const oneToken07 = "700000000000000000";
    const oneToken05 = "500000000000000000";    
    const oneToken03 = "300000000000000000";
    
    const reserveClaimFraction = 50000;
    const tradedClaimFraction = 50000;
    
    const emptyReserveClaimFraction = 0;
    const emptyTradedClaimFraction = 0;
    
    var StakingFactoryInstance, 
        StakingContractInstance, 
        ERC20MintableInstanceToken1,
        ERC20MintableInstanceToken2,
        ERC20MintableInstanceToken3,
        UniswapRouterFactoryInstance,
        UniswapRouterInstance,
        pairInstance
    ;
    var erc1820;
    let tmpTr;
    let tmp;
    
    var name = 'name';
    var symbol = 'symbol';
    var defaultOperators=[];
    var interval = 7*24*60*60; // * interval: WEEK by default
    var duration = 52; // * duration: 52 (intervals)
    var multiplier = 100; // 1 mul by 1e2
    var token;
    var whitelist = [];
    
    var lockupDuration = 365*24*60*60; // year in seconds

        
    function getArgs(tr, eventname) {
        for (var i in tmpTr.logs) {
            if (eventname == tmpTr.logs[i].event) {
                return tmpTr.logs[i].args;
            }
        }
        return '';
    }
    
    before(async () => {
        erc1820 = await singletons.ERC1820Registry(accountNine);
        
        //create factory
        StakingFactoryInstance = await StakingFactory.new({ from: accountFive });
        
        
        //create router
        //LiquidityMiningRouterInstance = await LiquidityMiningRouter.new(LiquidityMiningFactoryInstance.address, emptyReserveClaimFraction, emptyReserveClaimFraction, { from: accountFive });
        
        //emit PairCreated(tokenA, tokenB, pair, allPairs.length);
        
        ERC20MintableInstanceToken1 = await ERC20Mintable.new("erc20testToken","erc20testToken", { from: accountFive });
        ERC20MintableInstanceToken2 = await ERC20Mintable.new("erc20testToken","erc20testToken", { from: accountFive });
        ERC20MintableInstanceToken3 = await ERC20Mintable.new("erc20testToken","erc20testToken", { from: accountFive });
        
        
        UniswapRouterFactoryInstance = await IUniswapV2Factory.at(uniswapRouterFactory);
        UniswapRouterInstance = await IUniswapRouter.at(uniswapRouter);
        
        await UniswapRouterFactoryInstance.createPair(ERC20MintableInstanceToken1.address, ERC20MintableInstanceToken2.address);
        
        let pairAddress = await UniswapRouterFactoryInstance.getPair(ERC20MintableInstanceToken1.address, ERC20MintableInstanceToken2.address);
        
        pairInstance = await ERC20Mintable.at(pairAddress);
        
        await ERC20MintableInstanceToken1.mint(accountFive, oneToken07);
        await ERC20MintableInstanceToken2.mint(accountFive, oneToken07);
        await ERC20MintableInstanceToken1.approve(UniswapRouterInstance.address, oneToken07, { from: accountFive });
        await ERC20MintableInstanceToken2.approve(UniswapRouterInstance.address, oneToken07, { from: accountFive });
        
        await UniswapRouterInstance.addLiquidity(
            ERC20MintableInstanceToken1.address,
            ERC20MintableInstanceToken2.address,
            oneToken07,
            oneToken07,
            0,
            0,
            accountFive,
            Math.floor(Date.now()/1000)+(lockupDuration)
            , { from: accountFive }
        );
        
        tmpTr = await StakingFactoryInstance.produce(ERC20MintableInstanceToken1.address, ERC20MintableInstanceToken2.address, lockupDuration)
        
        StakingContractInstance = await StakingContract.at(getArgs(tmpTr, "PairCreated").pair);
        
        // // initialize factories
        // await DividendsFactoryInstance.init(DividendsContractInstance2Clone.address);
        // await DividendsGroupFactoryInstance.init(DividendsGroupContractInstance2Clone.address);
        
        // ERC20MintableInstanceToken = await ERC20Mintable.new("erc20testToken","erc20testToken", { from: accountFive });
        // ERC777MintableInstanceToken = await ERC777Mintable.new("erc777testToken","erc777testToken", [],  { from: accountFive });
        
        // ERC20MintableInstanceDividend = await ERC20Mintable.new("erc20testDividend","erc20testDividend", { from: accountFive });
        // ERC777MintableInstanceDividend = await ERC777Mintable.new("erc777testDividend","erc777testDividend", [],  { from: accountFive });
        
        
    });
    
    beforeEach(async () => {
        // DividendsContractInstance = await DividendsContract.new({ from: accountFive });
        
        // await DividendsContractInstance.initialize('NFT-title', 'NFT-symbol', [CommunityMockInstance.address, "members"], { from: accountFive });
        
        // ERC20MintableInstance = await ERC20Mintable.new("erc20test","erc20test",{ from: accountFive });
    });
   
    it('should create by factory', async () => {
        let allPairsLengthBefore = await StakingFactoryInstance.allPairsLength();
        tmpTr = await StakingFactoryInstance.produce(ERC20MintableInstanceToken1.address, ERC20MintableInstanceToken2.address, 11111);
        let allPairsLengthAfter = await StakingFactoryInstance.allPairsLength();
        let address1 = getArgs(tmpTr, "PairCreated").pair;
        
        assert.equal(BigNumber(parseInt(allPairsLengthBefore)+1).toString(), BigNumber(allPairsLengthAfter).toString(), "allPairsLength error");
        assert.notEqual(address1, zeroAddress, "can not be zero address");
        
        tmpTr = await StakingFactoryInstance.produce(ERC20MintableInstanceToken1.address, ERC20MintableInstanceToken2.address, 11112);
        let address2 = getArgs(tmpTr, "PairCreated").pair;
        assert.notEqual(address1, address2, "can not be equal with previous");
        
        await truffleAssert.reverts(
            StakingFactoryInstance.produce(ERC20MintableInstanceToken1.address, ERC20MintableInstanceToken2.address, 11111),
            "StakingFactory: PAIR_ALREADY_EXISTS"
        );
        
        await truffleAssert.reverts(
            StakingFactoryInstance.produce(ERC20MintableInstanceToken1.address, ERC20MintableInstanceToken1.address, 12345),
            "StakingFactory: IDENTICAL_ADDRESSES"
        );
        
        await truffleAssert.reverts(
            StakingFactoryInstance.produce(ERC20MintableInstanceToken1.address, zeroAddress, 12345),
            "StakingFactory: ZERO_ADDRESS"
        );
        await truffleAssert.reverts(
            StakingFactoryInstance.produce(zeroAddress, ERC20MintableInstanceToken1.address, 12345),
            "StakingFactory: ZERO_ADDRESS"
        );

    });
    
    //it('should create by factory', async () => {});
    
    it('buyAddLiquidityAndStake test()', async () => {
        
        await ERC20MintableInstanceToken2.mint(accountTwo, oneToken);
        
        await ERC20MintableInstanceToken2.approve(StakingContractInstance.address, oneToken, { from: accountTwo });
        
        // console.log('before Adding liquidity = ',BigNumber(await pairInstance.balanceOf(StakingContractInstance.address)).toString());
        
        //await LiquidityMiningRouterInstance.addLiquidityAndStake(ERC20MintableInstanceToken1.address, ERC20MintableInstanceToken2.address, oneToken, { from: accountTwo });
        await StakingContractInstance.methods['buyAddLiquidityAndStake(uint256)'](oneToken, { from: accountTwo });
        
        let shares = await StakingContractInstance.balanceOf(accountTwo);
        let lptokens = await pairInstance.balanceOf(StakingContractInstance.address);
        // console.log('after Adding liquidity        = ',BigNumber(lptokens).toString());
        // console.log('after Adding liquidity shares = ',BigNumber(shares).toString());
        
        // custom situation when  uniswapLP tokens equal sharesLP tokens.  can be happens in the first stake
        assert.equal(BigNumber(lptokens).toString(), BigNumber(shares).toString(), "error");
        
    });    
    
    it('buyAddLiquidityAndStake (through paying token)', async () => {
        
        await ERC20MintableInstanceToken3.mint(accountTwo, oneToken);
        
        await ERC20MintableInstanceToken3.approve(StakingContractInstance.address, oneToken, { from: accountTwo });
        
        //await StakingContractInstance.methods['buyAddLiquidityAndStake(address,uint256)'](ERC20MintableInstanceToken3.address, oneToken, { from: accountTwo });
        // revert if uniswap pair does not exists yet
        await truffleAssert.reverts(
            StakingContractInstance.methods['buyAddLiquidityAndStake(address,uint256)'](ERC20MintableInstanceToken3.address, oneToken, { from: accountTwo })
        );
        
        // create pair Token2 => Token3
        
        await ERC20MintableInstanceToken3.mint(accountFive, oneToken07);
        await ERC20MintableInstanceToken2.mint(accountFive, oneToken07);
        await ERC20MintableInstanceToken3.approve(UniswapRouterInstance.address, oneToken07, { from: accountFive });
        await ERC20MintableInstanceToken2.approve(UniswapRouterInstance.address, oneToken07, { from: accountFive });
        
        await UniswapRouterInstance.addLiquidity(
            ERC20MintableInstanceToken3.address,
            ERC20MintableInstanceToken2.address,
            oneToken07,
            oneToken07,
            0,
            0,
            accountFive,
            Math.floor(Date.now()/1000)+(lockupDuration)
            , { from: accountFive }
        );
        
        // now addinig liquidity through paying token will be successful
        await StakingContractInstance.methods['buyAddLiquidityAndStake(address,uint256)'](ERC20MintableInstanceToken3.address, oneToken, { from: accountTwo });
        
        let shares = await StakingContractInstance.balanceOf(accountTwo);
        let lptokens = await pairInstance.balanceOf(StakingContractInstance.address);
        // console.log('after Adding liquidity        = ',BigNumber(lptokens).toString());
        // console.log('after Adding liquidity shares = ',BigNumber(shares).toString());
        
        // custom situation when  uniswapLP tokens equal sharesLP tokens.  can be happens in the first stake
        assert.equal(BigNumber(lptokens).toString(), BigNumber(shares).toString(), "error");
        
    });    
    
});