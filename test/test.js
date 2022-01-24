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

const REDEEM_ROLE = 'redeem';

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

    
    const reserveTokenClaimFraction = 0;
    const tradedTokenClaimFraction = 0;
    const lpClaimFraction = 1000;
    const dayInSeconds = 24*60*60; // * interval: DAY in seconds
    const lockupIntervalCount = 365; // year in days(dayInSeconds)
    const percentLimitLeftTokenB = 0.001;

    const wrongClaimFraction = 99999999999;
    const discountSensitivity = 0;

    var implementation;
    var mockHook;
    var stakingFactory;
    var erc20;
    var erc777;
    var erc20TradedToken;
    var erc20ReservedToken;
    var erc20Reward;
    
    beforeEach("deploying", async() => {
        const StakingFactoryF = await ethers.getContractFactory("StakingFactory");
        const StakingContractF = await ethers.getContractFactory("StakingContract");
        const MockHookF = await ethers.getContractFactory("MockHook");
        const ERC20Factory = await ethers.getContractFactory("ERC20Mintable");
        const ERC777Factory = await ethers.getContractFactory("ERC777Mintable");
        

        implementation = await StakingContractF.deploy();
        mockHook = await MockHookF.deploy();

        stakingFactory = await StakingFactoryF.deploy(implementation.address, ZERO_ADDRESS, discountSensitivity);

        erc20 = await ERC20Factory.deploy("ERC20 Token", "ERC20");
        erc777 = await ERC20Factory.deploy("ERC777 Token", "ERC777");
        erc20TradedToken = await ERC20Factory.deploy("ERC20 Traded Token", "ERC20-TRD");
        erc20ReservedToken = await ERC20Factory.deploy("ERC20 Reserved Token", "ERC20-RSRV");
        erc20Reward = await ERC20Factory.deploy("ERC20 Token Reward", "ERC20-R");
        
        //console.log("before each №1");
    });

    xit("sqrt coverage", async() => {
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

    xit("shouldnt create with uniswap pair exists", async() => {
        await expect(stakingFactory["produce(address,address,uint64,uint64,uint64,uint64)"](
            erc20ReservedToken.address,
            erc20TradedToken.address,
            lockupIntervalCount,
            reserveTokenClaimFraction,
            tradedTokenClaimFraction,
            lpClaimFraction 
        )).to.be.revertedWith("NO_UNISWAP_V2_PAIR");
    });

    xit("shouldnt create staking with the same token pairs", async() => {
        await expect(stakingFactory["produce(address,address,uint64,uint64,uint64,uint64)"](
            erc20.address,
            erc20.address,
            lockupIntervalCount,
            reserveTokenClaimFraction,
            tradedTokenClaimFraction,
            lpClaimFraction 
        )).to.be.revertedWith("StakingFactory: IDENTICAL_ADDRESSES");
        
    });

    xit("shouldnt create staking with the Zero token", async() => {
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

    xit("shouldnt create with wrong fractions", async() => {
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

        xit("shouldnt create another pair with equal tokens", async() => {
            await expect(stakingFactory["produce(address,address,uint64,uint64,uint64,uint64)"](
                erc20ReservedToken.address,
                erc20TradedToken.address,
                lockupIntervalCount,
                reserveTokenClaimFraction,
                tradedTokenClaimFraction,
                lpClaimFraction 
            )).to.be.revertedWith("StakingFactory: PAIR_ALREADY_EXISTS");
        });

        xit("should set symbol and name with prefix", async() => {
            const nameSuffix= " Staking Token";
            const symbolSuffix= ".STAKE";

            const stakingName = await stakingInstance.name();
            const stakingSymbol = await stakingInstance.symbol();
            const tradedName = await erc20TradedToken.name();
            const tradedSymbol = await erc20TradedToken.symbol();
            
            expect(stakingName).to.be.eq(tradedName.concat(nameSuffix));
            expect(stakingSymbol).to.be.eq(tradedSymbol.concat(symbolSuffix));
            
        });

        xit("should revert if pair does not exists", async() => {
            // revert if uniswap pair(token vs anothertoken) does not exists yet
            await expect(stakingInstance.connect(bob)['buyLiquidityAndStake(address,uint256)'](erc20.address, ONE_ETH.mul(ONE))).to.be.reverted;
            
            // revert if uniswap pair(token vs WETH) does not exists yet
            await expect(stakingInstance.connect(bob)['buyLiquidityAndStake()']({value: ONE_ETH.mul(ONE)})).to.be.reverted;

        });

        describe("through erc20ReservedToken", function () {
            describe("when uniswap reserves in pools are equal", function () {
                var stakingBalanceToken1Before;
                var stakingBalanceToken2Before;
                var stakingBalanceToken1After;
                var stakingBalanceToken2After;
                beforeEach("deploying", async() => {
                    await erc20ReservedToken.mint(bob.address, ONE_ETH.mul(ONE));
                    await erc20ReservedToken.connect(bob).approve(stakingInstance.address, ONE_ETH.mul(ONE));

                    stakingBalanceToken1Before = await erc20ReservedToken.balanceOf(stakingInstance.address);
                    stakingBalanceToken2Before = await erc20TradedToken.balanceOf(stakingInstance.address);
                    await stakingInstance.connect(bob)['buyLiquidityAndStake(uint256)'](ONE_ETH.mul(ONE));
                    stakingBalanceToken1After = await erc20ReservedToken.balanceOf(stakingInstance.address);
                    stakingBalanceToken2After = await erc20TradedToken.balanceOf(stakingInstance.address);
                });

                xit("buyAddLiquidityAndStake", async () => {
            
                    let walletTokens = await stakingFactory.balanceOf(bob.address);
                    let lptokens = await pairInstance.balanceOf(stakingInstance.address);
                    
                    // custom situation when  uniswapLP tokens equal sharesLP tokens.  can be happens in the first stake
                    expect(BigNumber.from(lptokens)).not.to.be.eq(ZERO);
                    expect(lptokens).to.be.eq(walletTokens);
                
                }); 

                xit("shouldnt unstake if not unlocked yet", async () => {
                
                    let walletTokens = await stakingFactory.balanceOf(bob.address);

                    await expect(walletTokens).to.not.equal(ZERO);
                    
                    // even if approve before
                    await stakingFactory.connect(bob).approve(stakingFactory.address, walletTokens);
                    await expect(stakingFactory.connect(bob).unstake(walletTokens)).to.be.revertedWith('STAKE_NOT_UNLOCKED_YET');
                    
                });  

                xit("shouldnt redeem if not unlocked yet", async () => {
                    
                    let walletTokens = await stakingFactory.balanceOf(bob.address);

                    await expect(walletTokens).to.not.equal(ZERO);
                    
                    // even if approve before
                    await stakingFactory.connect(bob).approve(stakingFactory.address, walletTokens);
                    await expect(stakingFactory.connect(bob)['redeem(uint256)'](walletTokens)).to.be.revertedWith(
                        [
                            "AccessControl: account ",
                            (bob.address).toLowerCase(),
                            " is missing role ",
                            "0x"+padZeros(convertToHex(REDEEM_ROLE),64)
                        ].join("")
                            
                    );
                    
                }); 

                xit("should transfer wallet tokens after stake", async() => {
                    
                    let bobSharesAfter = await stakingFactory.balanceOf(bob.address);

                    let bobLockedBalanceAfter = await stakingFactory.connect(bob).viewLockedWalletTokens(bob.address);
                    let aliceLockedBalanceAfter = await stakingFactory.connect(bob).viewLockedWalletTokens(alice.address);
                    await expect(aliceLockedBalanceAfter).to.be.eq(ZERO);
                    await expect(bobLockedBalanceAfter).to.be.eq(bobSharesAfter);

                    await stakingFactory.connect(bob).transfer(alice.address, bobSharesAfter);

                    let bobSharesAfterTransfer = await stakingFactory.balanceOf(bob.address);
                    let aliceSharesAfterBobTransfer = await stakingFactory.balanceOf(alice.address);
                    let bobLockedBalanceAfterBobTransfer = await stakingFactory.connect(bob).viewLockedWalletTokens(bob.address);
                    let aliceLockedBalanceAfterBobTransfer = await stakingFactory.connect(bob).viewLockedWalletTokens(alice.address);

                    await expect(bobSharesAfterTransfer).to.be.eq(ZERO);
                    await expect(bobSharesAfter).to.be.eq(aliceSharesAfterBobTransfer);
                    await expect(bobLockedBalanceAfterBobTransfer).to.be.eq(ZERO);
                    await expect(aliceLockedBalanceAfterBobTransfer).to.be.eq(ZERO);
                    
                    
                });

                xit("should consume all traded tokens when buying liquidity", async () => {
                    
                    await expect(
                        BigNumber.from(stakingBalanceToken2Before).lte(BigNumber.from(percentLimitLeftTokenB*ONE_ETH))
                    ).to.be.eq(true);

                    await expect(
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
                    await erc20ReservedToken.connect(bob).approve(stakingInstance.address, ONE_ETH.mul(ONE));

                    // 50000
                    await erc20ReservedToken.mint(bob.address, ONE_ETH.mul(FOUR).mul(TEN).mul(THOUSAND));
                    await erc20ReservedToken.connect(bob).approve(stakingInstance.address, ONE_ETH.mul(FOUR).mul(TEN).mul(THOUSAND));

                    stakingBalanceToken1Before = await erc20ReservedToken.balanceOf(stakingInstance.address);
                    stakingBalanceToken2Before = await erc20TradedToken.balanceOf(stakingInstance.address);
                    await stakingInstance.connect(bob)['buyLiquidityAndStake(uint256)'](ONE_ETH.mul(ONE));
                    stakingBalanceToken1After = await erc20ReservedToken.balanceOf(stakingInstance.address);
                    stakingBalanceToken2After = await erc20TradedToken.balanceOf(stakingInstance.address);
                });

                xit("should consume all traded tokens when buying liquidity", async () => {
                    await expect(
                        BigNumber.from(stakingBalanceToken2Before).lte(BigNumber.from(percentLimitLeftTokenB*ONE_ETH))
                    ).to.be.eq(true);

                    await expect(
                        BigNumber.from(stakingBalanceToken2After).lte(BigNumber.from(percentLimitLeftTokenB*ONE_ETH))
                    ).to.be.eq(true);
                });
            });
        });

        describe("through paying token", function () {
            beforeEach("deploying", async() => {
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
            });

            xit("buyAddLiquidityAndStake", async () => {
        
                // now addinig liquidity through paying token will be successful
                await stakingInstance.connect(bob)['buyLiquidityAndStake(address,uint256)'](erc20.address, ONE_ETH.mul(ONE))
            
                let walletTokens = await stakingFactory.balanceOf(bob.address);
                let lptokens = await pairInstance.balanceOf(stakingInstance.address);
                    
                // custom situation when  uniswapLP tokens equal sharesLP tokens.  can be happens in the first stake

                expect(lptokens).not.to.be.eq(ZERO);
                expect(lptokens).to.be.eq(walletTokens);
            
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
            
            xit("buyAddLiquidityAndStake", async () => {
                
                await stakingInstance.connect(bob)['buyLiquidityAndStake()']({value: ONE_ETH.mul(ONE) });
                
                let walletTokens = await stakingFactory.balanceOf(bob.address);
                let lptokens = await pairInstance.balanceOf(stakingInstance.address);
                
                // custom situation when  uniswapLP tokens equal sharesLP tokens.  can be happens in the first stake
                expect(lptokens).not.to.be.eq(ZERO);
                expect(lptokens).to.be.eq(walletTokens);
                
            });    
        });

        describe("factory tests", function() {
            xit("should return instance info", async () => {
                
                let data = await await stakingFactory.connect(bob).getInstanceInfo(erc20ReservedToken.address, erc20TradedToken.address, lockupIntervalCount);
                
                await expect(data.reserveToken).to.be.eq(erc20ReservedToken.address);
                await expect(data.tradedToken).to.be.eq(erc20TradedToken.address);
                await expect(data.duration).to.be.eq(lockupIntervalCount);
                
            }); 
            
            xit("should return correct instance length", async () => {
                let data = await await stakingFactory.connect(bob).instancesCount();
                await expect(data).to.be.eq(ONE);
            }); 
        }); 

           
        describe("unstake/redeem/redeem-and-remove-liquidity tests", function () {
            var shares;
            beforeEach("before each callback", async() => {
                
                await erc20ReservedToken.mint(bob.address, ONE_ETH.mul(ONE));
                await erc20ReservedToken.connect(bob).approve(stakingInstance.address, ONE_ETH.mul(ONE));
                await stakingInstance.connect(bob)['buyLiquidityAndStake(uint256)'](ONE_ETH.mul(ONE));
                shares = await stakingFactory.balanceOf(bob.address);
            });

            xit("should wallet tokens appear and not equal zero", async () => {
                await expect(shares).to.not.equal(ZERO);
            });

            describe("unstake tests", function () {
                describe("shouldnt unstake", function () {
                    xit("if not unlocked yet", async () => {
                        await expect(stakingFactory.connect(bob)["unstake(uint256)"](shares)).to.be.revertedWith("STAKE_NOT_UNLOCKED_YET");
                    });
                    xit("if amount more than balance", async () => {
                        // pass some mtime
                        await time.increase(lockupIntervalCount*dayInSeconds+9);    

                        await expect(stakingFactory.connect(bob)["unstake(uint256)"](shares.add(ONE_ETH))).to.be.revertedWith("INSUFFICIENT_BALANCE");
                    });
                });
                describe("should unstake", function () {
                    xit("successfull", async () => {
// console.log('lockupIntervalCount=',lockupIntervalCount);
// console.log('dayInSeconds=',dayInSeconds);
                        // pass some mtime
                        await time.increase(lockupIntervalCount*dayInSeconds+9);    
                        

                        let bobReservedTokenBefore = await erc20ReservedToken.balanceOf(bob.address);
                        let bobTradedTokenBefore = await erc20TradedToken.balanceOf(bob.address);

                        await stakingFactory.connect(bob).approve(stakingFactory.address, shares);
                        await stakingFactory.connect(bob)["unstake(uint256)"](shares);

                        let bobReservedTokenAfter = await erc20ReservedToken.balanceOf(bob.address);
                        let bobTradedTokenAfter = await erc20TradedToken.balanceOf(bob.address);

                        await expect(bobReservedTokenAfter).gt(bobReservedTokenBefore);
                        await expect(bobTradedTokenAfter).gt(bobTradedTokenBefore);
                    });
                });
            });
            describe("redeem tests", function () {

                describe("shouldnt redeem", function () {
                    describe("without approve before", function () {
                        it("without approve", async () => {
                            await expect(stakingFactory.connect(bob)["redeem(uint256)"](shares)).to.be.revertedWith("Amount exceeds allowance");
                        });
                        it("if increase totalRedeemable", async () => {
                            await stakingFactory.connect(bob).transfer(alice.address, shares);
                            await expect(stakingFactory.connect(alice)["redeem(uint256)"](shares)).to.be.revertedWith("Amount exceeds allowance");
                        });
                    });  
                    describe("with approve before", function () {  
                        beforeEach("before each callback", async() => {
                            //approve
                            await stakingFactory.connect(bob).approve(stakingFactory.address, shares);
                        });    
                        it("without redeem role", async () => {
                        
                            await expect(stakingFactory.connect(bob)["redeem(uint256)"](shares)).to.be.revertedWith(
                                [
                                    "AccessControl: account ",
                                    (bob.address).toLowerCase(),
                                    " is missing role ",
                                    "0x"+padZeros(convertToHex(REDEEM_ROLE),64)
                                ].join("")
                            );

                            // transfer from bob to alice
                            await stakingFactory.connect(bob).transfer(alice.address, shares);
                            await expect(stakingFactory.connect(alice)["redeem(uint256)"](shares)).to.be.revertedWith(
                                [
                                    "AccessControl: account ",
                                    (bob.address).toLowerCase(),
                                    " is missing role ",
                                    "0x"+padZeros(convertToHex(REDEEM_ROLE),64)
                                ].join("")
                            );

                        });
                        it("without redeem role even if passed time", async () => {
                            // pass some mtime
                            await time.increase(lockupIntervalCount*dayInSeconds+9);    

                            await expect(stakingFactory.connect(bob)["redeem(uint256)"](shares)).to.be.revertedWith(
                                [
                                    "AccessControl: account ",
                                    (bob.address).toLowerCase(),
                                    " is missing role ",
                                    "0x"+padZeros(convertToHex(REDEEM_ROLE),64)
                                ].join("")
                            );

                            // transfer from bob to alice
                            await stakingFactory.connect(bob).transfer(alice.address, shares);
                            await expect(stakingFactory.connect(alice)["redeem(uint256)"](shares)).to.be.revertedWith(
                                [
                                    "AccessControl: account ",
                                    (bob.address).toLowerCase(),
                                    " is missing role ",
                                    "0x"+padZeros(convertToHex(REDEEM_ROLE),64)
                                ].join("")
                            );

                        });
                        describe("if grant role", function () {
                            beforeEach("before each callback", async() => {
                                // even if grant role
                                await stakingFactory.connect(owner).grantRole(ethers.utils.formatBytes32String(REDEEM_ROLE), bob.address);
                                await stakingFactory.connect(owner).grantRole(ethers.utils.formatBytes32String(REDEEM_ROLE), alice.address);
                            });
                        });
                    });
                    
                    
                    

                    describe("even if grant role", function () {
                        
                        it("but without pass", async () => {
                            // bob have tokens
                            await expect(stakingFactory.connect(bob)["redeem(uint256)"](shares)).to.be.revertedWith(
                                
                            );
                            //approve
                        //await stakingFactory.connect(bob).approve(stakingFactory.address, shares);

                            await expect(stakingFactory.connect(bob)["redeem(uint256)"](shares)).to.be.revertedWith("INSUFFICIENT_BALANCE");
                        });
                        
                    }); 
                    
                    
                });
                describe("should redeem", function () {
                    var uniswapV2PairAddress;
                    var uniswapV2PairInstance;
                    var aliceLPTokenBefore;
                    var aliceLPTokenAfter;
                    beforeEach("before each callback", async() => {
                        // pass some mtime
                        await time.increase(lockupIntervalCount*dayInSeconds+9);    
                        // grant role
                        await stakingFactory.connect(owner).grantRole(ethers.utils.formatBytes32String(REDEEM_ROLE), alice.address);

                        // transfer from bob to alice
                        await stakingFactory.connect(bob).transfer(alice.address, shares);
                        await stakingFactory.connect(owner).grantRole(ethers.utils.formatBytes32String(REDEEM_ROLE), alice.address);

                        //after that, when alice has obtain tokens she can redeem 
                        uniswapV2PairAddress = await stakingInstance.uniswapV2Pair();
                        uniswapV2PairInstance = await ethers.getContractAt("ERC20Mintable",uniswapV2PairAddress);

                        aliceLPTokenBefore = await uniswapV2PairInstance.balanceOf(alice.address);
                    });
                    xit("via redeem method", async () => {
                        
                        await stakingFactory.connect(alice).approve(stakingFactory.address, shares);
                        await stakingFactory.connect(alice)["redeem(uint256)"](shares);

                        aliceLPTokenAfter = await uniswapV2PairInstance.balanceOf(alice.address);

                        await expect(aliceLPTokenAfter).gt(aliceLPTokenBefore);
                    });
                    xit("via directly send to contract", async () => {
                        console.log("alice =", alice.address);
                        console.log("stakingFactory.address =", stakingFactory.address);
                        await stakingFactory.connect(alice).transfer(stakingFactory.address, shares);

                        aliceLPTokenAfter = await uniswapV2PairInstance.balanceOf(alice.address);

                        await expect(aliceLPTokenAfter).gt(aliceLPTokenBefore);
                    });
                     
                });
            });
            describe("redeem and remove liquidity(RRL) tests", function () {
                describe("shouldnt RRL", function () {
                    xit("without redeem role", async () => {
                        await expect(stakingFactory.connect(bob)["redeemAndRemoveLiquidity(uint256)"](shares)).to.be.revertedWith(
                            [
                                "AccessControl: account ",
                                (bob.address).toLowerCase(),
                                " is missing role ",
                                "0x"+padZeros(convertToHex(REDEEM_ROLE),64)
                            ].join("")
                        );

                    });
                    xit("without redeem role even if passed time", async () => {
                        // pass some mtime
                        await time.increase(lockupIntervalCount*dayInSeconds+9);    
                        await expect(stakingFactory.connect(bob)["redeemAndRemoveLiquidity(uint256)"](shares)).to.be.revertedWith(
                            [
                                "AccessControl: account ",
                                (bob.address).toLowerCase(),
                                " is missing role ",
                                "0x"+padZeros(convertToHex(REDEEM_ROLE),64)
                            ].join("")
                        );

                    });
                    xit("with redeem role but without enougn balance or without approve", async () => {
                        // even if grant role
                        await stakingFactory.connect(owner).grantRole(ethers.utils.formatBytes32String(REDEEM_ROLE), bob.address);
                        await expect(stakingFactory.connect(bob)["redeemAndRemoveLiquidity(uint256)"](shares)).to.be.revertedWith("INSUFFICIENT_BALANCE");
                    });

                    xit("with redeem role but without enougn balance", async () => {
                        // even if grant role
                        await stakingFactory.connect(owner).grantRole(ethers.utils.formatBytes32String(REDEEM_ROLE), bob.address);
                        await expect(stakingFactory.connect(bob)["redeemAndRemoveLiquidity(uint256)"](shares)).to.be.revertedWith("INSUFFICIENT_BALANCE");

                        // even if approve before
                        await stakingFactory.connect(bob).approve(stakingFactory.address, shares);
                        await expect(stakingFactory.connect(bob)["redeemAndRemoveLiquidity(uint256)"](shares)).to.be.revertedWith("INSUFFICIENT_BALANCE");
                    });
                });
                describe("should RRL", function () {
                    xit("successfull", async () => {
                        // pass some mtime
                        await time.increase(lockupIntervalCount*dayInSeconds+9);    
                        // grant role
                        await stakingFactory.connect(owner).grantRole(ethers.utils.formatBytes32String(REDEEM_ROLE), alice.address);

                        // transfer from bob to alice
                        await stakingFactory.connect(bob).transfer(alice.address, shares);
                        await stakingFactory.connect(owner).grantRole(ethers.utils.formatBytes32String(REDEEM_ROLE), alice.address);

                        //after that, when alice has obtain tokens she can redeem and remove liquidity
                        await stakingFactory.connect(alice).approve(stakingFactory.address, shares);

                        let aliceReservedTokenBefore = await erc20ReservedToken.balanceOf(alice.address);
                        let aliceTradedTokenBefore = await erc20TradedToken.balanceOf(alice.address);

                        await stakingFactory.connect(alice)["redeemAndRemoveLiquidity(uint256)"](shares);

                        let aliceReservedTokenAfter = await erc20ReservedToken.balanceOf(alice.address);
                        let aliceTradedTokenAfter = await erc20TradedToken.balanceOf(alice.address);

                        await expect(aliceReservedTokenAfter).gt(aliceReservedTokenBefore);
                        await expect(aliceTradedTokenAfter).gt(aliceTradedTokenBefore);
                    });
                });
            });
           
        });      
               

/*                
                describe("redeem via approve and call redeem", function() {
                    xit("shouldnt redeem until time expire", async () => {
                        await expect(stakingInstance.connect(bob).redeem(shares)).to.be.revertedWith("Amount exceeds allowance");
                        await stakingInstance.connect(bob).approve(stakingInstance.address, shares);
                        await expect(stakingInstance.connect(bob).redeem(shares)).to.be.revertedWith("STAKE_NOT_UNLOCKED_YET");
                    });
                    xit("redeem tokens", async () => {
                    
                        // pass some mtime
                        await time.increase(DaysCount*dayInSeconds+9);
                        await expect(stakingInstance.connect(bob).redeem(shares)).to.be.revertedWith("Amount exceeds allowance");
                        await stakingInstance.connect(bob).approve(stakingInstance.address, shares);
                        await stakingInstance.connect(bob).redeem(shares);
                        
                    });    
                    

                }); 
               

    */

                    
    

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

        
    });

});