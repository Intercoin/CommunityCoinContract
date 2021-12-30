const { ethers, waffle } = require('hardhat');
const { BigNumber } = require('ethers');
const { expect } = require('chai');
const chai = require('chai');
const { time } = require('@openzeppelin/test-helpers');

const ZERO = BigNumber.from('0');
const ONE = BigNumber.from('1');
const TWO = BigNumber.from('2');
const THREE = BigNumber.from('3');
const FOUR = BigNumber.from('3');
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

describe("Staking contract tests", function () {
    const accounts = waffle.provider.getWallets();
    const owner = accounts[0];                     
    const alice = accounts[1];
    const bob = accounts[2];
    const charlie = accounts[3];
    const liquidityHolder = accounts[4];

    
    const reserveTokenClaimFraction = 0;
    const tradedTokenClaimFraction = 0;
    const lpClaimFraction = 1000;
    const dayInSeconds = 24*60*60; // * interval: DAY in seconds
    const lockupIntervalCount = 365; // year in days(dayInSeconds)
    const percentLimitLeftTokenB = 0.001;

    const wrongClaimFraction = 99999999999;

    var implementation;
    var implementation2;
    var stakingFactory;
    var erc20;
    var erc777;
    var erc20TradedToken;
    var erc20ReservedToken;
    var erc20Reward;
    
    beforeEach("deploying", async() => {
        const StakingFactoryF = await ethers.getContractFactory("StakingFactory");
        const StakingContractF = await ethers.getContractFactory("StakingContract");
        const StakingTransferRulesF = await ethers.getContractFactory("StakingTransferRules");
        const ERC20Factory = await ethers.getContractFactory("ERC20Mintable");
        const ERC777Factory = await ethers.getContractFactory("ERC777Mintable");
        

        implementation = await StakingContractF.deploy();
        implementation2 = await StakingTransferRulesF.deploy();

        stakingFactory = await StakingFactoryF.deploy(implementation.address, implementation2.address);

        erc20 = await ERC20Factory.deploy("ERC20 Token", "ERC20");
        erc777 = await ERC20Factory.deploy("ERC777 Token", "ERC777");
        erc20TradedToken = await ERC20Factory.deploy("ERC20 Traded Token", "ERC20-TRD");
        erc20ReservedToken = await ERC20Factory.deploy("ERC20 Reserved Token", "ERC20-RSRV");
        erc20Reward = await ERC20Factory.deploy("ERC20 Token Reward", "ERC20-R");
        
        //console.log("before each №1");
    });

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
            await expect(
                BigNumber.from(tmp).eq(BigNumber.from(expectArr[i]))
            ).to.be.equal(true);
        }
        
    }); 

    it("shouldnt create with uniswap pair exists", async() => {
        await expect(stakingFactory["produce(address,address,uint64,uint64,uint64,uint64)"](
            erc20ReservedToken.address,
            erc20TradedToken.address,
            lockupIntervalCount,
            reserveTokenClaimFraction,
            tradedTokenClaimFraction,
            lpClaimFraction 
        )).to.be.revertedWith("NO_UNISWAP_V2_PAIR");
    });

    it("shouldnt create staking with the same token pairs", async() => {
        await expect(stakingFactory["produce(address,address,uint64,uint64,uint64,uint64)"](
            erc20.address,
            erc20.address,
            lockupIntervalCount,
            reserveTokenClaimFraction,
            tradedTokenClaimFraction,
            lpClaimFraction 
        )).to.be.revertedWith("StakingFactory: IDENTICAL_ADDRESSES");
        
    });
    it("shouldnt create staking with the Zero token", async() => {
        await expect(stakingFactory["produce(address,address,uint64,uint64,uint64,uint64)"](
            ZERO_ADDRESS,
            erc20.address,
            lockupIntervalCount,
            reserveTokenClaimFraction,
            tradedTokenClaimFraction,
            lpClaimFraction 
        )).to.be.revertedWith("StakingFactory: ZERO_ADDRESS");
        await expect(stakingFactory["produce(address,address,uint64,uint64,uint64,uint64)"](
            erc20.address,
            ZERO_ADDRESS,
            lockupIntervalCount,
            reserveTokenClaimFraction,
            tradedTokenClaimFraction,
            lpClaimFraction 
        )).to.be.revertedWith("StakingFactory: ZERO_ADDRESS");
    });
    it("shouldnt create with wrong fractions", async() => {
        await expect(stakingFactory["produce(address,address,uint64,uint64,uint64,uint64)"](
            erc20ReservedToken.address,
            erc20TradedToken.address,
            lockupIntervalCount,
            wrongClaimFraction,
            tradedTokenClaimFraction,
            lpClaimFraction 
        )).to.be.revertedWith("StakingFactory: WRONG_CLAIM_FRACTION");
        await expect(stakingFactory["produce(address,address,uint64,uint64,uint64,uint64)"](
            erc20ReservedToken.address,
            erc20TradedToken.address,
            lockupIntervalCount,
            reserveTokenClaimFraction,
            wrongClaimFraction,
            lpClaimFraction 
        )).to.be.revertedWith("StakingFactory: WRONG_CLAIM_FRACTION");
    });
    
    //    require(instance == address(0), "StakingFactory: PAIR_ALREADY_EXISTS");
    describe("Instance tests", function () {
        var uniswapRouterFactoryInstance;
        var uniswapRouterInstance;
        var stakingInstance;

        describe("Instance with zero duration tests(StakingTransferRules)", function () {
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

                let tx = await stakingFactory.connect(owner)["produce(address,address,uint64,uint64,uint64,uint64)"](
                    erc20ReservedToken.address,
                    erc20TradedToken.address,
                    ZERO,
                    reserveTokenClaimFraction,
                    tradedTokenClaimFraction,
                    lpClaimFraction 
                )

                const rc = await tx.wait(); // 0ms, as tx is already confirmed
                const event = rc.events.find(event => event.event === 'InstanceCreated');
                const [tokenA, tokenB, instance, instancesCount] = event.args;
                stakingInstance = await ethers.getContractAt("StakingTransferRules",instance);
                
            });

            it("shouldnt create another pair with equal tokens", async() => {
                await expect(stakingFactory["produce(address,address,uint64,uint64,uint64,uint64)"](
                    erc20ReservedToken.address,
                    erc20TradedToken.address,
                    ZERO,
                    reserveTokenClaimFraction,
                    tradedTokenClaimFraction,
                    lpClaimFraction 
                )).to.be.revertedWith("StakingFactory: PAIR_ALREADY_EXISTS");
            });

            it("shouldnt transfer shares", async() => {
                await erc20ReservedToken.mint(bob.address, ONE_ETH.mul(ONE));
                await erc20ReservedToken.connect(bob).approve(stakingInstance.address, ONE_ETH.mul(ONE));

                await stakingInstance.connect(bob)['buyLiquidityAndStake(uint256)'](ONE_ETH.mul(ONE));
                let bobShares = await stakingInstance.balanceOf(bob.address);

                await expect(stakingInstance.connect(bob).transfer(alice.address, bobShares)).to.be.revertedWith("TRANSFER_STAKES_DISABLED");


            });

            
        });
        describe("Instance with non-zero duration tests(StakingContract)", function () {
    
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

                let tx = await stakingFactory.connect(owner)["produce(address,address,uint64,uint64,uint64,uint64)"](
                    erc20ReservedToken.address,
                    erc20TradedToken.address,
                    lockupIntervalCount,
                    reserveTokenClaimFraction,
                    tradedTokenClaimFraction,
                    lpClaimFraction 
                )

                const rc = await tx.wait(); // 0ms, as tx is already confirmed
                const event = rc.events.find(event => event.event === 'InstanceCreated');
                const [tokenA, tokenB, instance, instancesCount] = event.args;
                //console.log(tokenA, tokenB, instance, instancesCount);

                stakingInstance = await ethers.getContractAt("StakingContract",instance);
                //console.log("before each №2");
            });

            it("shouldnt create another pair with equal tokens", async() => {
                await expect(stakingFactory["produce(address,address,uint64,uint64,uint64,uint64)"](
                    erc20ReservedToken.address,
                    erc20TradedToken.address,
                    lockupIntervalCount,
                    reserveTokenClaimFraction,
                    tradedTokenClaimFraction,
                    lpClaimFraction 
                )).to.be.revertedWith("StakingFactory: PAIR_ALREADY_EXISTS");
            });

            it("should set symbol and name with prefix", async() => {
                const nameSuffix= " Staking Token";
                const symbolSuffix= ".STAKE";

                const stakingName = await stakingInstance.name();
                const stakingSymbol = await stakingInstance.symbol();
                const tradedName = await erc20TradedToken.name();
                const tradedSymbol = await erc20TradedToken.symbol();
                
                expect(stakingName).to.be.eq(tradedName.concat(nameSuffix));
                expect(stakingSymbol).to.be.eq(tradedSymbol.concat(symbolSuffix));
                
            });

            it("should revert if pair does not exists", async() => {
                // revert if uniswap pair(token vs anothertoken) does not exists yet
                await expect(stakingInstance.connect(bob)['buyLiquidityAndStake(address,uint256)'](erc20.address, ONE_ETH.mul(ONE))).to.be.reverted;
                
                // revert if uniswap pair(token vs WETH) does not exists yet
                await expect(stakingInstance.connect(bob)['buyLiquidityAndStake()']({value: ONE_ETH.mul(ONE)})).to.be.reverted;

            });

            it("buyAddLiquidityAndStake test()", async () => {
            
                await erc20ReservedToken.mint(bob.address, ONE_ETH.mul(ONE));
                await erc20ReservedToken.connect(bob).approve(stakingInstance.address, ONE_ETH.mul(ONE));

                await stakingInstance.connect(bob)['buyLiquidityAndStake(uint256)'](ONE_ETH.mul(ONE));
            
                let shares = await stakingInstance.balanceOf(bob.address);
                let lptokens = await pairInstance.balanceOf(stakingInstance.address);
                
                // custom situation when  uniswapLP tokens equal sharesLP tokens.  can be happens in the first stake
                expect(lptokens).not.to.be.eq(ZERO);
                expect(lptokens).to.be.eq(shares);
            
            });    
            
            it("buyAddLiquidityAndStake (through paying token)", async () => {
            
                await erc20.mint(bob.address, ONE_ETH.mul(ONE));
                
                await erc20.connect(bob).approve(stakingInstance.address, ONE_ETH.mul(ONE));

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
            
                // now addinig liquidity through paying token will be successful
                stakingInstance.connect(bob)['buyLiquidityAndStake(address,uint256)'](erc20.address, ONE_ETH.mul(ONE))
            
                let shares = await stakingInstance.balanceOf(bob.address);
                let lptokens = await pairInstance.balanceOf(stakingInstance.address);
                    
                // custom situation when  uniswapLP tokens equal sharesLP tokens.  can be happens in the first stake
                expect(lptokens).not.to.be.eq(ZERO);
                expect(lptokens).to.be.eq(shares);
            
            });    

            it("buyAddLiquidityAndStake (through ETH)", async () => {
            
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
            
                // now it will be fine
                stakingInstance.connect(bob)['buyLiquidityAndStake()']({value: ONE_ETH.mul(ONE) });
                
                let shares = await stakingInstance.balanceOf(bob.address);
                let lptokens = await pairInstance.balanceOf(stakingInstance.address);
                
                // custom situation when  uniswapLP tokens equal sharesLP tokens.  can be happens in the first stake
                expect(lptokens).not.to.be.eq(ZERO);
                expect(lptokens).to.be.eq(shares);
                
            });    

            it("shouldnt redeem if not unlocked yet", async () => {
                
                await erc20ReservedToken.mint(bob.address, ONE_ETH.mul(ONE));
                await erc20ReservedToken.connect(bob).approve(stakingInstance.address, ONE_ETH.mul(ONE));
                await stakingInstance.connect(bob)['buyLiquidityAndStake(uint256)'](ONE_ETH.mul(ONE));
            
                let shares = await stakingInstance.balanceOf(bob.address);

                await expect(shares).to.not.equal(ZERO);
                
                // even if approve before
                await stakingInstance.connect(bob).approve(stakingInstance.address, shares);
                await expect(stakingInstance.connect(bob).redeem(shares)).to.be.revertedWith('STAKE_NOT_UNLOCKED_YET');

            }); 

            it("no one should add or remove tokens reward except owner", async () => {
                await expect(stakingInstance.connect(charlie).addRewardToken(erc20Reward.address, ZERO)).to.be.revertedWith("Ownable: caller is not the owner");
                await expect(stakingInstance.connect(charlie).removeRewardToken(erc20Reward.address)).to.be.revertedWith("Ownable: caller is not the owner");
            });

            it("should manage tokens reward", async () => {
                let arr;
                // was not included before
                arr = await stakingInstance.viewRewardTokensList();
                await expect(arr).to.not.include(erc20Reward.address);
                // add to list 
                await stakingInstance.connect(owner).addRewardToken(erc20Reward.address, ZERO);
                // check in list
                arr = await stakingInstance.viewRewardTokensList();
                await expect(arr).to.include(erc20Reward.address);

                //remove from list 
                await stakingInstance.connect(owner).removeRewardToken(erc20Reward.address);
                //should to be removed
                arr = await stakingInstance.viewRewardTokensList();
                await expect(arr).to.not.include(erc20Reward.address);
            });
            
            it("shouldnt stake if rewards limit exceeded ", async() => {
                
                // update reward info
                await stakingInstance.connect(owner).addRewardToken(erc20Reward.address, ONE);

                await erc20ReservedToken.mint(bob.address, ONE_ETH.mul(ONE));
                await erc20ReservedToken.connect(bob).approve(stakingInstance.address, ONE_ETH.mul(ONE));

                await expect(
                    stakingInstance.connect(bob)['buyLiquidityAndStake(uint256)'](ONE_ETH.mul(ONE))
                ).to.be.revertedWith("NO_MORE_STAKES_UNTIL_REWARDS_ADDED");
                
                
            });

            it("should transfer shares after stake", async() => {
                await erc20ReservedToken.mint(bob.address, ONE_ETH.mul(ONE));
                await erc20ReservedToken.connect(bob).approve(stakingInstance.address, ONE_ETH.mul(ONE));

                let bobSharesBefore = await stakingInstance.balanceOf(bob.address);
                let aliceSharesBefore = await stakingInstance.balanceOf(alice.address);
                await stakingInstance.connect(bob)['buyLiquidityAndStake(uint256)'](ONE_ETH.mul(ONE));
                let bobSharesAfter = await stakingInstance.balanceOf(bob.address);

                let bobLockedBalanceAfter = await stakingInstance.connect(bob).viewLockedShares(bob.address);
                let aliceLockedBalanceAfter = await stakingInstance.connect(bob).viewLockedShares(alice.address);
                await expect(aliceLockedBalanceAfter).to.be.eq(ZERO);
                await expect(bobLockedBalanceAfter).to.be.eq(bobSharesAfter);

                await stakingInstance.connect(bob).transfer(alice.address, bobSharesAfter);

                let bobSharesAfterTransfer = await stakingInstance.balanceOf(bob.address);
                let aliceSharesAfterBobTransfer = await stakingInstance.balanceOf(alice.address);
                let bobLockedBalanceAfterBobTransfer = await stakingInstance.connect(bob).viewLockedShares(bob.address);
                let aliceLockedBalanceAfterBobTransfer = await stakingInstance.connect(bob).viewLockedShares(alice.address);

                await expect(bobSharesAfterTransfer).to.be.eq(ZERO);
                await expect(bobSharesAfter).to.be.eq(aliceSharesAfterBobTransfer);
                await expect(bobLockedBalanceAfterBobTransfer).to.be.eq(ZERO);
                await expect(aliceSharesAfterBobTransfer).to.be.eq(aliceLockedBalanceAfterBobTransfer);
                
            });

            describe("factory tests", function() {
                it("should return instance info", async () => {
                    
                    let data = await await stakingFactory.connect(bob).getInstanceInfo(erc20ReservedToken.address, erc20TradedToken.address, lockupIntervalCount);
                    
                    await expect(data.reserveToken).to.be.eq(erc20ReservedToken.address);
                    await expect(data.tradedToken).to.be.eq(erc20TradedToken.address);
                    await expect(data.duration).to.be.eq(lockupIntervalCount);
                    
                }); 
                it("should return correct instance length", async () => {
                    
                    let data = await await stakingFactory.connect(bob).instancesCount();
                    
                    await expect(data).to.be.eq(ONE);

                    
                }); 
            }); 
            describe("should consume all traded tokens by contract when buying liquidity", function() {
                it("when uniswap reverves are equal", async () => {
                    await erc20ReservedToken.mint(bob.address, ONE_ETH.mul(ONE));
                    await erc20ReservedToken.connect(bob).approve(stakingInstance.address, ONE_ETH.mul(ONE));
                
                    let stakingBalanceToken1Before = await erc20ReservedToken.balanceOf(stakingInstance.address);
                    let stakingBalanceToken2Before = await erc20TradedToken.balanceOf(stakingInstance.address);
                    await stakingInstance.connect(bob)['buyLiquidityAndStake(uint256)'](ONE_ETH.mul(ONE));
                    let stakingBalanceToken1After = await erc20ReservedToken.balanceOf(stakingInstance.address);
                    let stakingBalanceToken2After = await erc20TradedToken.balanceOf(stakingInstance.address);

                    await expect(
                        BigNumber.from(stakingBalanceToken2Before).lte(BigNumber.from(percentLimitLeftTokenB*ONE_ETH))
                    ).to.be.eq(true);

                    await expect(
                        BigNumber.from(stakingBalanceToken2After).lte(BigNumber.from(percentLimitLeftTokenB*ONE_ETH))
                    ).to.be.eq(true);
                });

                it("when uniswap reverves are not equal", async () => {
                    
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

                    // 50000
                    await erc20ReservedToken.mint(bob.address, ONE_ETH.mul(FOUR).mul(TEN).mul(THOUSAND));
                    await erc20ReservedToken.connect(bob).approve(stakingInstance.address, ONE_ETH.mul(FOUR).mul(TEN).mul(THOUSAND));

                    let stakingBalanceToken1Before = await erc20ReservedToken.balanceOf(stakingInstance.address);
                    let stakingBalanceToken2Before = await erc20TradedToken.balanceOf(stakingInstance.address);
                    await stakingInstance.connect(bob)['buyLiquidityAndStake(uint256)'](ONE_ETH.mul(ONE));
                    let stakingBalanceToken1After = await erc20ReservedToken.balanceOf(stakingInstance.address);
                    let stakingBalanceToken2After = await erc20TradedToken.balanceOf(stakingInstance.address);
                    
                    await expect(
                        BigNumber.from(stakingBalanceToken2Before).lte(BigNumber.from(percentLimitLeftTokenB*ONE_ETH))
                    ).to.be.eq(true);

                    await expect(
                        BigNumber.from(stakingBalanceToken2After).lte(BigNumber.from(percentLimitLeftTokenB*ONE_ETH))
                    ).to.be.eq(true);
                
                });

            });

            describe("redeem tests", function () {
                const DaysCount = 4;
                var shares;
                beforeEach("before each callback", async() => {
                    
                    let tx = await stakingFactory["produce(address,address,uint64)"](
                        erc20ReservedToken.address,
                        erc20TradedToken.address,
                        DaysCount
                    )

                    const rc = await tx.wait(); // 0ms, as tx is already confirmed
                    const event = rc.events.find(event => event.event === 'InstanceCreated');
                    const [, , instance, ] = event.args;
                    
                    stakingInstance = await ethers.getContractAt("StakingContract",instance);
                    
                    // create staking for 4 days
                    await erc20ReservedToken.mint(bob.address, ONE_ETH.mul(ONE));
                    await erc20ReservedToken.connect(bob).approve(stakingInstance.address, ONE_ETH.mul(ONE));
                    await stakingInstance.connect(bob)['buyLiquidityAndStake(uint256)'](ONE_ETH.mul(ONE));
                    shares = await stakingInstance.balanceOf(bob.address);
                });

                it("should shares appear and not equal zero", async () => {
                    await expect(shares).to.not.equal(ZERO);
                });


                it("shouldnt redeem and remove liquidity until time expire", async () => {
                    await expect(stakingInstance.connect(bob).redeemAndRemoveLiquidity(shares)).to.be.revertedWith("Redeem amount exceeds allowance");
                    // even if approve before
                    await stakingInstance.connect(bob).approve(stakingInstance.address, shares);
                    await expect(stakingInstance.connect(bob).redeemAndRemoveLiquidity(shares)).to.be.revertedWith("STAKE_NOT_UNLOCKED_YET");
                    
                });

                
                it("redeem and remove liquidity", async () => {
                    
                    // pass some mtime
                    await time.increase(DaysCount*dayInSeconds+9);

                    await expect(stakingInstance.connect(bob).redeemAndRemoveLiquidity(shares)).to.be.revertedWith("Redeem amount exceeds allowance");
                    
                    await stakingInstance.connect(bob).approve(stakingInstance.address, shares);

                    let bobReservedTokenBefore = await erc20ReservedToken.balanceOf(bob.address);
                    let bobTradedTokenBefore = await erc20TradedToken.balanceOf(bob.address);

                    await stakingInstance.connect(bob).redeemAndRemoveLiquidity(shares);
                    
                    let bobReservedTokenAfter = await erc20ReservedToken.balanceOf(bob.address);
                    let bobTradedTokenAfter = await erc20TradedToken.balanceOf(bob.address);

                    await expect(bobReservedTokenAfter).gt(bobReservedTokenBefore);
                    await expect(bobTradedTokenAfter).gt(bobTradedTokenBefore);
                    
                }); 
                describe("redeem via approve and call redeem", function() {
                    it("shouldnt redeem until time expire", async () => {
                        await expect(stakingInstance.connect(bob).redeem(shares)).to.be.revertedWith("Redeem amount exceeds allowance");
                        await stakingInstance.connect(bob).approve(stakingInstance.address, shares);
                        await expect(stakingInstance.connect(bob).redeem(shares)).to.be.revertedWith("STAKE_NOT_UNLOCKED_YET");
                    });
                    it("redeem tokens", async () => {
                    
                        // pass some mtime
                        await time.increase(DaysCount*dayInSeconds+9);
                        await expect(stakingInstance.connect(bob).redeem(shares)).to.be.revertedWith("Redeem amount exceeds allowance");
                        await stakingInstance.connect(bob).approve(stakingInstance.address, shares);
                        await stakingInstance.connect(bob).redeem(shares);
                        
                    });    
                    

                }); 
                describe("redeem via directly send to contract", function() {
                    it("shouldnt redeem until time expire", async () => {

                        await expect(stakingInstance.connect(bob).transfer(stakingInstance.address, shares)).to.be.revertedWith("STAKE_NOT_UNLOCKED_YET");
                    });
                    it("redeem tokens", async () => {
                        // pass some mtime
                        await time.increase(DaysCount*dayInSeconds+9);
                        await stakingInstance.connect(bob).transfer(stakingInstance.address, shares);
                    });    
                }); 

                describe("reward tokens", function() {
                    beforeEach("before each callback", async() => {
                        // add reward token
                        await stakingInstance.connect(owner).addRewardToken(erc20Reward.address, ZERO);
                    });


                    describe("empty reward balance", function() {
                        beforeEach("before each callback", async() => {
                            // pass some mtime
                            await time.increase(DaysCount*dayInSeconds+9);
                        });

                        it("via approve and call", async() => {
                            let bobRewardBalanceBefore = await erc20Reward.balanceOf(bob.address);
                            await stakingInstance.connect(bob).approve(stakingInstance.address, shares);
                            await stakingInstance.connect(bob).redeem(shares);
                            let bobRewardBalanceAfter = await erc20Reward.balanceOf(bob.address);
                            await expect(bobRewardBalanceBefore).to.be.equal(bobRewardBalanceAfter);
                        });

                        it("via directly send to contract", async() => {
                            let bobRewardBalanceBefore = await erc20Reward.balanceOf(bob.address);
                            await stakingInstance.connect(bob).transfer(stakingInstance.address, shares);
                            let bobRewardBalanceAfter = await erc20Reward.balanceOf(bob.address);
                            await expect(bobRewardBalanceBefore).to.be.equal(bobRewardBalanceAfter);
                            
                        });
                    });
                    describe("none-empty reward balance", function() {
                        beforeEach("before each callback", async() => {
                            await erc20Reward.mint(stakingInstance.address, ONE_ETH.mul(ONE));    
                            // pass some mtime
                            await time.increase(DaysCount*dayInSeconds+10);
                        });

                        it("via approve and call", async() => {
                            let bobRewardBalanceBefore = await erc20Reward.balanceOf(bob.address);
                            await stakingInstance.connect(bob).approve(stakingInstance.address, shares);
                            await stakingInstance.connect(bob).redeem(shares);
                            let bobRewardBalanceAfter = await erc20Reward.balanceOf(bob.address);
                            // here Bob will get all reward as the one participant
                            await expect(
                                BigNumber.from(bobRewardBalanceBefore).lt(BigNumber.from(bobRewardBalanceAfter))
                            ).to.be.equal(true);
                            await expect(
                                BigNumber.from(bobRewardBalanceAfter).eq(ONE_ETH.mul(ONE))
                            ).to.be.equal(true);
                        });

                        it("via directly send to contract", async() => {
                            let bobRewardBalanceBefore = await erc20Reward.balanceOf(bob.address);
                            await stakingInstance.connect(bob).transfer(stakingInstance.address, shares);
                            let bobRewardBalanceAfter = await erc20Reward.balanceOf(bob.address);
                            // here Bob will  get all reward as the one participant
                            await expect(
                                BigNumber.from(bobRewardBalanceBefore).lt(BigNumber.from(bobRewardBalanceAfter))
                            ).to.be.equal(true);
                            await expect(
                                BigNumber.from(bobRewardBalanceAfter).eq(ONE_ETH.mul(ONE))
                            ).to.be.equal(true);
                        });

                    });

                });
    
            });   

                    
    

            // left for erc777
            // xit('buyAddLiquidityAndStake ERC777 tokensReceived', async () => {
                
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


            
            // describe("Instance tests222", function () {
            //     beforeEach("before each callback", async() => {
            //         console.log("before each №3");

            //     });
            //     it("dddddd exists", async() => {
                    
            //         expect(true).to.be.eq(true);
            //     });
            // });
            
            //  describe("Instance 33333", function () {
            //     beforeEach("before each callback", async() => {
            //         console.log("before each №3.5");
            //     });
            //     it("dddddd exists", async() => {
            //         expect(true).to.be.eq(true);
            //     });
            // });
            
        });
    });
/*
    it("dddddd exists", async() => {
       

//         const rc = await tx.wait(); // 0ms, as tx is already confirmed
//         const event = rc.events.find(event => event.event === 'InstanceCreated');
//         const [tokenA, tokenB, instance, instancesCount] = event.args;
// console.log(tokenA, tokenB, instance, instancesCount);
        
    });
    */
});