const { ethers, waffle } = require('hardhat');
const { BigNumber } = require('ethers');
const { expect } = require('chai');
const chai = require('chai');
const { time } = require('@openzeppelin/test-helpers');

const ZERO = BigNumber.from('0');
const ONE = BigNumber.from('1');
const TWO = BigNumber.from('2');
const THREE = BigNumber.from('3');
const FOUR = BigNumber.from('4');
const FIVE = BigNumber.from('5');
const SIX = BigNumber.from('6');
const SEVEN = BigNumber.from('7');
const TEN = BigNumber.from('10');
const HUNDRED = BigNumber.from('100');
const THOUSAND = BigNumber.from('1000');


const ONE_ETH = ethers.utils.parseEther('1');

//const TOTALSUPPLY = ethers.utils.parseEther('1000000000');    
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD';
const UNISWAP_ROUTER_FACTORY_ADDRESS = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
const UNISWAP_ROUTER = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';

const ADMIN_ROLE = 'admin';
const REDEEM_ROLE = 'redeem';
const CIRCULATE_ROLE = 'circulate';

const FRACTION = 100000;

const NO_DONATIONS = [];

const NO_BONUS_FRACTIONS = ZERO; // no bonus. means amount*NO_BONUS_FRACTIONS/FRACTION = X*0/100000 = 0
const BONUS_FRACTIONS = 50000; // 50%


function convertToHex(str) {
    var hex = '';
    for(var i=0;i<str.length;i++) {
        hex += ''+str.charCodeAt(i).toString(16);
    }
    return hex;
}
function padZeros(num, size) {
    var s = num+"";
    while (s.length < size) s =  s + "0";
    return s;
}

describe("Staking contract tests", function () {
    const accounts = waffle.provider.getWallets();
    const owner = accounts[0];                     
    const alice = accounts[1];
    const bob = accounts[2];
    const charlie = accounts[3];
    const liquidityHolder = accounts[4];
    const trustedForwarder = accounts[5];
    const david = accounts[4];
    const frank = accounts[5];
    
    const lpFraction = ZERO;
    const numerator = 1;
    const denominator = 10;
    const dayInSeconds = 24*60*60; // * interval: DAY in seconds
    const lockupIntervalCount = 365; // year in days(dayInSeconds)
    const percentLimitLeftTokenB = 0.001;

    const discountSensitivity = 1*FRACTION;

    var implementationCommunityCoin;
    var implementationCommunityStakingPoolFactory;
    var implementationCommunityStakingPool;
    var implementationCommunityStakingPoolErc20;
    var implementationCommunityRolesManagement;
    var mockHook;
    var mockCommunity;
    var ERC20Factory;
    var CommunityCoinFactory;
    var CommunityCoin;
    var CommunityCoinAndExternalCommunity;
    var CommunityCoinWithHook;
    var erc20;
    var erc777;
    var erc20TradedToken;
    var erc20ReservedToken;
    var erc20Reward;
    var fakeUSDT;
    var fakeMiddle;
    
    beforeEach("deploying", async() => {
        const ReleaseManagerFactoryF = await ethers.getContractFactory("MockReleaseManagerFactory");
        const ReleaseManagerF = await ethers.getContractFactory("MockReleaseManager");
        const CommunityCoinFactoryF = await ethers.getContractFactory("CommunityCoinFactory");

        const CommunityCoinF = await ethers.getContractFactory("CommunityCoin");
        const CommunityStakingPoolF = await ethers.getContractFactory("MockCommunityStakingPool");
        const CommunityStakingPoolErc20F = await ethers.getContractFactory("CommunityStakingPoolErc20");
        const CommunityStakingPoolFactoryF = await ethers.getContractFactory("CommunityStakingPoolFactory");

        const CommunityRolesManagementF = await ethers.getContractFactory("CommunityRolesManagement");

        const MockHookF = await ethers.getContractFactory("MockHook");
        const MockCommunityF = await ethers.getContractFactory("MockCommunity");
        ERC20Factory = await ethers.getContractFactory("ERC20Mintable");
        
        let implementationReleaseManager    = await ReleaseManagerF.deploy();

        let releaseManagerFactory   = await ReleaseManagerFactoryF.connect(owner).deploy(implementationReleaseManager.address);
        let tx,rc,event,instance,instancesCount;
        //
        tx = await releaseManagerFactory.connect(owner).produce();
        rc = await tx.wait(); // 0ms, as tx is already confirmed
        event = rc.events.find(event => event.event === 'InstanceProduced');
        [instance, instancesCount] = event.args;
        let releaseManager = await ethers.getContractAt("MockReleaseManager",instance);

        erc20 = await ERC20Factory.deploy("ERC20 Token", "ERC20");
        erc777 = await ERC20Factory.deploy("ERC777 Token", "ERC777");
        erc20TradedToken = await ERC20Factory.deploy("ERC20 Traded Token", "ERC20-TRD");
        erc20ReservedToken = await ERC20Factory.deploy("ERC20 Reserved Token", "ERC20-RSRV");
        erc20Reward = await ERC20Factory.deploy("ERC20 Token Reward", "ERC20-R");

        implementationCommunityCoin = await CommunityCoinF.deploy();
        implementationCommunityStakingPoolFactory = await CommunityStakingPoolFactoryF.deploy();
        implementationCommunityStakingPool = await CommunityStakingPoolF.deploy();
        implementationCommunityStakingPoolErc20 = await CommunityStakingPoolErc20F.deploy();
        implementationCommunityRolesManagement = await CommunityRolesManagementF.deploy();

        mockHook = await MockHookF.deploy();
        mockCommunity = await MockCommunityF.deploy();

        const NONE_COMMUNITY_SETTINGS = [ZERO_ADDRESS, ADMIN_ROLE, REDEEM_ROLE, CIRCULATE_ROLE];
        const COMMUNITY_SETTINGS = [mockCommunity.address, ADMIN_ROLE, REDEEM_ROLE, CIRCULATE_ROLE];

        const NO_COSTMANAGER = ZERO_ADDRESS;
        
        CommunityCoinFactory  = await CommunityCoinFactoryF.deploy(
            implementationCommunityCoin.address, 
            implementationCommunityStakingPoolFactory.address, 
            implementationCommunityStakingPool.address, 
            implementationCommunityStakingPoolErc20.address,
            implementationCommunityRolesManagement.address/*,
            NO_COSTMANAGER*/
        );

        // 
        const factoriesList = [CommunityCoinFactory.address];
        const factoryInfo = [
            [
                1,//uint8 factoryIndex; 
                1,//uint16 releaseTag; 
                "0x53696c766572000000000000000000000000000000000000"//bytes24 factoryChangeNotes;
            ]
        ]
        await CommunityCoinFactory.connect(owner).registerReleaseManager(releaseManager.address);
        await releaseManager.connect(owner).newRelease(factoriesList, factoryInfo);

        // without hook
        tx = await CommunityCoinFactory.connect(owner).produce(erc20ReservedToken.address, erc20TradedToken.address, ZERO_ADDRESS, discountSensitivity, NONE_COMMUNITY_SETTINGS);
        rc = await tx.wait(); // 0ms, as tx is already confirmed
        event = rc.events.find(event => event.event === 'InstanceCreated');
        [instance, instancesCount] = event.args;
        CommunityCoin = await ethers.getContractAt("CommunityCoin",instance);

        // with hook
        tx = await CommunityCoinFactory.connect(owner).produce(erc20ReservedToken.address, erc20TradedToken.address, mockHook.address, discountSensitivity, NONE_COMMUNITY_SETTINGS);
        rc = await tx.wait(); // 0ms, as tx is already confirmed
        event = rc.events.find(event => event.event === 'InstanceCreated');
        [instance, instancesCount] = event.args;
        CommunityCoinWithHook = await ethers.getContractAt("CommunityCoin",instance);

        // without hook and external community
        tx = await CommunityCoinFactory.connect(owner).produce(erc20ReservedToken.address, erc20TradedToken.address, ZERO_ADDRESS, discountSensitivity, COMMUNITY_SETTINGS);
        rc = await tx.wait(); // 0ms, as tx is already confirmed
        event = rc.events.find(event => event.event === 'InstanceCreated');
        [instance, instancesCount] = event.args;
        CommunityCoinAndExternalCommunity = await ethers.getContractAt("CommunityCoin",instance);

        
        
        //console.log("before each №1");
    });
    
    it("staking factory", async() => {
        let count = await CommunityCoinFactory.instancesCount();
        await expect(count).to.be.equal(THREE);
    })

    it("sqrt coverage", async() => {
        const MockSrqtCoverageFactory = await ethers.getContractFactory("MockSrqtCoverage");
        let mockSrqtCoverageInstance = await MockSrqtCoverageFactory.deploy();

        let inputArr = [
            "0x100000000000000000000000000000000",
            "0x10000000000000000",
            "0x100000000",
            "0x100000",
            "0x400",
            "0x100",
            "0x10",
            "0x8",
            "0x4",
            "0x2",
            "0x1",
            "0x0",
            ];
        let expectArr = [
            "0x10000000000000000",
            "0x100000000",
            "0x10000",
            "0x400",
            "0x20",
            "0x10",
            "0x4",
            "0x2",
            "0x2",
            "0x1",
            "0x1",
            "0x0",
        ];

        let tmp;
        for (let i = 0; i< inputArr.length; i++) {
            tmp = await mockSrqtCoverageInstance.calculateSqrt(BigNumber.from(inputArr[i]));
            expect(
                BigNumber.from(tmp).eq(BigNumber.from(expectArr[i]))
            ).to.be.equal(true);
        }
        
    }); 

    it("shouldnt create with uniswap pair exists", async() => {
        await expect(CommunityCoin["produce(uint64,uint64,(address,uint256)[],uint64,address,uint64,uint64)"](
            lockupIntervalCount,
            NO_BONUS_FRACTIONS,
            NO_DONATIONS,
            lpFraction,
            ZERO_ADDRESS,
            numerator,
            denominator
        )).to.be.revertedWith("NO_UNISWAP_V2_PAIR");
    });
    
    it("should produce with default values", async() => {
        let uniswapRouterFactoryInstance = await ethers.getContractAt("IUniswapV2Factory",UNISWAP_ROUTER_FACTORY_ADDRESS);
        let uniswapRouterInstance = await ethers.getContractAt("IUniswapV2Router02", UNISWAP_ROUTER);

        await uniswapRouterFactoryInstance.createPair(erc20ReservedToken.address, erc20TradedToken.address);
    
        let pairAddress = await uniswapRouterFactoryInstance.getPair(erc20ReservedToken.address, erc20TradedToken.address);

        let pairInstance = await ethers.getContractAt("ERC20Mintable",pairAddress);

        await erc20ReservedToken.mint(liquidityHolder.address, ONE_ETH.mul(SEVEN));
        await erc20TradedToken.mint(liquidityHolder.address, ONE_ETH.mul(SEVEN));
        await erc20ReservedToken.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(SEVEN));
        await erc20TradedToken.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(SEVEN));

        const ts = await time.latest();
        const timeUntil = parseInt(ts)+parseInt(lockupIntervalCount*dayInSeconds);

        await uniswapRouterInstance.connect(liquidityHolder).addLiquidity(
            erc20ReservedToken.address,
            erc20TradedToken.address,
            ONE_ETH.mul(SEVEN),
            ONE_ETH.mul(SEVEN),
            0,
            0,
            liquidityHolder.address,
            timeUntil
        );


        let tx = await CommunityCoin.connect(owner)["produce(uint64,uint64,(address,uint256)[],uint64,address,uint64,uint64)"](
            lockupIntervalCount,
            NO_BONUS_FRACTIONS,
            NO_DONATIONS,
            lpFraction,
            ZERO_ADDRESS,
            numerator,
            denominator
        )

        const rc = await tx.wait(); // 0ms, as tx is already confirmed
        const event = rc.events.find(event => event.event === 'InstanceCreated');
        const [tokenA, tokenB, instance] = event.args;

        expect(instance).not.to.be.eq(ZERO_ADDRESS); 
    });

    describe("donate tests", function () {   
        var uniswapRouterFactoryInstance;
        var uniswapRouterInstance;
        var communityStakingPool;
        var pairInstance;
        
        const DONATIONS = [[david.address, FRACTION*50/100], [frank.address, FRACTION*25/100]];
        beforeEach("deploying", async() => {
        
            uniswapRouterFactoryInstance = await ethers.getContractAt("IUniswapV2Factory",UNISWAP_ROUTER_FACTORY_ADDRESS);
            uniswapRouterInstance = await ethers.getContractAt("IUniswapV2Router02", UNISWAP_ROUTER);

            await uniswapRouterFactoryInstance.createPair(erc20ReservedToken.address, erc20TradedToken.address);
        
            let pairAddress = await uniswapRouterFactoryInstance.getPair(erc20ReservedToken.address, erc20TradedToken.address);

            pairInstance = await ethers.getContractAt("ERC20Mintable",pairAddress);

            await erc20ReservedToken.mint(liquidityHolder.address, ONE_ETH.mul(TEN));
            await erc20TradedToken.mint(liquidityHolder.address, ONE_ETH.mul(TEN));
            await erc20ReservedToken.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(TEN));
            await erc20TradedToken.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(TEN));

            const ts = await time.latest();
            const timeUntil = parseInt(ts)+parseInt(lockupIntervalCount*dayInSeconds);

            await uniswapRouterInstance.connect(liquidityHolder).addLiquidity(
                erc20ReservedToken.address,
                erc20TradedToken.address,
                ONE_ETH.mul(SEVEN),
                ONE_ETH.mul(SEVEN),
                0,
                0,
                liquidityHolder.address,
                timeUntil
            );

            let tx = await CommunityCoin.connect(owner)["produce(uint64,uint64,(address,uint256)[],uint64,address,uint64,uint64)"](
                lockupIntervalCount,
                NO_BONUS_FRACTIONS,
                DONATIONS,
                lpFraction,
                ZERO_ADDRESS,
                numerator,
                denominator
            )

            const rc = await tx.wait(); // 0ms, as tx is already confirmed
            const event = rc.events.find(event => event.event === 'InstanceCreated');
            const [tokenA, tokenB, instance] = event.args;
            //console.log(tokenA, tokenB, instance, instancesCount);

            communityStakingPool = await ethers.getContractAt("MockCommunityStakingPool",instance);
            //console.log("before each №2");

            await erc20ReservedToken.mint(liquidityHolder.address, ONE_ETH.mul(TEN));
            await erc20ReservedToken.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(TEN));

            const ts2 = await time.latest();
            const timeUntil2 = parseInt(ts2)+parseInt(lockupIntervalCount*dayInSeconds);

            await uniswapRouterInstance.connect(liquidityHolder).addLiquidityETH(
                erc20ReservedToken.address,
                ONE_ETH.mul(TEN),
                0,
                0,
                liquidityHolder.address,
                timeUntil2,
                {value: ONE_ETH.mul(TEN) }
            );
        });

        it("buyAddLiquidityAndStake (donations:50% and 25%. left for sender)", async () => {
            
            await communityStakingPool.connect(bob)['buyAndStakeLiquidity()']({value: ONE_ETH.mul(ONE) });
            
            let bobWalletTokens = await CommunityCoin.balanceOf(bob.address);
            let poolLptokens = await pairInstance.balanceOf(communityStakingPool.address);

            let davidWalletTokens = await CommunityCoin.balanceOf(david.address);
            let frankWalletTokens = await CommunityCoin.balanceOf(frank.address);

            expect(bobWalletTokens).not.to.be.eq(ZERO);
            expect(davidWalletTokens).not.to.be.eq(ZERO);
            expect(frankWalletTokens).not.to.be.eq(ZERO);

            expect(poolLptokens).not.to.be.eq(ZERO);
            expect(poolLptokens.mul(numerator).div(denominator)).to.be.eq(davidWalletTokens.add(frankWalletTokens).add(bobWalletTokens));

            // donates 50% and 25% and left for Bob
            expect(davidWalletTokens).to.be.eq(frankWalletTokens.add(bobWalletTokens));
            
        });  

    });

    describe("Snapshots tests", function () {
        var uniswapRouterFactoryInstance;
        var uniswapRouterInstance;
        var communityStakingPool;
        var communityStakingPoolBonus;
        var pairInstance;

        var func;
        var tmp;

        beforeEach("deploying", async() => {
        
            uniswapRouterFactoryInstance = await ethers.getContractAt("IUniswapV2Factory",UNISWAP_ROUTER_FACTORY_ADDRESS);
            uniswapRouterInstance = await ethers.getContractAt("IUniswapV2Router02", UNISWAP_ROUTER);

            await uniswapRouterFactoryInstance.createPair(erc20ReservedToken.address, erc20TradedToken.address);
        
            let pairAddress = await uniswapRouterFactoryInstance.getPair(erc20ReservedToken.address, erc20TradedToken.address);

            pairInstance = await ethers.getContractAt("ERC20Mintable",pairAddress);

            await erc20ReservedToken.mint(liquidityHolder.address, ONE_ETH.mul(TEN));
            await erc20TradedToken.mint(liquidityHolder.address, ONE_ETH.mul(TEN));
            await erc20ReservedToken.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(TEN));
            await erc20TradedToken.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(TEN));

            const ts = await time.latest();
            const timeUntil = parseInt(ts)+parseInt(lockupIntervalCount*dayInSeconds);

            await uniswapRouterInstance.connect(liquidityHolder).addLiquidity(
                erc20ReservedToken.address,
                erc20TradedToken.address,
                ONE_ETH.mul(SEVEN),
                ONE_ETH.mul(SEVEN),
                0,
                0,
                liquidityHolder.address,
                timeUntil
            );

            func = async (param_bonus_fractions, lp_fraction, lp_fraction_beneficiary) => {
                
                let tx = await CommunityCoin.connect(owner)["produce(uint64,uint64,(address,uint256)[],uint64,address,uint64,uint64)"](
                    lockupIntervalCount,
                    param_bonus_fractions,
                    NO_DONATIONS,
                    lp_fraction,
                    lp_fraction_beneficiary,
                    numerator,
                    denominator
                )

                const rc = await tx.wait(); // 0ms, as tx is already confirmed
                const event = rc.events.find(event => event.event === 'InstanceCreated');
                const [tokenA, tokenB, instance] = event.args;
                //console.log(tokenA, tokenB, instance, instancesCount);

                communityStakingPool = await ethers.getContractAt("MockCommunityStakingPool",instance);
                //console.log("before each №2");

                await erc20ReservedToken.mint(liquidityHolder.address, ONE_ETH.mul(TEN));
                await erc20ReservedToken.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(TEN));

                const ts2 = await time.latest();
                const timeUntil2 = parseInt(ts2)+parseInt(lockupIntervalCount*dayInSeconds);

                await uniswapRouterInstance.connect(liquidityHolder).addLiquidityETH(
                    erc20ReservedToken.address,
                    ONE_ETH.mul(TEN),
                    0,
                    0,
                    liquidityHolder.address,
                    timeUntil2,
                    {value: ONE_ETH.mul(TEN) }
                );
                //--------------------------------------------------------
                await communityStakingPool.connect(bob)['buyAndStakeLiquidity()']({value: ONE_ETH.mul(ONE) });
            
                let bobWalletTokens = await CommunityCoin.balanceOf(bob.address);

                

                return bobWalletTokens;
            }
            
        });

        it("Bonus tests::buyAddLiquidityAndStake (Bonus:50%)", async () => {

            // here we: 
            // - calculate how much tokens user will obtain without bonuses 
            // - store them in `tokensWithNoBonus`
            // - revert snapshot
            // - calculate how much tokens user will obtain WITH bonuses (50%)
            // - store them in `tokensWithBonus`
            // - validate that bonus token shouldn't be unstaked even if duration pass
            // - validate that bonus token can be transfer and consuming in first order


            let snapId;

            // make snapshot before time manipulations
            snapId = await ethers.provider.send('evm_snapshot', []);
            let tokensWithNoBonus = await func(NO_BONUS_FRACTIONS, ZERO, ZERO_ADDRESS);

            await expect(CommunityCoin.connect(bob)["unstake(uint256)"](tokensWithNoBonus)).to.be.revertedWith(`StakeNotUnlockedYet("${bob.address}", ${tokensWithNoBonus}, 0)`);
            

            // pass some mtime
            await time.increase(lockupIntervalCount*dayInSeconds+9);    

            await CommunityCoin.connect(bob).approve(CommunityCoin.address, tokensWithNoBonus);
            await CommunityCoin.connect(bob)["unstake(uint256)"](tokensWithNoBonus);

            // restore snapshot
            await ethers.provider.send('evm_revert', [snapId]);
            //--------------------------------------------------------------
            snapId = await ethers.provider.send('evm_snapshot', []);
            let tokensWithBonus = await func(BONUS_FRACTIONS, ZERO, ZERO_ADDRESS);

            await expect(CommunityCoin.connect(bob)["unstake(uint256)"](tokensWithNoBonus)).to.be.revertedWith(`StakeNotUnlockedYet("${bob.address}", ${tokensWithNoBonus}, ${tokensWithNoBonus.div(TWO)})`);
            await expect(CommunityCoin.connect(bob)["unstake(uint256)"](tokensWithBonus)).to.be.revertedWith(`StakeNotUnlockedYet("${bob.address}", ${tokensWithNoBonus}, 0)`);

            ////// validate `viewLockedWalletTokens` and `viewLockedWalletTokensList`
            let bobSharesAfter = await CommunityCoin.balanceOf(bob.address);
            let bobLockedListAfter, bobBonusesListAfter;

            let bobLockedBalanceAfter = await CommunityCoin.connect(bob).viewLockedWalletTokens(bob.address);
            [bobLockedListAfter, bobBonusesListAfter] = await CommunityCoin.connect(bob).viewLockedWalletTokensList(bob.address);

            expect(bobLockedBalanceAfter).to.be.eq(bobSharesAfter);
            expect(bobLockedBalanceAfter).to.be.eq(tokensWithBonus);

            expect(tokensWithNoBonus).to.be.eq(bobLockedListAfter[0][0]);
            expect(tokensWithBonus.sub(tokensWithNoBonus)).to.be.eq(bobBonusesListAfter[0][0]);
            ////// ENDOF validate `viewLockedWalletTokens` and `viewLockedWalletTokensList`
            
            // pass some mtime
            await time.increase(lockupIntervalCount*dayInSeconds+9);    

            await CommunityCoin.connect(bob).approve(CommunityCoin.address, tokensWithBonus);

            await expect(CommunityCoin.connect(bob)["unstake(uint256)"](tokensWithBonus)).to.be.revertedWith(`InsufficientAmount("${bob.address}", ${tokensWithBonus})`);

            await CommunityCoin.connect(bob).transfer(alice.address, tokensWithBonus.sub(tokensWithNoBonus));

            await CommunityCoin.connect(bob).approve(CommunityCoin.address, tokensWithNoBonus);
            await CommunityCoin.connect(bob)["unstake(uint256)"](tokensWithNoBonus);


            // restore snapshot
            await ethers.provider.send('evm_revert', [snapId]);

            // finally check correct amount of bonuses
            let expectedBonusAmount = tokensWithNoBonus.mul(BONUS_FRACTIONS).div(FRACTION);
            expect(tokensWithBonus).to.be.eq(tokensWithNoBonus.add(expectedBonusAmount));

        });  

        it("LP Fraction validate", async () => {
            
            //uint64 public constant FRACTION = 100000;
            let snapId;

            // make snapshot before time manipulations
            snapId = await ethers.provider.send('evm_snapshot', []);
            let charlieLPTokensWithNoLPConsumingBefore = await pairInstance.connect(charlie).balanceOf(charlie.address);
            let tokensWithNoLPConsuming = await func(NO_BONUS_FRACTIONS, ZERO, ZERO_ADDRESS);

            // // pass some mtime
            // await time.increase(lockupIntervalCount*dayInSeconds+9);  

            // grant role
            await CommunityCoin.connect(owner).grantRole(ethers.utils.formatBytes32String(REDEEM_ROLE), charlie.address);
            // transfer to charlie who has redeem role
            await CommunityCoin.connect(bob).transfer(charlie.address, tokensWithNoLPConsuming);

            await CommunityCoin.connect(charlie).approve(CommunityCoin.address, tokensWithNoLPConsuming);
            await CommunityCoin.connect(charlie)["redeem(uint256)"](tokensWithNoLPConsuming);  

            let charlieLPTokensWithNoLPConsumingAfter = await pairInstance.connect(charlie).balanceOf(charlie.address);

            // restore snapshot
            await ethers.provider.send('evm_revert', [snapId]);
            //------------------------------------------------------------------------------
            // make snapshot before time manipulations
            snapId = await ethers.provider.send('evm_snapshot', []);

            let aliceLPTokensWithLPConsumingBefore = await pairInstance.connect(alice).balanceOf(alice.address);
            let charlieLPTokensWithLPConsumingBefore = await pairInstance.connect(charlie).balanceOf(charlie.address);
            let tokensWithLPConsuming = await func(NO_BONUS_FRACTIONS, 1000, alice.address); // lp = 1%

            // // pass some mtime
            // await time.increase(lockupIntervalCount*dayInSeconds+9);  
            // grant role
            await CommunityCoin.connect(owner).grantRole(ethers.utils.formatBytes32String(REDEEM_ROLE), charlie.address);
            // transfer to charlie who has redeem role
            await CommunityCoin.connect(bob).transfer(charlie.address, tokensWithLPConsuming);

            await CommunityCoin.connect(charlie).approve(CommunityCoin.address, tokensWithLPConsuming);
            await CommunityCoin.connect(charlie)["redeem(uint256)"](tokensWithLPConsuming);  

            let aliceLPTokensWithLPConsumingAfter = await pairInstance.connect(alice).balanceOf(alice.address);
            let charlieLPTokensWithLPConsumingAfter = await pairInstance.connect(charlie).balanceOf(charlie.address);

            expect(
                charlieLPTokensWithNoLPConsumingAfter.sub(charlieLPTokensWithNoLPConsumingBefore)
            ).to.be.gt(
                charlieLPTokensWithLPConsumingAfter.sub(charlieLPTokensWithLPConsumingBefore)
            );

            expect(
                charlieLPTokensWithNoLPConsumingAfter.sub(charlieLPTokensWithLPConsumingAfter)
            ).to.be.eq(
                aliceLPTokensWithLPConsumingAfter.sub(aliceLPTokensWithLPConsumingBefore)
            );

            // restore snapshot
            await ethers.provider.send('evm_revert', [snapId]);
        });  
    });

    describe("TrustedForwarder Rewards", function () {

        var rewards;
        
        const DONATIONS = [[david.address, FRACTION*50/100], [frank.address, FRACTION*25/100]];
        beforeEach("deploying", async() => {

            const RewardsF = await ethers.getContractFactory("Rewards");
            rewards = await RewardsF.deploy(
                frank.address, //address sellingToken,
                [], //uint256[] memory timestamps,
                [], //uint256[] memory prices,
                [], //uint256[] memory thresholds,
                [], //uint256[] memory bonuses
            );

        });

        it("should be empty after init", async() => {
            expect(await rewards.connect(bob).isTrustedForwarder(ZERO_ADDRESS)).to.be.true;
        });

        it("should be setup by owner", async() => {
            await expect(rewards.connect(bob).setTrustedForwarder(charlie.address)).to.be.revertedWith("Ownable: caller is not the owner");
            expect(await rewards.connect(bob).isTrustedForwarder(ZERO_ADDRESS)).to.be.true;
            await rewards.connect(owner).setTrustedForwarder(charlie.address);
            expect(await rewards.connect(bob).isTrustedForwarder(charlie.address)).to.be.true;
        });
        
        it("should drop trusted forward if trusted forward become owner ", async() => {
            await rewards.connect(owner).setTrustedForwarder(charlie.address);
            expect(await rewards.connect(bob).isTrustedForwarder(charlie.address)).to.be.true;
            await rewards.connect(owner).transferOwnership(charlie.address);
            expect(await rewards.connect(bob).isTrustedForwarder(ZERO_ADDRESS)).to.be.true;
        });

        it("shouldnt become owner and trusted forwarder", async() => {
            await expect(rewards.connect(owner).setTrustedForwarder(owner.address)).to.be.revertedWith("FORWARDER_CAN_NOT_BE_OWNER");
        });
        
    });
        

    describe("Hook tests", function () {   
        var uniswapRouterFactoryInstance;
        var uniswapRouterInstance;
        var communityStakingPoolWithHook;

        var walletTokens;
        var lptokens;

        beforeEach("deploying", async() => {
            uniswapRouterFactoryInstance = await ethers.getContractAt("IUniswapV2Factory",UNISWAP_ROUTER_FACTORY_ADDRESS);
            uniswapRouterInstance = await ethers.getContractAt("IUniswapV2Router02", UNISWAP_ROUTER);

            await uniswapRouterFactoryInstance.createPair(erc20ReservedToken.address, erc20TradedToken.address);
        
            let pairAddress = await uniswapRouterFactoryInstance.getPair(erc20ReservedToken.address, erc20TradedToken.address);

            pairInstance = await ethers.getContractAt("ERC20Mintable",pairAddress);

            await erc20ReservedToken.mint(liquidityHolder.address, ONE_ETH.mul(SEVEN));
            await erc20TradedToken.mint(liquidityHolder.address, ONE_ETH.mul(SEVEN));
            await erc20ReservedToken.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(SEVEN));
            await erc20TradedToken.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(SEVEN));

            const ts = await time.latest();
            const timeUntil = parseInt(ts)+parseInt(lockupIntervalCount*dayInSeconds);

            await uniswapRouterInstance.connect(liquidityHolder).addLiquidity(
                erc20ReservedToken.address,
                erc20TradedToken.address,
                ONE_ETH.mul(SEVEN),
                ONE_ETH.mul(SEVEN),
                0,
                0,
                liquidityHolder.address,
                timeUntil
            );

            let tx = await CommunityCoinWithHook.connect(owner)["produce(uint64,uint64,(address,uint256)[],uint64,address,uint64,uint64)"](
                lockupIntervalCount,
                NO_BONUS_FRACTIONS,
                NO_DONATIONS,
                lpFraction,
                ZERO_ADDRESS,
                numerator,
                denominator
            )

            const rc = await tx.wait(); // 0ms, as tx is already confirmed
            const event = rc.events.find(event => event.event === 'InstanceCreated');
            const [tokenA, tokenB, instance] = event.args;
            
            communityStakingPoolWithHook = await ethers.getContractAt("CommunityStakingPool",instance);
            
            // create pair Token2 => WETH
            await erc20ReservedToken.mint(liquidityHolder.address, ONE_ETH.mul(SEVEN));
            await erc20ReservedToken.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(SEVEN));

            await uniswapRouterInstance.connect(liquidityHolder).addLiquidityETH(
                erc20ReservedToken.address,
                ONE_ETH.mul(SEVEN),
                0,
                0,
                liquidityHolder.address,
                timeUntil,
                {value: ONE_ETH.mul(SEVEN) }
            );

            


        });

        it("test bonus tokens if not set", async() => {
            await mockHook.setupVars(ZERO,true);
            await communityStakingPoolWithHook.connect(bob)['buyAndStakeLiquidity()']({value: ONE_ETH.mul(ONE) });
            
            walletTokens = await CommunityCoinWithHook.balanceOf(bob.address);
            lptokens = await pairInstance.balanceOf(communityStakingPoolWithHook.address);

            expect(lptokens).not.to.be.eq(ZERO);
            expect(lptokens.mul(numerator).div(denominator)).to.be.eq(walletTokens);;
               
        });

        describe("test transferHook ", function () {   
            beforeEach("before each", async() => {
                await communityStakingPoolWithHook.connect(bob)['buyAndStakeLiquidity()']({value: ONE_ETH.mul(ONE) });
                
                walletTokens = await CommunityCoinWithHook.balanceOf(bob.address);
                lptokens = await pairInstance.balanceOf(communityStakingPoolWithHook.address);
                
            });
            it("should prevent transfer if disabled via hook contract", async() => {
                
                // custom situation when  uniswapLP tokens equal sharesLP tokens.  can be happens in the first stake
                expect(lptokens).not.to.be.eq(ZERO);
                expect(lptokens.mul(numerator).div(denominator)).to.be.eq(walletTokens);;

                await mockHook.setupVars(ZERO,false);

                await expect(CommunityCoinWithHook.connect(bob).transfer(alice.address, walletTokens)).to.be.revertedWith(`HookTransferPrevent("${bob.address}", "${alice.address}", ${walletTokens})`);
                
            });

            it("should allow transfer if enabled via hook contract", async() => {
                
                // custom situation when  uniswapLP tokens equal sharesLP tokens.  can be happens in the first stake
                expect(lptokens).not.to.be.eq(ZERO);
                expect(lptokens.mul(numerator).div(denominator)).to.be.eq(walletTokens);;

                await mockHook.setupVars(ZERO,true);

                await expect(CommunityCoinWithHook.connect(bob).transfer(alice.address, walletTokens)).not.to.be.revertedWith(`HookTransferPrevent("${bob.address}", "${alice.address}", ${walletTokens})`);
                
            });
        }); 

    });
    
    describe("ERC20 pool tests", function () { 
        var communityStakingPoolErc20; 
        beforeEach("deploying", async() => { 
            let tx = await CommunityCoin.connect(owner)["produce(address,uint64,uint64,(address,uint256)[],uint64,address,uint64,uint64)"](
                erc20.address,
                lockupIntervalCount,
                NO_BONUS_FRACTIONS,
                NO_DONATIONS,
                lpFraction,
                ZERO_ADDRESS,
                numerator,
                denominator
            );

            const rc = await tx.wait(); // 0ms, as tx is already confirmed
            const event = rc.events.find(event => event.event === 'InstanceErc20Created');
            const [erc20tokenAddress, instance] = event.args;
            
            communityStakingPoolErc20 = await ethers.getContractAt("CommunityStakingPoolErc20",instance);
        });
        it("should produce", async() => {
            expect(communityStakingPoolErc20.address).not.to.be.eq(ZERO_ADDRESS); 
        });
        
        it("shouldnt create another pair with equal tokens", async() => {
            await expect(CommunityCoin["produce(address,uint64,uint64,(address,uint256)[],uint64,address,uint64,uint64)"](
                erc20.address,
                lockupIntervalCount,
                NO_BONUS_FRACTIONS,
                NO_DONATIONS,
                lpFraction,
                ZERO_ADDRESS,
                numerator,
                denominator
            )).to.be.revertedWith("CommunityCoin: PAIR_ALREADY_EXISTS");
        });

        it("shouldn't produce another instance type", async() => {
            
            await expect(CommunityCoin.connect(owner)["produce(uint64,uint64,(address,uint256)[],uint64,address,uint64,uint64)"](
                lockupIntervalCount,
                NO_BONUS_FRACTIONS,
                NO_DONATIONS,
                lpFraction,
                ZERO_ADDRESS,
                numerator,
                denominator
            )).to.be.revertedWith("CommunityCoin: INVALID_INSTANCE_TYPE");

        });

        describe("buy and stake", function() {
            var uniswapRouterFactoryInstance;
            var uniswapRouterInstance;

            var bobWalletTokensBefore, charlieWalletTokensBefore, charlieWalletTokensAfter, bobWalletTokensAfter;

            beforeEach("deploying", async() => {
                uniswapRouterFactoryInstance = await ethers.getContractAt("IUniswapV2Factory",UNISWAP_ROUTER_FACTORY_ADDRESS);
                uniswapRouterInstance = await ethers.getContractAt("IUniswapV2Router02", UNISWAP_ROUTER);

                await uniswapRouterFactoryInstance.createPair(erc20.address, erc20TradedToken.address);
            
                let pairAddress = await uniswapRouterFactoryInstance.getPair(erc20.address, erc20TradedToken.address);

                pairInstance = await ethers.getContractAt("ERC20Mintable",pairAddress);

                await erc20.mint(liquidityHolder.address, ONE_ETH.mul(SEVEN));
                await erc20TradedToken.mint(liquidityHolder.address, ONE_ETH.mul(SEVEN));
                await erc20.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(SEVEN));
                await erc20TradedToken.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(SEVEN));

                const ts = await time.latest();
                const timeUntil = parseInt(ts)+parseInt(lockupIntervalCount*dayInSeconds);

                await uniswapRouterInstance.connect(liquidityHolder).addLiquidity(
                    erc20.address,
                    erc20TradedToken.address,
                    ONE_ETH.mul(SEVEN),
                    ONE_ETH.mul(SEVEN),
                    0,
                    0,
                    liquidityHolder.address,
                    timeUntil
                );

                charlieWalletTokensBefore = await CommunityCoin.balanceOf(charlie.address);
                bobWalletTokensBefore = await CommunityCoin.balanceOf(bob.address);

                
                await erc20TradedToken.mint(bob.address, ONE_ETH.mul(ONE));
                await erc20TradedToken.connect(bob).approve(communityStakingPoolErc20.address, ONE_ETH.mul(ONE));
                
                await communityStakingPoolErc20.connect(bob).buyAndStake(erc20TradedToken.address, ONE_ETH.mul(ONE), charlie.address);

                charlieWalletTokensAfter = await CommunityCoin.balanceOf(charlie.address);
                bobWalletTokensAfter = await CommunityCoin.balanceOf(bob.address);
            })

            it("just stake", async () => {

                await erc20.mint(bob.address, ONE_ETH.mul(ONE));
                await erc20.connect(bob).approve(communityStakingPoolErc20.address, ONE_ETH.mul(ONE));

                let charlieWalletTokensBefore = await CommunityCoin.balanceOf(charlie.address);
                let bobLptokensBefore = await erc20.balanceOf(communityStakingPoolErc20.address);

                await communityStakingPoolErc20.connect(bob).stake(ONE_ETH.mul(ONE), charlie.address);

                let walletTokens = await CommunityCoin.balanceOf(charlie.address);
                let lptokens = await erc20.balanceOf(communityStakingPoolErc20.address);
                
                // custom situation when  uniswapLP tokens equal sharesLP tokens.  can be happens in the first stake
                expect(BigNumber.from(lptokens)).not.to.be.eq(ZERO);
                expect(lptokens.mul(numerator).div(denominator)).to.be.eq(walletTokens);

                expect(charlieWalletTokensBefore).not.to.be.eq(walletTokens);
                expect(ZERO).not.to.be.eq(walletTokens);

                expect(bobLptokensBefore).not.to.be.eq(lptokens);
            
            }); 

            it("should buyAndStake", async () => {

                expect(charlieWalletTokensAfter).to.be.gt(charlieWalletTokensBefore);
                expect(charlieWalletTokensAfter).not.to.be.eq(ZERO);
            
            }); 

            it("shouldnt unstake if not unlocked yet", async () => {
                // even if approve before
                await CommunityCoin.connect(charlie).approve(CommunityCoin.address, charlieWalletTokensAfter);
                 
                await expect(CommunityCoin.connect(charlie).unstake(charlieWalletTokensAfter)).to.be.revertedWith(`StakeNotUnlockedYet("${charlie.address}", ${charlieWalletTokensAfter}, 0)`);
            });  

            it("shouldnt redeem if sender haven't redeem role", async () => {
                
                // even if approve before
                
                await CommunityCoin.connect(charlie).approve(CommunityCoin.address, charlieWalletTokensAfter);
                let revertMsg = [
                                            "AccessControl: account ",
                                            (charlie.address).toLowerCase(),
                                            " is missing role ",
                                            "0x"+padZeros(convertToHex(REDEEM_ROLE),64)
                                        ].join("");
                await expect(CommunityCoin.connect(charlie)['redeem(uint256)'](charlieWalletTokensAfter)).to.be.revertedWith(revertMsg);
                
            }); 

            it("should transfer wallet tokens after stake", async() => {
            
                let charlieLockedListAfter, charlieBonusesListAfter;

                let charlieLockedBalanceAfter = await CommunityCoin.connect(charlie).viewLockedWalletTokens(charlie.address);
                [charlieLockedListAfter, charlieBonusesListAfter] = await CommunityCoin.connect(charlie).viewLockedWalletTokensList(charlie.address);

                let aliceLockedBalanceAfter = await CommunityCoin.connect(charlie).viewLockedWalletTokens(alice.address);
                expect(aliceLockedBalanceAfter).to.be.eq(ZERO);
                expect(charlieLockedBalanceAfter).to.be.eq(charlieWalletTokensAfter);
                expect(charlieLockedBalanceAfter).to.be.eq(charlieLockedListAfter[0][0]);

                await CommunityCoin.connect(charlie).transfer(alice.address, charlieWalletTokensAfter);

                let charlieSharesAfterTransfer = await CommunityCoin.balanceOf(charlie.address);
                let aliceSharesAfterCharlieTransfer = await CommunityCoin.balanceOf(alice.address);
                let charlieLockedBalanceAfterCharlieTransfer = await CommunityCoin.connect(charlie).viewLockedWalletTokens(charlie.address);
                let aliceLockedBalanceAfterCharlieTransfer = await CommunityCoin.connect(charlie).viewLockedWalletTokens(alice.address);

                expect(charlieSharesAfterTransfer).to.be.eq(ZERO);
                expect(charlieWalletTokensAfter).to.be.eq(aliceSharesAfterCharlieTransfer);
                expect(charlieLockedBalanceAfterCharlieTransfer).to.be.eq(ZERO);
                expect(aliceLockedBalanceAfterCharlieTransfer).to.be.eq(ZERO);
                
                
            });

            it("should redeem", async () => {
                // pass some mtime
                await time.increase(lockupIntervalCount*dayInSeconds+9);    

                // grant role
                await CommunityCoin.connect(owner).grantRole(ethers.utils.formatBytes32String(REDEEM_ROLE), alice.address);

                // transfer from charlie to alice
                await CommunityCoin.connect(charlie).transfer(alice.address, charlieWalletTokensAfter);

                let aliceLPTokenBefore = await erc20.balanceOf(alice.address);

                await CommunityCoin.connect(alice).approve(CommunityCoin.address, charlieWalletTokensAfter);


                await CommunityCoin.connect(alice)['redeem(uint256)'](charlieWalletTokensAfter);
                let aliceLPTokenAfter = await erc20.balanceOf(alice.address);
                expect(aliceLPTokenAfter).gt(aliceLPTokenBefore);

            }); 


        })

    });

    for (const communityExternalMode of [false,true]) {
    describe(`Instance tests with-${communityExternalMode ? 'in': 'out'} external community`, function () {
        var uniswapRouterFactoryInstance;
        var uniswapRouterInstance;
        var communityStakingPool;
        var pairInstance;

        beforeEach("deploying", async() => {
            if (communityExternalMode) {
                CommunityCoin = CommunityCoinAndExternalCommunity;
            }
            

            uniswapRouterFactoryInstance = await ethers.getContractAt("IUniswapV2Factory",UNISWAP_ROUTER_FACTORY_ADDRESS);
            uniswapRouterInstance = await ethers.getContractAt("IUniswapV2Router02", UNISWAP_ROUTER);

            await uniswapRouterFactoryInstance.createPair(erc20ReservedToken.address, erc20TradedToken.address);
        
            let pairAddress = await uniswapRouterFactoryInstance.getPair(erc20ReservedToken.address, erc20TradedToken.address);

            pairInstance = await ethers.getContractAt("ERC20Mintable",pairAddress);

            await erc20ReservedToken.mint(liquidityHolder.address, ONE_ETH.mul(SEVEN));
            await erc20TradedToken.mint(liquidityHolder.address, ONE_ETH.mul(SEVEN));
            await erc20ReservedToken.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(SEVEN));
            await erc20TradedToken.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(SEVEN));

            const ts = await time.latest();
            const timeUntil = parseInt(ts)+parseInt(lockupIntervalCount*dayInSeconds);

            await uniswapRouterInstance.connect(liquidityHolder).addLiquidity(
                erc20ReservedToken.address,
                erc20TradedToken.address,
                ONE_ETH.mul(SEVEN),
                ONE_ETH.mul(SEVEN),
                0,
                0,
                liquidityHolder.address,
                timeUntil
            );

            // add liquidity into erc20ReservedToken::USDT and erc20TradedToken::USDT
            fakeUSDT = await ERC20Factory.deploy("FAKE USDT Token", "FUSDT");
            await fakeUSDT.mint(liquidityHolder.address, ONE_ETH.mul(HUNDRED).mul(TWO));
            await erc20ReservedToken.mint(liquidityHolder.address, ONE_ETH.mul(HUNDRED));
            await erc20TradedToken.mint(liquidityHolder.address, ONE_ETH.mul(HUNDRED));

            await fakeUSDT.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(HUNDRED));
            await erc20TradedToken.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(HUNDRED));
            await uniswapRouterInstance.connect(liquidityHolder).addLiquidity(
                fakeUSDT.address,
                erc20TradedToken.address,
                ONE_ETH.mul(HUNDRED),
                ONE_ETH.mul(HUNDRED),
                0,
                0,
                liquidityHolder.address,
                timeUntil
            );

            await fakeUSDT.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(HUNDRED));
            await erc20ReservedToken.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(HUNDRED));
            await uniswapRouterInstance.connect(liquidityHolder).addLiquidity(
                fakeUSDT.address,
                erc20ReservedToken.address,
                ONE_ETH.mul(HUNDRED),
                ONE_ETH.mul(HUNDRED),
                0,
                0,
                liquidityHolder.address,
                timeUntil
            );
            // add liquidity into erc20ReservedToken::middleToken, erc20TradedToken::middleToken and middleToken::USDT
            fakeMiddle = await ERC20Factory.deploy("FAKE Middle Token", "FMT");

            await fakeMiddle.mint(liquidityHolder.address, ONE_ETH.mul(HUNDRED).mul(TEN));
            await erc20ReservedToken.mint(liquidityHolder.address, ONE_ETH.mul(HUNDRED));
            await erc20TradedToken.mint(liquidityHolder.address, ONE_ETH.mul(HUNDRED));
            await fakeUSDT.mint(liquidityHolder.address, ONE_ETH.mul(HUNDRED));

            //erc20ReservedToken::middleToken
            await fakeMiddle.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(HUNDRED).mul(TWO));
            await erc20ReservedToken.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(HUNDRED));
            await uniswapRouterInstance.connect(liquidityHolder).addLiquidity(
                fakeMiddle.address,
                erc20ReservedToken.address,
                ONE_ETH.mul(HUNDRED).mul(TWO),
                ONE_ETH.mul(HUNDRED),
                0,
                0,
                liquidityHolder.address,
                timeUntil
            );

            //erc20TradedToken::middleToken
            await fakeMiddle.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(HUNDRED).mul(TWO));
            await erc20TradedToken.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(HUNDRED));
            await uniswapRouterInstance.connect(liquidityHolder).addLiquidity(
                fakeMiddle.address,
                erc20TradedToken.address,
                ONE_ETH.mul(HUNDRED).mul(TWO),
                ONE_ETH.mul(HUNDRED),
                0,
                0,
                liquidityHolder.address,
                timeUntil
            );

            // middleToken::USDT
            await fakeMiddle.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(HUNDRED).mul(SIX));
            await fakeUSDT.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(HUNDRED));
            await uniswapRouterInstance.connect(liquidityHolder).addLiquidity(
                fakeMiddle.address,
                fakeUSDT.address,
                ONE_ETH.mul(HUNDRED).mul(SIX),
                ONE_ETH.mul(HUNDRED),
                0,
                0,
                liquidityHolder.address,
                timeUntil
            );

            //--------------------------------------------------

            let tx = await CommunityCoin.connect(owner)["produce(uint64,uint64,(address,uint256)[],uint64,address,uint64,uint64)"](
                lockupIntervalCount,
                NO_BONUS_FRACTIONS,
                NO_DONATIONS,
                lpFraction,
                ZERO_ADDRESS,
                numerator,
                denominator
            )

            const rc = await tx.wait(); // 0ms, as tx is already confirmed
            const event = rc.events.find(event => event.event === 'InstanceCreated');
            const [tokenA, tokenB, instance] = event.args;
            //console.log(tokenA, tokenB, instance, instancesCount);

            communityStakingPool = await ethers.getContractAt("MockCommunityStakingPool",instance);
            //console.log("before each №2");

            
        });

        it("should add/remove tokens to circulation", async() => {
            let amount = ONE_ETH;
            let balanceBefore = await CommunityCoin.balanceOf(charlie.address);
            let revertMessage = [
                    "AccessControl: account ",
                    (charlie.address).toLowerCase(),
                    " is missing role ",
                    "0x"+padZeros(convertToHex(CIRCULATE_ROLE),64)
                ].join("");

            await expect(
                CommunityCoin.connect(charlie).addToCirculation(amount)
            ).to.be.revertedWith(revertMessage);

            await expect(
                CommunityCoin.connect(charlie).removeFromCirculation(amount)
            ).to.be.revertedWith(revertMessage);

            if (communityExternalMode) {
                // imitate exists role
                //await mockCommunity.connect(owner).setRoles(['AAA','BBB','CCC','DDD',CIRCULATE_ROLE]);
                await mockCommunity.connect(owner).setRoles(['AAA','BBB','CCC',CIRCULATE_ROLE,'DDD']);

            } else {
                await CommunityCoin.connect(owner).grantRole(ethers.utils.formatBytes32String(CIRCULATE_ROLE), charlie.address);
            }
            

            await CommunityCoin.connect(charlie).addToCirculation(amount);

            let balanceAfter = await CommunityCoin.balanceOf(charlie.address);

            expect(balanceAfter).not.to.be.eq(ZERO_ADDRESS);
            expect(balanceAfter).to.be.eq(amount);
            
            await CommunityCoin.connect(charlie).removeFromCirculation(amount);

            // let balanceAfter2 = await CommunityCoin.balanceOf(charlie.address);

            // expect(balanceBefore).to.be.eq(balanceAfter2);

        });

        it("should add tokens to circulation, transfer to some1 and remove from circulation", async() => {
            let amount = ONE_ETH;
            let balanceBefore = await CommunityCoin.balanceOf(charlie.address);

            if (communityExternalMode) {
                // imitate exists role
                //await mockCommunity.connect(owner).setRoles(['AAA','BBB','CCC','DDD',CIRCULATE_ROLE]);
                await mockCommunity.connect(owner).setRoles(['AAA','BBB','CCC',CIRCULATE_ROLE,'DDD']);

            } else {
                await CommunityCoin.connect(owner).grantRole(ethers.utils.formatBytes32String(CIRCULATE_ROLE), charlie.address);
            }
            // adding
            await CommunityCoin.connect(charlie).addToCirculation(amount);
            let balanceAfter = await CommunityCoin.balanceOf(charlie.address);
            expect(balanceAfter).not.to.be.eq(ZERO_ADDRESS);
            expect(balanceAfter).to.be.eq(amount);

            //transfers
                //to david
            await CommunityCoin.connect(charlie).transfer(david.address, amount);
                //back to charlie david
            await CommunityCoin.connect(david).transfer(charlie.address, amount);

            //removing
            await CommunityCoin.connect(charlie).removeFromCirculation(amount);

            // let balanceAfter2 = await CommunityCoin.balanceOf(charlie.address);

            // expect(balanceBefore).to.be.eq(balanceAfter2);

        });

        it("shouldnt create another pair with equal tokens", async() => {
            await expect(CommunityCoin["produce(uint64,uint64,(address,uint256)[],uint64,address,uint64,uint64)"](
                lockupIntervalCount,
                NO_BONUS_FRACTIONS,
                NO_DONATIONS,
                lpFraction,
                ZERO_ADDRESS,
                numerator,
                denominator
            )).to.be.revertedWith("CommunityCoin: PAIR_ALREADY_EXISTS");
        });

        it("shouldn't produce another instance type", async() => {
          await expect(CommunityCoin["produce(address,uint64,uint64,(address,uint256)[],uint64,address,uint64,uint64)"](
                erc20.address,
                lockupIntervalCount,
                NO_BONUS_FRACTIONS,
                NO_DONATIONS,
                lpFraction,
                ZERO_ADDRESS,
                numerator,
                denominator
            )).to.be.revertedWith("CommunityCoin: INVALID_INSTANCE_TYPE");
        });

        describe("TrustedForwarder", function () {
            it("should be empty after init", async() => {
                expect(await CommunityCoin.connect(bob).isTrustedForwarder(ZERO_ADDRESS)).to.be.true;
            });

            it("should be setup by owner", async() => {
                await expect(CommunityCoin.connect(bob).setTrustedForwarder(alice.address)).to.be.revertedWith("Ownable: caller is not the owner");
                expect(await CommunityCoin.connect(bob).isTrustedForwarder(ZERO_ADDRESS)).to.be.true;
                await CommunityCoin.connect(owner).setTrustedForwarder(alice.address);
                expect(await CommunityCoin.connect(bob).isTrustedForwarder(alice.address)).to.be.true;
            });
            
            it("should drop trusted forward if trusted forward become owner ", async() => {
                await CommunityCoin.connect(owner).setTrustedForwarder(alice.address);
                expect(await CommunityCoin.connect(bob).isTrustedForwarder(alice.address)).to.be.true;
                await CommunityCoin.connect(owner).transferOwnership(alice.address);
                expect(await CommunityCoin.connect(bob).isTrustedForwarder(ZERO_ADDRESS)).to.be.true;
            });

            it("shouldnt become owner and trusted forwarder", async() => {
                await expect(CommunityCoin.connect(owner).setTrustedForwarder(owner.address)).to.be.revertedWith(`TrustedForwarderCanNotBeOwner("${owner.address}")`);
            });
            
        });
        
        for (const trustedForwardMode of [false,true]) {
            context(`via ${trustedForwardMode ? 'trusted forwarder' : 'user'} call`, () => {
                
                beforeEach("deploying", async() => {
                   
                    if (trustedForwardMode) {
                        await CommunityCoin.connect(owner).setTrustedForwarder(trustedForwarder.address);
                    }
                });

                
                it("should stake liquidity", async() => {
                    let allLiquidityAmount = await pairInstance.balanceOf(liquidityHolder.address);
                    let halfLiquidityAmount = BigNumber.from(allLiquidityAmount).div(TWO);
                    await pairInstance.connect(liquidityHolder).transfer(alice.address, halfLiquidityAmount);
                    await pairInstance.connect(alice).approve(communityStakingPool.address, halfLiquidityAmount);
                    let lptokensBefore = await pairInstance.balanceOf(communityStakingPool.address);

                    if (trustedForwardMode) {
                        const dataTx = await communityStakingPool.connect(trustedForwarder).populateTransaction['stakeLiquidity(uint256)'](halfLiquidityAmount);
                        dataTx.data = dataTx.data.concat((alice.address).substring(2));
                        await trustedForwarder.sendTransaction(dataTx);
                    } else {
                        await communityStakingPool.connect(alice)['stakeLiquidity(uint256)'](halfLiquidityAmount);
                    }
                    let lptokens = await pairInstance.balanceOf(communityStakingPool.address);
                    expect(lptokens).not.to.be.eq(lptokensBefore);

                });

                it("should sellAndStakeLiquidity", async () => {
                    let uniswapV2PairInstance = await ethers.getContractAt("IUniswapV2PairMock",await communityStakingPool.uniswapV2Pair());
                    await erc20TradedToken.mint(bob.address, ONE_ETH.mul(TEN));
                    await erc20TradedToken.connect(bob).approve(communityStakingPool.address, ONE_ETH.mul(ONE));
                    let reservesBefore = await uniswapV2PairInstance.getReserves();
                    
                    if (trustedForwardMode) {
                        const dataTx = await communityStakingPool.connect(trustedForwarder).populateTransaction['sellAndStakeLiquidity(uint256)'](ONE_ETH.mul(ONE));
                        dataTx.data = dataTx.data.concat((bob.address).substring(2));
                        await trustedForwarder.sendTransaction(dataTx);
                    } else {
                        await communityStakingPool.connect(bob)['sellAndStakeLiquidity(uint256)'](ONE_ETH.mul(ONE));
                    }
                    let shares = await CommunityCoin.balanceOf(bob.address);
                    let reservesAfter = await uniswapV2PairInstance.getReserves();

                    let token0 = await uniswapV2PairInstance.token0();
                    if (erc20TradedToken.address == token0) {
                        expect(reservesAfter[0]).to.be.gt(reservesBefore[0]);
                        expect(reservesAfter[1]).to.be.eq(reservesBefore[1]);
                    } else {
                        expect(reservesAfter[0]).to.be.eq(reservesBefore[0]);
                        expect(reservesAfter[1]).to.be.gt(reservesBefore[1]);
                    }
                    
                    expect(shares).not.to.be.eq(ZERO);
                }); 

                it("should addAndStakeLiquidity", async () => {
                    let uniswapV2PairInstance = await ethers.getContractAt("IUniswapV2PairMock",await communityStakingPool.uniswapV2Pair());
                    await erc20TradedToken.mint(bob.address, ONE_ETH.mul(TEN));
                    await erc20TradedToken.connect(bob).approve(communityStakingPool.address, ONE_ETH.mul(ONE));
                    await erc20ReservedToken.mint(bob.address, ONE_ETH.mul(TEN));
                    await erc20ReservedToken.connect(bob).approve(communityStakingPool.address, ONE_ETH.mul(ONE));

                    let reservesBefore = await uniswapV2PairInstance.getReserves();
                    
                    if (trustedForwardMode) {
                        const dataTx = await communityStakingPool.connect(trustedForwarder).populateTransaction['addAndStakeLiquidity(uint256,uint256)'](ONE_ETH.mul(ONE), ONE_ETH.mul(ONE));
                        dataTx.data = dataTx.data.concat((bob.address).substring(2));
                        await trustedForwarder.sendTransaction(dataTx);
                    } else {
                        await expect( communityStakingPool.connect(bob).addAndStakeLiquidity(ZERO, ONE_ETH.mul(ONE)) ).to.be.revertedWith("AMOUNT_EMPTY");
                        await expect( communityStakingPool.connect(bob).addAndStakeLiquidity(ONE_ETH.mul(ONE),ZERO) ).to.be.revertedWith("AMOUNT_EMPTY");
                        await communityStakingPool.connect(bob).addAndStakeLiquidity(ONE_ETH.mul(ONE), ONE_ETH.mul(ONE));
                    }
                    
                    let shares = await CommunityCoin.balanceOf(bob.address);
                    let reservesAfter = await uniswapV2PairInstance.getReserves();
            
                    expect(reservesAfter[0]).to.be.gt(reservesBefore[0]);
                    expect(reservesAfter[1]).to.be.gt(reservesBefore[1]);
                    
                    
                    expect(shares).not.to.be.eq(ZERO);

                }); 

                describe("through erc20ReservedToken", function () {
                });
                
                describe("through erc20ReservedToken", function () {
                    if (!trustedForwardMode) {
                        it("beneficiary test", async () => {
                        
                            await erc20ReservedToken.mint(bob.address, ONE_ETH.mul(ONE));
                            await erc20ReservedToken.connect(bob).approve(communityStakingPool.address, ONE_ETH.mul(ONE));

                            let walletTokensBefore = await CommunityCoin.balanceOf(charlie.address);
                            let lptokensBefore = await pairInstance.balanceOf(communityStakingPool.address);
                            
                            await communityStakingPool.connect(bob)['buyAndStakeLiquidity(uint256,address)'](ONE_ETH.mul(ONE), charlie.address);

                            let walletTokens = await CommunityCoin.balanceOf(charlie.address);
                            let lptokens = await pairInstance.balanceOf(communityStakingPool.address);
                            
                            // custom situation when  uniswapLP tokens equal sharesLP tokens.  can be happens in the first stake
                            expect(BigNumber.from(lptokens)).not.to.be.eq(ZERO);
                            expect(lptokens.mul(numerator).div(denominator)).to.be.eq(walletTokens);;

                            expect(walletTokensBefore).not.to.be.eq(walletTokens);
                            expect(lptokens).not.to.be.eq(lptokensBefore);
                        
                        });
                    }
                    // it("TrustedForwarder test", async() => {
                    //     await CommunityCoin.connect(owner).setTrustedForwarder(alice.address);
                        
                    //     await erc20ReservedToken.mint(bob.address, ONE_ETH.mul(ONE));
                    //     await erc20ReservedToken.connect(bob).approve(communityStakingPool.address, ONE_ETH.mul(ONE));

                    //     let walletTokensBefore = await CommunityCoin.balanceOf(bob.address);
                    //     let lptokensBefore = await pairInstance.balanceOf(communityStakingPool.address);

                    //     //await communityStakingPool.connect(alice)['buyAndStakeLiquidity(uint256)'](ONE_ETH.mul(ONE));
                    //     // trick with set up msgsender for TrustedForwarder calls
                    //     const lqBuyTx = await communityStakingPool.connect(alice).populateTransaction['buyAndStakeLiquidity(uint256)'](ONE_ETH.mul(ONE));
                    //     lqBuyTx.data = lqBuyTx.data.concat((bob.address).substring(2));
                    //     await alice.sendTransaction(lqBuyTx);
                    //     //-----

                    //     let walletTokens = await CommunityCoin.balanceOf(bob.address);
                    //     let lptokens = await pairInstance.balanceOf(communityStakingPool.address);

                    //     // custom situation when  uniswapLP tokens equal sharesLP tokens.  can be happens in the first stake
                    //     expect(BigNumber.from(lptokens)).not.to.be.eq(ZERO);
                    //     expect(lptokens.mul(numerator).div(denominator)).to.be.eq(walletTokens);;

                    //     expect(walletTokensBefore).not.to.be.eq(walletTokens);
                    //     expect(lptokens).not.to.be.eq(lptokensBefore);
                    // }); 
                    describe("when uniswap reserves in pools are equal", function () {
                        var stakingBalanceToken1Before;
                        var stakingBalanceToken2Before;
                        var stakingBalanceToken1After;
                        var stakingBalanceToken2After;

                        var bobWalletTokensBefore;
                        var bobLptokensBefore;

                        beforeEach("deploying", async() => {
                            await erc20ReservedToken.mint(bob.address, ONE_ETH.mul(ONE));
                            await erc20ReservedToken.connect(bob).approve(communityStakingPool.address, ONE_ETH.mul(ONE));

                            bobWalletTokensBefore = await CommunityCoin.balanceOf(bob.address);
                            bobLptokensBefore = await pairInstance.balanceOf(communityStakingPool.address);

                            stakingBalanceToken1Before = await erc20ReservedToken.balanceOf(communityStakingPool.address);
                            stakingBalanceToken2Before = await erc20TradedToken.balanceOf(communityStakingPool.address);

                            if (trustedForwardMode) {
                                const dataTx = await communityStakingPool.connect(trustedForwarder).populateTransaction['buyAndStakeLiquidity(uint256)'](ONE_ETH.mul(ONE));
                                dataTx.data = dataTx.data.concat((bob.address).substring(2));
                                await trustedForwarder.sendTransaction(dataTx);
                            } else {
                                await communityStakingPool.connect(bob)['buyAndStakeLiquidity(uint256)'](ONE_ETH.mul(ONE));
                            }

                            stakingBalanceToken1After = await erc20ReservedToken.balanceOf(communityStakingPool.address);
                            stakingBalanceToken2After = await erc20TradedToken.balanceOf(communityStakingPool.address);
                        });

                        it("buyAddLiquidityAndStake", async () => {
                    
                            let walletTokens = await CommunityCoin.balanceOf(bob.address);
                            let lptokens = await pairInstance.balanceOf(communityStakingPool.address);
                            
                            // custom situation when  uniswapLP tokens equal sharesLP tokens.  can be happens in the first stake
                            expect(BigNumber.from(lptokens)).not.to.be.eq(ZERO);
                            expect(lptokens.mul(numerator).div(denominator)).to.be.eq(walletTokens);;

                            expect(bobWalletTokensBefore).not.to.be.eq(walletTokens);
                            expect(bobLptokensBefore).not.to.be.eq(lptokens);
                        
                        }); 

                        it("shouldnt unstake if not unlocked yet", async () => {
                        
                            let walletTokens = await CommunityCoin.balanceOf(bob.address);

                            expect(walletTokens).to.not.equal(ZERO);
                            
                            // even if approve before
                            if (trustedForwardMode) {
                                const dataTx = await CommunityCoin.connect(trustedForwarder).populateTransaction.approve(CommunityCoin.address, walletTokens);
                                dataTx.data = dataTx.data.concat((bob.address).substring(2));
                                await trustedForwarder.sendTransaction(dataTx);
                            } else {
                                await CommunityCoin.connect(bob).approve(CommunityCoin.address, walletTokens);
                            }

                            if (trustedForwardMode) {
                                const dataTx = await CommunityCoin.connect(trustedForwarder).populateTransaction.unstake(walletTokens);
                                dataTx.data = dataTx.data.concat((bob.address).substring(2));
                                await expect(trustedForwarder.sendTransaction(dataTx)).to.be.revertedWith(`StakeNotUnlockedYet("${bob.address}", ${walletTokens}, 0)`);
                            } else {
                                await expect(CommunityCoin.connect(bob).unstake(walletTokens)).to.be.revertedWith(`StakeNotUnlockedYet("${bob.address}", ${walletTokens}, 0)`);
                            }
                        });  

                        it("shouldnt redeem if not unlocked yet", async () => {
                            let dataTx;
                            let walletTokens = await CommunityCoin.balanceOf(bob.address);

                            expect(walletTokens).to.not.equal(ZERO);
                            
                            // even if approve before
                            if (trustedForwardMode) {
                                dataTx = await CommunityCoin.connect(trustedForwarder).populateTransaction.approve(CommunityCoin.address, walletTokens);
                                dataTx.data = dataTx.data.concat((bob.address).substring(2));
                                await trustedForwarder.sendTransaction(dataTx);
                            } else {
                                await CommunityCoin.connect(bob).approve(CommunityCoin.address, walletTokens);
                            }
                            
                            let revertMsg = [
                                        "AccessControl: account ",
                                        (bob.address).toLowerCase(),
                                        " is missing role ",
                                        "0x"+padZeros(convertToHex(REDEEM_ROLE),64)
                                    ].join("");

                            if (trustedForwardMode) {
                                dataTx = await CommunityCoin.connect(trustedForwarder).populateTransaction['redeem(uint256)'](walletTokens);
                                dataTx.data = dataTx.data.concat((bob.address).substring(2));
                                await expect(trustedForwarder.sendTransaction(dataTx)).to.be.revertedWith(revertMsg);
                            } else {
                                await expect(CommunityCoin.connect(bob)['redeem(uint256)'](walletTokens)).to.be.revertedWith(revertMsg);
                            }
                            
                        }); 


                        it("should transfer wallet tokens after stake", async() => {
                            
                            let bobSharesAfter = await CommunityCoin.balanceOf(bob.address);

                            let bobLockedBalanceAfter = await CommunityCoin.connect(bob).viewLockedWalletTokens(bob.address);
                            let aliceLockedBalanceAfter = await CommunityCoin.connect(bob).viewLockedWalletTokens(alice.address);
                            expect(aliceLockedBalanceAfter).to.be.eq(ZERO);
                            expect(bobLockedBalanceAfter).to.be.eq(bobSharesAfter);

                            if (trustedForwardMode) {
                                const dataTx = await CommunityCoin.connect(trustedForwarder).populateTransaction.transfer(alice.address, bobSharesAfter);
                                dataTx.data = dataTx.data.concat((bob.address).substring(2));
                                await trustedForwarder.sendTransaction(dataTx);
                            } else {
                                await CommunityCoin.connect(bob).transfer(alice.address, bobSharesAfter);
                            }
                            

                            let bobSharesAfterTransfer = await CommunityCoin.balanceOf(bob.address);
                            let aliceSharesAfterBobTransfer = await CommunityCoin.balanceOf(alice.address);
                            let bobLockedBalanceAfterBobTransfer = await CommunityCoin.connect(bob).viewLockedWalletTokens(bob.address);
                            let aliceLockedBalanceAfterBobTransfer = await CommunityCoin.connect(bob).viewLockedWalletTokens(alice.address);

                            expect(bobSharesAfterTransfer).to.be.eq(ZERO);
                            expect(bobSharesAfter).to.be.eq(aliceSharesAfterBobTransfer);
                            expect(bobLockedBalanceAfterBobTransfer).to.be.eq(ZERO);
                            expect(aliceLockedBalanceAfterBobTransfer).to.be.eq(ZERO);
                            
                            
                        });

                        it("should consume all traded tokens when buying liquidity", async () => {
                            
                            expect(
                                BigNumber.from(stakingBalanceToken2Before).lte(BigNumber.from(percentLimitLeftTokenB*ONE_ETH))
                            ).to.be.eq(true);

                            expect(
                                BigNumber.from(stakingBalanceToken2After).lte(BigNumber.from(percentLimitLeftTokenB*ONE_ETH))
                            ).to.be.eq(true);
                        });

                    });
                    describe("when uniswap reserves in pools are not equal", function () {
                        var stakingBalanceToken1Before;
                        var stakingBalanceToken2Before;
                        var stakingBalanceToken1After;
                        var stakingBalanceToken2After;
                        beforeEach("deploying", async() => {

                            await erc20ReservedToken.mint(liquidityHolder.address, ONE_ETH.mul(TEN).mul(THOUSAND));
                            await erc20TradedToken.mint(liquidityHolder.address, ONE_ETH.mul(FOUR).mul(TEN).mul(THOUSAND));
                            await erc20ReservedToken.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(TEN).mul(THOUSAND));
                            await erc20TradedToken.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(FOUR).mul(TEN).mul(THOUSAND));

                            const ts = await time.latest();
                            const timeUntil = parseInt(ts)+parseInt(lockupIntervalCount*dayInSeconds);

                            await uniswapRouterInstance.connect(liquidityHolder).addLiquidity(
                                erc20ReservedToken.address,
                                erc20TradedToken.address,
                                ONE_ETH.mul(TEN).mul(THOUSAND),             // 10000
                                ONE_ETH.mul(FOUR).mul(TEN).mul(THOUSAND),   // 40000
                                0,
                                0,
                                liquidityHolder.address,
                                timeUntil
                            );

                            await erc20ReservedToken.mint(bob.address, ONE_ETH.mul(ONE));
                            await erc20ReservedToken.connect(bob).approve(communityStakingPool.address, ONE_ETH.mul(ONE));

                            // 50000
                            await erc20ReservedToken.mint(bob.address, ONE_ETH.mul(FOUR).mul(TEN).mul(THOUSAND));
                            await erc20ReservedToken.connect(bob).approve(communityStakingPool.address, ONE_ETH.mul(FOUR).mul(TEN).mul(THOUSAND));

                            stakingBalanceToken1Before = await erc20ReservedToken.balanceOf(communityStakingPool.address);
                            stakingBalanceToken2Before = await erc20TradedToken.balanceOf(communityStakingPool.address);

                            if (trustedForwardMode) {
                                const dataTx = await communityStakingPool.connect(trustedForwarder).populateTransaction['buyAndStakeLiquidity(uint256)'](ONE_ETH.mul(ONE));
                                dataTx.data = dataTx.data.concat((bob.address).substring(2));
                                await trustedForwarder.sendTransaction(dataTx);
                            } else {
                                await communityStakingPool.connect(bob)['buyAndStakeLiquidity(uint256)'](ONE_ETH.mul(ONE));
                            }

                            stakingBalanceToken1After = await erc20ReservedToken.balanceOf(communityStakingPool.address);
                            stakingBalanceToken2After = await erc20TradedToken.balanceOf(communityStakingPool.address);
                        });

                        it("should consume all traded tokens when buying liquidity", async () => {
                            expect(
                                BigNumber.from(stakingBalanceToken2Before).lte(BigNumber.from(percentLimitLeftTokenB*ONE_ETH))
                            ).to.be.eq(true);

                            expect(
                                BigNumber.from(stakingBalanceToken2After).lte(BigNumber.from(percentLimitLeftTokenB*ONE_ETH))
                            ).to.be.eq(true);
                        });
                    });
                });

                describe("through paying token", function () {
                    beforeEach("deploying", async() => {
                        await erc20.mint(bob.address, ONE_ETH.mul(ONE));
                    
                        await erc20.connect(bob).approve(communityStakingPool.address, ONE_ETH.mul(ONE));

                        // create pair Token2 => Token3
                        await erc20ReservedToken.mint(liquidityHolder.address, ONE_ETH.mul(SEVEN));
                        await erc20.mint(liquidityHolder.address, ONE_ETH.mul(SEVEN));
                        await erc20ReservedToken.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(SEVEN));
                        await erc20.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(SEVEN));

                        const ts = await time.latest();
                        const timeUntil = parseInt(ts)+parseInt(lockupIntervalCount*dayInSeconds);

                        await uniswapRouterInstance.connect(liquidityHolder).addLiquidity(
                            erc20ReservedToken.address,
                            erc20.address,
                            ONE_ETH.mul(SEVEN),
                            ONE_ETH.mul(SEVEN),
                            0,
                            0,
                            liquidityHolder.address,
                            timeUntil
                        );
                    });

                    it("buyAddLiquidityAndStake", async () => {
                
                        // now addinig liquidity through paying token will be successful
                        if (trustedForwardMode) {
                            const dataTx = await communityStakingPool.connect(trustedForwarder).populateTransaction['buyAndStakeLiquidity(address,uint256)'](erc20.address, ONE_ETH.mul(ONE));
                            dataTx.data = dataTx.data.concat((bob.address).substring(2));
                            await trustedForwarder.sendTransaction(dataTx);
                        } else {
                            await communityStakingPool.connect(bob)['buyAndStakeLiquidity(address,uint256)'](erc20.address, ONE_ETH.mul(ONE));
                        }
                    
                        let walletTokens = await CommunityCoin.balanceOf(bob.address);
                        let lptokens = await pairInstance.balanceOf(communityStakingPool.address);
                            
                        // custom situation when  uniswapLP tokens equal sharesLP tokens.  can be happens in the first stake

                        expect(lptokens).not.to.be.eq(ZERO);
                        expect(lptokens.mul(numerator).div(denominator)).to.be.eq(walletTokens);;
                    
                    });    

                    it("buyAddLiquidityAndStake (beneficiary)", async () => {
                
                        let walletTokensBefore = await CommunityCoin.balanceOf(charlie.address);
                        let lptokensBefore = await pairInstance.balanceOf(communityStakingPool.address);

                        // now addinig liquidity through paying token will be successful
                        if (trustedForwardMode) {
                            const dataTx = await communityStakingPool.connect(trustedForwarder).populateTransaction['buyAndStakeLiquidity(address,uint256,address)'](erc20.address, ONE_ETH.mul(ONE), charlie.address);
                            dataTx.data = dataTx.data.concat((bob.address).substring(2));
                            await trustedForwarder.sendTransaction(dataTx);
                        } else {
                            await communityStakingPool.connect(bob)['buyAndStakeLiquidity(address,uint256,address)'](erc20.address, ONE_ETH.mul(ONE), charlie.address);
                        }
                    
                        let walletTokens = await CommunityCoin.balanceOf(charlie.address);
                        let lptokens = await pairInstance.balanceOf(communityStakingPool.address);
                            
                        // custom situation when  uniswapLP tokens equal sharesLP tokens.  can be happens in the first stake

                        expect(lptokens).not.to.be.eq(ZERO);
                        expect(lptokens.mul(numerator).div(denominator)).to.be.eq(walletTokens);;

                        expect(walletTokensBefore).not.to.be.eq(walletTokens);
                        expect(lptokensBefore).not.to.be.eq(lptokens);
                    
                    });    
                });

                describe("through ETH", function () {
                    beforeEach("deploying", async() => {
                        // create pair Token2 => WETH
                        await erc20ReservedToken.mint(liquidityHolder.address, ONE_ETH.mul(SEVEN));
                        await erc20ReservedToken.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(SEVEN));

                        const ts = await time.latest();
                        const timeUntil = parseInt(ts)+parseInt(lockupIntervalCount*dayInSeconds);

                        await uniswapRouterInstance.connect(liquidityHolder).addLiquidityETH(
                            erc20ReservedToken.address,
                            ONE_ETH.mul(SEVEN),
                            0,
                            0,
                            liquidityHolder.address,
                            timeUntil,
                            {value: ONE_ETH.mul(SEVEN) }
                        );
                    
                    });
                    
                    it("buyAddLiquidityAndStake", async () => {
                        
                        await communityStakingPool.connect(bob)['buyAndStakeLiquidity()']({value: ONE_ETH.mul(ONE) });
                        if (trustedForwardMode) {
                            const dataTx = await communityStakingPool.connect(trustedForwarder).populateTransaction['buyAndStakeLiquidity()']({value: ONE_ETH.mul(ONE) });
                            dataTx.data = dataTx.data.concat((bob.address).substring(2));
                            await trustedForwarder.sendTransaction(dataTx);
                        } else {
                            await communityStakingPool.connect(bob)['buyAndStakeLiquidity()']({value: ONE_ETH.mul(ONE) });
                        }
    
                        let walletTokens = await CommunityCoin.balanceOf(bob.address);
                        let lptokens = await pairInstance.balanceOf(communityStakingPool.address);
                        
                        // custom situation when  uniswapLP tokens equal sharesLP tokens.  can be happens in the first stake
                        expect(lptokens).not.to.be.eq(ZERO);

                        //expect(lptokens.mul(numerator).div(denominator)).to.be.eq(walletTokens);
                        // float number
                        expect(
                            lptokens.mul(numerator).div(denominator).div(10).mul(10)
                        ).to.be.eq(
                            walletTokens.div(10).mul(10)
                        );
                        
                    });    

                    it("buyAddLiquidityAndStake (beneficiary)", async () => {
                        let walletTokensBefore = await CommunityCoin.balanceOf(charlie.address);
                        let lptokensBefore = await pairInstance.balanceOf(communityStakingPool.address);

                        if (trustedForwardMode) {
                            const dataTx = await communityStakingPool.connect(trustedForwarder).populateTransaction['buyAndStakeLiquidity(address)'](charlie.address, {value: ONE_ETH.mul(ONE) });
                            dataTx.data = dataTx.data.concat((bob.address).substring(2));
                            await trustedForwarder.sendTransaction(dataTx);
                        } else {
                            await communityStakingPool.connect(bob)['buyAndStakeLiquidity(address)'](charlie.address, {value: ONE_ETH.mul(ONE) });
                        }

                        
                        let walletTokens = await CommunityCoin.balanceOf(charlie.address);
                        let lptokens = await pairInstance.balanceOf(communityStakingPool.address);
                        
                        // custom situation when  uniswapLP tokens equal sharesLP tokens.  can be happens in the first stake
                        expect(lptokens).not.to.be.eq(ZERO);
                        expect(lptokens.mul(numerator).div(denominator)).to.be.eq(walletTokens);;
                        
                        expect(walletTokensBefore).not.to.be.eq(walletTokens);
                        expect(lptokensBefore).not.to.be.eq(lptokens);
                    });   
                });
            });
        } //end for

        describe("factory tests", function() {
            var instanceManagementInstance;
            beforeEach("before each callback", async() => {
                let instanceManagementAddr = await CommunityCoin.connect(bob).instanceManagment();
                instanceManagementInstance = await ethers.getContractAt("CommunityStakingPoolFactory",instanceManagementAddr);
                
            });
            it("should return instance info", async () => {
                
                let data = await instanceManagementInstance.connect(bob).getInstanceInfo(erc20ReservedToken.address, erc20TradedToken.address, lockupIntervalCount);
                
                expect(data.reserveToken).to.be.eq(erc20ReservedToken.address);
                expect(data.tradedToken).to.be.eq(erc20TradedToken.address);
                expect(data.duration).to.be.eq(lockupIntervalCount);
                
            }); 
            
            it("should return all instances info", async () => {
                
                let data = await instanceManagementInstance.connect(bob).getInstancesInfo();
                
                expect(data[0].reserveToken).to.be.eq(erc20ReservedToken.address);
                expect(data[0].tradedToken).to.be.eq(erc20TradedToken.address);
                expect(data[0].duration).to.be.eq(lockupIntervalCount);
                expect(data[0].bonusTokenFraction).to.be.eq(NO_BONUS_FRACTIONS);
                
            }); 
            

            it("should return correct instance length", async () => {
                let data = await instanceManagementInstance.connect(bob).instancesCount();
                expect(data).to.be.eq(ONE);
            }); 

            it("should return correct instance by index", async () => {
                let instance = await instanceManagementInstance.connect(bob).instancesByIndex(0);
                expect(instance).to.be.eq(communityStakingPool.address);
            }); 
        }); 
 
 
        describe("unstake/redeem/redeem-and-remove-liquidity tests", function () {
            var shares;
            beforeEach("before each callback", async() => {
                
                await erc20ReservedToken.mint(bob.address, ONE_ETH.mul(ONE));
                await erc20ReservedToken.connect(bob).approve(communityStakingPool.address, ONE_ETH.mul(ONE));
                await communityStakingPool.connect(bob)['buyAndStakeLiquidity(uint256)'](ONE_ETH.mul(ONE));
                shares = await CommunityCoin.balanceOf(bob.address);
            });

            it("should wallet tokens appear and not equal zero", async () => {
                expect(shares).to.not.equal(ZERO);
            });

            it("should burn tokens without descreasing any 'redeem' variables", async () => {

                var uniswapV2PairAddress;
                var uniswapV2PairInstance;

                uniswapV2PairAddress = await communityStakingPool.uniswapV2Pair();
                uniswapV2PairInstance = await ethers.getContractAt("ERC20Mintable",uniswapV2PairAddress);

                let bobLPTokenBefore = await uniswapV2PairInstance.balanceOf(bob.address);
                await CommunityCoin.connect(bob).burn(shares, []);
                let bobLPTokenAfter = await uniswapV2PairInstance.balanceOf(bob.address);

                expect(bobLPTokenAfter).equal(bobLPTokenBefore);
            });

            describe("unstake tests", function () {
                describe("shouldnt unstake", function () {
                    it("if not unlocked yet", async () => {
                        await expect(CommunityCoin.connect(bob)["unstake(uint256)"](shares)).to.be.revertedWith(`StakeNotUnlockedYet("${bob.address}", ${shares}, 0)`);
                    });
                    it("if amount more than balance", async () => {
                        // pass some mtime
                        await time.increase(lockupIntervalCount*dayInSeconds+9);    

                        await expect(CommunityCoin.connect(bob)["unstake(uint256)"](shares.add(ONE_ETH))).to.be.revertedWith(`InsufficientBalance("${bob.address}", ${shares.add(ONE_ETH)})`);
                    });
                    
                    it("if happens smth unexpected with pool", async () => {

                        await time.increase(lockupIntervalCount*dayInSeconds+9);    
                        
                        let bobReservedTokenBefore = await erc20ReservedToken.balanceOf(bob.address);
                        let bobTradedTokenBefore = await erc20TradedToken.balanceOf(bob.address);

                        await CommunityCoin.connect(bob).approve(CommunityCoin.address, shares);

                        // broke contract and emulate 'Error when unstake' response
                        await communityStakingPool.setUniswapPair(ZERO_ADDRESS);

                        await expect(CommunityCoin.connect(bob)["unstake(uint256)"](shares)).to.be.revertedWith("UNSTAKE_ERROR()");
        
                    }); 
                });
                describe("should unstake", function () {
                        var uniswapV2PairInstance;
                    beforeEach("before each callback", async() => {
                        let uniswapV2PairAddress = await communityStakingPool.uniswapV2Pair();
                        uniswapV2PairInstance = await ethers.getContractAt("ERC20Mintable",uniswapV2PairAddress);
                    });
                    it("successfull ", async () => {
                        // pass some mtime
                        await time.increase(lockupIntervalCount*dayInSeconds+9);    

                        let bobLPTokenBefore = await uniswapV2PairInstance.balanceOf(bob.address);
                        let bobReservedTokenBefore = await erc20ReservedToken.balanceOf(bob.address);
                        let bobTradedTokenBefore = await erc20TradedToken.balanceOf(bob.address);

                        await CommunityCoin.connect(bob).approve(CommunityCoin.address, shares);
                        await CommunityCoin.connect(bob)["unstake(uint256)"](shares);

                        let bobLPTokenAfter = await uniswapV2PairInstance.balanceOf(bob.address);
                        let bobReservedTokenAfter = await erc20ReservedToken.balanceOf(bob.address);
                        let bobTradedTokenAfter = await erc20TradedToken.balanceOf(bob.address);
                        
                        expect(bobLPTokenAfter).gt(bobLPTokenBefore);
                        expect(bobReservedTokenAfter).eq(bobReservedTokenBefore);
                        expect(bobTradedTokenAfter).eq(bobTradedTokenBefore);

                    });
                    it("successfull RRL", async () => {
                        // pass some mtime
                        await time.increase(lockupIntervalCount*dayInSeconds+9);    
                        
                        let bobLPTokenBefore = await uniswapV2PairInstance.balanceOf(bob.address);
                        let bobReservedTokenBefore = await erc20ReservedToken.balanceOf(bob.address);
                        let bobTradedTokenBefore = await erc20TradedToken.balanceOf(bob.address);

                        await CommunityCoin.connect(bob).approve(CommunityCoin.address, shares);
                        await CommunityCoin.connect(bob)["unstakeAndRemoveLiquidity(uint256)"](shares);

                        let bobLPTokenAfter = await uniswapV2PairInstance.balanceOf(bob.address);
                        let bobReservedTokenAfter = await erc20ReservedToken.balanceOf(bob.address);
                        let bobTradedTokenAfter = await erc20TradedToken.balanceOf(bob.address);

                        expect(bobLPTokenAfter).eq(bobLPTokenBefore);
                        expect(bobReservedTokenAfter).gt(bobReservedTokenBefore);
                        expect(bobTradedTokenAfter).gt(bobTradedTokenBefore);
                    });
                });
            });

            //                      redeem , redeemAndRemoveLiquidity                                    
            for (const forkAction of [true, false]) {

                context(`${forkAction ? 'redeem' : 'redeem and remove liquidity(RRL)'} reserve token`, () => {
                    describe(`shouldnt ${forkAction ? 'redeem' : 'RRL' }`, function () {

                        it("if happens smth unexpected with pool", async () => {

                            // pass some mtime
                            await time.increase(lockupIntervalCount*dayInSeconds+9);   
                            if (communityExternalMode) {
                                // imitate exists role
                                await mockCommunity.connect(owner).setRoles(['AAA','BBB','CCC','DDD',REDEEM_ROLE]);
                            } else {
                                // grant role
                                await CommunityCoin.connect(owner).grantRole(ethers.utils.formatBytes32String(REDEEM_ROLE), alice.address);
                            }
                            // transfer from bob to alice
                            await CommunityCoin.connect(bob).transfer(alice.address, shares);
                            
                            await CommunityCoin.connect(alice).approve(CommunityCoin.address, shares);

                            // broke contract and emulate 'Error when redeem in an instance' response
                            await communityStakingPool.setUniswapPair(ZERO_ADDRESS);

                            await expect(CommunityCoin.connect(alice)[`${forkAction ? 'redeem(uint256)' : 'redeemAndRemoveLiquidity(uint256)'}`](shares)).to.be.revertedWith("REDEEM_ERROR()");


                        }); 

                        describe("without redeem role", function () {
                            it("if anyone didn't transfer tokens to you before", async () => {
                                await expect(CommunityCoin.connect(bob)[`${forkAction ? 'redeem(uint256)' : 'redeemAndRemoveLiquidity(uint256)'}`](shares)).to.be.revertedWith(
                                    [
                                        "AccessControl: account ",
                                        (bob.address).toLowerCase(),
                                        " is missing role ",
                                        "0x"+padZeros(convertToHex(REDEEM_ROLE),64)
                                    ].join("")
                                );
                            });
                            describe("after someone transfer", function () {  
                                beforeEach("before each callback", async() => {
                                    await CommunityCoin.connect(bob).transfer(alice.address, shares);
                                });  
                                
                                it("without approve before", async () => {
                                    await expect(CommunityCoin.connect(alice)[`${forkAction ? 'redeem(uint256)' : 'redeemAndRemoveLiquidity(uint256)'}`](shares)).to.be.revertedWith(
                                        [
                                            "AccessControl: account ",
                                            (alice.address).toLowerCase(),
                                            " is missing role ",
                                            "0x"+padZeros(convertToHex(REDEEM_ROLE),64)
                                        ].join("")
                                    );
                                });
                                it("without approve before even if passed time", async () => {
                                    // pass some mtime
                                    await time.increase(lockupIntervalCount*dayInSeconds+9);    
                                    await expect(CommunityCoin.connect(alice)[`${forkAction ? 'redeem(uint256)' : 'redeemAndRemoveLiquidity(uint256)'}`](shares)).to.be.revertedWith(
                                        [
                                            "AccessControl: account ",
                                            (alice.address).toLowerCase(),
                                            " is missing role ",
                                            "0x"+padZeros(convertToHex(REDEEM_ROLE),64)
                                        ].join("")
                                    );
                                });
                                
                                it("with approve before", async () => {
                                    await CommunityCoin.connect(alice).approve(CommunityCoin.address, shares);
                                    await expect(CommunityCoin.connect(alice)[`${forkAction ? 'redeem(uint256)' : 'redeemAndRemoveLiquidity(uint256)'}`](shares)).to.be.revertedWith(
                                        [
                                            "AccessControl: account ",
                                            (alice.address).toLowerCase(),
                                            " is missing role ",
                                            "0x"+padZeros(convertToHex(REDEEM_ROLE),64)
                                        ].join("")
                                    );
                                });
                                it("with approve before even if passed time", async () => {
                                    await CommunityCoin.connect(alice).approve(CommunityCoin.address, shares);
                                    // pass some mtime
                                    await time.increase(lockupIntervalCount*dayInSeconds+9);    

                                    await expect(CommunityCoin.connect(alice)[`${forkAction ? 'redeem(uint256)' : 'redeemAndRemoveLiquidity(uint256)'}`](shares)).to.be.revertedWith(
                                        [
                                            "AccessControl: account ",
                                            (alice.address).toLowerCase(),
                                            " is missing role ",
                                            "0x"+padZeros(convertToHex(REDEEM_ROLE),64)
                                        ].join("")
                                    );

                                });
                            
                            });     
                        
                        });

                        describe("with redeem role", function () {
                            beforeEach("before each callback", async() => {
                                if (communityExternalMode) {
                                    // imitate exists role
                                    await mockCommunity.connect(owner).setRoles(['AAA','BBB','CCC','DDD',REDEEM_ROLE]);
                                } else {
                                    // grant role to bob
                                    await CommunityCoin.connect(owner).grantRole(ethers.utils.formatBytes32String(REDEEM_ROLE), bob.address);
                                }
                            });

                            it("if anyone didn't transfer tokens to you before", async () => {
                                await expect(CommunityCoin.connect(bob)[`${forkAction ? 'redeem(uint256)' : 'redeemAndRemoveLiquidity(uint256)'}`](shares)).to.be.revertedWith(`AmountExceedsAllowance("${bob.address}", ${shares})`);
                            });
        
                            it("but without transfer to some one", async () => {
                                // means that bob have tokens(after stake), he have redeem role, but totalRedeemable are zero
                                // here it raise a erc777 
                                
                                //!!await CommunityCoin.connect(owner).grantRole(ethers.utils.formatBytes32String(REDEEM_ROLE), bob.address);
                                await CommunityCoin.connect(bob).approve(CommunityCoin.address, shares);

                                await expect(CommunityCoin.connect(bob)[`${forkAction ? 'redeem(uint256)' : 'redeemAndRemoveLiquidity(uint256)'}`](shares)).to.be.revertedWith(`InsufficientBalance("${bob.address}", ${shares})`);
                            });
                            
                            describe("after someone transfer", function () {  
                                beforeEach("before each callback", async() => {
                                    await CommunityCoin.connect(bob).transfer(alice.address, shares);
                                    if (communityExternalMode) {
                                        // imitate exists role
                                        await mockCommunity.connect(owner).setRoles(['AAA','BBB','CCC','DDD',REDEEM_ROLE]);
                                    } else {
                                        // grant role to alice
                                        await CommunityCoin.connect(owner).grantRole(ethers.utils.formatBytes32String(REDEEM_ROLE), alice.address);
                                    }
                                });  
                                
                                it("without approve before", async () => {
                                    await expect(CommunityCoin.connect(alice)[`${forkAction ? 'redeem(uint256)' : 'redeemAndRemoveLiquidity(uint256)'}`](shares)).to.be.revertedWith(`AmountExceedsAllowance("${alice.address}", ${shares})`);
                                });
                                it("without approve before even if passed time", async () => {
                                    // pass some mtime
                                    await time.increase(lockupIntervalCount*dayInSeconds+9);    
                                    await expect(CommunityCoin.connect(alice)[`${forkAction ? 'redeem(uint256)' : 'redeemAndRemoveLiquidity(uint256)'}`](shares)).to.be.revertedWith(`AmountExceedsAllowance("${alice.address}", ${shares})`);
                                });
                                
                            });      

                        });

                    });
                    describe("should redeem", function () {
                        var uniswapV2PairAddress;
                        var uniswapV2PairInstance;
                        var aliceLPTokenBefore;
                        var aliceReservedTokenBefore;
                        var aliceTradedTokenBefore;
                        var aliceLPTokenAfter;
                        
                        beforeEach("before each callback", async() => {
                            // pass some mtime
                            await time.increase(lockupIntervalCount*dayInSeconds+9);    
                            if (communityExternalMode) {
                                // imitate exists role

                                await mockCommunity.connect(owner).setRoles(['AAA','BBB','CCC','DDD',REDEEM_ROLE]);
                            } else {
                                // grant role
                                await CommunityCoin.connect(owner).grantRole(ethers.utils.formatBytes32String(REDEEM_ROLE), alice.address);
                            }

                            // transfer from bob to alice
                            await CommunityCoin.connect(bob).transfer(alice.address, shares);
                            //await CommunityCoin.connect(owner).grantRole(ethers.utils.formatBytes32String(REDEEM_ROLE), alice.address);

                            //after that, when alice has obtain tokens she can redeem 
                            uniswapV2PairAddress = await communityStakingPool.uniswapV2Pair();
                            uniswapV2PairInstance = await ethers.getContractAt("ERC20Mintable",uniswapV2PairAddress);

                            aliceLPTokenBefore = await uniswapV2PairInstance.balanceOf(alice.address);

                            aliceReservedTokenBefore = await erc20ReservedToken.balanceOf(alice.address);
                            aliceTradedTokenBefore = await erc20TradedToken.balanceOf(alice.address);
                        });

                        for (const preferredInstance of [false, true]) {
                        for (const swapThroughMiddle of [false, true]) {

                            it(""+`via ${forkAction ? 'redeem' : 'redeemAndRemoveLiquidity'} method`+` ${preferredInstance ? 'with preferred instances' : ''}` + ` ${swapThroughMiddle ? 'and swap through middle token' : ''}`, async () => {
                                var amountAfterSwapLP, tokenAfterSwap, aliceFakeUSDTToken;
                                await CommunityCoin.connect(alice).approve(CommunityCoin.address, shares);
                                if (preferredInstance) {
                                    let instanceManagementAddr = await CommunityCoin.connect(bob).instanceManagment();
                                    instanceManagementInstance = await ethers.getContractAt("CommunityStakingPoolFactory",instanceManagementAddr);
                                    let pList = await instanceManagementInstance.instances();

                                    if (!forkAction && preferredInstance) {

                                        if (swapThroughMiddle) {

                                            //Gettting how much tokens USDT user will obtain if swap all lp to usdt through middle token
                                            tmp = await CommunityCoin.connect(alice).simulateRedeemAndRemoveLiquidity(
                                                alice.address, 
                                                shares, 
                                                pList, 
                                                [
                                                    //[fakeMiddle.address, instanceManagementAddr],
                                                    [fakeMiddle.address, fakeUSDT.address]
                                                    
                                                ]
                                            );
                                        } else {
                                            //Gettting how much tokens USDT user will obtain if swap all lp to usdt
                                             tmp = await CommunityCoin.connect(alice).simulateRedeemAndRemoveLiquidity(
                                                alice.address, 
                                                shares, 
                                                pList, 
                                                [
                                                    [fakeUSDT.address]
                                                ]
                                            );
                                            
                                        }
                                        tokenAfterSwap = tmp[0];
                                        amountAfterSwapLP = tmp[1];
                                        
                                    }

                                    await CommunityCoin.connect(alice)[`${forkAction ? 'redeem(uint256,address[])' : 'redeemAndRemoveLiquidity(uint256,address[])'}`](shares, pList);

                                } else {

                                    await CommunityCoin.connect(alice)[`${forkAction ? 'redeem(uint256)' : 'redeemAndRemoveLiquidity(uint256)'}`](shares);

                                }
                                aliceLPTokenAfter = await uniswapV2PairInstance.balanceOf(alice.address);
                                aliceReservedTokenAfter = await erc20ReservedToken.balanceOf(alice.address);
                                aliceTradedTokenAfter = await erc20TradedToken.balanceOf(alice.address);

                                if (!forkAction && preferredInstance) {
                                    // now swap reserve and traded tokens to usdt
                                    const ts = await time.latest();
                                    const timeUntil = parseInt(ts)+parseInt(lockupIntervalCount*dayInSeconds);

                                    // erc20TradedToken->erc20ReservedToken
                                    await erc20TradedToken.connect(alice).approve(uniswapRouterInstance.address, aliceTradedTokenAfter.sub(aliceTradedTokenBefore));
                                    tmp2 = await uniswapRouterInstance.connect(alice).swapExactTokensForTokens(
                                        aliceTradedTokenAfter.sub(aliceTradedTokenBefore), 0, [erc20TradedToken.address, erc20ReservedToken.address], alice.address, timeUntil
                                    );

                                    aliceReservedTokenAfter = await erc20ReservedToken.balanceOf(alice.address);

                                    if (swapThroughMiddle) {
                                        
                                        let aliceMiddleTokenBefore = await fakeMiddle.balanceOf(alice.address);

                                        // total erc20ReservedToken->middle->usdt
                                        await erc20ReservedToken.connect(alice).approve(uniswapRouterInstance.address, aliceReservedTokenAfter.sub(aliceReservedTokenBefore));
                                        await uniswapRouterInstance.connect(alice).swapExactTokensForTokens(
                                            aliceReservedTokenAfter.sub(aliceReservedTokenBefore), 0, [erc20ReservedToken.address, fakeMiddle.address], alice.address, timeUntil
                                        );
                                        let aliceMiddleTokenAfter = await fakeMiddle.balanceOf(alice.address);

                                        await fakeMiddle.connect(alice).approve(uniswapRouterInstance.address, aliceMiddleTokenAfter.sub(aliceMiddleTokenBefore));
                                        await uniswapRouterInstance.connect(alice).swapExactTokensForTokens(
                                            aliceMiddleTokenAfter.sub(aliceMiddleTokenBefore), 0, [fakeMiddle.address, fakeUSDT.address], alice.address, timeUntil
                                        );

                                    } else {

                                        await erc20ReservedToken.connect(alice).approve(uniswapRouterInstance.address, aliceReservedTokenAfter.sub(aliceReservedTokenBefore));
                                        await uniswapRouterInstance.connect(alice).swapExactTokensForTokens(
                                            aliceReservedTokenAfter.sub(aliceReservedTokenBefore), 0, [erc20ReservedToken.address, fakeUSDT.address], alice.address, timeUntil
                                        );
                                        
                                    }

                                    aliceFakeUSDTToken = await fakeUSDT.balanceOf(alice.address);

                                    // and compare with amountAfterSwapLP. it should be the same
                                    expect(amountAfterSwapLP).to.be.eq(aliceFakeUSDTToken);
                                    expect(amountAfterSwapLP).not.to.be.eq(ZERO);
                                    expect(aliceFakeUSDTToken).not.to.be.eq(ZERO);
                                    
                                }

                                if (forkAction) {
                                    expect(aliceLPTokenAfter).gt(aliceLPTokenBefore);
                                } else {
                                    
                                    expect(aliceReservedTokenAfter).gt(aliceReservedTokenBefore);
                                    expect(aliceTradedTokenAfter).gt(aliceTradedTokenBefore);
                                }
  
                            });
                        }
                        }

                        if (forkAction) {
                            it("via directly send to contract", async () => {
                                await CommunityCoin.connect(alice).transfer(CommunityCoin.address, shares);
                                aliceLPTokenAfter = await uniswapV2PairInstance.balanceOf(alice.address);
                                expect(aliceLPTokenAfter).gt(aliceLPTokenBefore);
                            });

                            describe("discountSensivityTests", function () {
                                var amountWithout, amountWith;
                                it("calculate amount obtain without circulation", async () => {
                                    await CommunityCoin.connect(alice).transfer(CommunityCoin.address, shares);
                                    amountWithout = await uniswapV2PairInstance.balanceOf(alice.address);
                                });

                                it("calculate amount obtain with circulation", async () => {
                                    if (communityExternalMode) {
                                        // imitate exists role
                                        //await mockCommunity.connect(owner).setRoles(['AAA','BBB','CCC','DDD',CIRCULATE_ROLE]);
                                        await mockCommunity.connect(owner).setRoles(['AAA','BBB','CCC',CIRCULATE_ROLE,REDEEM_ROLE]);

                                    } else {
                                        await CommunityCoin.connect(owner).grantRole(ethers.utils.formatBytes32String(CIRCULATE_ROLE), charlie.address);
                                    }
                                    await CommunityCoin.connect(charlie).addToCirculation(shares);
                                    await CommunityCoin.connect(alice).transfer(CommunityCoin.address, shares);
                                    amountWith = await uniswapV2PairInstance.balanceOf(alice.address);
                                });

                                it("check correct sensivity discount", async () => {
                                    // if total shares = X and admin will add to circulation on X more
                                    // then the user will obtain in a two times less

                                    //expect(amountWithout.div(amountWith)).to.be.eq(TWO); // it will be if sensitivityDiscount is zero
                                    expect(amountWithout.div(amountWith)).to.be.eq(FOUR);
                                });
                                
                            });
                        }
                        
                    
                    });
                });

            } // end for 
        
        });      
        
    });
    }
});