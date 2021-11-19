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

contract('staking::test reward', (accounts) => {
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
        StakingContractInstance2,
        ERC20MintableInstanceToken1,
        ERC20MintableInstanceToken2,
        ERC20MintableInstanceToken3,
        ERC20MintableInstanceToken4,
        ERC20MintableInstanceTokenReward1,
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
    //var interval = 7*24*60*60; // * interval: WEEK by default
    var duration = 52; // * duration: 52 (intervals)
    var multiplier = 100; // 1 mul by 1e2
    var token;
    var whitelist = [];
    
    var interval = 24*60*60; // * interval: WEEK by default
    var lockupIntervalCount = 365; // year in seconds

        
    function getArgs(tr, eventname) {
        for (var i in tr.logs) {
            if (eventname == tr.logs[i].event) {
                return tr.logs[i].args;
            }
        }
        return '';
    }
    
    function printArgs(tr) {
        var res;
        for (var i in tr.logs) {
            console.log('Event: "',tr.logs[i].event, '"');
            res = Object.keys(tr.logs[i].args).reduce((acc, elem)=>{
              acc[elem] = tr.logs[i].args[elem];
              if (acc[elem] !== null) {
                acc[elem] = acc[elem].toString();    
              }
              
              return acc;
            },{});
            console.log(res);
            
            console.log('=========================');
            
        }
        
    }
    
    before(async () => {
        erc1820 = await singletons.ERC1820Registry(accountNine);
        
        
        
    });
    
    beforeEach(async () => {
        //create factory
        StakingFactoryInstance = await StakingFactory.new({ from: accountFive });
        
        ERC20MintableInstanceToken1 = await ERC20Mintable.new("erc20testToken","erc20testToken", { from: accountFive });
        ERC20MintableInstanceToken2 = await ERC20Mintable.new("erc20testToken","erc20testToken", { from: accountFive });
        ERC20MintableInstanceToken3 = await ERC20Mintable.new("erc20testToken","erc20testToken", { from: accountFive });
        ERC20MintableInstanceToken4 = await ERC20Mintable.new("erc20testToken","erc20testToken", { from: accountFive });
        
        ERC20MintableInstanceTokenReward1 = await ERC20Mintable.new("erc20testToken","erc20testToken", { from: accountFive });
        
        UniswapRouterFactoryInstance = await IUniswapV2Factory.at(uniswapRouterFactory);
        UniswapRouterInstance = await IUniswapRouter.at(uniswapRouter);
        
        // await UniswapRouterFactoryInstance.createPair(ERC20MintableInstanceToken1.address, ERC20MintableInstanceToken2.address);
        // await UniswapRouterFactoryInstance.createPair(ERC20MintableInstanceToken1.address, ERC20MintableInstanceToken3.address);
        
        // let pairAddress = await UniswapRouterFactoryInstance.getPair(ERC20MintableInstanceToken1.address, ERC20MintableInstanceToken2.address);
        
        // pairInstance = await ERC20Mintable.at(pairAddress);
        
        await ERC20MintableInstanceToken1.mint(accountFive, oneToken07);
        await ERC20MintableInstanceToken2.mint(accountFive, oneToken07);
        await ERC20MintableInstanceToken3.mint(accountFive, oneToken07);
        await ERC20MintableInstanceToken4.mint(accountFive, oneToken07);
        await ERC20MintableInstanceToken1.approve(UniswapRouterInstance.address, oneToken07, { from: accountFive });
        await ERC20MintableInstanceToken2.approve(UniswapRouterInstance.address, oneToken07, { from: accountFive });
        await ERC20MintableInstanceToken3.approve(UniswapRouterInstance.address, oneToken07, { from: accountFive });
        await ERC20MintableInstanceToken4.approve(UniswapRouterInstance.address, oneToken07, { from: accountFive });
        
        await UniswapRouterInstance.addLiquidity(
            ERC20MintableInstanceToken1.address,
            ERC20MintableInstanceToken2.address,
            oneToken07,
            oneToken07,
            0,
            0,
            accountFive,
            Math.floor(Date.now()/1000)+(lockupIntervalCount*interval)
            , { from: accountFive }
        );
        
        await UniswapRouterInstance.addLiquidity(
            ERC20MintableInstanceToken3.address,
            ERC20MintableInstanceToken4.address,
            oneToken07,
            oneToken07,
            0,
            0,
            accountFive,
            Math.floor(Date.now()/1000)+(lockupIntervalCount*interval)
            , { from: accountFive }
        );
        
        
    });
    
    it('check claim Percents', async () => {
        // create staking for 2 days
        tmpTr = await StakingFactoryInstance.produce(ERC20MintableInstanceToken1.address, ERC20MintableInstanceToken2.address, 2);
        StakingContractInstance = await StakingContract.at(getArgs(tmpTr, "PairCreated").pair);
        
        tmpTr = await StakingFactoryInstance.produce(ERC20MintableInstanceToken3.address, ERC20MintableInstanceToken4.address, 2, 50000,50000,1000,{ from: accountFive });
        StakingContractInstance2 = await StakingContract.at(getArgs(tmpTr, "PairCreated").pair);
        
        
        await ERC20MintableInstanceToken2.mint(accountTwo, oneToken);
        await ERC20MintableInstanceToken2.approve(StakingContractInstance.address, oneToken, { from: accountTwo });
        
        await ERC20MintableInstanceToken4.mint(accountThree, oneToken);
        await ERC20MintableInstanceToken4.approve(StakingContractInstance2.address, oneToken, { from: accountThree });
        
        
        await StakingContractInstance.methods['buyLiquidityAndStake(uint256)'](oneToken, { from: accountTwo });
        await StakingContractInstance2.methods['buyLiquidityAndStake(uint256)'](oneToken, { from: accountThree });

        let shares, shares2;
        shares = await StakingContractInstance.balanceOf(accountTwo);
        shares2 = await StakingContractInstance2.balanceOf(accountThree);
        
        // pass some mtime
        await helper.advanceTimeAndBlock(2*interval+9);

        await StakingContractInstance.approve(StakingContractInstance.address, shares, { from: accountTwo });
        await StakingContractInstance2.approve(StakingContractInstance2.address, shares2, { from: accountThree });

        await StakingContractInstance.redeemAndRemoveLiquidity(shares, { from: accountTwo});
        await StakingContractInstance2.redeemAndRemoveLiquidity(shares2, { from: accountThree});
        // checking the same custom situation with the same amount LP tokens but diffrent different (50%) claimFraction
        assert.equal(
            BigNumber(await ERC20MintableInstanceToken1.balanceOf(accountTwo)).div(2).toString(),
            BigNumber(await ERC20MintableInstanceToken3.balanceOf(accountThree)).toString(),
            "wrong claimFraction reward"
        );
        assert.equal(
            BigNumber(await ERC20MintableInstanceToken2.balanceOf(accountTwo)).div(2).toString(),
            BigNumber(await ERC20MintableInstanceToken4.balanceOf(accountThree)).toString(),
            "wrong claimFraction reward"
        );
        
    });    
});
