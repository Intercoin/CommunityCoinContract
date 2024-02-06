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

// make hardcode for bsc. the same in MockCommunityStakingPool
const UNISWAP_ROUTER_FACTORY_ADDRESS = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73';
const UNISWAP_ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E';


const INVITEDBY_FRACTION = 0;

const REDEEM_ROLE       = 0x2;//'redeem';
const CIRCULATE_ROLE    = 0x3;//'circulate';
const TARIFF_ROLE       = 0x4;//'tariff';

const FRACTION = BigNumber.from('100000');

const NO_DONATIONS = [];

const NO_BONUS_FRACTIONS = ZERO; // no bonus. means amount*NO_BONUS_FRACTIONS/FRACTION = X*0/10000 = 0
const BONUS_FRACTIONS = 50000; // 50%

const PRICE_DENOM = 100_000_000; // 1e8
const NO_POPULAR_TOKEN = ZERO_ADDRESS;


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
    const denominator = 1;
    const dayInSeconds = 24*60*60; // * interval: DAY in seconds
    const lockupIntervalCount = 365; // year in days(dayInSeconds)
    const percentLimitLeftTokenB = 0.001;

    const discountSensitivity = 1*FRACTION;
    const rewardsRateFraction = FRACTION;

    const rewardsTenPercentBonus = 10;

    const walletTokenName = 'ITR community';
    const walletTokenSymbol = 'ITRc';
    
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
    var snapId;
    before("deploying", async() => {
        snapId = await ethers.provider.send('evm_snapshot', []);
    });
    beforeEach("deploying", async() => {
        const ReleaseManagerFactoryF = await ethers.getContractFactory("MockReleaseManagerFactory");
        const ReleaseManagerF = await ethers.getContractFactory("MockReleaseManager");
        const CommunityCoinFactoryF = await ethers.getContractFactory("CommunityCoinFactory");

        const PoolStakesLibF = await ethers.getContractFactory("PoolStakesLib");
	    let poolStakesLib = await PoolStakesLibF.deploy();
        
        const CommunityCoinF = await ethers.getContractFactory("MockCommunityCoin", {
            libraries: {
                "contracts/libs/PoolStakesLib.sol:PoolStakesLib": poolStakesLib.address
            }
        });
        const CommunityStakingPoolF = await ethers.getContractFactory("MockCommunityStakingPool");
        const CommunityStakingPoolFactoryF = await ethers.getContractFactory("CommunityStakingPoolFactory");

        const RewardsF = await ethers.getContractFactory("Rewards");
        const MockCommunityF = await ethers.getContractFactory("MockCommunity");
        ERC20Factory = await ethers.getContractFactory("ERC20Mintable");
        ERC777Factory = await ethers.getContractFactory("ERC777Mintable");
        
        
        let implementationReleaseManager    = await ReleaseManagerF.deploy();

        let releaseManagerFactory   = await ReleaseManagerFactoryF.connect(owner).deploy(implementationReleaseManager.address);
        let tx,rc,event,instance,instancesCount;
        //
        tx = await releaseManagerFactory.connect(owner).produce();
        rc = await tx.wait(); // 0ms, as tx is already confirmed
        event = rc.events.find(event => event.event === 'InstanceProduced');
        [instance, instancesCount] = event.args;
        releaseManager = await ethers.getContractAt("MockReleaseManager",instance);

        erc20 = await ERC20Factory.deploy("ERC20 Token", "ERC20");
        erc20Paying = await ERC20Factory.deploy("ERC20 Token Paying", "ERC20Paying");
        erc777 = await ERC777Factory.deploy("ERC777 Token", "ERC777");
        erc20TradedToken = await ERC20Factory.deploy("ERC20 Traded Token", "ERC20-TRD");
        erc20ReservedToken = await ERC20Factory.deploy("ERC20 Reserved Token", "ERC20-RSRV");
        erc20Reward = await ERC20Factory.deploy("ERC20 Token Reward", "ERC20-R");

        implementationCommunityCoin = await CommunityCoinF.deploy();
        implementationCommunityStakingPoolFactory = await CommunityStakingPoolFactoryF.deploy();
        implementationCommunityStakingPool = await CommunityStakingPoolF.deploy();

        rewardsHook = await RewardsF.deploy();

        const PRICE_REWARDS = PRICE_DENOM;
        const amoutnRaisedVal = THOUSAND.mul(THOUSAND).mul(THOUSAND).mul(ONE_ETH);
        let timeLatest = await time.latest();

        await rewardsHook.connect(owner).initialize(
            erc20Reward.address,                    //address sellingToken,
            [timeLatest.toString()],                //uint256[] memory timestamps,
            [PRICE_REWARDS],                        // uint256[] memory _prices,
            [amoutnRaisedVal],                      // uint256[] memory _amountRaised,
            timeLatest.add(timeLatest).toString(),//make a huge ts //uint64 _endTs,
            [ethers.utils.parseEther("0.00001")],   // uint256[] memory thresholds,
            [rewardsTenPercentBonus]   // 10%       // uint256[] memory bonuses
        )

        mockCommunity = await MockCommunityF.deploy();

        const COMMUNITY_SETTINGS = [
            INVITEDBY_FRACTION,
            mockCommunity.address, 
            REDEEM_ROLE, 
            CIRCULATE_ROLE,
            TARIFF_ROLE
        ];

        const NO_COSTMANAGER = ZERO_ADDRESS;
        
        CommunityCoinFactory  = await CommunityCoinFactoryF.deploy(
            implementationCommunityCoin.address, 
            implementationCommunityStakingPoolFactory.address, 
            implementationCommunityStakingPool.address, 
            erc20.address, // as linkedContract
            NO_COSTMANAGER,
            releaseManager.address
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
        
        await releaseManager.connect(owner).newRelease(factoriesList, factoryInfo);

        // without hook
        tx = await CommunityCoinFactory.connect(owner).produce(walletTokenName, walletTokenSymbol, [ZERO_ADDRESS], discountSensitivity, COMMUNITY_SETTINGS, owner.address);
        rc = await tx.wait(); // 0ms, as tx is already confirmed
        event = rc.events.find(event => event.event === 'InstanceCreated');
        [instance, instancesCount] = event.args;
        CommunityCoin = await ethers.getContractAt("MockCommunityCoin",instance);

        // with hook
        tx = await CommunityCoinFactory.connect(owner).produce(walletTokenName, walletTokenSymbol, [rewardsHook.address], discountSensitivity, COMMUNITY_SETTINGS, owner.address);
        rc = await tx.wait(); // 0ms, as tx is already confirmed
        event = rc.events.find(event => event.event === 'InstanceCreated');
        [instance, instancesCount] = event.args;
        CommunityCoinWithRewardsHook = await ethers.getContractAt("CommunityCoin",instance);
        
    });

    it("The new community coin owner is not the sender, but rather the one pointed to in the parameters as instanceOwner.", async() => {
        let tx = await CommunityCoinFactory.connect(owner).produce(
            walletTokenName, 
            walletTokenSymbol, 
            [ZERO_ADDRESS], 
            discountSensitivity, 
            [
                INVITEDBY_FRACTION,
                mockCommunity.address, 
                REDEEM_ROLE, 
                CIRCULATE_ROLE,
                TARIFF_ROLE
            ], 
            alice.address
        );
        let rc = await tx.wait(); // 0ms, as tx is already confirmed
        let event = rc.events.find(event => event.event === 'InstanceCreated');
        let instance;
        [instance, ] = event.args;
        var communityCoinContract = await ethers.getContractAt("MockCommunityCoin",instance);

        await expect(
            communityCoinContract.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
                erc20.address,
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
            erc20.address,
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
        let count = await CommunityCoinFactory.instancesCount();
        await expect(count).to.be.equal(TWO);
    })

    it("shouldnt produce if pool with token already exists", async() => {

        await CommunityCoin.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
            erc20.address,
            lockupIntervalCount,
            NO_BONUS_FRACTIONS,
            NO_POPULAR_TOKEN,
            NO_DONATIONS,
            rewardsRateFraction,
            numerator,
            denominator
        );

        await expect(CommunityCoin.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
            erc20.address,
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

        let tx = await CommunityCoin.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
            erc20.address,
            lockupIntervalCount,
            NO_BONUS_FRACTIONS,
            NO_POPULAR_TOKEN,
            NO_DONATIONS,
            rewardsRateFraction,
            numerator,
            denominator
        );
        
        const rc = await tx.wait(); // 0ms, as tx is already confirmed
        const event = rc.events.find(event => event.event === 'InstanceCreated');
        const [erc20token, instance] = event.args;

        expect(instance).not.to.be.eq(ZERO_ADDRESS); 
    });

    
    it("should change inviteByFraction ", async() => {
        const oldInvitedByFraction = await CommunityCoin.invitedByFraction();
        const toSetInvitedByFraction = FRACTION.sub(123);
        await expect(CommunityCoin.connect(alice).setCommission(toSetInvitedByFraction)).to.be.revertedWith("Ownable: caller is not the owner");
        await CommunityCoin.connect(owner).setCommission(toSetInvitedByFraction);
        const newInvitedByFraction = await CommunityCoin.invitedByFraction();

        expect(oldInvitedByFraction).to.be.eq(INVITEDBY_FRACTION);
        expect(newInvitedByFraction).to.be.eq(toSetInvitedByFraction);
    });

    it("donate tests: (donations:50% and 25%. left for sender)", async () => {
        var communityStakingPool;

    
        const DONATIONS = [[david.address, FRACTION*50/100], [frank.address, FRACTION*25/100]];

        let tx = await CommunityCoin.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
            erc20.address,
            lockupIntervalCount,
            NO_BONUS_FRACTIONS,
            NO_POPULAR_TOKEN,
            DONATIONS,
            rewardsRateFraction,
            numerator,
            denominator
        );
        

        const rc = await tx.wait(); // 0ms, as tx is already confirmed
        const event = rc.events.find(event => event.event === 'InstanceCreated');
        const [erc20token, instance] = event.args;
        
        communityStakingPool = await ethers.getContractAt("MockCommunityStakingPool",instance);

        const shares = ONE_ETH.mul(ONE);
        await erc20.mint(bob.address, shares);
        await erc20.connect(bob).approve(communityStakingPool.address, shares);

        const bobCommunityCoinTokensBefore = await CommunityCoin.balanceOf(bob.address);
        const davidERC20TokensBefore = await erc20.balanceOf(david.address);
        const frankERC20TokensBefore = await erc20.balanceOf(frank.address);

        await communityStakingPool.connect(bob).stake(shares, bob.address);
        
        const bobCommunityCoinTokensAfter = await CommunityCoin.balanceOf(bob.address);
        const davidERC20TokensAfter = await erc20.balanceOf(david.address);
        const frankERC20TokensAfter = await erc20.balanceOf(frank.address);

        // donates 50% and 25% and left for Bob
        expect(bobCommunityCoinTokensAfter.sub(bobCommunityCoinTokensBefore)).to.be.eq(shares.mul(FRACTION*25/100).div(FRACTION));
        expect(davidERC20TokensAfter.sub(davidERC20TokensBefore)).to.be.eq(shares.mul(FRACTION*50/100).div(FRACTION));
        expect(frankERC20TokensAfter.sub(frankERC20TokensBefore)).to.be.eq(shares.mul(FRACTION*25/100).div(FRACTION));

        
    });  

    it("donate tests: (donations address should be EOA)", async () => {
        const DONATIONS = [[CommunityCoin.address, FRACTION*50/100], [erc20.address, FRACTION*25/100]];

        await expect(
            CommunityCoin.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
                erc20.address,
                lockupIntervalCount,
                NO_BONUS_FRACTIONS,
                NO_POPULAR_TOKEN,
                DONATIONS,
                rewardsRateFraction,
                numerator,
                denominator
            )
        ).to.be.revertedWith('InvalidDonationAddress');
    });  

    it("donate tests: (should be Full Donation if staking != INTER)", async () => {
        const DONATIONS = [[david.address, FRACTION*50/100], [frank.address, FRACTION*25/100]];
        const DONATIONS_FULL_SINGLE = [[david.address, FRACTION*100/100]];
        const DONATIONS_FULL_MULTIPLE = [[david.address, FRACTION*50/100], [frank.address, FRACTION*25/100], [charlie.address, FRACTION*25/100]];

        await expect(
            CommunityCoin.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
                erc20Paying.address,
                lockupIntervalCount,
                NO_BONUS_FRACTIONS,
                NO_POPULAR_TOKEN,
                DONATIONS,
                rewardsRateFraction,
                numerator,
                denominator
            )
        ).to.be.revertedWith('ShouldBeFullDonations');

        await CommunityCoin.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
            erc20Paying.address,
            lockupIntervalCount,
            NO_BONUS_FRACTIONS,
            NO_POPULAR_TOKEN,
            DONATIONS_FULL_SINGLE,
            rewardsRateFraction,
            numerator,
            denominator
        );
        await CommunityCoin.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
            erc777.address,
            lockupIntervalCount,
            NO_BONUS_FRACTIONS,
            NO_POPULAR_TOKEN,
            DONATIONS_FULL_MULTIPLE,
            rewardsRateFraction,
            numerator,
            denominator
        )
    });  

    describe("tariff tests", function () {
        var communityStakingPool;
        before("deploying", async() => {
            // restore snapshot
            await ethers.provider.send('evm_revert', [snapId]);
        });
        beforeEach("deploying", async() => {

            let tx = await CommunityCoin.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
                erc20.address,
                lockupIntervalCount,
                NO_BONUS_FRACTIONS,
                NO_POPULAR_TOKEN,
                NO_DONATIONS,
                rewardsRateFraction,
                numerator,
                denominator
            );

            const rc = await tx.wait(); // 0ms, as tx is already confirmed
            const event = rc.events.find(event => event.event === 'InstanceCreated');
            const [erc20token, instance] = event.args;

            communityStakingPool = await ethers.getContractAt("MockCommunityStakingPool",instance);

        });    
        it("shouldn't set tariff by owner or anyone except tariffrole memeber", async () => {
            await expect(CommunityCoin.connect(owner).setTariff(ONE, ONE)).to.be.revertedWith('MissingRole').withArgs(owner.address, TARIFF_ROLE);
            await expect(CommunityCoin.connect(bob).setTariff(ONE, ONE)).to.be.revertedWith('MissingRole').withArgs(bob.address, TARIFF_ROLE);
            await expect(CommunityCoin.connect(frank).setTariff(ONE, ONE)).to.be.revertedWith('MissingRole').withArgs(frank.address, TARIFF_ROLE);
        });    
        it("should set tariff(redeem / unstake)", async () => {
            await mockCommunity.connect(owner).setRoles(charlie.address, [TARIFF_ROLE]);
            await CommunityCoin.connect(charlie).setTariff(ONE, ONE);
        });

        it("shouldn't exсeed max tariff(redeem / unstake)", async () => {
            await mockCommunity.connect(owner).setRoles(charlie.address, [TARIFF_ROLE]);

            const MAX_REDEEM_TARIFF = await CommunityCoin.MAX_REDEEM_TARIFF();
            const MAX_UNSTAKE_TARIFF = await CommunityCoin.MAX_UNSTAKE_TARIFF(); 

            await expect(CommunityCoin.connect(charlie).setTariff(TWO.mul(MAX_REDEEM_TARIFF), ONE)).to.be.revertedWith('AmountExceedsMaxTariff');
            await expect(CommunityCoin.connect(charlie).setTariff(ONE, TWO.mul(MAX_UNSTAKE_TARIFF))).to.be.revertedWith('AmountExceedsMaxTariff');
            
        });

        describe("should consume by correct tariff", function () {
            var shares;
            beforeEach("deploying", async() => {

                await erc20.mint(bob.address, ONE_ETH.mul(ONE));
                await erc20.connect(bob).approve(communityStakingPool.address, ONE_ETH.mul(ONE));
                await communityStakingPool.connect(bob).stake(ONE_ETH.mul(ONE), bob.address);
                shares = await CommunityCoin.balanceOf(bob.address);

                // pass some mtime
                await time.increase(lockupIntervalCount*dayInSeconds+9);    

            });

            it(" - when unstake", async () => {
                const MAX_UNSTAKE_TARIFF = await CommunityCoin.MAX_UNSTAKE_TARIFF(); 
                let snapId;
                let bobTokensWithoutTariff, bobTokensWithTariff;

                // make snapshot before time manipulations
                snapId = await ethers.provider.send('evm_snapshot', []);

                let bobCommunityCoinTokenBefore1 = await CommunityCoin.balanceOf(bob.address);
                
                let bobERC20TokenBefore1 = await erc20.balanceOf(bob.address);
                
                await CommunityCoin.connect(bob).approve(CommunityCoin.address, shares);
                await CommunityCoin.connect(bob)["unstake(uint256)"](shares);

                let bobCommunityCoinTokenAfter1 = await CommunityCoin.balanceOf(bob.address);
                
                let bobERC20TokenAfter1 = await erc20.balanceOf(bob.address);
                
                bobTokensWithoutTariff = bobERC20TokenAfter1.sub(bobERC20TokenBefore1);
                expect(bobCommunityCoinTokenBefore1).gt(bobCommunityCoinTokenAfter1);
                expect(bobCommunityCoinTokenAfter1).eq(ZERO);
                
                expect(bobERC20TokenAfter1).gt(bobERC20TokenBefore1);
                

                // restore snapshot
                await ethers.provider.send('evm_revert', [snapId]);
                //----------------------------------------------------------------
                // make snapshot before time manipulations
                snapId = await ethers.provider.send('evm_snapshot', []);

                await mockCommunity.connect(owner).setRoles(charlie.address, [TARIFF_ROLE]);
                await CommunityCoin.connect(charlie).setTariff(ONE, MAX_UNSTAKE_TARIFF);

                let bobCommunityCoinTokenBefore2 = await CommunityCoin.balanceOf(bob.address);
                
                let bobERC20TokenBefore2 = await erc20.balanceOf(bob.address);

                await CommunityCoin.connect(bob).approve(CommunityCoin.address, shares);

                const userUnstakeableBefore = await CommunityCoin.getUnstakeableMap(bob.address);
                const instanceUnstakeableBefore = await CommunityCoin.getInstanceUnstakeableMap(communityStakingPool.address, bob.address);

                await CommunityCoin.connect(bob)["unstake(uint256)"](shares);

                let userUnstakeableAfter = await CommunityCoin.getUnstakeableMap(bob.address);
                let instanceStakedAfter = await CommunityCoin.getInstanceStakedMap(communityStakingPool.address);
                let instanceUnstakeableAfter = await CommunityCoin.getInstanceUnstakeableMap(communityStakingPool.address, bob.address);

                let bobCommunityCoinTokenAfter2 = await CommunityCoin.balanceOf(bob.address);
                
                let bobERC20TokenAfter2 = await erc20.balanceOf(bob.address);

                bobTokensWithTariff = bobERC20TokenAfter2.sub(bobERC20TokenBefore2);

                expect(bobERC20TokenAfter2).gt(bobERC20TokenBefore2);
                expect(bobCommunityCoinTokenBefore2).gt(bobCommunityCoinTokenAfter2);
                expect(bobCommunityCoinTokenAfter2).eq(ZERO);
                
                // restore snapshot
                await ethers.provider.send('evm_revert', [snapId]);

                // now check unstake tariff
                expect(bobTokensWithTariff).to.be.eq(bobTokensWithoutTariff.sub(shares.mul(MAX_UNSTAKE_TARIFF).div(FRACTION)));

                // issue 53
                // https://github.com/Intercoin/StakingContract/issues/53
                //unstakeable tokens for users should consuming completely without taxes
                expect(userUnstakeableBefore.sub(shares)).to.be.eq(userUnstakeableAfter);
                expect(instanceUnstakeableBefore.sub(shares)).to.be.eq(instanceUnstakeableAfter);

                //if smhow to be zero
                expect(instanceUnstakeableAfter).not.to.be.eq(userUnstakeableBefore.sub(shares.mul(MAX_UNSTAKE_TARIFF).div(FRACTION)));

            });

            it(" - when redeem", async () => {
                const MAX_REDEEM_TARIFF = await CommunityCoin.MAX_REDEEM_TARIFF();

                let snapId;
                let aliceLPTokenWithoutTariff, aliceLPTokenWithTariff;

                // imitate exists role
                await mockCommunity.connect(owner).setRoles(alice.address, [0x99,0x98,0x97,0x96,REDEEM_ROLE]);
                // transfer from bob to alice
                await CommunityCoin.connect(bob).transfer(alice.address, shares);


                // make snapshot before time manipulations
                snapId = await ethers.provider.send('evm_snapshot', []);

                
                let aliceReservedTokenBefore1 = await erc20ReservedToken.balanceOf(alice.address);
                let aliceERC20TokenBefore1 = await erc20.balanceOf(alice.address);

                await CommunityCoin.connect(alice).approve(CommunityCoin.address, shares);
                await CommunityCoin.connect(alice)["redeem(uint256)"](shares);

                let aliceReservedTokenAfter1 = await erc20ReservedToken.balanceOf(alice.address);
                let aliceERC20TokenAfter1 = await erc20.balanceOf(alice.address);
                
                expect(aliceReservedTokenAfter1).eq(aliceReservedTokenBefore1);
                
                expect(aliceERC20TokenAfter1).gt(aliceERC20TokenBefore1);

                // restore snapshot
                await ethers.provider.send('evm_revert', [snapId]);
                //----------------------------------------------------------------
                // make snapshot before time manipulations
                snapId = await ethers.provider.send('evm_snapshot', []);

                await mockCommunity.connect(owner).setRoles(charlie.address, [TARIFF_ROLE]);
                await CommunityCoin.connect(charlie).setTariff(MAX_REDEEM_TARIFF, ONE);

                let aliceReservedTokenBefore2 = await erc20ReservedToken.balanceOf(alice.address);
                let aliceERC20TokenBefore2 = await erc20.balanceOf(alice.address);

                await CommunityCoin.connect(alice).approve(CommunityCoin.address, shares);
                await CommunityCoin.connect(alice)["redeem(uint256)"](shares);

                let aliceReservedTokenAfter2 = await erc20ReservedToken.balanceOf(alice.address);
                let aliceERC20TokenAfter2 = await erc20.balanceOf(alice.address);
                
                expect(aliceReservedTokenAfter2).eq(aliceReservedTokenBefore2);
                expect(aliceERC20TokenAfter2).gt(aliceERC20TokenBefore2);
                
                // restore snapshot
                await ethers.provider.send('evm_revert', [snapId]);

            });
        });

    });
 
    describe("Snapshots tests", function () {
        
        var communityStakingPool;
        
        var func;

        before("deploying", async() => {
            // restore snapshot
            await ethers.provider.send('evm_revert', [snapId]);
        });

        beforeEach("deploying", async() => {

            func = async (param_bonus_fractions) => {
                
                let tx = await CommunityCoin.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
                    erc20.address,
                    lockupIntervalCount,
                    param_bonus_fractions,
                    NO_POPULAR_TOKEN,
                    NO_DONATIONS,
                    rewardsRateFraction,
                    numerator,
                    denominator
                );


                const rc = await tx.wait(); // 0ms, as tx is already confirmed
                const event = rc.events.find(event => event.event === 'InstanceCreated');
                const [erc20token, instance] = event.args;
                
                communityStakingPool = await ethers.getContractAt("MockCommunityStakingPool",instance);
                //console.log("before each №2");
                
                //--------------------------------------------------------


                await erc20.mint(bob.address, ONE_ETH.mul(ONE));
                await erc20.connect(bob).approve(communityStakingPool.address, ONE_ETH.mul(ONE));
                await communityStakingPool.connect(bob).stake(ONE_ETH.mul(ONE), bob.address);
                
                let bobWalletTokens = await CommunityCoin.balanceOf(bob.address);

                return bobWalletTokens;

            }
            
        });

        it("Bonus tests::stake (Bonus:50%)", async () => {

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
            let tokensWithNoBonus = await func(NO_BONUS_FRACTIONS);

            await expect(CommunityCoin.connect(bob)["unstake(uint256)"](tokensWithNoBonus)).to.be.revertedWith('StakeNotUnlockedYet').withArgs(bob.address, tokensWithNoBonus, 0);
            

            // pass some mtime
            await time.increase(lockupIntervalCount*dayInSeconds+9);    

            await CommunityCoin.connect(bob).approve(CommunityCoin.address, tokensWithNoBonus);
            await CommunityCoin.connect(bob)["unstake(uint256)"](tokensWithNoBonus);

            // restore snapshot
            await ethers.provider.send('evm_revert', [snapId]);
            //--------------------------------------------------------------
            snapId = await ethers.provider.send('evm_snapshot', []);
            let tokensWithBonus = await func(BONUS_FRACTIONS, ZERO, ZERO_ADDRESS);

            await expect(CommunityCoin.connect(bob)["unstake(uint256)"](tokensWithNoBonus)).to.be.revertedWith('StakeNotUnlockedYet').withArgs(bob.address, tokensWithNoBonus, tokensWithNoBonus.div(TWO));
            await expect(CommunityCoin.connect(bob)["unstake(uint256)"](tokensWithBonus)).to.be.revertedWith('StakeNotUnlockedYet').withArgs(bob.address, tokensWithNoBonus, 0);

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

            await expect(CommunityCoin.connect(bob)["unstake(uint256)"](tokensWithBonus)).to.be.revertedWith('InsufficientAmount').withArgs(bob.address, tokensWithBonus);

            await CommunityCoin.connect(bob).transfer(alice.address, tokensWithBonus.sub(tokensWithNoBonus));

            await CommunityCoin.connect(bob).approve(CommunityCoin.address, tokensWithNoBonus);
            await CommunityCoin.connect(bob)["unstake(uint256)"](tokensWithNoBonus);

            // restore snapshot
            await ethers.provider.send('evm_revert', [snapId]);

            // finally check correct amount of bonuses
            let expectedBonusAmount = tokensWithNoBonus.mul(BONUS_FRACTIONS).div(FRACTION);
            expect(tokensWithBonus).to.be.eq(tokensWithNoBonus.add(expectedBonusAmount));

        });  

        it("InvitedBy tests", async () => {
            let snapId, bobTokens, aliceTokens;

            // make snapshot before time manipulations
            snapId = await ethers.provider.send('evm_snapshot', []);

            await func(NO_BONUS_FRACTIONS, ZERO, ZERO_ADDRESS);
            bobTokens = await CommunityCoin.balanceOf(bob.address);
            aliceTokens = await CommunityCoin.balanceOf(alice.address);

            expect(bobTokens).not.to.be.eq(aliceTokens);

            // restore snapshot
            await ethers.provider.send('evm_revert', [snapId]);

            await CommunityCoin.connect(owner).setCommission(FRACTION);
            await mockCommunity.setInvitedBy(alice.address, bob.address);
            
            // make snapshot before time manipulations
            snapId = await ethers.provider.send('evm_snapshot', []);
            await func(NO_BONUS_FRACTIONS, ZERO, ZERO_ADDRESS);

            bobTokens = await CommunityCoin.balanceOf(bob.address);
            aliceTokens = await CommunityCoin.balanceOf(alice.address);

            expect(bobTokens).to.be.eq(aliceTokens); // invitedBy - 100%

            // restore snapshot
            await ethers.provider.send('evm_revert', [snapId]);
        });  
  
    });

    describe("TrustedForwarder Rewards", function () {

        var rewards;
        
        const DONATIONS = [[david.address, FRACTION*50/100], [frank.address, FRACTION*25/100]];
                
        before("deploying", async() => {
            // restore snapshot
            await ethers.provider.send('evm_revert', [snapId]);
        });

        beforeEach("deploying", async() => {

            const RewardsF = await ethers.getContractFactory("Rewards");
            rewards = await RewardsF.deploy();
            await rewards.initialize(
                frank.address, //address sellingToken,
                [], //uint256[] memory timestamps,
                [], //uint256[] memory prices,
                [], //uint256[] memory _amountRaised,
                999999999, //uint64 _endTs,
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
            await expect(rewards.connect(owner).setTrustedForwarder(owner.address)).to.be.revertedWith("ForwarderCanNotBeOwner");
        });

    });

    describe("Rewards tests", function () {   
        var uniswapRouterFactoryInstance;
        var uniswapRouterInstance;
        var communityStakingPoolWithHook;

        var walletTokens;
        var lptokens;
        
        before("deploying", async() => {
            // restore snapshot
            await ethers.provider.send('evm_revert', [snapId]);
        });

        beforeEach("deploying", async() => {

            let tx = await CommunityCoinWithRewardsHook.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
                erc20.address,
                lockupIntervalCount,
                NO_BONUS_FRACTIONS,
                NO_POPULAR_TOKEN,
                NO_DONATIONS,
                rewardsRateFraction,
                numerator,
                denominator
            );


            const rc = await tx.wait(); // 0ms, as tx is already confirmed
            const event = rc.events.find(event => event.event === 'InstanceCreated');
            const [erc20token, instance] = event.args;
            
            communityStakingPoolWithHook = await ethers.getContractAt("MockCommunityStakingPool",instance);

                // await erc20.mint(bob.address, ONE_ETH.mul(ONE));
                // await erc20.connect(bob).approve(communityStakingPool.address, ONE_ETH.mul(ONE));
                // await communityStakingPool.connect(bob).stake(ONE_ETH.mul(ONE), bob.address);

        });

        it("test rewards tokens", async() => {
            const GroupName = "TestGroup";
          
            await rewardsHook.connect(owner).setGroup([bob.address], GroupName);
            const oldGroupBonus = await rewardsHook.getGroupBonus(GroupName);
            await expect(oldGroupBonus).to.be.eq(ZERO);

            await erc20.mint(bob.address, ONE_ETH.mul(ONE));
            await erc20.connect(bob).approve(communityStakingPoolWithHook.address, ONE_ETH.mul(ONE));
            
            await communityStakingPoolWithHook.connect(bob).stake(ONE_ETH.mul(ONE), bob.address);

            let shares = await CommunityCoinWithRewardsHook.balanceOf(bob.address);

            // pass some mtime
            await time.increase(lockupIntervalCount*dayInSeconds+9);    

            await CommunityCoinWithRewardsHook.connect(bob).approve(CommunityCoinWithRewardsHook.address, shares);

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
            await expect(CommunityCoinWithRewardsHook.connect(bob).claim()).to.be.revertedWith('InsufficientAmount');
            
            //now mint smth 
            await erc20Reward.mint(rewardsHook.address, HUNDRED.mul(ONE_ETH));
            //and try again
            let oldBobBalance = await erc20Reward.balanceOf(bob.address);
            await CommunityCoinWithRewardsHook.connect(bob).claim();
            let newBobBalance = await erc20Reward.balanceOf(bob.address);
            expect(newBobBalance).to.be.gt(oldBobBalance);

        });
    });

    describe("Taxes tests", function () {   
        var communityStakingPoolWithHook;

        var walletTokens;
        var lptokens;
        
        before("deploying", async() => {
            // restore snapshot
            await ethers.provider.send('evm_revert', [snapId]);
        });

        beforeEach("deploying", async() => {

            let tx = await CommunityCoin.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
                erc20.address,
                lockupIntervalCount,
                NO_BONUS_FRACTIONS,
                NO_POPULAR_TOKEN,
                NO_DONATIONS,
                rewardsRateFraction,
                numerator,
                denominator
            );
            
            const rc = await tx.wait(); // 0ms, as tx is already confirmed
            const event = rc.events.find(event => event.event === 'InstanceCreated');
            const [erc20token, instance] = event.args;
            
            communityStakingPoolWithHook = await ethers.getContractAt("CommunityStakingPool",instance);
            

        });

        describe("test transferHook ", function () {   
            var taxHook;
            beforeEach("before each", async() => {
                
                await erc20.mint(bob.address, ONE_ETH.mul(ONE));
                await erc20.connect(bob).approve(communityStakingPoolWithHook.address, ONE_ETH.mul(ONE));
                await communityStakingPoolWithHook.connect(bob).stake(ONE_ETH.mul(ONE), bob.address);
                
                walletTokens = await CommunityCoin.balanceOf(bob.address);
                
                const MockTaxesF = await ethers.getContractFactory("MockTaxes");
                taxHook = await MockTaxesF.deploy();
                
                await CommunityCoin.connect(owner).setupTaxAddress(taxHook.address);
                

            }); 

            it("should prevent transfer if disabled via hook contract", async() => {
                
                await taxHook.setupVars(ZERO,false);

                await expect(CommunityCoin.connect(bob).transfer(alice.address, walletTokens)).to.be.revertedWith('HookTransferPrevent').withArgs(bob.address, alice.address, walletTokens);
                
            });

            it("should allow transfer if enabled via hook contract", async() => {
                
                await taxHook.setupVars(FRACTION,true);
                
                await expect(
                    CommunityCoin.connect(bob).transfer(alice.address, walletTokens)
                ).not.to.be.revertedWith('HookTransferPrevent');
                //.withArgs(bob.address, alice.address, walletTokens.toString());
                
            });

            describe("test taxes ", function () {   
                let tmp1,tmp2,tmp3,tmp4;
                let obtainedTokensWithNoTax, obtainedTokensWithTax, senderTokensWithNoTax, senderTokensTokensWithTax;

                const TokensToSend = ONE_ETH.div(20);
                const PERCENTS_FRACTION = FIVE.mul(FRACTION).div(100); //5%*fraction

                beforeEach("before each", async() => {
                    await taxHook.setupVars(FRACTION,true);
                    tmp1 = await CommunityCoin.balanceOf(alice.address);
                    tmp3 = await CommunityCoin.balanceOf(bob.address);
                    await CommunityCoin.connect(bob).transfer(alice.address, TokensToSend);
                    tmp2 = await CommunityCoin.balanceOf(alice.address);
                    tmp4 = await CommunityCoin.balanceOf(bob.address);

                    obtainedTokensWithNoTax = tmp2.sub(tmp1);
                    senderTokensWithNoTax = tmp3.sub(tmp4);
                    
                });
                it("should reduce tokens while transfer if taxes used", async() => {

                    tmp1 = await CommunityCoin.balanceOf(alice.address);
                    await taxHook.setupVars(FRACTION.sub(PERCENTS_FRACTION), true);
                    await CommunityCoin.connect(bob).transfer(alice.address, TokensToSend);
                    tmp2 = await CommunityCoin.balanceOf(alice.address);

                    obtainedTokensWithTax = tmp2.sub(tmp1);

                    expect(obtainedTokensWithTax).to.be.lt(obtainedTokensWithNoTax);

                    expect(obtainedTokensWithNoTax.sub(obtainedTokensWithNoTax.mul(PERCENTS_FRACTION).div(FRACTION))).to.be.eq(obtainedTokensWithTax);
                    
                });

                it("shouldn't exceed maxTAX ", async() => {
                    
                    const TOO_MUCH_PERCENTS_FRACTION = HUNDRED.mul(FRACTION).div(100); //100%*fraction
                    
                    tmp1 = await CommunityCoin.balanceOf(alice.address);
                    await taxHook.setupVars(FRACTION.sub(TOO_MUCH_PERCENTS_FRACTION), true);
                    await CommunityCoin.connect(bob).transfer(alice.address, TokensToSend);
                    tmp2 = await CommunityCoin.balanceOf(alice.address);

                    obtainedTokensWithTax = tmp2.sub(tmp1);

                    expect(obtainedTokensWithTax).to.be.lt(obtainedTokensWithNoTax);

                    expect(obtainedTokensWithNoTax.sub(obtainedTokensWithNoTax.mul(PERCENTS_FRACTION).div(FRACTION))).not.to.be.eq(obtainedTokensWithTax);

                    let MAX_TAX = await await CommunityCoin.MAX_TAX();
                    expect(obtainedTokensWithNoTax.sub(obtainedTokensWithNoTax.mul(MAX_TAX).div(FRACTION))).to.be.eq(obtainedTokensWithTax);
                    
                });

                it("should mint extra tokens while transfer if taxes used ", async() => {
                    tmp1 = await CommunityCoin.balanceOf(alice.address);
                    await taxHook.setupVars(FRACTION.add(PERCENTS_FRACTION), true);
                    await CommunityCoin.connect(bob).transfer(alice.address, TokensToSend);
                    tmp2 = await CommunityCoin.balanceOf(alice.address);

                    obtainedTokensWithTax = tmp2.sub(tmp1);

                    expect(obtainedTokensWithTax).to.be.gt(obtainedTokensWithNoTax);

                    expect(obtainedTokensWithNoTax.add(obtainedTokensWithNoTax.mul(PERCENTS_FRACTION).div(FRACTION))).to.be.eq(obtainedTokensWithTax);
                });
                
                it("shouldn't exceed maxBOOST", async() => {
                     
                    const TOO_MUCH_PERCENTS_FRACTION = HUNDRED.mul(FRACTION).div(100); //100%*fraction
                    
                    tmp1 = await CommunityCoin.balanceOf(alice.address);
                    await taxHook.setupVars(FRACTION.add(TOO_MUCH_PERCENTS_FRACTION), true);
                    await CommunityCoin.connect(bob).transfer(alice.address, TokensToSend);
                    tmp2 = await CommunityCoin.balanceOf(alice.address);

                    obtainedTokensWithTax = tmp2.sub(tmp1);

                    expect(obtainedTokensWithTax).to.be.gt(obtainedTokensWithNoTax);

                    expect(obtainedTokensWithNoTax.add(obtainedTokensWithNoTax.mul(PERCENTS_FRACTION).div(FRACTION))).not.to.be.eq(obtainedTokensWithTax);

                    let MAX_BOOST = await await CommunityCoin.MAX_BOOST();
                    expect(obtainedTokensWithNoTax.add(obtainedTokensWithNoTax.mul(MAX_BOOST).div(FRACTION))).to.be.eq(obtainedTokensWithTax);
                });
            });
           
        }); 

    });

    describe("ERC20 pool tests", function () { 
        var communityStakingPoolERC20; 
        
        before("deploying", async() => {
            // restore snapshot
            await ethers.provider.send('evm_revert', [snapId]);
        });

        beforeEach("deploying", async() => { 
            let tx = await CommunityCoin.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
                erc20.address,
                lockupIntervalCount,
                NO_BONUS_FRACTIONS,
                NO_POPULAR_TOKEN,
                NO_DONATIONS,
                rewardsRateFraction,
                numerator,
                denominator
            );

            const rc = await tx.wait(); // 0ms, as tx is already confirmed
            const event = rc.events.find(event => event.event === 'InstanceCreated');
            const [erc20tokenAddress, instance] = event.args;
            
            communityStakingPoolERC20 = await ethers.getContractAt("CommunityStakingPool",instance);
        });
        it("should produce", async() => {
            expect(communityStakingPoolERC20.address).not.to.be.eq(ZERO_ADDRESS); 
        });

        it("shouldn't receive ether", async() => {
            await expect(
                owner.sendTransaction({
                    to: communityStakingPoolERC20.address,
                    value: ethers.utils.parseEther("1.0"), // Sends exactly 1.0 ether
                })
            ).not.to.be.revertedWith("DENIED()"); 
        });
        
        it("shouldnt create another pair with equal tokens", async() => {
            await expect(CommunityCoin["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
                erc20.address,
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

            await erc20.mint(bob.address, ONE_ETH.mul(ONE));
            await erc20.connect(bob).approve(communityStakingPoolERC20.address, ONE_ETH.mul(ONE));

            let charlieWalletTokensBefore = await CommunityCoin.balanceOf(charlie.address);
            let bobLptokensBefore = await erc20.balanceOf(communityStakingPoolERC20.address);

            await communityStakingPoolERC20.connect(bob).stake(ONE_ETH.mul(ONE), charlie.address);

            let walletTokens = await CommunityCoin.balanceOf(charlie.address);
            let lptokens = await erc20.balanceOf(communityStakingPoolERC20.address);
            
            // custom situation when  uniswapLP tokens equal sharesLP tokens.  can be happens in the first stake
            expect(BigNumber.from(lptokens)).not.to.be.eq(ZERO);
            expect(lptokens.mul(numerator).div(denominator)).to.be.eq(walletTokens);

            expect(charlieWalletTokensBefore).not.to.be.eq(walletTokens);
            expect(ZERO).not.to.be.eq(walletTokens);

            expect(bobLptokensBefore).not.to.be.eq(lptokens);
        
        }); 

        it("shouldnt buy and stake through paying token if havent uniswap pair", async () => {
            await erc20Paying.mint(bob.address, ONE_ETH.mul(ONE));
            await erc20Paying.connect(bob).approve(communityStakingPoolERC20.address, ONE_ETH.mul(ONE));
            
            await expect(communityStakingPoolERC20.connect(bob).buyAndStake(erc20Paying.address, ONE_ETH.mul(ONE), charlie.address)).to.be.revertedWith("NoUniswapV2Pair");
        }); 

        it("shouldnt buy in presale and stake if presale contract doesn't contain buy method", async () => {
            const badPresale1F = await ethers.getContractFactory("MockPresaleBad1"); //empty contract
            const badPresale2F = await ethers.getContractFactory("MockPresaleBad2"); //with only none payable fallback method
            const badPresale3F = await ethers.getContractFactory("MockPresaleBad3"); //with only payable fallback method
            const badPresale4F = await ethers.getContractFactory("MockPresaleBad4"); //with payable fallback method and endTime
            const badPresale1 = await badPresale1F.deploy();
            const badPresale2 = await badPresale2F.deploy();
            const badPresale3 = await badPresale3F.deploy();
            const badPresale4 = await badPresale4F.deploy();
            
            // any contract should be registered in ecosystem. it will be the first error
            await expect(
                communityStakingPoolERC20.connect(bob).buyInPresaleAndStake(badPresale1.address, charlie.address)
            ).to.be.revertedWith("NotInIntercoinEcosystem");
            await expect(
                communityStakingPoolERC20.connect(bob).buyInPresaleAndStake(badPresale2.address, charlie.address)
            ).to.be.revertedWith("NotInIntercoinEcosystem");
            await expect(
                communityStakingPoolERC20.connect(bob).buyInPresaleAndStake(badPresale3.address, charlie.address)
            ).to.be.revertedWith("NotInIntercoinEcosystem");
            await expect(
                communityStakingPoolERC20.connect(bob).buyInPresaleAndStake(badPresale4.address, charlie.address)
            ).to.be.revertedWith("NotInIntercoinEcosystem");

            // overwise we will check buy and fallback method

            await releaseManager.customRegisterInstance(badPresale1.address, bob.address);
            await releaseManager.customRegisterInstance(badPresale2.address, bob.address);
            await releaseManager.customRegisterInstance(badPresale3.address, bob.address);
            await releaseManager.customRegisterInstance(badPresale4.address, bob.address);

            await expect(
                communityStakingPoolERC20.connect(bob).buyInPresaleAndStake(badPresale1.address, charlie.address)
            ).to.be.revertedWith("function selector was not recognized and there's no fallback function");
            await expect(
                communityStakingPoolERC20.connect(bob).buyInPresaleAndStake(badPresale2.address, charlie.address)
            ).to.be.revertedWith("function returned an unexpected amount of data");
            await expect(
                communityStakingPoolERC20.connect(bob).buyInPresaleAndStake(badPresale3.address, charlie.address)
            ).to.be.revertedWith("function returned an unexpected amount of data");
            await expect(
                communityStakingPoolERC20.connect(bob).buyInPresaleAndStake(badPresale4.address, charlie.address)
            ).to.be.revertedWith("EndTimeAlreadyPassed");


            // the same with some native coins
            await expect(
                communityStakingPoolERC20.connect(bob).buyInPresaleAndStake(badPresale1.address, charlie.address, {value: ONE_ETH.mul(ONE)})
            ).to.be.revertedWith("function selector was not recognized and there's no fallback function");
            await expect(
                communityStakingPoolERC20.connect(bob).buyInPresaleAndStake(badPresale2.address, charlie.address, {value: ONE_ETH.mul(ONE)})
            ).to.be.revertedWith('function returned an unexpected amount of data');
            //).to.be.revertedWith(`fallback function is not payable and was called with value ${ONE_ETH.mul(ONE)}`);
            
            await expect(
                communityStakingPoolERC20.connect(bob).buyInPresaleAndStake(badPresale3.address, charlie.address, {value: ONE_ETH.mul(ONE)})
            ).to.be.revertedWith('function returned an unexpected amount of data');
            //).to.be.revertedWith("InsufficientAmount");

            await expect(
                communityStakingPoolERC20.connect(bob).buyInPresaleAndStake(badPresale4.address, charlie.address, {value: ONE_ETH.mul(ONE)})
            ).to.be.revertedWith('EndTimeAlreadyPassed');

            await badPresale4.setEndTime(9999999999);

            await expect(
                communityStakingPoolERC20.connect(bob).buyInPresaleAndStake(badPresale4.address, charlie.address)
            ).to.be.revertedWith("InsufficientAmount");
            await expect(
                communityStakingPoolERC20.connect(bob).buyInPresaleAndStake(badPresale4.address, charlie.address, {value: ONE_ETH.mul(ONE)})
            ).to.be.revertedWith("InsufficientAmount");

        }); 
        it("shouldnt buy in presale and stake if presale contract is not in intercoin ecosystem", async () => {
            const goodPresaleF = await ethers.getContractFactory("MockPresaleGood");
            const goodPresale = await goodPresaleF.deploy();
            await expect(
                communityStakingPoolERC20.connect(bob).buyInPresaleAndStake(goodPresale.address, charlie.address)
            ).to.be.revertedWith("NotInIntercoinEcosystem");
            
            await goodPresale.setTokenAddress(erc20.address);
            await erc20.mint(goodPresale.address, ONE_ETH.mul(ONE));
            await releaseManager.customRegisterInstance(goodPresale.address, bob.address); // just trick with WRONG factory and custom registratation

            await expect(
                communityStakingPoolERC20.connect(bob).buyInPresaleAndStake(goodPresale.address, charlie.address)
            ).to.be.revertedWith("EndTimeAlreadyPassed");

            await goodPresale.setEndTime(9999999999);
            
            var charlieBalanceBefore = await CommunityCoin.balanceOf(charlie.address);
            var poolBalanceBefore = await erc20.balanceOf(communityStakingPoolERC20.address);
            await communityStakingPoolERC20.connect(bob).buyInPresaleAndStake(goodPresale.address, charlie.address, {value: ONE_ETH.mul(ONE)})
            var charlieBalanceAfter = await CommunityCoin.balanceOf(charlie.address);
            var poolBalanceAfter = await erc20.balanceOf(communityStakingPoolERC20.address);

            expect(charlieBalanceAfter.sub(charlieBalanceBefore)).to.be.eq(ONE_ETH.mul(ONE));
            expect(poolBalanceAfter.sub(poolBalanceBefore)).to.be.eq(ONE_ETH.mul(ONE));

        }); 
        
        //customRegisterInstance
         
        describe("buy and stake", function() {
            var uniswapRouterFactoryInstance;
            var uniswapRouterInstance;

            var charlieWalletTokensBefore, charlieWalletTokensAfter;

            beforeEach("deploying", async() => {
                //////////////////////////////////////////////////////////////////
                uniswapRouterFactoryInstance = await ethers.getContractAt("IUniswapV2Factory",UNISWAP_ROUTER_FACTORY_ADDRESS);
                uniswapRouterInstance = await ethers.getContractAt("IUniswapV2Router02", UNISWAP_ROUTER);

                await uniswapRouterFactoryInstance.createPair(erc20.address, erc20Paying.address);
            
                let pairAddress = await uniswapRouterFactoryInstance.getPair(erc20.address, erc20Paying.address);

                pairInstance = await ethers.getContractAt("ERC20Mintable",pairAddress);

                await erc20.mint(liquidityHolder.address, ONE_ETH.mul(SEVEN));
                await erc20Paying.mint(liquidityHolder.address, ONE_ETH.mul(SEVEN));
                await erc20.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(SEVEN));
                await erc20Paying.connect(liquidityHolder).approve(uniswapRouterInstance.address, ONE_ETH.mul(SEVEN));

                const ts = await time.latest();
                const timeUntil = parseInt(ts)+parseInt(lockupIntervalCount*dayInSeconds);

                await uniswapRouterInstance.connect(liquidityHolder).addLiquidity(
                    erc20.address,
                    erc20Paying.address,
                    ONE_ETH.mul(SEVEN),
                    ONE_ETH.mul(SEVEN),
                    0,
                    0,
                    liquidityHolder.address,
                    timeUntil
                );

                charlieWalletTokensBefore = await CommunityCoin.balanceOf(charlie.address);
                
                await erc20Paying.mint(bob.address, ONE_ETH.mul(ONE));
                //////////////////////////////////////////////////////////////////

                charlieWalletTokensBefore = await CommunityCoin.balanceOf(charlie.address);
                bobWalletTokensBefore = await CommunityCoin.balanceOf(bob.address);

                await erc20Paying.mint(bob.address, ONE_ETH.mul(ONE));
                await erc20Paying.connect(bob).approve(communityStakingPoolERC20.address, ONE_ETH.mul(ONE));

                await communityStakingPoolERC20.connect(bob).buyAndStake(erc20Paying.address, ONE_ETH.mul(ONE), charlie.address);

                charlieWalletTokensAfter = await CommunityCoin.balanceOf(charlie.address);
                
            })

            it("should buyAndStake", async () => {

                expect(charlieWalletTokensAfter).to.be.gt(charlieWalletTokensBefore);
                expect(charlieWalletTokensAfter).not.to.be.eq(ZERO);
            
            }); 

            it("shouldnt unstake if not unlocked yet", async () => {
                // even if approve before
                await CommunityCoin.connect(charlie).approve(CommunityCoin.address, charlieWalletTokensAfter);
                 
                await expect(CommunityCoin.connect(charlie).unstake(charlieWalletTokensAfter)).to.be.revertedWith('StakeNotUnlockedYet').withArgs(charlie.address, charlieWalletTokensAfter, 0);
            });  

            it("shouldnt redeem if sender haven't redeem role", async () => {
                
                // even if approve before
                
                await CommunityCoin.connect(charlie).approve(CommunityCoin.address, charlieWalletTokensAfter);
                
                await expect(
                    CommunityCoin.connect(charlie)['redeem(uint256)'](charlieWalletTokensAfter)
                ).to.be.revertedWith('MissingRole').withArgs(
                    charlie.address, REDEEM_ROLE
                );
                
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
                // imitate exists role
                await mockCommunity.connect(owner).setRoles(alice.address, [REDEEM_ROLE]);

                // transfer from charlie to alice
                await CommunityCoin.connect(charlie).transfer(alice.address, charlieWalletTokensAfter);

                let aliceLPTokenBefore = await erc20.balanceOf(alice.address);

                await CommunityCoin.connect(alice).approve(CommunityCoin.address, charlieWalletTokensAfter);


                await CommunityCoin.connect(alice)['redeem(uint256)'](charlieWalletTokensAfter);
                let aliceLPTokenAfter = await erc20.balanceOf(alice.address);
                expect(aliceLPTokenAfter).gt(aliceLPTokenBefore);

            }); 


        });

    });

    describe(`Instance tests with external community`, function () {
        var uniswapRouterFactoryInstance;
        var uniswapRouterInstance;
        var communityStakingPool;
        var pairInstance;
        
        before("deploying", async() => {
            // restore snapshot
            await ethers.provider.send('evm_revert', [snapId]);
        });

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
            let tx = await CommunityCoin.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
                erc20.address,
                lockupIntervalCount,
                NO_BONUS_FRACTIONS,
                NO_POPULAR_TOKEN,
                NO_DONATIONS,
                rewardsRateFraction,
                numerator,
                denominator
            );


            const rc = await tx.wait(); // 0ms, as tx is already confirmed
            const event = rc.events.find(event => event.event === 'InstanceCreated');
            const [erc20token, instance] = event.args;
           
            communityStakingPool = await ethers.getContractAt("MockCommunityStakingPool",instance);
            //console.log("before each №2");

            
        });

        it("shouldnt create another pair with equal tokens", async() => {
            await expect(CommunityCoin.connect(owner)["produce(address,uint64,uint64,address,(address,uint256)[],uint64,uint64,uint64)"](
                erc20.address,
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
                await expect(CommunityCoin.connect(owner).setTrustedForwarder(owner.address)).to.be.revertedWith('TrustedForwarderCanNotBeOwner').withArgs(owner.address);
            });
            
            it("shouldnt transferOwnership if sender is trusted forwarder", async() => {
                await CommunityCoin.connect(owner).setTrustedForwarder(trustedForwarder.address);

                const dataTx = await CommunityCoin.connect(trustedForwarder).populateTransaction['transferOwnership(address)'](bob.address);
                dataTx.data = dataTx.data.concat((owner.address).substring(2));
                await expect(trustedForwarder.sendTransaction(dataTx)).to.be.revertedWith("DeniedForTrustedForwarder");

            });
            
        });

        describe("factory tests", function() {
            var instanceManagementInstance;
            beforeEach("before each callback", async() => {
                let instanceManagementAddr = await CommunityCoin.connect(bob).instanceManagment();
                instanceManagementInstance = await ethers.getContractAt("CommunityStakingPoolFactory",instanceManagementAddr);
                
            });
            it("should return instance info", async () => {
                
                let data = await instanceManagementInstance.connect(bob).getInstanceInfo(erc20.address, lockupIntervalCount);
                
                expect(data.tokenErc20).to.be.eq(erc20.address);
                expect(data.duration).to.be.eq(lockupIntervalCount);
                
            }); 
            
            it("should return all instances info", async () => {
                
                let data = await instanceManagementInstance.connect(bob).getInstancesInfo();
                
                
                expect(data[0].tokenErc20).to.be.eq(erc20.address);
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
                await erc20.mint(bob.address, ONE_ETH.mul(ONE));
                await erc20.connect(bob).approve(communityStakingPool.address, ONE_ETH.mul(ONE));
                await communityStakingPool.connect(bob)['stake(uint256,address)'](ONE_ETH.mul(ONE), bob.address);
                shares = await CommunityCoin.balanceOf(bob.address);
            });

            it("should wallet tokens appear and not equal zero", async () => {
                expect(shares).to.not.equal(ZERO);
            });

            it("shouldn't accept unknown tokens if send directly", async () => {
                let anotherToken = await ERC777Factory.deploy("Another ERC777 Token", "A-ERC777");
                await anotherToken.mint(bob.address, ONE_ETH);
                await expect(anotherToken.connect(bob).transfer(CommunityCoin.address, ONE_ETH)).to.be.revertedWith('OwnTokensPermittedOnly');
            });

            describe("unstake tests", function () {
                describe("shouldnt unstake", function () {
                    it("if not unlocked yet", async () => {
                        await expect(CommunityCoin.connect(bob)["unstake(uint256)"](shares)).to.be.revertedWith('StakeNotUnlockedYet').withArgs(bob.address, shares, 0);
                    });
                    it("if amount more than balance", async () => {
                        // pass some mtime
                        await time.increase(lockupIntervalCount*dayInSeconds+9);    

                        await expect(CommunityCoin.connect(bob)["unstake(uint256)"](shares.add(ONE_ETH))).to.be.revertedWith('InsufficientBalance').withArgs(bob.address, shares.add(ONE_ETH));
                    });
                    
                    it("if happens smth unexpected with pool", async () => {

                        await time.increase(lockupIntervalCount*dayInSeconds+9);    
                        
                        await CommunityCoin.connect(bob).approve(CommunityCoin.address, shares);

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
                        await time.increase(lockupIntervalCount*dayInSeconds+9);    

                        let bobERC20TokenBefore = await erc20.balanceOf(bob.address);

                        await CommunityCoin.connect(bob).approve(CommunityCoin.address, shares);
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
                        await time.increase(lockupIntervalCount*dayInSeconds+9);   
                        
                        // imitate exists role
                        await mockCommunity.connect(owner).setRoles(alice.address, [0x99,0x98,0x97,0x96,REDEEM_ROLE]);
                        
                        // transfer from bob to alice
                        await CommunityCoin.connect(bob).transfer(alice.address, shares);
                        
                        await CommunityCoin.connect(alice).approve(CommunityCoin.address, shares);

                        // broke contract and emulate 'Error when redeem in an instance' response
                        await communityStakingPool.setStakingToken(ZERO_ADDRESS);

                        await expect(CommunityCoin.connect(alice)[`redeem(uint256)`](shares)).to.be.revertedWith('REDEEM_ERROR');


                    }); 

                    describe("without redeem role", function () {
                        it("if send directly", async() => {
                            await expect(
                                CommunityCoin.connect(bob).transfer(CommunityCoin.address, shares)
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
                                await time.increase(lockupIntervalCount*dayInSeconds+9);    
                                await expect(
                                    CommunityCoin.connect(alice)[`redeem(uint256)`](shares)
                                ).to.be.revertedWith('MissingRole').withArgs(alice.address, REDEEM_ROLE);
                            });
                            
                            it("with approve before", async () => {
                                await CommunityCoin.connect(alice).approve(CommunityCoin.address, shares);
                                await expect(
                                    CommunityCoin.connect(alice)[`redeem(uint256)`](shares)
                                ).to.be.revertedWith('MissingRole').withArgs(alice.address, REDEEM_ROLE);
                            });
                            it("with approve before even if passed time", async () => {
                                await CommunityCoin.connect(alice).approve(CommunityCoin.address, shares);
                                // pass some mtime
                                await time.increase(lockupIntervalCount*dayInSeconds+9);    

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
                            await CommunityCoin.connect(bob).approve(CommunityCoin.address, shares);

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
                                await time.increase(lockupIntervalCount*dayInSeconds+9);    
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
                        await time.increase(lockupIntervalCount*dayInSeconds+9);    
                        
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
                        await CommunityCoin.connect(alice).transfer(CommunityCoin.address, shares);
                        aliceERC20TokenAfter = await erc20.balanceOf(alice.address);
                        expect(aliceERC20TokenAfter).gt(aliceERC20TokenBefore);
                    });

                    // for (const preferredInstance of [false, true]) {
                    // for (const swapThroughMiddle of [false, true]) {

                    //     it(`via redeem method`+` ${preferredInstance ? 'with preferred instances' : ''}` + ` ${swapThroughMiddle ? 'and swap through middle token' : ''}`, async () => {
                    //         var amountAfterSwapLP, tokenAfterSwap, aliceFakeUSDTToken;
                    //         await CommunityCoin.connect(alice).approve(CommunityCoin.address, shares);
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
                        await CommunityCoin.connect(alice).transfer(CommunityCoin.address, shares);
                        aliceERC20TokenAfter = await erc20.balanceOf(alice.address);
                        expect(aliceERC20TokenAfter).gt(aliceERC20TokenBefore);
                    });

                    // it.only("test", async () => {
                    //     await mockCommunity.connect(owner).setRoles(charlie.address, [CIRCULATE_ROLE]);

                    //     await CommunityCoin.connect(charlie).addToCirculation(charlie.address, shares);

                    //     //try to unstake
                    //     await CommunityCoin.connect(charlie).approve(CommunityCoin.address, shares);
                    //     await CommunityCoin.connect(charlie).unstake(shares);
                    //     //try to redeem
                    //     await mockCommunity.connect(owner).setRoles(charlie.address, [REDEEM_ROLE]);
                        
                            
                    // });

                    it("discountSensivityTests", async () => {
                        var amountWithout, amountWith, snapId;

                        // ----- calculate amount obtain without circulation ------//
                        snapId = await ethers.provider.send('evm_snapshot', []);
                        
                        await CommunityCoin.connect(alice).transfer(CommunityCoin.address, shares);
                        amountWithout = await erc20.balanceOf(alice.address);

                        await ethers.provider.send('evm_revert', [snapId]);

                        // ----- calculate amount obtain with circulation ------//
                        snapId = await ethers.provider.send('evm_snapshot', []);
                        // imitate exists role
                        //await mockCommunity.connect(owner).setRoles([0x99,0x98,0x97,0x96,CIRCULATE_ROLE]);
                        await mockCommunity.connect(owner).setRoles(charlie.address, [0x99,0x98,0x97,CIRCULATE_ROLE,REDEEM_ROLE]);

                        await CommunityCoin.connect(charlie).addToCirculation(charlie.address, shares);
                        await CommunityCoin.connect(alice).transfer(CommunityCoin.address, shares);

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

    });


});