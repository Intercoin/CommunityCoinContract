const { expect } = require('chai');
const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
require("@nomicfoundation/hardhat-chai-matchers");

const ZERO = 0n;//BigNumber.from('0');
const ONE = 1n;//BigNumber.from('1');
const TWO = 2n;//BigNumber.from('2');
const THREE = 3n;//BigNumber.from('3');
const FOUR = 4n;//BigNumber.from('4');
const FIVE = 5n;//BigNumber.from('5');
const SIX = 6n;//BigNumber.from('6');
const SEVEN = 7n;//BigNumber.from('7');
const TEN = 10n;//BigNumber.from('10');
const HUNDRED = 100n;//BigNumber.from('100');
const THOUSAND = 1000n;//BigNumber.from('1000');


const ONE_ETH = ethers.parseEther('1');

//const TOTALSUPPLY = ethers.utils.parseEther('1000000000');    
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD';


// function convertToHex(str) {
//     var hex = '';
//     for(var i=0;i<str.length;i++) {
//         hex += ''+str.charCodeAt(i).toString(16);
//     }
//     return hex;
// }
// function padZeros(num, size) {
//     var s = num+"";
//     while (s.length < size) s =  s + "0";
//     return s;
// }

describe("Staking contract tests", function () {
    async function deploy() {
        const [
            owner, 
            alice, 
            bob, 
            charlie, 
            liquidityHolder, 
            trustedForwarder, 
            david, 
            frank
        ] = await ethers.getSigners();
        // predefined init params

        const FRACTION = 10000n;

        const lpFraction = ZERO;
        const numerator = 1n;
        const denominator = 1n;
        const dayInSeconds = 86400n; // * interval: DAY in seconds
        const lockupIntervalCount = 365n; // year in days(dayInSeconds)
        //const percentLimitLeftTokenB = 0.001;

        const discountSensitivity = 1n*FRACTION;
        const rewardsRateFraction = FRACTION;

        const rewardsTenPercentBonus = 10n;

        const walletTokenName = 'ITR community';
        const walletTokenSymbol = 'ITRc';
    
        const INVITEDBY_FRACTION = 0n;

        const REDEEM_ROLE       = 0x2;//'redeem';
        const CIRCULATE_ROLE    = 0x3;//'circulate';
        const TARIFF_ROLE       = 0x4;//'tariff';

        

        const NO_DONATIONS = [];

        const NO_BONUS_FRACTIONS = ZERO; // no bonus. means amount*NO_BONUS_FRACTIONS/FRACTION = X*0/10000 = 0
        const BONUS_FRACTIONS = 5000n; // 50%

        const PRICE_DENOM = 100_000_000n; // 1e8
        const NO_POPULAR_TOKEN = ZERO_ADDRESS;

        var implementationCommunityCoin;
        var implementationCommunityStakingPoolFactory;
        var implementationCommunityStakingPool;

        var rewardsHook;
        var mockCommunity;
        var ERC20Factory;
        var ERC777Factory;
        var CommunityCoinFactory;
        var CommunityCoin;
        var CommunityCoinWithRewardsHook;
        var erc20;
        var erc20Paying;
        var erc777;
        var erc20TradedToken;
        var erc20ReservedToken;
        var erc20Reward;
        var fakeUSDT;
        var fakeMiddle;

        var releaseManager;
        //var snapId;

        const ReleaseManagerFactoryF = await ethers.getContractFactory("MockReleaseManagerFactory");
        const ReleaseManagerF = await ethers.getContractFactory("MockReleaseManager");
        const CommunityCoinFactoryF = await ethers.getContractFactory("CommunityCoinFactory");

        const PoolStakesLibF = await ethers.getContractFactory("PoolStakesLib");
	    let poolStakesLib = await PoolStakesLibF.deploy();
        
        const CommunityCoinF = await ethers.getContractFactory("MockCommunityCoin", {
            libraries: {
                "contracts/libs/PoolStakesLib.sol:PoolStakesLib": poolStakesLib.target
            }
        });
        const CommunityStakingPoolF = await ethers.getContractFactory("MockCommunityStakingPool");
        const CommunityStakingPoolFactoryF = await ethers.getContractFactory("CommunityStakingPoolFactory");

        const RewardsF = await ethers.getContractFactory("Rewards");
        const MockCommunityF = await ethers.getContractFactory("MockCommunity");
        ERC20Factory = await ethers.getContractFactory("ERC20Mintable");
        ERC777Factory = await ethers.getContractFactory("ERC777Mintable");
        
        
        let implementationReleaseManager    = await ReleaseManagerF.deploy();

        let releaseManagerFactory   = await ReleaseManagerFactoryF.connect(owner).deploy(implementationReleaseManager.target);
        let tx,rc,event,instance,instancesCount;
        //
        tx = await releaseManagerFactory.connect(owner).produce();
        rc = await tx.wait(); // 0ms, as tx is already confirmed
        event = rc.logs.find(obj => obj.fragment.name === 'InstanceProduced');
        [instance, instancesCount] = event.args;
        releaseManager = await ethers.getContractAt("MockReleaseManager",instance);

        erc20 = await ERC20Factory.deploy("ERC20 Token", "ERC20");
        erc20Paying = await ERC20Factory.deploy("ERC20 Token Paying", "ERC20Paying");
        erc777 = await ERC777Factory.deploy("ERC777 Token", "ERC777");
        erc20TradedToken = await ERC20Factory.deploy("ERC20 Traded Token", "ERC20-TRD");
        erc20ReservedToken = await ERC20Factory.deploy("ERC20 Reserved Token", "ERC20-RSRV");
        erc20Reward = await ERC20Factory.deploy("ERC20 Token Reward", "ERC20-R");
        fakeUSDT = await ERC20Factory.deploy("FAKE USDT Token", "FUSDT");
        fakeMiddle = await ERC20Factory.deploy("FAKE Middle Token", "FMT");

        implementationCommunityCoin = await CommunityCoinF.deploy();
        implementationCommunityStakingPoolFactory = await CommunityStakingPoolFactoryF.deploy();
        implementationCommunityStakingPool = await CommunityStakingPoolF.deploy();

        rewardsHook = await RewardsF.deploy();

        const PRICE_REWARDS = PRICE_DENOM;
        const amoutnRaisedVal = ethers.parseEther('1000000000');//THOUSAND.mul(THOUSAND).mul(THOUSAND).mul(ONE_ETH);
        let timeLatest = await time.latest();

        await rewardsHook.connect(owner).initialize(
            erc20Reward.target,                    //address sellingToken,
            [timeLatest],                //uint256[] memory timestamps,
            [PRICE_REWARDS],                        // uint256[] memory _prices,
            [amoutnRaisedVal],                      // uint256[] memory _amountRaised,
            (timeLatest + timeLatest),  //make a huge ts //uint64 _endTs,
            [ethers.parseEther("0.00001")],   // uint256[] memory thresholds,
            [rewardsTenPercentBonus]   // 10%       // uint256[] memory bonuses
        )

        mockCommunity = await MockCommunityF.deploy();

        const COMMUNITY_SETTINGS = [
            INVITEDBY_FRACTION,
            mockCommunity.target, 
            REDEEM_ROLE, 
            CIRCULATE_ROLE,
            TARIFF_ROLE
        ];

        const NO_COSTMANAGER = ZERO_ADDRESS;
        
        var libData = await ethers.getContractFactory("@intercoin/liquidity/contracts/LiquidityLib.sol:LiquidityLib");    
        const liquidityLib = await libData.deploy();

        CommunityCoinFactory  = await CommunityCoinFactoryF.deploy(
            implementationCommunityCoin.target, 
            implementationCommunityStakingPoolFactory.target, 
            implementationCommunityStakingPool.target, 
            erc20.target, // as linkedContract
            liquidityLib.target,
            NO_COSTMANAGER,
            releaseManager.target
        );

        // 
        const factoriesList = [CommunityCoinFactory.target];
        const factoryInfo = [
            [
                1n,//uint8 factoryIndex; 
                1n,//uint16 releaseTag; 
                "0x53696c766572000000000000000000000000000000000000"//bytes24 factoryChangeNotes;
            ]
        ]
        
        await releaseManager.connect(owner).newRelease(factoriesList, factoryInfo);

        // without hook
        tx = await CommunityCoinFactory.connect(owner).produce(walletTokenName, walletTokenSymbol, [ZERO_ADDRESS], discountSensitivity, COMMUNITY_SETTINGS, owner.address, [erc20.target, erc20Paying.target, erc777.target]);
        rc = await tx.wait(); // 0ms, as tx is already confirmed
        event = rc.logs.find(obj => obj.fragment.name === 'InstanceCreated');
        [instance, instancesCount] = event.args;
        CommunityCoin = await ethers.getContractAt("MockCommunityCoin",instance);

        // with hook
        tx = await CommunityCoinFactory.connect(owner).produce(walletTokenName, walletTokenSymbol, [rewardsHook.target], discountSensitivity, COMMUNITY_SETTINGS, owner.address, [erc20.target, erc20Paying.target, erc777.target]);
        rc = await tx.wait(); // 0ms, as tx is already confirmed
        event = rc.logs.find(obj => obj.fragment.name === 'InstanceCreated');
        [instance, instancesCount] = event.args;
        CommunityCoinWithRewardsHook = await ethers.getContractAt("CommunityCoin",instance);

        const rewards = await RewardsF.deploy();
        await rewards.initialize(
            frank.address, //address sellingToken,
            [], //uint256[] memory timestamps,
            [], //uint256[] memory prices,
            [], //uint256[] memory _amountRaised,
            999999999, //uint64 _endTs,
            [], //uint256[] memory thresholds,
            [], //uint256[] memory bonuses
        );

        const MockTaxesF = await ethers.getContractFactory("MockTaxes");
        const taxHook = await MockTaxesF.deploy();

        const badPresale1F = await ethers.getContractFactory("MockPresaleBad1"); //empty contract
        const badPresale2F = await ethers.getContractFactory("MockPresaleBad2"); //with only none payable fallback method
        const badPresale3F = await ethers.getContractFactory("MockPresaleBad3"); //with only payable fallback method
        const badPresale4F = await ethers.getContractFactory("MockPresaleBad4"); //with payable fallback method and endTime
        const goodPresaleF = await ethers.getContractFactory("MockPresaleGood");
        const badPresale1 = await badPresale1F.deploy();
        const badPresale2 = await badPresale2F.deploy();
        const badPresale3 = await badPresale3F.deploy();
        const badPresale4 = await badPresale4F.deploy();
        const goodPresale = await goodPresaleF.deploy();

        return {
            owner, 
            alice, 
            bob, 
            charlie, 
            liquidityHolder, 
            trustedForwarder, 
            david, 
            frank,

            ///////////////////////////////
            lpFraction,
            numerator,
            denominator,
            dayInSeconds,
            lockupIntervalCount,
            //percentLimitLeftTokenB,// ?? = 0.001;
            discountSensitivity,
            rewardsRateFraction,
            rewardsTenPercentBonus,
            walletTokenName,
            walletTokenSymbol,

            INVITEDBY_FRACTION,
            REDEEM_ROLE,
            CIRCULATE_ROLE,
            TARIFF_ROLE,
            FRACTION,
            NO_DONATIONS,
            NO_BONUS_FRACTIONS,
            BONUS_FRACTIONS,
            PRICE_DENOM,
            NO_POPULAR_TOKEN,

            rewardsHook,
            rewards,
            mockCommunity,
            ERC20Factory,
            ERC777Factory,
            CommunityCoinFactory,
            CommunityCoin,
            CommunityCoinWithRewardsHook,
            taxHook,
            erc20,
            erc20Paying,
            erc777,
            erc20TradedToken,
            erc20ReservedToken,
            erc20Reward,
            fakeUSDT,
            fakeMiddle,

            badPresale1,
            badPresale2,
            badPresale3,
            badPresale4,
            goodPresale,

            releaseManager,
            implementationCommunityCoin,
            implementationCommunityStakingPoolFactory,
            implementationCommunityStakingPool
        }

    }

    async function deployStakingPoolWithRewardsHook() {
        const res = await loadFixture(deploy);
        const {
            owner,
            CommunityCoinWithRewardsHook,
            erc20,
            lockupIntervalCount,
            NO_BONUS_FRACTIONS,
            NO_POPULAR_TOKEN,
            NO_DONATIONS,
            rewardsRateFraction,
            numerator,
            denominator
        } = res;

        let tx = await CommunityCoinWithRewardsHook.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
            erc20.target,
            lockupIntervalCount,
            NO_BONUS_FRACTIONS,
            NO_POPULAR_TOKEN,
            NO_DONATIONS,
            rewardsRateFraction,
            numerator,
            denominator
        );


        const rc = await tx.wait(); // 0ms, as tx is already confirmed
        const event = rc.logs.find(obj => obj.fragment && obj.fragment.name === 'InstanceCreated');
        const [erc20token, instance] = event.args;
        
        const communityStakingPoolWithHook = await ethers.getContractAt("MockCommunityStakingPool",instance);

        return {
            ...res,
            ...{communityStakingPoolWithHook}
        }
    }

    async function deployStakingPoolWithoutRewardsHook() {
        const res = await loadFixture(deploy);
        const {
            owner,
            CommunityCoin,
            erc20,
            lockupIntervalCount,
            NO_BONUS_FRACTIONS,
            NO_POPULAR_TOKEN,
            NO_DONATIONS,
            rewardsRateFraction,
            numerator,
            denominator
        } = res;

        let tx = await CommunityCoin.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
            erc20.target,
            lockupIntervalCount,
            NO_BONUS_FRACTIONS,
            NO_POPULAR_TOKEN,
            NO_DONATIONS,
            rewardsRateFraction,
            numerator,
            denominator
        );
        
        const rc = await tx.wait(); // 0ms, as tx is already confirmed
        const event = rc.logs.find(obj => obj.fragment && obj.fragment.name === 'InstanceCreated');
        const [erc20token, instance] = event.args;
        
        const communityStakingPoolWithoutRewardsHook = await ethers.getContractAt("MockCommunityStakingPool",instance);
        
        return {
            ...res,
            ...{communityStakingPoolWithoutRewardsHook}
        }
    }

    async function deployWithUniswap() {
        const res = await loadFixture(deployStakingPoolWithoutRewardsHook);
        const {
            bob,
            charlie,
            lockupIntervalCount,
            dayInSeconds,
            liquidityHolder,
            communityStakingPoolWithoutRewardsHook,
            CommunityCoin,
            erc20Paying,
            erc20,
            erc20ReservedToken, 
            erc20TradedToken,
            fakeUSDT,
            fakeMiddle
        } = res;

        const UNISWAP_ROUTER_FACTORY_ADDRESS = await CommunityCoin.uniswapRouterFactory();
        const UNISWAP_ROUTER = await CommunityCoin.uniswapRouter();

        const uniswapRouterFactoryInstance = await ethers.getContractAt("IUniswapV2Factory",UNISWAP_ROUTER_FACTORY_ADDRESS);
        const uniswapRouterInstance = await ethers.getContractAt("IUniswapV2Router02", UNISWAP_ROUTER);

        await uniswapRouterFactoryInstance.createPair(erc20.target, erc20Paying.target);
        await uniswapRouterFactoryInstance.createPair(erc20ReservedToken.target, erc20TradedToken.target);

        
        var pairAddress = await uniswapRouterFactoryInstance.getPair(erc20.target, erc20Paying.target);
        const pair_erc20_erc20Paying = await ethers.getContractAt("ERC20Mintable",pairAddress);

        var pairAddress = await uniswapRouterFactoryInstance.getPair(erc20ReservedToken.target, erc20TradedToken.target);
        const pair_Reserved_Traded = await ethers.getContractAt("ERC20Mintable",pairAddress);

        const amount7 = ethers.parseEther('7');
        const amount1 = ethers.parseEther('1');
        const amount100 = ethers.parseEther('100');
        const amount200 = ethers.parseEther('200');
        const amount600 = ethers.parseEther('200');

        const ts = await time.latest();
        const timeUntil = BigInt(ts)+lockupIntervalCount*dayInSeconds;

        // add liquidity erc20:erc20Paying = 7:7
        await erc20.mint(liquidityHolder.address, amount7);
        await erc20Paying.mint(liquidityHolder.address, amount7);
        await erc20.connect(liquidityHolder).approve(uniswapRouterInstance.target, amount7);
        await erc20Paying.connect(liquidityHolder).approve(uniswapRouterInstance.target, amount7);
        await uniswapRouterInstance.connect(liquidityHolder).addLiquidity(
            erc20.target,
            erc20Paying.target,
            amount7,
            amount7,
            0,
            0,
            liquidityHolder.address,
            timeUntil
        );

        // add liquidity erc20ReservedToken:erc20TradedToken = 7:7
        await erc20ReservedToken.mint(liquidityHolder.address, amount7);
        await erc20TradedToken.mint(liquidityHolder.address, amount7);
        await erc20ReservedToken.connect(liquidityHolder).approve(uniswapRouterInstance.target, amount7);
        await erc20TradedToken.connect(liquidityHolder).approve(uniswapRouterInstance.target, amount7);
        await uniswapRouterInstance.connect(liquidityHolder).addLiquidity(
            erc20ReservedToken.target,
            erc20TradedToken.target,
            amount7,
            amount7,
            0,
            0,
            liquidityHolder.address,
            timeUntil
        );

        // add liquidity fakeUSDT:erc20TradedToken = 100:100
        await fakeUSDT.mint(liquidityHolder.address, amount100);
        await erc20ReservedToken.mint(liquidityHolder.address, amount100);
        await erc20TradedToken.mint(liquidityHolder.address, amount100);
        await fakeUSDT.connect(liquidityHolder).approve(uniswapRouterInstance.target, amount100);
        await erc20TradedToken.connect(liquidityHolder).approve(uniswapRouterInstance.target, amount100);
        await uniswapRouterInstance.connect(liquidityHolder).addLiquidity(
            fakeUSDT.target,
            erc20TradedToken.target,
            amount100,
            amount100,
            0,
            0,
            liquidityHolder.address,
            timeUntil
        );
        
        // add liquidity fakeUSDT:erc20ReservedToken = 100:100
        await fakeUSDT.mint(liquidityHolder.address, amount100);
        await fakeUSDT.connect(liquidityHolder).approve(uniswapRouterInstance.target, amount100);
        await erc20ReservedToken.connect(liquidityHolder).approve(uniswapRouterInstance.target, amount100);
        await uniswapRouterInstance.connect(liquidityHolder).addLiquidity(
            fakeUSDT.target,
            erc20ReservedToken.target,
            amount100,
            amount100,
            0,
            0,
            liquidityHolder.address,
            timeUntil
        );
        
        // add liquidity fakeMiddle:erc20ReservedToken = 200:100
        await fakeMiddle.mint(liquidityHolder.address, amount200);
        await erc20ReservedToken.mint(liquidityHolder.address, amount100);
        await fakeMiddle.connect(liquidityHolder).approve(uniswapRouterInstance.target, amount200);
        await erc20ReservedToken.connect(liquidityHolder).approve(uniswapRouterInstance.target, amount100);
        await uniswapRouterInstance.connect(liquidityHolder).addLiquidity(
            fakeMiddle.target,
            erc20ReservedToken.target,
            amount200,
            amount100,
            0,
            0,
            liquidityHolder.address,
            timeUntil
        );

        // add liquidity fakeMiddle:erc20TradedToken = 200:100
        await fakeMiddle.mint(liquidityHolder.address, amount200);
        await erc20TradedToken.mint(liquidityHolder.address, amount100);
        await fakeMiddle.connect(liquidityHolder).approve(uniswapRouterInstance.target, amount200);
        await erc20TradedToken.connect(liquidityHolder).approve(uniswapRouterInstance.target, amount100);
        await uniswapRouterInstance.connect(liquidityHolder).addLiquidity(
            fakeMiddle.target,
            erc20TradedToken.target,
            amount200,
            amount100,
            0,
            0,
            liquidityHolder.address,
            timeUntil
        );

        // add liquidity fakeMiddle:fakeUSDT = 600:100
        await fakeMiddle.mint(liquidityHolder.address, amount600);
        await fakeUSDT.mint(liquidityHolder.address, amount100);
        await fakeMiddle.connect(liquidityHolder).approve(uniswapRouterInstance.target, amount600);
        await fakeUSDT.connect(liquidityHolder).approve(uniswapRouterInstance.target, amount100);
        await uniswapRouterInstance.connect(liquidityHolder).addLiquidity(
            fakeMiddle.target,
            fakeUSDT.target,
            amount600,
            amount100,
            0,
            0,
            liquidityHolder.address,
            timeUntil
        );
        //--------------------------------------------------


        await erc20Paying.mint(bob.address, amount1);
        //////////////////////////////////////////////////////////////////

        const charlieWalletTokensBefore = await CommunityCoin.balanceOf(charlie.address);
        //const bobWalletTokensBefore = await CommunityCoin.balanceOf(bob.address);

        await erc20Paying.mint(bob.address, amount1);
        await erc20Paying.connect(bob).approve(communityStakingPoolWithoutRewardsHook.target, amount1);

        await communityStakingPoolWithoutRewardsHook.connect(bob).buyAndStake(erc20Paying.target, amount1, charlie.address);

        const charlieWalletTokensAfter = await CommunityCoin.balanceOf(charlie.address);
        
        return {
            ...res,
            ...{
                charlieWalletTokensBefore, 
                charlieWalletTokensAfter,
                pair_erc20_erc20Paying,
                pair_Reserved_Traded
            }
        };
    }

    async function deployTariffAndConsumingTests() {
        const res = await loadFixture(deployStakingPoolWithoutRewardsHook);
        const {
            bob,
            lockupIntervalCount,
            dayInSeconds,
            erc20,
            communityStakingPoolWithoutRewardsHook,
            CommunityCoin
        } = res;
        ///---------
        await erc20.mint(bob.address, ethers.parseEther('1'));
        await erc20.connect(bob).approve(communityStakingPoolWithoutRewardsHook.target, ethers.parseEther('1'));
        await communityStakingPoolWithoutRewardsHook.connect(bob).stake(ethers.parseEther('1'), bob.address);
        const shares = await CommunityCoin.balanceOf(bob.address);
        // pass some mtime
        await time.increase(lockupIntervalCount*dayInSeconds+9n);    
        ///---------
        return {...res, ...{
            shares
        }};
    }

    it("The new community coin owner is not the sender, but rather the one pointed to in the parameters as instanceOwner.", async() => {
        const res = await loadFixture(deploy);
        
        const {
            owner,
            alice,

            walletTokenName, 
            walletTokenSymbol, 
            discountSensitivity,
            lockupIntervalCount,
            NO_BONUS_FRACTIONS,
            NO_POPULAR_TOKEN,
            NO_DONATIONS,
            rewardsRateFraction,
            numerator,
            denominator,

            INVITEDBY_FRACTION,
            REDEEM_ROLE, 
            CIRCULATE_ROLE,
            TARIFF_ROLE,

            mockCommunity,
            CommunityCoinFactory,
            erc20

        } = res;
        

        let tx = await CommunityCoinFactory.connect(owner).produce(
            walletTokenName, 
            walletTokenSymbol, 
            [ZERO_ADDRESS], 
            discountSensitivity, 
            [
                INVITEDBY_FRACTION,
                mockCommunity.target, 
                REDEEM_ROLE, 
                CIRCULATE_ROLE,
                TARIFF_ROLE
            ], 
            alice.address,
            [erc20.target]
        );

        let rc = await tx.wait(); // 0ms, as tx is already confirmed
        let event = rc.logs.find(obj => obj.fragment.name === 'InstanceCreated');
        let instance;
        [instance, ] = event.args;
        var communityCoinContract = await ethers.getContractAt("MockCommunityCoin",instance);

        await expect(
            communityCoinContract.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
                erc20.target,
                lockupIntervalCount,
                NO_BONUS_FRACTIONS,
                NO_POPULAR_TOKEN,
                NO_DONATIONS,
                rewardsRateFraction,
                numerator,
                denominator
            )
        ).to.be.revertedWith("Ownable: caller is not the owner");

        await communityCoinContract.connect(alice)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
            erc20.target,
            lockupIntervalCount,
            NO_BONUS_FRACTIONS,
            NO_POPULAR_TOKEN,
            NO_DONATIONS,
            rewardsRateFraction,
            numerator,
            denominator
        )

    });

    it("staking factory", async() => {
        const res = await loadFixture(deploy);
        const {
            CommunityCoinFactory
        } = res;
        let count = await CommunityCoinFactory.instancesCount();
        await expect(count).to.be.equal(2n);
    })

    it("shouldnt produce if pool with token already exists", async() => {
        const res = await loadFixture(deploy);
        const {
            owner,

            lockupIntervalCount,
            NO_BONUS_FRACTIONS,
            NO_POPULAR_TOKEN,
            NO_DONATIONS,
            rewardsRateFraction,
            numerator,
            denominator,

            CommunityCoin,
            erc20
        } = res;

        await CommunityCoin.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
            erc20.target,
            lockupIntervalCount,
            NO_BONUS_FRACTIONS,
            NO_POPULAR_TOKEN,
            NO_DONATIONS,
            rewardsRateFraction,
            numerator,
            denominator
        );

        await expect(CommunityCoin.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
            erc20.target,
            lockupIntervalCount,
            NO_BONUS_FRACTIONS,
            NO_POPULAR_TOKEN,
            NO_DONATIONS,
            rewardsRateFraction,
            numerator,
            denominator
        )).to.be.revertedWith("CommunityCoin: PAIR_ALREADY_EXISTS");
        
    });

    it("should produce with default values", async() => {
        const res = await loadFixture(deploy);
        const {
            owner,
            erc20,
            lockupIntervalCount,
            NO_BONUS_FRACTIONS,
            NO_POPULAR_TOKEN,
            NO_DONATIONS,
            CommunityCoin,
            rewardsRateFraction,
            numerator,
            denominator
        } = res;

        let tx = await CommunityCoin.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
            erc20.target,
            lockupIntervalCount,
            NO_BONUS_FRACTIONS,
            NO_POPULAR_TOKEN,
            NO_DONATIONS,
            rewardsRateFraction,
            numerator,
            denominator
        );
        //console.log(tx);
        const rc = await tx.wait(); // 0ms, as tx is already confirmed
        

        const event = rc.logs.find(obj => obj.fragment && obj.fragment.name === 'InstanceCreated');
        const [/*erc20token*/, instance] = event.args;

        expect(instance).not.to.be.eq(ZERO_ADDRESS); 
    });

    it("should change inviteByFraction ", async() => {
        const res = await loadFixture(deploy);
        const {
            owner,
            alice,
            FRACTION,
            INVITEDBY_FRACTION,
            CommunityCoin
        } = res;
        const oldInvitedByFraction = await CommunityCoin.invitedByFraction();
        const toSetInvitedByFraction = FRACTION - 123n;
        await expect(CommunityCoin.connect(alice).setCommission(toSetInvitedByFraction)).to.be.revertedWith("Ownable: caller is not the owner");
        await CommunityCoin.connect(owner).setCommission(toSetInvitedByFraction);
        const newInvitedByFraction = await CommunityCoin.invitedByFraction();

        expect(oldInvitedByFraction).to.be.eq(INVITEDBY_FRACTION);
        expect(newInvitedByFraction).to.be.eq(toSetInvitedByFraction);
    });

    it("donate tests: (donations:50% and 25%. left for sender)", async () => {
        const res = await loadFixture(deploy);
        const {
            owner,
            bob,
            david,
            frank,
            FRACTION,
            lockupIntervalCount,
            NO_BONUS_FRACTIONS,
            NO_POPULAR_TOKEN,
            rewardsRateFraction,
            numerator,
            denominator,

            erc20,
            CommunityCoin
        } = res;
        

    
        const DONATIONS = [[david.address, FRACTION*50n/100n], [frank.address, FRACTION*25n/100n]];

        let tx = await CommunityCoin.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
            erc20.target,
            lockupIntervalCount,
            NO_BONUS_FRACTIONS,
            NO_POPULAR_TOKEN,
            DONATIONS,
            rewardsRateFraction,
            numerator,
            denominator
        );
        

        const rc = await tx.wait(); // 0ms, as tx is already confirmed
        const event = rc.logs.find(obj => obj.fragment && obj.fragment.name === 'InstanceCreated');
        const [erc20token, instance] = event.args;
        
        const communityStakingPool = await ethers.getContractAt("MockCommunityStakingPool",instance);

        const shares = ethers.parseEther('1');
        await erc20.mint(bob.address, shares);
        await erc20.connect(bob).approve(communityStakingPool.target, shares);

        const bobCommunityCoinTokensBefore = await CommunityCoin.balanceOf(bob.address);
        const davidERC20TokensBefore = await erc20.balanceOf(david.address);
        const frankERC20TokensBefore = await erc20.balanceOf(frank.address);

        await communityStakingPool.connect(bob).stake(shares, bob.address);
        
        const bobCommunityCoinTokensAfter = await CommunityCoin.balanceOf(bob.address);
        const davidERC20TokensAfter = await erc20.balanceOf(david.address);
        const frankERC20TokensAfter = await erc20.balanceOf(frank.address);

        // donates 50% and 25% and left for Bob
        expect(
            bobCommunityCoinTokensAfter - bobCommunityCoinTokensBefore
        ).to.be.eq(
            shares * (FRACTION*25n/100n) / (FRACTION)
        );
        expect(
            davidERC20TokensAfter - davidERC20TokensBefore
        ).to.be.eq(
            shares * (FRACTION*50n/100n) / (FRACTION)
        );
        expect(
            frankERC20TokensAfter - frankERC20TokensBefore
        ).to.be.eq(
            shares * (FRACTION*25n/100n) / (FRACTION)
        );

        
    });  

    it("donate tests: (donations address should be EOA)", async () => {
        const res = await loadFixture(deploy);
        const {
            owner,
            FRACTION,
            lockupIntervalCount,
            NO_BONUS_FRACTIONS,
            NO_POPULAR_TOKEN,
            rewardsRateFraction,
            numerator,
            denominator,
            erc20,
            implementationCommunityStakingPoolFactory,
            CommunityCoin,
        } = res;

        const DONATIONS = [[CommunityCoin.target, FRACTION*50n/100n], [erc20.target, FRACTION*25n/100n]];

        await expect(
            CommunityCoin.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
                erc20.target,
                lockupIntervalCount,
                NO_BONUS_FRACTIONS,
                NO_POPULAR_TOKEN,
                DONATIONS,
                rewardsRateFraction,
                numerator,
                denominator
            )
        ).to.be.revertedWithCustomError(implementationCommunityStakingPoolFactory, 'InvalidDonationAddress');
    });  

    it("donate tests: (should be Full Donation if staking != INTER)", async () => {
        const res = await loadFixture(deploy);
        const {
            owner,
            charlie,
            frank,
            david,

            lockupIntervalCount,
            FRACTION,
            NO_BONUS_FRACTIONS,
            NO_POPULAR_TOKEN,
            rewardsRateFraction,
            numerator,
            denominator,

            erc20Paying,
            erc777,
            CommunityCoin
        } = res;

        const DONATIONS = [[david.address, FRACTION*50n/100n], [frank.address, FRACTION*25n/100n]];
        const DONATIONS_FULL_SINGLE = [[david.address, FRACTION*100n/100n]];
        const DONATIONS_FULL_MULTIPLE = [[david.address, FRACTION*50n/100n], [frank.address, FRACTION*25n/100n], [charlie.address, FRACTION*25n/100n]];

        await expect(
            CommunityCoin.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
                erc20Paying.target,
                lockupIntervalCount,
                NO_BONUS_FRACTIONS,
                NO_POPULAR_TOKEN,
                DONATIONS,
                rewardsRateFraction,
                numerator,
                denominator
            )
        ).to.be.revertedWithCustomError(CommunityCoin, 'ShouldBeFullDonations');


        await CommunityCoin.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
            erc20Paying.target,
            lockupIntervalCount,
            NO_BONUS_FRACTIONS,
            NO_POPULAR_TOKEN,
            DONATIONS_FULL_SINGLE,
            rewardsRateFraction,
            numerator,
            denominator
        );
        await CommunityCoin.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
            erc777.target,
            lockupIntervalCount,
            NO_BONUS_FRACTIONS,
            NO_POPULAR_TOKEN,
            DONATIONS_FULL_MULTIPLE,
            rewardsRateFraction,
            numerator,
            denominator
        )
    });  

    it("donate tests: (tokens should be whitelisted)", async () => {
        const res = await loadFixture(deploy);
        const {
            owner,
            david,
            frank,
            CommunityCoin,
            erc20Reward,
            lockupIntervalCount,
            FRACTION,
            NO_BONUS_FRACTIONS,
            NO_POPULAR_TOKEN,
            rewardsRateFraction,
            numerator,
            denominator
        } = res;

        const DONATIONS = [[david.address, FRACTION*50n/100n], [frank.address, FRACTION*25n/100n]];

        await expect(
            CommunityCoin.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
                erc20Reward.target,
                lockupIntervalCount,
                NO_BONUS_FRACTIONS,
                NO_POPULAR_TOKEN,
                DONATIONS,
                rewardsRateFraction,
                numerator,
                denominator
            )
        ).to.be.revertedWithCustomError(CommunityCoin, 'TokenNotInWhitelist');
    });

    describe("tariff tests", function () {
        
        it("shouldn't set tariff by owner or anyone except tariffrole memeber", async () => {
            const res = await loadFixture(deployStakingPoolWithoutRewardsHook);
            const {
                owner,
                bob,
                frank,
                TARIFF_ROLE,
                CommunityCoin
            } = res;

            await expect(CommunityCoin.connect(owner).setTariff(1n, 1n)).to.be.revertedWithCustomError(CommunityCoin,'MissingRole').withArgs(owner.address, TARIFF_ROLE);
            await expect(CommunityCoin.connect(bob).setTariff(1n, 1n)).to.be.revertedWithCustomError(CommunityCoin,'MissingRole').withArgs(bob.address, TARIFF_ROLE);
            await expect(CommunityCoin.connect(frank).setTariff(1n, 1n)).to.be.revertedWithCustomError(CommunityCoin,'MissingRole').withArgs(frank.address, TARIFF_ROLE);
        }); 

        it("should set tariff(redeem / unstake)", async () => {
            const res = await loadFixture(deployStakingPoolWithoutRewardsHook);
            const {
                owner,
                charlie,
                TARIFF_ROLE,
                mockCommunity,
                CommunityCoin
            } = res;

            await mockCommunity.connect(owner).setRoles(charlie.address, [TARIFF_ROLE]);
            await CommunityCoin.connect(charlie).setTariff(1n, 1n);
        });

        it("shouldn't exсeed max tariff(redeem / unstake)", async () => {
            const res = await loadFixture(deployStakingPoolWithoutRewardsHook);
            const {
                owner,
                charlie,
                TARIFF_ROLE,
                mockCommunity,
                CommunityCoin
            } = res;

            await mockCommunity.connect(owner).setRoles(charlie.address, [TARIFF_ROLE]);

            const MAX_REDEEM_TARIFF = await CommunityCoin.MAX_REDEEM_TARIFF();
            const MAX_UNSTAKE_TARIFF = await CommunityCoin.MAX_UNSTAKE_TARIFF(); 

            await expect(CommunityCoin.connect(charlie).setTariff(2n * MAX_REDEEM_TARIFF, 1n)).to.be.revertedWithCustomError(CommunityCoin,'AmountExceedsMaxTariff');
            await expect(CommunityCoin.connect(charlie).setTariff(1n, 2n * MAX_UNSTAKE_TARIFF)).to.be.revertedWithCustomError(CommunityCoin,'AmountExceedsMaxTariff');
            
        });

        describe("should consume by correct tariff", function () {
            
            it(" - when unstake", async () => {

                let bobTokensWithoutTariff, bobTokensWithTariff;
                const res = await loadFixture(deployTariffAndConsumingTests);

                var {
                    owner,
                    bob,
                    charlie,
                    
                    TARIFF_ROLE,
                    shares,
                    FRACTION,

                    erc20,
                    communityStakingPoolWithoutRewardsHook,
                    mockCommunity,
                    CommunityCoin
                } = res;
                
                const MAX_UNSTAKE_TARIFF = await CommunityCoin.MAX_UNSTAKE_TARIFF(); 

                let bobCommunityCoinTokenBefore1 = await CommunityCoin.balanceOf(bob.address);
                let bobERC20TokenBefore1 = await erc20.balanceOf(bob.address);
                
                await CommunityCoin.connect(bob).approve(CommunityCoin.target, shares);
                await CommunityCoin.connect(bob)["unstake(uint256)"](shares);

                let bobCommunityCoinTokenAfter1 = await CommunityCoin.balanceOf(bob.address);
                
                let bobERC20TokenAfter1 = await erc20.balanceOf(bob.address);
                
                bobTokensWithoutTariff = bobERC20TokenAfter1 - bobERC20TokenBefore1;
                expect(bobCommunityCoinTokenBefore1).gt(bobCommunityCoinTokenAfter1);
                expect(bobCommunityCoinTokenAfter1).eq(0n);
                expect(bobERC20TokenAfter1).gt(bobERC20TokenBefore1);
                
                //------------------------------------
                const res2 = await loadFixture(deployTariffAndConsumingTests);
                var {
                    owner,
                    bob,
                    charlie,
                    
                    TARIFF_ROLE,
                    shares,
                    FRACTION,
                    
                    erc20,
                    communityStakingPoolWithoutRewardsHook,
                    mockCommunity,
                    CommunityCoin
                } = res2;
                
                await mockCommunity.connect(owner).setRoles(charlie.address, [TARIFF_ROLE]);
                await CommunityCoin.connect(charlie).setTariff(1n, MAX_UNSTAKE_TARIFF);

                let bobCommunityCoinTokenBefore2 = await CommunityCoin.balanceOf(bob.address);
                let bobERC20TokenBefore2 = await erc20.balanceOf(bob.address);

                await CommunityCoin.connect(bob).approve(CommunityCoin.target, shares);

                const userUnstakeableBefore = await CommunityCoin.getUnstakeableMap(bob.address);
                const instanceUnstakeableBefore = await CommunityCoin.getInstanceUnstakeableMap(communityStakingPoolWithoutRewardsHook.target, bob.address);

                await CommunityCoin.connect(bob)["unstake(uint256)"](shares);

                let userUnstakeableAfter = await CommunityCoin.getUnstakeableMap(bob.address);
                //let instanceStakedAfter = await CommunityCoin.getInstanceStakedMap(communityStakingPool.target);
                let instanceUnstakeableAfter = await CommunityCoin.getInstanceUnstakeableMap(communityStakingPoolWithoutRewardsHook.target, bob.address);

                let bobCommunityCoinTokenAfter2 = await CommunityCoin.balanceOf(bob.address);
                
                let bobERC20TokenAfter2 = await erc20.balanceOf(bob.address);

                bobTokensWithTariff = bobERC20TokenAfter2 - bobERC20TokenBefore2;

                expect(bobERC20TokenAfter2).gt(bobERC20TokenBefore2);
                expect(bobCommunityCoinTokenBefore2).gt(bobCommunityCoinTokenAfter2);
                expect(bobCommunityCoinTokenAfter2).eq(0n);
                
                //-------------------------------------------------
                // now check unstake tariff
                expect(bobTokensWithTariff).to.be.eq(bobTokensWithoutTariff - (shares * MAX_UNSTAKE_TARIFF / FRACTION));

                // issue 53
                // https://github.com/Intercoin/StakingContract/issues/53
                //unstakeable tokens for users should consuming completely without taxes
                expect(userUnstakeableBefore - shares).to.be.eq(userUnstakeableAfter);
                expect(instanceUnstakeableBefore - shares).to.be.eq(instanceUnstakeableAfter);

                //if smhow to be zero
                expect(instanceUnstakeableAfter).not.to.be.eq(userUnstakeableBefore - (shares * MAX_UNSTAKE_TARIFF / FRACTION));

            });

            it(" - when redeem", async () => {
                let aliceERC20TokenWithoutTariff, aliceERC20TokenWithTariff;
                const res = await loadFixture(deployTariffAndConsumingTests);
                var {
                    owner,
                    alice,
                    bob,
                    charlie,
                    
                    TARIFF_ROLE,
                    REDEEM_ROLE,
                    shares,
                    FRACTION,

                    erc20,
                    erc20ReservedToken,
                    mockCommunity,
                    CommunityCoin
                } = res;

                const MAX_REDEEM_TARIFF = await CommunityCoin.MAX_REDEEM_TARIFF();


                // imitate exists role
                await mockCommunity.connect(owner).setRoles(alice.address, [0x99,0x98,0x97,0x96,REDEEM_ROLE]);
                // transfer from bob to alice
                await CommunityCoin.connect(bob).transfer(alice.address, shares);

                let aliceReservedTokenBefore1 = await erc20ReservedToken.balanceOf(alice.address);
                let aliceERC20TokenBefore1 = await erc20.balanceOf(alice.address);

                await CommunityCoin.connect(alice).approve(CommunityCoin.target, shares);
                await CommunityCoin.connect(alice)["redeem(uint256)"](shares);

                let aliceReservedTokenAfter1 = await erc20ReservedToken.balanceOf(alice.address);
                let aliceERC20TokenAfter1 = await erc20.balanceOf(alice.address);
                
                expect(aliceReservedTokenAfter1).eq(aliceReservedTokenBefore1);
                expect(aliceERC20TokenAfter1).gt(aliceERC20TokenBefore1);

                aliceERC20TokenWithoutTariff = aliceERC20TokenAfter1 - aliceERC20TokenBefore1;
                //------------------------------------
                const res2 = await loadFixture(deployTariffAndConsumingTests);
                var {
                    owner,
                    alice,
                    bob,
                    charlie,
                    
                    TARIFF_ROLE,
                    REDEEM_ROLE,
                    shares,
                    FRACTION,

                    erc20,
                    erc20ReservedToken,
                    mockCommunity,
                    CommunityCoin
                } = res2;
                
                // imitate exists role
                await mockCommunity.connect(owner).setRoles(alice.address, [0x99,0x98,0x97,0x96,REDEEM_ROLE]);
                // transfer from bob to alice
                await CommunityCoin.connect(bob).transfer(alice.address, shares);

                await mockCommunity.connect(owner).setRoles(charlie.address, [TARIFF_ROLE]);
                await CommunityCoin.connect(charlie).setTariff(MAX_REDEEM_TARIFF, ONE);

                let aliceReservedTokenBefore2 = await erc20ReservedToken.balanceOf(alice.address);
                let aliceERC20TokenBefore2 = await erc20.balanceOf(alice.address);

                await CommunityCoin.connect(alice).approve(CommunityCoin.target, shares);
                await CommunityCoin.connect(alice)["redeem(uint256)"](shares);

                let aliceReservedTokenAfter2 = await erc20ReservedToken.balanceOf(alice.address);
                let aliceERC20TokenAfter2 = await erc20.balanceOf(alice.address);
                
                expect(aliceReservedTokenAfter2).eq(aliceReservedTokenBefore2);
                expect(aliceERC20TokenAfter2).gt(aliceERC20TokenBefore2);
                
                aliceERC20TokenWithTariff = aliceERC20TokenAfter2 - aliceERC20TokenBefore2;
                ///-----------------------------------
                // now check unstake tariff
                expect(aliceERC20TokenWithTariff).to.be.eq(aliceERC20TokenWithoutTariff - (shares * MAX_REDEEM_TARIFF / FRACTION));
            });
        });

    });

    describe("Snapshots tests", function () {
        
        var func = async (fixtures, param_bonus_fractions) => {

            const {
                owner,
                bob,
                CommunityCoin,
                erc20,
                lockupIntervalCount,
                NO_POPULAR_TOKEN,
                NO_DONATIONS,
                rewardsRateFraction,
                numerator,
                denominator
            } = fixtures;

            let tx = await CommunityCoin.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
                erc20.target,
                lockupIntervalCount,
                param_bonus_fractions,
                NO_POPULAR_TOKEN,
                NO_DONATIONS,
                rewardsRateFraction,
                numerator,
                denominator
            );


            const rc = await tx.wait(); // 0ms, as tx is already confirmed
            const event = rc.logs.find(obj => obj.fragment && obj.fragment.name === 'InstanceCreated');
            const [erc20token, instance] = event.args;
            
            const communityStakingPool = await ethers.getContractAt("MockCommunityStakingPool",instance);
            //console.log("before each №2");
            
            //--------------------------------------------------------

            const amount = ethers.parseEther('1');
            await erc20.mint(bob.address, amount);
            await erc20.connect(bob).approve(communityStakingPool.target, amount);
            await communityStakingPool.connect(bob).stake(amount, bob.address);
            
            const bobWalletTokens = await CommunityCoin.balanceOf(bob.address);

            return {...fixtures, ...{
                bobWalletTokens
            }};

        }
          
        it("Bonus tests::stake (Bonus:50%)", async () => {

            // here we: 
            // - calculate how much tokens user will obtain without bonuses 
            // - store them in `tokensWithNoBonus`
            // - revert snapshot
            // - calculate how much tokens user will obtain WITH bonuses (50%)
            // - store them in `tokensWithBonus`
            // - validate that bonus token shouldn't be unstaked even if duration pass
            // - validate that bonus token can be transfer and consuming in first order
            //
            // UPD remade to use fixture instead calling manual snapshot set and revert
            const res = await loadFixture(deploy);
            const {NO_BONUS_FRACTIONS} = res;
            //---first
            var x = await func(res, NO_BONUS_FRACTIONS);
            var {
                bob,
                CommunityCoin,
                FRACTION,
                lockupIntervalCount,
                dayInSeconds,
            } = x;
            var tokensWithNoBonus = x.bobWalletTokens;

            await expect(CommunityCoin.connect(bob)["unstake(uint256)"](tokensWithNoBonus)).to.be.revertedWithCustomError(CommunityCoin, 'StakeNotUnlockedYet').withArgs(bob.address, tokensWithNoBonus, 0);

            // pass some mtime
            await time.increase(lockupIntervalCount*dayInSeconds+9n);    

            await CommunityCoin.connect(bob).approve(CommunityCoin.target, tokensWithNoBonus);
            await CommunityCoin.connect(bob)["unstake(uint256)"](tokensWithNoBonus);

            //---second
            const res2 = await loadFixture(deploy);
            const {BONUS_FRACTIONS} = res2;
            var x2 = await func(res, BONUS_FRACTIONS);
            var {
                alice,
                bob,
                CommunityCoin,
                FRACTION,
                lockupIntervalCount,
                dayInSeconds
            } = x2;
            var tokensWithBonus = x2.bobWalletTokens;

            await expect(CommunityCoin.connect(bob)["unstake(uint256)"](tokensWithNoBonus)).to.be.revertedWithCustomError(CommunityCoin, 'StakeNotUnlockedYet').withArgs(bob.address, tokensWithNoBonus, tokensWithNoBonus / 2n);
            await expect(CommunityCoin.connect(bob)["unstake(uint256)"](tokensWithBonus)).to.be.revertedWithCustomError(CommunityCoin, 'StakeNotUnlockedYet').withArgs(bob.address, tokensWithNoBonus, 0n);

            ////// validate `viewLockedWalletTokens` and `viewLockedWalletTokensList`
            let bobSharesAfter = await CommunityCoin.balanceOf(bob.address);
            let bobLockedListAfter, bobBonusesListAfter;

            let bobLockedBalanceAfter = await CommunityCoin.connect(bob).viewLockedWalletTokens(bob.address);
            [bobLockedListAfter, bobBonusesListAfter] = await CommunityCoin.connect(bob).viewLockedWalletTokensList(bob.address);

            expect(bobLockedBalanceAfter).to.be.eq(bobSharesAfter);
            expect(bobLockedBalanceAfter).to.be.eq(tokensWithBonus);

            expect(tokensWithNoBonus).to.be.eq(bobLockedListAfter[0][0]);
            expect(tokensWithBonus - tokensWithNoBonus).to.be.eq(bobBonusesListAfter[0][0]);
            ////// ENDOF validate `viewLockedWalletTokens` and `viewLockedWalletTokensList`
            
            // pass some mtime
            await time.increase(lockupIntervalCount * dayInSeconds + 9n);    
            await CommunityCoin.connect(bob).approve(CommunityCoin.target, tokensWithBonus);
            await expect(CommunityCoin.connect(bob)["unstake(uint256)"](tokensWithBonus)).to.be.revertedWithCustomError(CommunityCoin, 'InsufficientAmount').withArgs(bob.address, tokensWithBonus);

            await CommunityCoin.connect(bob).transfer(alice.address, tokensWithBonus - tokensWithNoBonus);

            await CommunityCoin.connect(bob).approve(CommunityCoin.target, tokensWithNoBonus);
            await CommunityCoin.connect(bob)["unstake(uint256)"](tokensWithNoBonus);

            ///////////////////////

            // finally check correct amount of bonuses
            let expectedBonusAmount = tokensWithNoBonus * BONUS_FRACTIONS / FRACTION;
            expect(tokensWithBonus).to.be.eq(tokensWithNoBonus + expectedBonusAmount);

        });  

        it("InvitedBy tests", async () => {
            let bobTokens, aliceTokens;

            //await func(NO_BONUS_FRACTIONS, ZERO, ZERO_ADDRESS);
            const res = await loadFixture(deploy);
            var {NO_BONUS_FRACTIONS} = res;
            //---first
            var x = await func(res, NO_BONUS_FRACTIONS);
            var {
                alice,
                bob,
                CommunityCoin,
                FRACTION
            } = x;

            bobTokens = await CommunityCoin.balanceOf(bob.address);
            aliceTokens = await CommunityCoin.balanceOf(alice.address);

            expect(bobTokens).not.to.be.eq(aliceTokens);
            //-----------------------------------------------------
            //second
            const res2 = await loadFixture(deploy);
            var {
                owner,
                alice,
                bob,
                mockCommunity,
                CommunityCoin,
                FRACTION,
                NO_BONUS_FRACTIONS
            } = res2;
            //invited
            await CommunityCoin.connect(owner).setCommission(FRACTION);
            await mockCommunity.setInvitedBy(alice.address, bob.address);

            await func(res, NO_BONUS_FRACTIONS);

            bobTokens = await CommunityCoin.balanceOf(bob.address);
            aliceTokens = await CommunityCoin.balanceOf(alice.address);

            expect(bobTokens).to.be.eq(aliceTokens); // invitedBy - 100%
            //----------------------------------------------------------
        });  
  
    });

    describe("TrustedForwarder Rewards", function () {

        it("should be empty after init", async() => {
            const res = await loadFixture(deploy);
            const {
                bob,
                rewards
            } = res;
            expect(await rewards.connect(bob).isTrustedForwarder(ZERO_ADDRESS)).to.be.true;
            
        });

        it("should be setup by owner", async() => {
            const res = await loadFixture(deploy);
            const {
                owner,
                bob,
                charlie,
                rewards
            } = res;

            await expect(rewards.connect(bob).setTrustedForwarder(charlie.address)).to.be.revertedWith("Ownable: caller is not the owner");
            expect(await rewards.connect(bob).isTrustedForwarder(ZERO_ADDRESS)).to.be.true;
            await rewards.connect(owner).setTrustedForwarder(charlie.address);
            expect(await rewards.connect(bob).isTrustedForwarder(charlie.address)).to.be.true;
        });
        
        it("should drop trusted forward if trusted forward become owner ", async() => {
            const res = await loadFixture(deploy);
            const {
                owner,
                bob,
                charlie,
                rewards
            } = res;

            await rewards.connect(owner).setTrustedForwarder(charlie.address);
            expect(await rewards.connect(bob).isTrustedForwarder(charlie.address)).to.be.true;
            await rewards.connect(owner).transferOwnership(charlie.address);
            expect(await rewards.connect(bob).isTrustedForwarder(ZERO_ADDRESS)).to.be.true;
        });

        it("shouldnt become owner and trusted forwarder", async() => {
            const res = await loadFixture(deploy);
            const {
                owner,
                rewards
            } = res;
            await expect(rewards.connect(owner).setTrustedForwarder(owner.address)).to.be.revertedWithCustomError(rewards, "ForwarderCanNotBeOwner");
        });

    });

    describe("Rewards tests", function () {   
        

        it("test rewards tokens", async() => {
            const res = await loadFixture(deployStakingPoolWithRewardsHook);
            const {
                owner,
                bob,
                lockupIntervalCount,
                dayInSeconds,
                rewardsTenPercentBonus,
                CommunityCoinWithRewardsHook,
                erc20,
                erc20Reward,
                rewardsHook,
                communityStakingPoolWithHook
            } = res;

            const GroupName = "TestGroup";
          
            await rewardsHook.connect(owner).setGroup([bob.address], GroupName);
            const oldGroupBonus = await rewardsHook.getGroupBonus(GroupName);
            await expect(oldGroupBonus).to.be.eq(ZERO);

            await erc20.mint(bob.address, ethers.parseEther('1'));
            await erc20.connect(bob).approve(communityStakingPoolWithHook.target, ethers.parseEther('1'));
            
            await communityStakingPoolWithHook.connect(bob).stake(ethers.parseEther('1'), bob.address);

            let shares = await CommunityCoinWithRewardsHook.balanceOf(bob.address);

            // pass some mtime
            await time.increase(lockupIntervalCount*dayInSeconds+9n);    

            await CommunityCoinWithRewardsHook.connect(bob).approve(CommunityCoinWithRewardsHook.target, shares);

            let oldBobBalanceBeforeUnstake = await erc20Reward.balanceOf(bob.address);
            await CommunityCoinWithRewardsHook.connect(bob)["unstake(uint256)"](shares);
            let newBobBalanceBeforeUnstake = await erc20Reward.balanceOf(bob.address);
            let erc20RewardTotalSupply = await erc20Reward.totalSupply();
            expect(erc20RewardTotalSupply).to.be.eq(ZERO);
            expect(oldBobBalanceBeforeUnstake).to.be.eq(ZERO);
            expect(newBobBalanceBeforeUnstake).to.be.eq(ZERO);
            // there are no revert when erc20 haven't tokens to rewards

            const newGroupBonus = await rewardsHook.getGroupBonus(GroupName);
            expect(newGroupBonus).not.to.be.eq(ZERO);
            expect(newGroupBonus).to.be.eq(rewardsTenPercentBonus);
            
            // but if try to claim from chain CommunityCoins->[claim]->RewardHook->[onClaim] we will revert
            await expect(CommunityCoinWithRewardsHook.connect(bob).claim()).to.be.revertedWithCustomError(rewardsHook, 'InsufficientAmount');
            
            //now mint smth 
            await erc20Reward.mint(rewardsHook.target, ethers.parseEther('100'));
            //and try again
            let oldBobBalance = await erc20Reward.balanceOf(bob.address);
            await CommunityCoinWithRewardsHook.connect(bob).claim();
            let newBobBalance = await erc20Reward.balanceOf(bob.address);
            expect(newBobBalance).to.be.gt(oldBobBalance);

        });
    });

    describe("Taxes tests", function () {   
        
        async function prepareTestWithTransferHook() {
            const res = await loadFixture(deployStakingPoolWithoutRewardsHook);
            const {
                owner,
                bob,
                CommunityCoin,
                communityStakingPoolWithoutRewardsHook,
                erc20,
                taxHook
            } = res;

            const amount = ethers.parseEther('1');
            await erc20.mint(bob.address, amount);
            await erc20.connect(bob).approve(communityStakingPoolWithoutRewardsHook.target, amount);
            await communityStakingPoolWithoutRewardsHook.connect(bob).stake(amount, bob.address);
            
            const walletTokens = await CommunityCoin.balanceOf(bob.address);
            
            await CommunityCoin.connect(owner).setupTaxAddress(taxHook.target);

            return {
                ...res,
                ...{walletTokens}
            }
        }

        describe("test transferHook ", function () {   

            it("should prevent transfer if disabled via hook contract", async() => {
                const res = await loadFixture(prepareTestWithTransferHook);
                const {
                    alice,
                    bob,
                    walletTokens,
                    CommunityCoin,
                    taxHook
                } = res;
                
                await taxHook.setupVars(0n,false);
                await expect(CommunityCoin.connect(bob).transfer(alice.address, walletTokens)).to.be.revertedWithCustomError(CommunityCoin,'HookTransferPrevent').withArgs(bob.address, alice.address, walletTokens);
            });

            it("should allow transfer if enabled via hook contract", async() => {
                const res = await loadFixture(prepareTestWithTransferHook);
                const {
                    alice,
                    bob,
                    walletTokens,
                    FRACTION,
                    CommunityCoin,
                    taxHook
                } = res;

                await taxHook.setupVars(FRACTION,true);
                
                await expect(
                    CommunityCoin.connect(bob).transfer(alice.address, walletTokens)
                ).not.to.be.revertedWith('HookTransferPrevent');
                //.withArgs(bob.address, alice.address, walletTokens.toString());
                
            });

            describe("test taxes ", function () {   

                async function prepareTestWithTransferHookAndTaxes() {
                    const res = await loadFixture(prepareTestWithTransferHook);
                    const {
                        alice,
                        bob,
                        FRACTION,
                        CommunityCoin,
                        taxHook
                    } = res;

                    const TokensToSend = ethers.parseEther('0.05');//ONE_ETH.div(20);
                    const PERCENTS_FRACTION = FRACTION * 5n / 100n; //5%*fraction
                    const TOO_MUCH_PERCENTS_FRACTION = FRACTION * 100n / 100n; // HUNDRED.mul(FRACTION).div(100); //100%*fraction

                    await taxHook.setupVars(FRACTION,true);
                    let tmp1 = await CommunityCoin.balanceOf(alice.address);
                    let tmp3 = await CommunityCoin.balanceOf(bob.address);
                    await CommunityCoin.connect(bob).transfer(alice.address, TokensToSend);
                    let tmp2 = await CommunityCoin.balanceOf(alice.address);
                    let tmp4 = await CommunityCoin.balanceOf(bob.address);

                    const obtainedTokensWithNoTax = tmp2 - tmp1;
                    const senderTokensWithNoTax = tmp3 - tmp4;

                    return {
                        ...res,
                        ...{
                            TokensToSend,
                            PERCENTS_FRACTION,
                            TOO_MUCH_PERCENTS_FRACTION,
                            obtainedTokensWithNoTax,
                            senderTokensWithNoTax,
                        }
                    }
                }

                it("should reduce tokens while transfer if taxes used", async() => {
                    const res = await loadFixture(prepareTestWithTransferHookAndTaxes);
                    const {
                        alice,
                        bob,
                        FRACTION,
                        PERCENTS_FRACTION,
                        TokensToSend,
                        obtainedTokensWithNoTax,
                        CommunityCoin,
                        taxHook
                    } = res;

                    let tmp1 = await CommunityCoin.balanceOf(alice.address);
                    await taxHook.setupVars(FRACTION - PERCENTS_FRACTION, true);
                    await CommunityCoin.connect(bob).transfer(alice.address, TokensToSend);
                    let tmp2 = await CommunityCoin.balanceOf(alice.address);

                    const obtainedTokensWithTax = tmp2 - tmp1;

                    expect(obtainedTokensWithTax).to.be.lt(obtainedTokensWithNoTax);

                    expect(
                        obtainedTokensWithNoTax - (obtainedTokensWithNoTax * PERCENTS_FRACTION / FRACTION)
                    ).to.be.eq(obtainedTokensWithTax);
                    
                });

                it("shouldn't exceed maxTAX ", async() => {
                    const res = await loadFixture(prepareTestWithTransferHookAndTaxes);
                    const {
                        alice,
                        bob,
                        FRACTION,
                        PERCENTS_FRACTION,
                        TOO_MUCH_PERCENTS_FRACTION,
                        TokensToSend,
                        obtainedTokensWithNoTax,
                        CommunityCoin,
                        taxHook
                    } = res;
                    
                    let tmp1 = await CommunityCoin.balanceOf(alice.address);
                    await taxHook.setupVars(FRACTION - TOO_MUCH_PERCENTS_FRACTION, true);
                    await CommunityCoin.connect(bob).transfer(alice.address, TokensToSend);
                    let tmp2 = await CommunityCoin.balanceOf(alice.address);

                    const obtainedTokensWithTax = tmp2 - tmp1;

                    expect(obtainedTokensWithTax).to.be.lt(obtainedTokensWithNoTax);

                    expect(
                        obtainedTokensWithNoTax - (obtainedTokensWithNoTax * PERCENTS_FRACTION / FRACTION)
                    ).not.to.be.eq(obtainedTokensWithTax);

                    let MAX_TAX = await await CommunityCoin.MAX_TAX();
                    expect(
                        obtainedTokensWithNoTax - (obtainedTokensWithNoTax * MAX_TAX / FRACTION)
                    ).to.be.eq(obtainedTokensWithTax);
                    
                });

                it("should mint extra tokens while transfer if taxes used ", async() => {
                    const res = await loadFixture(prepareTestWithTransferHookAndTaxes);
                    const {
                        alice,
                        bob,
                        FRACTION,
                        PERCENTS_FRACTION,
                        TokensToSend,
                        obtainedTokensWithNoTax,
                        CommunityCoin,
                        taxHook
                    } = res;
                    

                    let tmp1 = await CommunityCoin.balanceOf(alice.address);
                    await taxHook.setupVars(FRACTION + PERCENTS_FRACTION, true);
                    await CommunityCoin.connect(bob).transfer(alice.address, TokensToSend);
                    let tmp2 = await CommunityCoin.balanceOf(alice.address);

                    const obtainedTokensWithTax = tmp2 - tmp1;

                    expect(obtainedTokensWithTax).to.be.gt(obtainedTokensWithNoTax);

                    expect(
                        obtainedTokensWithNoTax + (obtainedTokensWithNoTax * PERCENTS_FRACTION / FRACTION)
                    ).to.be.eq(obtainedTokensWithTax);
                });
                
                it("shouldn't exceed maxBOOST", async() => {
                    const res = await loadFixture(prepareTestWithTransferHookAndTaxes);
                    const {
                        alice,
                        bob,
                        FRACTION,
                        PERCENTS_FRACTION,
                        TOO_MUCH_PERCENTS_FRACTION,
                        TokensToSend,
                        obtainedTokensWithNoTax,
                        CommunityCoin,
                        taxHook
                    } = res;

                    let tmp1 = await CommunityCoin.balanceOf(alice.address);
                    await taxHook.setupVars(FRACTION + TOO_MUCH_PERCENTS_FRACTION, true);
                    await CommunityCoin.connect(bob).transfer(alice.address, TokensToSend);
                    let tmp2 = await CommunityCoin.balanceOf(alice.address);

                    const obtainedTokensWithTax = tmp2 - tmp1;

                    expect(obtainedTokensWithTax).to.be.gt(obtainedTokensWithNoTax);

                    expect(
                        obtainedTokensWithNoTax + (obtainedTokensWithNoTax * PERCENTS_FRACTION / FRACTION)
                    ).not.to.be.eq(obtainedTokensWithTax);

                    let MAX_BOOST = await await CommunityCoin.MAX_BOOST();
                    expect(
                        obtainedTokensWithNoTax + (obtainedTokensWithNoTax * MAX_BOOST / FRACTION)
                    ).to.be.eq(obtainedTokensWithTax);
                });
            });

        }); 

    });

    describe("ERC20 pool tests", function () { 
     
        it("should produce", async() => {
            const res = await loadFixture(deployStakingPoolWithoutRewardsHook);
            const {
                communityStakingPoolWithoutRewardsHook,
            } = res;
            expect(communityStakingPoolWithoutRewardsHook.target).not.to.be.eq(ZERO_ADDRESS); 
        });

        it("shouldn't receive ether", async() => {
            const res = await loadFixture(deployStakingPoolWithoutRewardsHook);
            const {
                owner,
                communityStakingPoolWithoutRewardsHook,
            } = res;

            await expect(
                owner.sendTransaction({
                    to: communityStakingPoolWithoutRewardsHook.target,
                    value: ethers.parseEther("1"), // Sends exactly 1.0 ether
                })
            ).to.be.revertedWithCustomError(communityStakingPoolWithoutRewardsHook, "Denied"); 
        });
        
        it("shouldnt create another pair with equal tokens", async() => {
            const res = await loadFixture(deployStakingPoolWithoutRewardsHook);
            const {
                lockupIntervalCount,
                NO_BONUS_FRACTIONS,
                NO_POPULAR_TOKEN,
                NO_DONATIONS,
                rewardsRateFraction,
                numerator,
                denominator,
                CommunityCoin,
                erc20
            } = res;

            await expect(CommunityCoin["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
                erc20.target,
                lockupIntervalCount,
                NO_BONUS_FRACTIONS,
                NO_POPULAR_TOKEN,
                NO_DONATIONS,
                rewardsRateFraction,
                numerator,
                denominator
            )).to.be.revertedWith("CommunityCoin: PAIR_ALREADY_EXISTS");
        });

        it("just stake", async () => {
            const res = await loadFixture(deployStakingPoolWithoutRewardsHook);
            const {
                bob,
                charlie,
                communityStakingPoolWithoutRewardsHook,
                CommunityCoin,
                erc20,
                numerator,
                denominator
            } = res;

            const amount = ethers.parseEther('1');
            await erc20.mint(bob.address, amount);
            await erc20.connect(bob).approve(communityStakingPoolWithoutRewardsHook.target, amount);

            let charlieWalletTokensBefore = await CommunityCoin.balanceOf(charlie.address);
            let bobLptokensBefore = await erc20.balanceOf(communityStakingPoolWithoutRewardsHook.target);

            await communityStakingPoolWithoutRewardsHook.connect(bob).stake(amount, charlie.address);

            let walletTokens = await CommunityCoin.balanceOf(charlie.address);
            let lptokens = await erc20.balanceOf(communityStakingPoolWithoutRewardsHook.target);
            
            // custom situation when  uniswapLP tokens equal sharesLP tokens.  can be happens in the first stake
            expect(lptokens).not.to.be.eq(0n);
            expect(lptokens * numerator / denominator).to.be.eq(walletTokens);

            expect(charlieWalletTokensBefore).not.to.be.eq(walletTokens);
            expect(0n).not.to.be.eq(walletTokens);

            expect(bobLptokensBefore).not.to.be.eq(lptokens);
        
        }); 

        it("shouldnt buy and stake through paying token if havent uniswap pair", async () => {
            const res = await loadFixture(deployStakingPoolWithoutRewardsHook);
            const {
                bob,
                charlie,
                communityStakingPoolWithoutRewardsHook,
                CommunityCoin,
                erc20Paying
            } = res;
            const amount = ethers.parseEther('1');

            await erc20Paying.mint(bob.address, amount);
            await erc20Paying.connect(bob).approve(communityStakingPoolWithoutRewardsHook.target, amount);
            
            await expect(communityStakingPoolWithoutRewardsHook.connect(bob).buyAndStake(erc20Paying.target, amount, charlie.address)).to.be.revertedWithCustomError(communityStakingPoolWithoutRewardsHook, "NoUniswapV2Pair");
        }); 

        it("shouldnt buy in presale and stake if presale contract doesn't contain buy method", async () => {
            const res = await loadFixture(deployStakingPoolWithoutRewardsHook);
            const {
                bob,
                charlie,
                communityStakingPoolWithoutRewardsHook,
                releaseManager,
                badPresale1,
                badPresale2,
                badPresale3,
                badPresale4
            } = res;

            // badPresale1 //empty contract
            // badPresale2 //with only none payable fallback method
            // badPresale3 //with only payable fallback method
            // badPresale4 //with payable fallback method and endTime
            
            // any contract should be registered in ecosystem. it will be the first error
            await expect(
                communityStakingPoolWithoutRewardsHook.connect(bob).buyInPresaleAndStake(badPresale1.target, charlie.address)
            ).to.be.revertedWithCustomError(communityStakingPoolWithoutRewardsHook, "NotInIntercoinEcosystem");
            await expect(
                communityStakingPoolWithoutRewardsHook.connect(bob).buyInPresaleAndStake(badPresale2.target, charlie.address)
            ).to.be.revertedWithCustomError(communityStakingPoolWithoutRewardsHook, "NotInIntercoinEcosystem");
            await expect(
                communityStakingPoolWithoutRewardsHook.connect(bob).buyInPresaleAndStake(badPresale3.target, charlie.address)
            ).to.be.revertedWithCustomError(communityStakingPoolWithoutRewardsHook, "NotInIntercoinEcosystem");
            await expect(
                communityStakingPoolWithoutRewardsHook.connect(bob).buyInPresaleAndStake(badPresale4.target, charlie.address)
            ).to.be.revertedWithCustomError(communityStakingPoolWithoutRewardsHook, "NotInIntercoinEcosystem");

            // overwise we will check buy and fallback method

            await releaseManager.customRegisterInstance(badPresale1.target, bob.address);
            await releaseManager.customRegisterInstance(badPresale2.target, bob.address);
            await releaseManager.customRegisterInstance(badPresale3.target, bob.address);
            await releaseManager.customRegisterInstance(badPresale4.target, bob.address);

            await expect(
                communityStakingPoolWithoutRewardsHook.connect(bob).buyInPresaleAndStake(badPresale1.target, charlie.address)
            //).to.be.revertedWith("function selector was not recognized and there's no fallback function");
            ).to.be.revertedWithoutReason;

            await expect(
                communityStakingPoolWithoutRewardsHook.connect(bob).buyInPresaleAndStake(badPresale2.target, charlie.address)
            //).to.be.revertedWith("function returned an unexpected amount of data");
            ).to.be.revertedWithoutReason;

            await expect(
                communityStakingPoolWithoutRewardsHook.connect(bob).buyInPresaleAndStake(badPresale3.target, charlie.address)
            //).to.be.revertedWith("function returned an unexpected amount of data");
            ).to.be.revertedWithoutReason;

            await expect(
                communityStakingPoolWithoutRewardsHook.connect(bob).buyInPresaleAndStake(badPresale4.target, charlie.address)
            ).to.be.revertedWithCustomError(communityStakingPoolWithoutRewardsHook, 'EndTimeAlreadyPassed');


            // the same with some native coins
            await expect(
                communityStakingPoolWithoutRewardsHook.connect(bob).buyInPresaleAndStake(badPresale1.target, charlie.address, {value: ethers.parseEther('1')})
            // ).to.be.revertedWith("function selector was not recognized and there's no fallback function");
            ).to.be.revertedWithoutReason;

            await expect(
                communityStakingPoolWithoutRewardsHook.connect(bob).buyInPresaleAndStake(badPresale2.target, charlie.address, {value: ethers.parseEther('1')})
            //).to.be.revertedWith('function returned an unexpected amount of data');
            ).to.be.revertedWithoutReason;
            
            await expect(
                communityStakingPoolWithoutRewardsHook.connect(bob).buyInPresaleAndStake(badPresale3.target, charlie.address, {value: ethers.parseEther('1')})
            //).to.be.revertedWith('function returned an unexpected amount of data');
            ).to.be.revertedWithoutReason;

            await expect(
                communityStakingPoolWithoutRewardsHook.connect(bob).buyInPresaleAndStake(badPresale4.target, charlie.address, {value: ethers.parseEther('1')})
            ).to.be.revertedWithCustomError(communityStakingPoolWithoutRewardsHook, 'EndTimeAlreadyPassed');

            await badPresale4.setEndTime(9999999999n);

            await expect(
                communityStakingPoolWithoutRewardsHook.connect(bob).buyInPresaleAndStake(badPresale4.target, charlie.address)
            ).to.be.revertedWithCustomError(communityStakingPoolWithoutRewardsHook, "InsufficientAmount");
            await expect(
                communityStakingPoolWithoutRewardsHook.connect(bob).buyInPresaleAndStake(badPresale4.target, charlie.address, {value: ethers.parseEther('1')})
            ).to.be.revertedWithCustomError(communityStakingPoolWithoutRewardsHook, "InsufficientAmount");

        }); 
        
        it("shouldnt buy in presale and stake if presale contract is not in intercoin ecosystem", async () => {
            const res = await loadFixture(deployStakingPoolWithoutRewardsHook);
            const {
                bob,
                charlie,
                communityStakingPoolWithoutRewardsHook,
                CommunityCoin,
                erc20,
                releaseManager,
                goodPresale
            } = res;

            await expect(
                communityStakingPoolWithoutRewardsHook.connect(bob).buyInPresaleAndStake(goodPresale.target, charlie.address)
            ).to.be.revertedWithCustomError(communityStakingPoolWithoutRewardsHook, "NotInIntercoinEcosystem");
            
            await goodPresale.setTokenAddress(erc20.target);
            await erc20.mint(goodPresale.target, ethers.parseEther('1'));
            await releaseManager.customRegisterInstance(goodPresale.target, bob.address); // just trick with WRONG factory and custom registratation

            await expect(
                communityStakingPoolWithoutRewardsHook.connect(bob).buyInPresaleAndStake(goodPresale.target, charlie.address)
            ).to.be.revertedWithCustomError(communityStakingPoolWithoutRewardsHook, "EndTimeAlreadyPassed");

            await goodPresale.setEndTime(9999999999n);
            
            var charlieBalanceBefore = await CommunityCoin.balanceOf(charlie.address);
            var poolBalanceBefore = await erc20.balanceOf(communityStakingPoolWithoutRewardsHook.target);
            await communityStakingPoolWithoutRewardsHook.connect(bob).buyInPresaleAndStake(goodPresale.target, charlie.address, {value: ethers.parseEther('1')})
            var charlieBalanceAfter = await CommunityCoin.balanceOf(charlie.address);
            var poolBalanceAfter = await erc20.balanceOf(communityStakingPoolWithoutRewardsHook.target);

            expect(charlieBalanceAfter - charlieBalanceBefore).to.be.eq(ethers.parseEther('1'));
            expect(poolBalanceAfter - poolBalanceBefore).to.be.eq(ethers.parseEther('1'));

        }); 
  
        describe("buy and stake", function() {
            // var uniswapRouterFactoryInstance;
            // var uniswapRouterInstance;

            it("should buyAndStake", async () => {
                const res = await loadFixture(deployWithUniswap);
                const {
                    charlieWalletTokensBefore,
                    charlieWalletTokensAfter
                } = res;
                expect(charlieWalletTokensAfter).to.be.gt(charlieWalletTokensBefore);
                expect(charlieWalletTokensAfter).not.to.be.eq(0n);
            
            }); 

            it("shouldnt unstake if not unlocked yet", async () => {
                const res = await loadFixture(deployWithUniswap);
                const {
                    charlie,
                    charlieWalletTokensAfter,
                    CommunityCoin
                } = res;

                // even if approve before
                await CommunityCoin.connect(charlie).approve(CommunityCoin.target, charlieWalletTokensAfter);
                 
                await expect(CommunityCoin.connect(charlie).unstake(charlieWalletTokensAfter)).to.be.revertedWithCustomError(CommunityCoin, 'StakeNotUnlockedYet').withArgs(charlie.address, charlieWalletTokensAfter, 0);
            });  

            it("shouldnt redeem if sender haven't redeem role", async () => {
                const res = await loadFixture(deployWithUniswap);
                const {
                    charlie,
                    charlieWalletTokensAfter,
                    REDEEM_ROLE,
                    CommunityCoin
                } = res;

                // even if approve before
                
                await CommunityCoin.connect(charlie).approve(CommunityCoin.target, charlieWalletTokensAfter);
                
                await expect(
                    CommunityCoin.connect(charlie)['redeem(uint256)'](charlieWalletTokensAfter)
                ).to.be.revertedWithCustomError(CommunityCoin, 'MissingRole').withArgs(
                    charlie.address, REDEEM_ROLE
                );
                
            }); 

            it("should transfer wallet tokens after stake", async() => {
                const res = await loadFixture(deployWithUniswap);
                const {
                    alice,
                    charlie,
                    charlieWalletTokensAfter,
                    CommunityCoin
                } = res;

                let charlieLockedListAfter, charlieBonusesListAfter;

                let charlieLockedBalanceAfter = await CommunityCoin.connect(charlie).viewLockedWalletTokens(charlie.address);
                [charlieLockedListAfter, charlieBonusesListAfter] = await CommunityCoin.connect(charlie).viewLockedWalletTokensList(charlie.address);

                let aliceLockedBalanceAfter = await CommunityCoin.connect(charlie).viewLockedWalletTokens(alice.address);
                expect(aliceLockedBalanceAfter).to.be.eq(0n);
                expect(charlieLockedBalanceAfter).to.be.eq(charlieWalletTokensAfter);
                expect(charlieLockedBalanceAfter).to.be.eq(charlieLockedListAfter[0][0]);

                await CommunityCoin.connect(charlie).transfer(alice.address, charlieWalletTokensAfter);

                let charlieSharesAfterTransfer = await CommunityCoin.balanceOf(charlie.address);
                let aliceSharesAfterCharlieTransfer = await CommunityCoin.balanceOf(alice.address);
                let charlieLockedBalanceAfterCharlieTransfer = await CommunityCoin.connect(charlie).viewLockedWalletTokens(charlie.address);
                let aliceLockedBalanceAfterCharlieTransfer = await CommunityCoin.connect(charlie).viewLockedWalletTokens(alice.address);

                expect(charlieSharesAfterTransfer).to.be.eq(0n);
                expect(charlieWalletTokensAfter).to.be.eq(aliceSharesAfterCharlieTransfer);
                expect(charlieLockedBalanceAfterCharlieTransfer).to.be.eq(0n);
                expect(aliceLockedBalanceAfterCharlieTransfer).to.be.eq(0n);
                
                
            });

            it("should redeem", async () => {

                const res = await loadFixture(deployWithUniswap);
                const {
                    owner,
                    alice,
                    charlie,
                    REDEEM_ROLE,
                    lockupIntervalCount,
                    dayInSeconds,
                    charlieWalletTokensAfter,
                    CommunityCoin,
                    mockCommunity,
                    erc20
                } = res;

                // pass some mtime
                await time.increase(lockupIntervalCount*dayInSeconds+9n);    

                // grant role
                // imitate exists role
                await mockCommunity.connect(owner).setRoles(alice.address, [REDEEM_ROLE]);

                // transfer from charlie to alice
                await CommunityCoin.connect(charlie).transfer(alice.address, charlieWalletTokensAfter);

                let aliceLPTokenBefore = await erc20.balanceOf(alice.address);

                await CommunityCoin.connect(alice).approve(CommunityCoin.target, charlieWalletTokensAfter);


                await CommunityCoin.connect(alice)['redeem(uint256)'](charlieWalletTokensAfter);
                let aliceLPTokenAfter = await erc20.balanceOf(alice.address);
                expect(aliceLPTokenAfter).gt(aliceLPTokenBefore);

            }); 


        });
        
    });

    describe(`Instance tests with external community`, function () {
        
        // var communityStakingPool; // communityStakingPoolWithoutRewardsHook
        // var pairInstance; // pair_Reserved_Traded
 
        it("shouldnt create another pair with equal tokens", async() => {
            const res = await loadFixture(deployWithUniswap);
            const {
                owner,
                lockupIntervalCount,
                NO_BONUS_FRACTIONS,
                NO_POPULAR_TOKEN,
                NO_DONATIONS,
                rewardsRateFraction,
                numerator,
                denominator,
                CommunityCoin,
                erc20,
                charlieWalletTokensBefore,
                charlieWalletTokensAfter
            } = res;

            await expect(CommunityCoin.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
                erc20.target,
                lockupIntervalCount,
                NO_BONUS_FRACTIONS,
                NO_POPULAR_TOKEN,
                NO_DONATIONS,
                rewardsRateFraction,
                numerator,
                denominator
            )).to.be.revertedWith("CommunityCoin: PAIR_ALREADY_EXISTS");
        });
        
        describe("TrustedForwarder", function () {
            it("should be empty after init", async() => {
                const res = await loadFixture(deployWithUniswap);
                const {
                    bob,
                    CommunityCoin
                } = res;
                expect(await CommunityCoin.connect(bob).isTrustedForwarder(ZERO_ADDRESS)).to.be.true;
            });

            it("should be setup by owner", async() => {
                const res = await loadFixture(deployWithUniswap);
                const {
                    owner,
                    alice,
                    bob,
                    CommunityCoin
                } = res;

                await expect(CommunityCoin.connect(bob).setTrustedForwarder(alice.address)).to.be.revertedWith("Ownable: caller is not the owner");
                expect(await CommunityCoin.connect(bob).isTrustedForwarder(ZERO_ADDRESS)).to.be.true;
                await CommunityCoin.connect(owner).setTrustedForwarder(alice.address);
                expect(await CommunityCoin.connect(bob).isTrustedForwarder(alice.address)).to.be.true;
            });
            
            it("should drop trusted forward if trusted forward become owner ", async() => {
                const res = await loadFixture(deployWithUniswap);
                const {
                    owner,
                    alice,
                    bob,
                    CommunityCoin
                } = res;

                await CommunityCoin.connect(owner).setTrustedForwarder(alice.address);
                expect(await CommunityCoin.connect(bob).isTrustedForwarder(alice.address)).to.be.true;
                await CommunityCoin.connect(owner).transferOwnership(alice.address);
                expect(await CommunityCoin.connect(bob).isTrustedForwarder(ZERO_ADDRESS)).to.be.true;
            });

            it("shouldnt become owner and trusted forwarder", async() => {
                const res = await loadFixture(deployWithUniswap);
                const {
                    owner,
                    CommunityCoin
                } = res;

                await expect(CommunityCoin.connect(owner).setTrustedForwarder(owner.address)).to.be.revertedWithCustomError(CommunityCoin, 'TrustedForwarderCanNotBeOwner').withArgs(owner.address);
            });
            
            it("shouldnt transferOwnership if sender is trusted forwarder", async() => {
                const res = await loadFixture(deployWithUniswap);
                const {
                    owner,
                    bob,
                    trustedForwarder,
                    CommunityCoin
                } = res;

                await CommunityCoin.connect(owner).setTrustedForwarder(trustedForwarder.address);

                const dataTx = await CommunityCoin.connect(trustedForwarder).transferOwnership.populateTransaction(bob.address);
                dataTx.data = dataTx.data.concat((owner.address).substring(2));
                await expect(trustedForwarder.sendTransaction(dataTx)).to.be.revertedWithCustomError(CommunityCoin, "DeniedForTrustedForwarder");


            });
            
        });

        describe("factory tests", function() {

            it("should return instance info", async () => {
                const res = await loadFixture(deployWithUniswap);
                const {
                    bob,
                    lockupIntervalCount,
                    erc20,
                    CommunityCoin
                } = res;
                let instanceManagementAddr = await CommunityCoin.connect(bob).instanceManagment();
                const instanceManagementInstance = await ethers.getContractAt("CommunityStakingPoolFactory",instanceManagementAddr);

                let data = await instanceManagementInstance.connect(bob).getInstanceInfo(erc20.target, lockupIntervalCount);
                
                expect(data.reserveToken).to.be.eq(erc20.target);
                expect(data.duration).to.be.eq(lockupIntervalCount);
                
            }); 
            
            it("should return all instances info", async () => {
                const res = await loadFixture(deployWithUniswap);
                const {
                    bob,
                    lockupIntervalCount,
                    NO_BONUS_FRACTIONS,
                    erc20,
                    CommunityCoin
                } = res;
                let instanceManagementAddr = await CommunityCoin.connect(bob).instanceManagment();
                const instanceManagementInstance = await ethers.getContractAt("CommunityStakingPoolFactory",instanceManagementAddr);

                let data = await instanceManagementInstance.connect(bob).getInstancesInfo();
                
                expect(data[0].reserveToken).to.be.eq(erc20.target);
                expect(data[0].duration).to.be.eq(lockupIntervalCount);
                expect(data[0].bonusTokenFraction).to.be.eq(NO_BONUS_FRACTIONS);
                
            }); 
            
            it("should return correct instance length", async () => {
                const res = await loadFixture(deployWithUniswap);
                const {
                    bob,
                    CommunityCoin
                } = res;
                let instanceManagementAddr = await CommunityCoin.connect(bob).instanceManagment();
                const instanceManagementInstance = await ethers.getContractAt("CommunityStakingPoolFactory",instanceManagementAddr);

                let data = await instanceManagementInstance.connect(bob).instancesCount();
                expect(data).to.be.eq(1n);
            }); 

            it("should return correct instance by index", async () => {
                const res = await loadFixture(deployWithUniswap);
                const {
                    bob,
                    CommunityCoin,
                    communityStakingPoolWithoutRewardsHook
                } = res;
                let instanceManagementAddr = await CommunityCoin.connect(bob).instanceManagment();
                const instanceManagementInstance = await ethers.getContractAt("CommunityStakingPoolFactory",instanceManagementAddr);

                let instance = await instanceManagementInstance.connect(bob).instancesByIndex(0);
                expect(instance).to.be.eq(communityStakingPoolWithoutRewardsHook.target);
            }); 
        }); 
/*
        describe.only("unstake/redeem/redeem-and-remove-liquidity tests", function () {
            var shares;
            beforeEach("before each callback", async() => {
                await erc20.mint(bob.address, ONE_ETH.mul(ONE));
                await erc20.connect(bob).approve(communityStakingPool.target, ONE_ETH.mul(ONE));
                await communityStakingPool.connect(bob)['stake(uint256,address)'](ONE_ETH.mul(ONE), bob.address);
                shares = await CommunityCoin.balanceOf(bob.address);
            });

            it("should wallet tokens appear and not equal zero", async () => {
                expect(shares).to.not.equal(ZERO);
            });

            it("shouldn't accept unknown tokens if send directly", async () => {
                let anotherToken = await ERC777Factory.deploy("Another ERC777 Token", "A-ERC777");
                await anotherToken.mint(bob.address, ONE_ETH);
                await expect(anotherToken.connect(bob).transfer(CommunityCoin.target, ONE_ETH)).to.be.revertedWith('OwnTokensPermittedOnly');
            });

            describe("unstake tests", function () {
                describe("shouldnt unstake", function () {
                    it("if not unlocked yet", async () => {
                        await expect(CommunityCoin.connect(bob)["unstake(uint256)"](shares)).to.be.revertedWith('StakeNotUnlockedYet').withArgs(bob.address, shares, 0);
                    });
                    it("if amount more than balance", async () => {
                        // pass some mtime
                        await time.increase(lockupIntervalCount*dayInSeconds+9n);    

                        await expect(CommunityCoin.connect(bob)["unstake(uint256)"](shares.add(ONE_ETH))).to.be.revertedWith('InsufficientBalance').withArgs(bob.address, shares.add(ONE_ETH));
                    });
                    
                    it("if happens smth unexpected with pool", async () => {

                        await time.increase(lockupIntervalCount*dayInSeconds+9n);    
                        
                        await CommunityCoin.connect(bob).approve(CommunityCoin.target, shares);

                        // broke contract and emulate 'Error when unstake' response
                        await communityStakingPool.setStakingToken(ZERO_ADDRESS);

                        await expect(CommunityCoin.connect(bob)["unstake(uint256)"](shares)).to.be.revertedWith('UNSTAKE_ERROR');
        
                    }); 
                });
                describe("should unstake", function () {
                        
                    // beforeEach("before each callback", async() => {
                    // });

                    it("successfull ", async () => {
                        // pass some mtime
                        await time.increase(lockupIntervalCount*dayInSeconds+9n);    

                        let bobERC20TokenBefore = await erc20.balanceOf(bob.address);

                        await CommunityCoin.connect(bob).approve(CommunityCoin.target, shares);
                        await CommunityCoin.connect(bob)["unstake(uint256)"](shares);

                        let bobERC20TokenAfter = await erc20.balanceOf(bob.address);
                        
                        expect(bobERC20TokenAfter).gt(bobERC20TokenBefore);
                    });
                    
                });
            });

            context(`redeem reserve token`, () => {
                describe(`shouldnt redeem`, function () {

                    it("if happens smth unexpected with pool", async () => {

                        // pass some mtime
                        await time.increase(lockupIntervalCount*dayInSeconds+9n);   
                        
                        // imitate exists role
                        await mockCommunity.connect(owner).setRoles(alice.address, [0x99,0x98,0x97,0x96,REDEEM_ROLE]);
                        
                        // transfer from bob to alice
                        await CommunityCoin.connect(bob).transfer(alice.address, shares);
                        
                        await CommunityCoin.connect(alice).approve(CommunityCoin.target, shares);

                        // broke contract and emulate 'Error when redeem in an instance' response
                        await communityStakingPool.setStakingToken(ZERO_ADDRESS);

                        await expect(CommunityCoin.connect(alice)[`redeem(uint256)`](shares)).to.be.revertedWith('REDEEM_ERROR');


                    }); 

                    describe("without redeem role", function () {
                        it("if send directly", async() => {
                            await expect(
                                CommunityCoin.connect(bob).transfer(CommunityCoin.target, shares)
                            ).to.be.revertedWith('MissingRole').withArgs(bob.address, REDEEM_ROLE);
                        });

                        it("if anyone didn't transfer tokens to you before", async () => {
                            await expect(
                                CommunityCoin.connect(bob)[`redeem(uint256)`](shares)
                            ).to.be.revertedWith('MissingRole').withArgs(bob.address, REDEEM_ROLE);
                        });
                        describe("after someone transfer", function () {  
                            beforeEach("before each callback", async() => {
                                await CommunityCoin.connect(bob).transfer(alice.address, shares);
                            });  
                            
                            it("without approve before", async () => {
                                await expect(
                                    CommunityCoin.connect(alice)[`redeem(uint256)`](shares)
                                ).to.be.revertedWith('MissingRole').withArgs(alice.address, REDEEM_ROLE);
                            });
                            it("without approve before even if passed time", async () => {
                                // pass some mtime
                                await time.increase(lockupIntervalCount*dayInSeconds+9n);    
                                await expect(
                                    CommunityCoin.connect(alice)[`redeem(uint256)`](shares)
                                ).to.be.revertedWith('MissingRole').withArgs(alice.address, REDEEM_ROLE);
                            });
                            
                            it("with approve before", async () => {
                                await CommunityCoin.connect(alice).approve(CommunityCoin.target, shares);
                                await expect(
                                    CommunityCoin.connect(alice)[`redeem(uint256)`](shares)
                                ).to.be.revertedWith('MissingRole').withArgs(alice.address, REDEEM_ROLE);
                            });
                            it("with approve before even if passed time", async () => {
                                await CommunityCoin.connect(alice).approve(CommunityCoin.target, shares);
                                // pass some mtime
                                await time.increase(lockupIntervalCount*dayInSeconds+9n);    

                                await expect(
                                    CommunityCoin.connect(alice)[`redeem(uint256)`](shares)
                                ).to.be.revertedWith('MissingRole').withArgs(alice.address, REDEEM_ROLE);

                            });
                        
                        });     
                    
                    });

                    describe("with redeem role", function () {
                        beforeEach("before each callback", async() => {
                            
                            // imitate exists role
                            await mockCommunity.connect(owner).setRoles(bob.address, [0x99,0x98,0x97,0x96,REDEEM_ROLE]);
                            
                        });

                        it("if anyone didn't transfer tokens to you before", async () => {
                            await expect(
                                CommunityCoin.connect(bob)[`redeem(uint256)`](shares)
                            ).to.be.revertedWith('InsufficientBalance').withArgs(bob.address, shares);
                        });
    
                        it("but without transfer to some one", async () => {
                            // means that bob have tokens(after stake), he have redeem role, but totalRedeemable are zero
                            // here it raise a erc777 
                            
                            //!!await CommunityCoin.connect(owner).grantRole(ethers.utils.formatBytes32String(REDEEM_ROLE), bob.address);
                            await CommunityCoin.connect(bob).approve(CommunityCoin.target, shares);

                            await expect(
                                CommunityCoin.connect(bob)[`redeem(uint256)`](shares)
                            ).to.be.revertedWith('InsufficientBalance').withArgs(bob.address, shares);
                        });
                        
                        describe("after someone transfer", function () {  
                            beforeEach("before each callback", async() => {
                                await CommunityCoin.connect(bob).transfer(alice.address, shares);
                                
                                // imitate exists role
                                await mockCommunity.connect(owner).setRoles(alice.address, [0x99,0x98,0x97,0x96,REDEEM_ROLE]);
                                
                            });  
                            
                            it("without approve before", async () => {
                                await expect(
                                    CommunityCoin.connect(alice)[`redeem(uint256)`](shares)
                                ).to.be.revertedWith('AmountExceedsAllowance').withArgs(alice.address, shares);
                            });

                            it("without approve before even if passed time", async () => {
                                // pass some mtime
                                await time.increase(lockupIntervalCount*dayInSeconds+9n);    
                                await expect(
                                    CommunityCoin.connect(alice)[`redeem(uint256)`](shares)
                                ).to.be.revertedWith('AmountExceedsAllowance').withArgs(alice.address, shares);
                            });
                            
                        });      

                    });

                });
                describe("should redeem", function () {
                    var uniswapV2PairAddress;
                    var uniswapV2PairInstance;
                    var aliceERC20TokenBefore;
                    var aliceERC20TokenAfter;
                    var aliceReservedTokenBefore;
                    var aliceTradedTokenBefore;
                    
                    beforeEach("before each callback", async() => {
                        // pass some mtime
                        await time.increase(lockupIntervalCount*dayInSeconds+9n);    
                        
                        // imitate exists role
                        await mockCommunity.connect(owner).setRoles(alice.address, [0x99,0x98,0x97,0x96,REDEEM_ROLE]);
                        
                        // transfer from bob to alice
                        await CommunityCoin.connect(bob).transfer(alice.address, shares);
                        //await CommunityCoin.connect(owner).grantRole(ethers.utils.formatBytes32String(REDEEM_ROLE), alice.address);

                        aliceERC20TokenBefore = await erc20.balanceOf(alice.address);

                        // aliceReservedTokenBefore = await erc20ReservedToken.balanceOf(alice.address);
                        // aliceTradedTokenBefore = await erc20TradedToken.balanceOf(alice.address);
                    });

                    it("should redeem directly", async() => {
                        aliceERC20TokenBefore = await erc20.balanceOf(alice.address);
                        await CommunityCoin.connect(alice).transfer(CommunityCoin.target, shares);
                        aliceERC20TokenAfter = await erc20.balanceOf(alice.address);
                        expect(aliceERC20TokenAfter).gt(aliceERC20TokenBefore);
                    });

                    // for (const preferredInstance of [false, true]) {
                    // for (const swapThroughMiddle of [false, true]) {

                    //     it(`via redeem method`+` ${preferredInstance ? 'with preferred instances' : ''}` + ` ${swapThroughMiddle ? 'and swap through middle token' : ''}`, async () => {
                    //         var amountAfterSwapLP, tokenAfterSwap, aliceFakeUSDTToken;
                    //         await CommunityCoin.connect(alice).approve(CommunityCoin.target, shares);
                    //         if (preferredInstance) {
                    //             let instanceManagementAddr = await CommunityCoin.connect(bob).instanceManagment();
                    //             instanceManagementInstance = await ethers.getContractAt("CommunityStakingPoolFactory",instanceManagementAddr);
                    //             let pList = await instanceManagementInstance.instances();

                    //             if (preferredInstance) {

                    //                 if (swapThroughMiddle) {

                    //                     //Gettting how much tokens USDT user will obtain if swap all lp to usdt through middle token
                    //                     tmp = await CommunityCoin.connect(alice).simulateRedeemAndRemoveLiquidity(
                    //                         alice.address, 
                    //                         shares, 
                    //                         pList, 
                    //                         [
                    //                             //[fakeMiddle.address, instanceManagementAddr],
                    //                             [fakeMiddle.address, fakeUSDT.address]
                                                
                    //                         ]
                    //                     );
                    //                 } else {
                    //                     //Gettting how much tokens USDT user will obtain if swap all lp to usdt
                    //                         tmp = await CommunityCoin.connect(alice).simulateRedeemAndRemoveLiquidity(
                    //                         alice.address, 
                    //                         shares, 
                    //                         pList, 
                    //                         [
                    //                             [fakeUSDT.address]
                    //                         ]
                    //                     );
                                        
                    //                 }
                    //                 tokenAfterSwap = tmp[0];
                    //                 amountAfterSwapLP = tmp[1];
                                    
                    //             }

                    //             await CommunityCoin.connect(alice)[`redeem(uint256,address[])`](shares, pList);

                    //         } else {

                    //             await CommunityCoin.connect(alice)[`redeem(uint256)`](shares);

                    //         }
                    //         aliceLPTokenAfter = await uniswapV2PairInstance.balanceOf(alice.address);
                    //         aliceReservedTokenAfter = await erc20ReservedToken.balanceOf(alice.address);
                    //         aliceTradedTokenAfter = await erc20TradedToken.balanceOf(alice.address);

                    //         if (preferredInstance) {
                    //             // now swap reserve and traded tokens to usdt
                    //             const ts = await time.latest();
                    //             const timeUntil = parseInt(ts)+parseInt(lockupIntervalCount*dayInSeconds);

                    //             // erc20TradedToken->erc20ReservedToken
                    //             await erc20TradedToken.connect(alice).approve(uniswapRouterInstance.address, aliceTradedTokenAfter.sub(aliceTradedTokenBefore));
                    //             tmp2 = await uniswapRouterInstance.connect(alice).swapExactTokensForTokens(
                    //                 aliceTradedTokenAfter.sub(aliceTradedTokenBefore), 0, [erc20TradedToken.address, erc20ReservedToken.address], alice.address, timeUntil
                    //             );

                    //             aliceReservedTokenAfter = await erc20ReservedToken.balanceOf(alice.address);

                    //             if (swapThroughMiddle) {
                                    
                    //                 let aliceMiddleTokenBefore = await fakeMiddle.balanceOf(alice.address);

                    //                 // total erc20ReservedToken->middle->usdt
                    //                 await erc20ReservedToken.connect(alice).approve(uniswapRouterInstance.address, aliceReservedTokenAfter.sub(aliceReservedTokenBefore));
                    //                 await uniswapRouterInstance.connect(alice).swapExactTokensForTokens(
                    //                     aliceReservedTokenAfter.sub(aliceReservedTokenBefore), 0, [erc20ReservedToken.address, fakeMiddle.address], alice.address, timeUntil
                    //                 );
                    //                 let aliceMiddleTokenAfter = await fakeMiddle.balanceOf(alice.address);

                    //                 await fakeMiddle.connect(alice).approve(uniswapRouterInstance.address, aliceMiddleTokenAfter.sub(aliceMiddleTokenBefore));
                    //                 await uniswapRouterInstance.connect(alice).swapExactTokensForTokens(
                    //                     aliceMiddleTokenAfter.sub(aliceMiddleTokenBefore), 0, [fakeMiddle.address, fakeUSDT.address], alice.address, timeUntil
                    //                 );

                    //             } else {

                    //                 await erc20ReservedToken.connect(alice).approve(uniswapRouterInstance.address, aliceReservedTokenAfter.sub(aliceReservedTokenBefore));
                    //                 await uniswapRouterInstance.connect(alice).swapExactTokensForTokens(
                    //                     aliceReservedTokenAfter.sub(aliceReservedTokenBefore), 0, [erc20ReservedToken.address, fakeUSDT.address], alice.address, timeUntil
                    //                 );
                                    
                    //             }

                    //             aliceFakeUSDTToken = await fakeUSDT.balanceOf(alice.address);

                    //             // and compare with amountAfterSwapLP. it should be the same
                    //             expect(amountAfterSwapLP).to.be.eq(aliceFakeUSDTToken);
                    //             expect(amountAfterSwapLP).not.to.be.eq(ZERO);
                    //             expect(aliceFakeUSDTToken).not.to.be.eq(ZERO);
                                
                    //         }

                            
                                
                    //         expect(aliceReservedTokenAfter).gt(aliceReservedTokenBefore);
                    //         expect(aliceTradedTokenAfter).gt(aliceTradedTokenBefore);
                            

                    //     });
                    // }
                    // }

                    
                    it("via directly send to contract", async () => {
                        await CommunityCoin.connect(alice).transfer(CommunityCoin.target, shares);
                        aliceERC20TokenAfter = await erc20.balanceOf(alice.address);
                        expect(aliceERC20TokenAfter).gt(aliceERC20TokenBefore);
                    });

                    // it.only("test", async () => {
                    //     await mockCommunity.connect(owner).setRoles(charlie.address, [CIRCULATE_ROLE]);

                    //     await CommunityCoin.connect(charlie).addToCirculation(charlie.address, shares);

                    //     //try to unstake
                    //     await CommunityCoin.connect(charlie).approve(CommunityCoin.target, shares);
                    //     await CommunityCoin.connect(charlie).unstake(shares);
                    //     //try to redeem
                    //     await mockCommunity.connect(owner).setRoles(charlie.address, [REDEEM_ROLE]);
                        
                            
                    // });

                    it("discountSensivityTests", async () => {
                        var amountWithout, amountWith, snapId;

                        // ----- calculate amount obtain without circulation ------//
                        snapId = await ethers.provider.send('evm_snapshot', []);
                        
                        await CommunityCoin.connect(alice).transfer(CommunityCoin.target, shares);
                        amountWithout = await erc20.balanceOf(alice.address);

                        await ethers.provider.send('evm_revert', [snapId]);

                        // ----- calculate amount obtain with circulation ------//
                        snapId = await ethers.provider.send('evm_snapshot', []);
                        // imitate exists role
                        //await mockCommunity.connect(owner).setRoles([0x99,0x98,0x97,0x96,CIRCULATE_ROLE]);
                        await mockCommunity.connect(owner).setRoles(charlie.address, [0x99,0x98,0x97,CIRCULATE_ROLE,REDEEM_ROLE]);

                        await CommunityCoin.connect(charlie).addToCirculation(charlie.address, shares);
                        await CommunityCoin.connect(alice).transfer(CommunityCoin.target, shares);

                        amountWith = await erc20.balanceOf(alice.address);

                        await ethers.provider.send('evm_revert', [snapId]);

                        //---------------
                        // check correct sensivity discount = 1*FRACTION;
                        // means 
                        //  ratio = A / (A + B * discountSensitivity);
                        //  amount * amount *ratio;
                        // Where: 
                        //  B - it's circulation tokens
                        //  A - totalRedeemable

                        // !!!!! it should be in two times less !!!!!!

                        // then constantly tax
                        //amount = amount * total.totalReserves / totalSupplyBefore;
                        // again descrease in two times

                        // i general we expect obtain in four times less
                        expect(amountWithout.div(amountWith)).to.be.eq(FOUR);

                            //what if it will be if sensitivityDiscount is zero
                        
                        

                    });
                        
                    
                
                });
            });

            
        
        });      
*/
    });

});