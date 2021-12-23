const BigNumber = require('bignumber.js');
const truffleAssert = require('truffle-assertions');

var StakingFactory = artifacts.require("StakingFactory");
var StakingContract = artifacts.require("StakingContract");

var IUniswapV2Factory = artifacts.require("IUniswapV2Factory");
var IUniswapRouter = artifacts.require("IUniswapRouter");


const ERC20Mintable = artifacts.require("ERC20Mintable");
const ERC777Mintable = artifacts.require("ERC777Mintable");

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
    
    const percentLimitLeftTokenB = 0.001;
    
    var StakingFactoryInstance, 
        StakingContractInstance, 
        ERC20MintableInstanceToken1,
        ERC20MintableInstanceToken2,
        ERC20MintableInstanceToken3,
        ERC20MintableInstanceTokenReward1,
        ERC777MintableInstanceToken1,
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
        
        //create factory
        StakingFactoryInstance = await StakingFactory.new({ from: accountFive });
        
        ERC20MintableInstanceToken1 = await ERC20Mintable.new("erc20testToken","erc20testToken", { from: accountFive });
        ERC20MintableInstanceToken2 = await ERC20Mintable.new("erc20testToken","erc20testToken", { from: accountFive });
        ERC20MintableInstanceToken3 = await ERC20Mintable.new("erc20testToken","erc20testToken", { from: accountFive });
        ERC20MintableInstanceToken4 = await ERC20Mintable.new("erc20testToken","erc20testToken", { from: accountFive });
        ERC20MintableInstanceToken5 = await ERC20Mintable.new("erc20testToken","erc20testToken", { from: accountFive });
        ERC20MintableInstanceTokenReward1 = await ERC20Mintable.new("erc20testToken","erc20testToken", { from: accountFive });
        
        ERC777MintableInstanceToken1 = await ERC777Mintable.new("erc777testToken","erc777testToken", { from: accountFive });
        
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
            Math.floor(Date.now()/1000)+(lockupIntervalCount*interval)
            , { from: accountFive }
        );
        
        //tmpTr = await StakingFactoryInstance.produce(ERC20MintableInstanceToken1.address, ERC20MintableInstanceToken2.address, lockupIntervalCount, {from: accountFive });
        tmpTr = await StakingFactoryInstance.methods['produce(address,address,uint256)'](ERC20MintableInstanceToken2.address, ERC20MintableInstanceToken1.address, lockupIntervalCount, {from: accountFive });
        
        StakingContractInstance = await StakingContract.at(getArgs(tmpTr, "InstanceCreated").instance);
        
    });
    
    
        

    it('should create by factory', async () => {
        let instancesCountBefore = await StakingFactoryInstance.instancesCount();
        tmpTr = await StakingFactoryInstance.produce(ERC20MintableInstanceToken2.address, ERC20MintableInstanceToken1.address, 11111);
        let instancesCountAfter = await StakingFactoryInstance.instancesCount();
        let address1 = getArgs(tmpTr, "InstanceCreated").instance;
        
        assert.equal(BigNumber(parseInt(instancesCountBefore)+1).toString(), BigNumber(instancesCountAfter).toString(), "instancesCount error");
        assert.notEqual(address1, zeroAddress, "can not be zero address");
        
        tmpTr = await StakingFactoryInstance.produce(ERC20MintableInstanceToken2.address, ERC20MintableInstanceToken1.address, 11112);
        let address2 = getArgs(tmpTr, "InstanceCreated").instance;
        assert.notEqual(address1, address2, "can not be equal with previous");
        
        await truffleAssert.reverts(
            StakingFactoryInstance.produce(ERC20MintableInstanceToken2.address, ERC20MintableInstanceToken1.address, 11111),
            "StakingFactory: PAIR_ALREADY_EXISTS"
        );
        
        await truffleAssert.reverts(
            StakingFactoryInstance.produce(ERC20MintableInstanceToken1.address, ERC20MintableInstanceToken1.address, 12345),
            "StakingFactory: IDENTICAL_ADDRESSES"
        );
        
        await truffleAssert.reverts(
            StakingFactoryInstance.produce(zeroAddress, ERC20MintableInstanceToken1.address, 12345),
            "StakingFactory: ZERO_ADDRESS"
        );
        await truffleAssert.reverts(
            StakingFactoryInstance.produce(ERC20MintableInstanceToken1.address, zeroAddress, 12345),
            "StakingFactory: ZERO_ADDRESS"
        );

    });

    it('buyAddLiquidityAndStake test()', async () => {
        
        await ERC20MintableInstanceToken2.mint(accountTwo, oneToken);
        
        await ERC20MintableInstanceToken2.approve(StakingContractInstance.address, oneToken, { from: accountTwo });
        
        // console.log('before Adding liquidity = ',BigNumber(await pairInstance.balanceOf(StakingContractInstance.address)).toString());
        
        //await LiquidityMiningRouterInstance.addLiquidityAndStake(ERC20MintableInstanceToken1.address, ERC20MintableInstanceToken2.address, oneToken, { from: accountTwo });
        await StakingContractInstance.methods['buyLiquidityAndStake(uint256)'](oneToken, { from: accountTwo });
        
        let shares = await StakingContractInstance.balanceOf(accountTwo);
        let lptokens = await pairInstance.balanceOf(StakingContractInstance.address);
        // console.log('after Adding liquidity        = ',BigNumber(lptokens).toString());
        // console.log('after Adding liquidity shares = ',BigNumber(shares).toString());
        
        // custom situation when  uniswapLP tokens equal sharesLP tokens.  can be happens in the first stake
        assert.notEqual(BigNumber(lptokens).toString(), BigNumber(0).toString(), "error");
        assert.equal(BigNumber(lptokens).toString(), BigNumber(shares).toString(), "error");
        
    });    
  
    it('buyAddLiquidityAndStake (through paying token)', async () => {
        
        await ERC20MintableInstanceToken3.mint(accountTwo, oneToken);
        
        await ERC20MintableInstanceToken3.approve(StakingContractInstance.address, oneToken, { from: accountTwo });
        
        //await StakingContractInstance.methods['buyLiquidityAndStake(address,uint256)'](ERC20MintableInstanceToken3.address, oneToken, { from: accountTwo });
        // revert if uniswap pair does not exists yet
        await truffleAssert.reverts(
            StakingContractInstance.methods['buyLiquidityAndStake(address,uint256)'](ERC20MintableInstanceToken3.address, oneToken, { from: accountTwo })
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
            Math.floor(Date.now()/1000)+(lockupIntervalCount*interval)
            , { from: accountFive }
        );
        
        // now addinig liquidity through paying token will be successful
        await StakingContractInstance.methods['buyLiquidityAndStake(address,uint256)'](ERC20MintableInstanceToken3.address, oneToken, { from: accountTwo });
        
        let shares = await StakingContractInstance.balanceOf(accountTwo);
        let lptokens = await pairInstance.balanceOf(StakingContractInstance.address);
        // console.log('after Adding liquidity        = ',BigNumber(lptokens).toString());
        // console.log('after Adding liquidity shares = ',BigNumber(shares).toString());
        
        // custom situation when  uniswapLP tokens equal sharesLP tokens.  can be happens in the first stake
        assert.equal(BigNumber(lptokens).toString(), BigNumber(shares).toString(), "error");
        
    });    

    it('buyAddLiquidityAndStake (through ETH)', async () => {
        
         // revert if uniswap pair(ERC20MintableInstanceToken2 vs WETH) does not exists yet
        await truffleAssert.reverts(
            StakingContractInstance.methods['buyLiquidityAndStake()']({ from: accountTwo, value: oneToken })
        );
        
        // create pair Token2 => WETH
        await ERC20MintableInstanceToken2.mint(accountFive, oneToken07);
        await ERC20MintableInstanceToken2.approve(UniswapRouterInstance.address, oneToken07, { from: accountFive });
        
        await UniswapRouterInstance.addLiquidityETH(
            ERC20MintableInstanceToken2.address,
            oneToken07,
            0,
            0,
            accountFive,
            Math.floor(Date.now()/1000)+(lockupIntervalCount*interval)
            , { from: accountFive, value: oneToken07}
        );
    
        // now it will be fine
        await StakingContractInstance.methods['buyLiquidityAndStake()']({ from: accountTwo, value: oneToken });
        
        let shares = await StakingContractInstance.balanceOf(accountTwo);
        let lptokens = await pairInstance.balanceOf(StakingContractInstance.address);
        // console.log('after Adding liquidity        = ',BigNumber(lptokens).toString());
        // console.log('after Adding liquidity shares = ',BigNumber(shares).toString());
        
        // custom situation when  uniswapLP tokens equal sharesLP tokens.  can be happens in the first stake
        assert.equal(BigNumber(lptokens).toString(), BigNumber(shares).toString(), "error");
        
    });    

    it('redeem (check lockup duration)', async () => {
        
        
        let shares;
        await ERC20MintableInstanceToken2.mint(accountTwo, oneToken);
        await ERC20MintableInstanceToken2.approve(StakingContractInstance.address, oneToken, { from: accountTwo });
        
        await StakingContractInstance.methods['buyLiquidityAndStake(uint256)'](oneToken, { from: accountTwo });
        
        shares = await StakingContractInstance.balanceOf(accountTwo);
        assert.equal(shares>0, true, "shares need > 0");
        
        
        await truffleAssert.reverts(
            StakingContractInstance.redeem(shares, { from: accountTwo}),
            'Redeeming stake that is not yet unlocked'
        );
        
        // even if approve before
        await StakingContractInstance.approve(StakingContractInstance.address, shares, { from: accountTwo });
        await truffleAssert.reverts(
            StakingContractInstance.redeem(shares, { from: accountTwo}),
            'Redeeming stake that is not yet unlocked'
        );
        
        
        // create staking for 2 days
        tmpTr = await StakingFactoryInstance.produce(ERC20MintableInstanceToken2.address, ERC20MintableInstanceToken1.address, 4);
        
        let StakingContractInstance2days = await StakingContract.at(getArgs(tmpTr, "InstanceCreated").instance);
        
        await ERC20MintableInstanceToken2.mint(accountTwo, oneToken);
        await ERC20MintableInstanceToken2.approve(StakingContractInstance2days.address, oneToken, { from: accountTwo });
        
        await StakingContractInstance2days.methods['buyLiquidityAndStake(uint256)'](oneToken, { from: accountTwo });

        shares = await StakingContractInstance2days.balanceOf(accountTwo);
        assert.equal(shares>0, true, "shares need > 0");
  
        //   console.log('lockupDuration=',(await StakingContractInstance2days.lockupDuration()).toString());      

        
        await truffleAssert.reverts(
            StakingContractInstance2days.redeem(shares, { from: accountTwo}),
            'Redeeming stake that is not yet unlocked'
        );
        
        // pass some mtime
        await helper.advanceTimeAndBlock(4*interval+9);

        await truffleAssert.reverts(
            StakingContractInstance2days.redeem(shares, { from: accountTwo}),
            'ERC777: transfer amount exceeds allowance'
        );
        
        await StakingContractInstance2days.approve(StakingContractInstance2days.address, shares, { from: accountTwo });

        await StakingContractInstance2days.redeem(shares, { from: accountTwo});
        
        await truffleAssert.reverts(
            StakingContractInstance2days.redeem(shares, { from: accountTwo}),
            'ERC777: transfer amount exceeds balance'
        );
        
        
    });    
    
    it('redeem and remove liquidity', async () => {
        // create staking for 2 days
        tmpTr = await StakingFactoryInstance.produce(ERC20MintableInstanceToken2.address, ERC20MintableInstanceToken1.address, 2);
        
        let StakingContractInstance2days = await StakingContract.at(getArgs(tmpTr, "InstanceCreated").instance);
        
        await ERC20MintableInstanceToken2.mint(accountTwo, oneToken);
        await ERC20MintableInstanceToken2.approve(StakingContractInstance2days.address, oneToken, { from: accountTwo });
        
        await StakingContractInstance2days.methods['buyLiquidityAndStake(uint256)'](oneToken, { from: accountTwo });

        shares = await StakingContractInstance2days.balanceOf(accountTwo);
        assert.equal(shares>0, true, "shares need > 0");
  
        //   console.log('lockupDuration=',(await StakingContractInstance2days.lockupDuration()).toString());      

        
        await truffleAssert.reverts(
            StakingContractInstance2days.redeemAndRemoveLiquidity(shares, { from: accountTwo}),
            'Redeeming stake that is not yet unlocked'
        );
        
        // pass some mtime
        await helper.advanceTimeAndBlock(2*interval+9);

        await truffleAssert.reverts(
            StakingContractInstance2days.redeemAndRemoveLiquidity(shares, { from: accountTwo}),
            'ERC777: transfer amount exceeds allowance'
        );
        
        await StakingContractInstance2days.approve(StakingContractInstance2days.address, shares, { from: accountTwo });

        let balanceT1Before = await ERC20MintableInstanceToken1.balanceOf(accountTwo);
        let balanceT2Before = await ERC20MintableInstanceToken2.balanceOf(accountTwo);
        await StakingContractInstance2days.redeemAndRemoveLiquidity(shares, { from: accountTwo});
        
        let balanceT1After = await ERC20MintableInstanceToken1.balanceOf(accountTwo);
        let balanceT2After = await ERC20MintableInstanceToken2.balanceOf(accountTwo);

        assert.equal(balanceT1After>balanceT1Before, true, "t1 must increase");
        assert.equal(balanceT2After>balanceT2Before, true, "t2 must increase");
        
        // await truffleAssert.reverts(
        //     StakingContractInstance2days.redeemAndRemoveLiquidity(shares, { from: accountTwo}),
        //     'Redeeming stake that is not yet unlocked'
        // );
        
    });    
 
    it('should consume all tokens when buying liquidity', async () => {
        
        await ERC20MintableInstanceToken2.mint(accountTwo, oneToken);
        
        await ERC20MintableInstanceToken2.approve(StakingContractInstance.address, oneToken, { from: accountTwo });
        
        // console.log('before Adding liquidity = ',BigNumber(await pairInstance.balanceOf(StakingContractInstance.address)).toString());
        
        //await LiquidityMiningRouterInstance.addLiquidityAndStake(ERC20MintableInstanceToken1.address, ERC20MintableInstanceToken2.address, oneToken, { from: accountTwo });
        
        
        let stakingBalanceToken1Before = await ERC20MintableInstanceToken1.balanceOf(StakingContractInstance.address);
        let stakingBalanceToken2Before = await ERC20MintableInstanceToken2.balanceOf(StakingContractInstance.address);
        await StakingContractInstance.methods['buyLiquidityAndStake(uint256)'](oneToken, { from: accountTwo });
        
        let stakingBalanceToken1After = await ERC20MintableInstanceToken1.balanceOf(StakingContractInstance.address);
        let stakingBalanceToken2After = await ERC20MintableInstanceToken2.balanceOf(StakingContractInstance.address);
        
        // console.log('token1::',stakingBalanceToken1Before.toString(), stakingBalanceToken1After.toString());
        // console.log('token2::',stakingBalanceToken2Before.toString(), stakingBalanceToken2After.toString());

        assert.equal(
            (
                (BigNumber(stakingBalanceToken2After).minus(BigNumber(stakingBalanceToken2Before))).div(BigNumber(oneToken))
            ).lt(BigNumber(percentLimitLeftTokenB).times(BigNumber(1e18)))
            , 
            true
            , 
            "error"
        );
        
        let shares = await StakingContractInstance.balanceOf(accountTwo);
        let lptokens = await pairInstance.balanceOf(StakingContractInstance.address);
        
        // console.log('after Adding liquidity        = ',BigNumber(lptokens).toString());
        // console.log('after Adding liquidity shares = ',BigNumber(shares).toString());
        
        // custom situation when  uniswapLP tokens equal sharesLP tokens.  can be happens in the first stake
        assert.equal(BigNumber(lptokens).toString(), BigNumber(shares).toString(), "error");



        await ERC20MintableInstanceToken1.mint(accountFive, "0x"+BigNumber(10000e18).toString(16));
        await ERC20MintableInstanceToken2.mint(accountFive, "0x"+BigNumber(40000e18).toString(16));
        await ERC20MintableInstanceToken1.approve(UniswapRouterInstance.address, "0x"+BigNumber(10000e18).toString(16), { from: accountFive });
        await ERC20MintableInstanceToken2.approve(UniswapRouterInstance.address, "0x"+BigNumber(40000e18).toString(16), { from: accountFive });
        
        await UniswapRouterInstance.addLiquidity(
            ERC20MintableInstanceToken1.address,
            ERC20MintableInstanceToken2.address,
            "0x"+BigNumber(10000e18).toString(16),
            "0x"+BigNumber(40000e18).toString(16),
            0,
            0,
            accountFive,
            Math.floor(Date.now()/1000)+(lockupIntervalCount*interval)
            , { from: accountFive }
        );
        await ERC20MintableInstanceToken2.mint(accountTwo, "0x"+BigNumber(50000e18).toString(16));
        await ERC20MintableInstanceToken2.approve(StakingContractInstance.address, "0x"+BigNumber(50000e18).toString(16), { from: accountTwo });
        
        stakingBalanceToken1Before = await ERC20MintableInstanceToken1.balanceOf(StakingContractInstance.address);
        stakingBalanceToken2Before = await ERC20MintableInstanceToken2.balanceOf(StakingContractInstance.address);
        await StakingContractInstance.methods['buyLiquidityAndStake(uint256)']("0x"+BigNumber(50000e18).toString(16), { from: accountTwo });
        stakingBalanceToken1After = await ERC20MintableInstanceToken1.balanceOf(StakingContractInstance.address);
        stakingBalanceToken2After = await ERC20MintableInstanceToken2.balanceOf(StakingContractInstance.address);
        
        assert.equal(
            (
                (BigNumber(stakingBalanceToken2After).minus(BigNumber(stakingBalanceToken2Before))).div(BigNumber(oneToken))
            ).lt(BigNumber(percentLimitLeftTokenB).times(BigNumber(1e18)))
            , 
            true
            , 
            "error"
        );
        
        
        // console.log('token1::',stakingBalanceToken1Before.toString(), stakingBalanceToken1After.toString());
        // console.log('token2::',stakingBalanceToken2Before.toString(), stakingBalanceToken2After.toString());
    });
    
    it('add reward token', async () => {
        let arr;
        await truffleAssert.reverts(
            StakingContractInstance.addRewardToken(ERC20MintableInstanceToken3.address, { from: accountTwo}),
            'Ownable: caller is not the owner'
        );
        await StakingContractInstance.addRewardToken(ERC20MintableInstanceToken3.address, { from: accountFive });
        
        arr = await StakingContractInstance.viewRewardTokensList();
        assert.notEqual(arr.indexOf(ERC20MintableInstanceToken3.address.toString()), -1, "can not add token reward");
        
        await truffleAssert.reverts(
            StakingContractInstance.removeRewardToken(ERC20MintableInstanceToken3.address, { from: accountTwo}),
            'Ownable: caller is not the owner'
        );
        await StakingContractInstance.removeRewardToken(ERC20MintableInstanceToken3.address, { from: accountFive });
        
        arr = await StakingContractInstance.viewRewardTokensList();
        assert.equal(arr.indexOf(ERC20MintableInstanceToken3.address.toString()), -1, "can not remove token reward");
    });    
 
    it('check reward after redeem with empty reward balance', async () => {
        
        
        
        // create staking for 2 days
        tmpTr = await StakingFactoryInstance.produce(ERC20MintableInstanceToken2.address, ERC20MintableInstanceToken1.address, 3);
        
        let StakingContractInstance2days = await StakingContract.at(getArgs(tmpTr, "InstanceCreated").instance);
        
        // add reward token
        await StakingContractInstance2days.addRewardToken(ERC20MintableInstanceToken3.address);    
        let balanceBefore = await ERC20MintableInstanceToken3.balanceOf(accountTwo);
        
        await ERC20MintableInstanceToken2.mint(accountTwo, oneToken);
        await ERC20MintableInstanceToken2.approve(StakingContractInstance2days.address, oneToken, { from: accountTwo });
        
        await StakingContractInstance2days.methods['buyLiquidityAndStake(uint256)'](oneToken, { from: accountTwo });

        shares = await StakingContractInstance2days.balanceOf(accountTwo);
        assert.equal(shares>0, true, "shares need > 0");
  
        // pass some mtime
        await helper.advanceTimeAndBlock(3*interval+9);

        
        await StakingContractInstance2days.approve(StakingContractInstance2days.address, shares, { from: accountTwo });

        await StakingContractInstance2days.redeem(shares, { from: accountTwo});
        let balanceAfter = await ERC20MintableInstanceToken3.balanceOf(accountTwo);
        assert.equal(balanceBefore.toString(), balanceAfter.toString(), "reward wrong");
        // console.log('balanceBefore=', balanceBefore.toString());
        // console.log('balanceAfter=', balanceAfter.toString());
        
        
    });    
    
    it('check reward after redeem with none-empty reward balance', async () => {
        
        
        
        // create staking for 2 days
        tmpTr = await StakingFactoryInstance.produce(ERC20MintableInstanceToken2.address, ERC20MintableInstanceToken1.address, 5);
        
        let StakingContractInstance2days = await StakingContract.at(getArgs(tmpTr, "InstanceCreated").instance);
        
        // add reward token
        await StakingContractInstance2days.addRewardToken(ERC20MintableInstanceToken3.address);    
        await ERC20MintableInstanceToken3.mint(StakingContractInstance2days.address, oneToken);
        let balanceBefore = await ERC20MintableInstanceToken3.balanceOf(accountTwo);
        
        await ERC20MintableInstanceToken2.mint(accountTwo, oneToken);
        await ERC20MintableInstanceToken2.approve(StakingContractInstance2days.address, oneToken, { from: accountTwo });
        
        await StakingContractInstance2days.methods['buyLiquidityAndStake(uint256)'](oneToken, { from: accountTwo });

        shares = await StakingContractInstance2days.balanceOf(accountTwo);
        assert.equal(shares>0, true, "shares need > 0");
  
        // pass some mtime
        await helper.advanceTimeAndBlock(5*interval+9);

        
        await StakingContractInstance2days.approve(StakingContractInstance2days.address, shares, { from: accountTwo });

        await StakingContractInstance2days.redeem(shares, { from: accountTwo});
        let balanceAfter = await ERC20MintableInstanceToken3.balanceOf(accountTwo);
        // here accountTwo get all reward as the one participant
        assert.equal(oneToken.toString(), balanceAfter.toString(), "reward wrong");
        
        
    });    

    // left for erc777
    // it('buyAddLiquidityAndStake ERC777 tokensReceived', async () => {
        
    //     await UniswapRouterFactoryInstance.createPair(ERC20MintableInstanceToken1.address, ERC777MintableInstanceToken1.address);
        
    //     let pairAddress = await UniswapRouterFactoryInstance.getPair(ERC20MintableInstanceToken1.address, ERC777MintableInstanceToken1.address);
        
    //     pairInstance = await ERC20Mintable.at(pairAddress);
        
    //     await ERC20MintableInstanceToken1.mint(accountFive, oneToken07);
    //     await ERC777MintableInstanceToken1.mint(accountFive, oneToken07);
    //     await ERC20MintableInstanceToken1.approve(UniswapRouterInstance.address, oneToken07, { from: accountFive });
    //     await ERC777MintableInstanceToken1.approve(UniswapRouterInstance.address, oneToken07, { from: accountFive });
        
    //     await UniswapRouterInstance.addLiquidity(
    //         ERC20MintableInstanceToken1.address,
    //         ERC777MintableInstanceToken1.address,
    //         oneToken07,
    //         oneToken07,
    //         0,
    //         0,
    //         accountFive,
    //         Math.floor(Date.now()/1000)+(lockupIntervalCount*interval)
    //         , { from: accountFive }
    //     );
        
    //     //tmpTr = await StakingFactoryInstance.produce(ERC20MintableInstanceToken2.address, ERC20MintableInstanceToken1.address, lockupIntervalCount, {from: accountFive });
    //     tmpTr = await StakingFactoryInstance.methods['produce(address,address,uint256)'](ERC777MintableInstanceToken1.address, ERC20MintableInstanceToken1.address, lockupIntervalCount, {from: accountFive });
        
        
    //     let StakingContractInstance_ERC20_777 = await StakingContract.at(getArgs(tmpTr, "InstanceCreated").instance);
        
    //     await ERC777MintableInstanceToken1.mint(accountTwo, oneToken);
        
    //     // approve and buyLiquidityAndStake
    //     await ERC777MintableInstanceToken1.transfer(StakingContractInstance_ERC20_777.address, oneToken, { from: accountTwo });
        
    //     let shares = await StakingContractInstance_ERC20_777.balanceOf(accountTwo);
    //     let lptokens = await pairInstance.balanceOf(StakingContractInstance_ERC20_777.address);
    //     // console.log('after Adding liquidity        = ',BigNumber(lptokens).toString());
    //     // console.log('after Adding liquidity shares = ',BigNumber(shares).toString());
        
    //     // custom situation when  uniswapLP tokens equal sharesLP tokens.  can be happens in the first stake
    //     assert.equal(BigNumber(lptokens).toString(), BigNumber(shares).toString(), "error");
        
    //     //----------
    //     await ERC777MintableInstanceToken1.mint(accountTwo, oneToken);
    //     await ERC777MintableInstanceToken1.approve(StakingContractInstance_ERC20_777.address, oneToken, { from: accountTwo });
    //     await StakingContractInstance_ERC20_777.methods['buyLiquidityAndStake(uint256)'](oneToken, { from: accountTwo });
        
    //     let shares2 = await StakingContractInstance_ERC20_777.balanceOf(accountTwo);
        
    //     console.log('shares=',shares.toString());
    //     console.log('shares2=',shares2.toString());
    // });    
     
});
