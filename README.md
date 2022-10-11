# StakingContract
StakingContract is not a single contract but it is a complex mechanism of several contracts that linked between itselfs. 
StakingContract allows to distributed tokens(`tradedToken`) by staking it for a period. 
Here and below we will call it **ITR**, like **I**nves**T**o**R** token.
So user should:
- buy it for another erc20 token `reserveToken` like USDT, USDC or native coin ETH. 
- stake it for a period(depends of pool) and obtain `community coins`(we call it **ITRc** like **I**nves**T**o**R** **c**ommunity token.)
- unstake `community coins` after period passed to get `tradedToken` and `reserveToken` tokens with some fraction bonuses 
> Actually bonus will applied for ITRc. so user obtain additionally bonus ITRc and can unstake it, only paid for smth. but about this it will write below

StakingContract represented with two pools `CommunityStakingPool` and `CommunityStakingPoolERC20`, that can not be used simultaneously in one `ComminityCoin` scope 
The list of basic features:
- buy and stake `tradedToken` in the various ways describe below(see How to stake)
- unstake staked tokens after locked up period passed
- redeem `tradedToken` tokens in any time if have redeem role
- as owner of contract can applied bonuses, taxes and make ecosystem more flexible
- make manage most functions that happens on contract and revert it if necessary

# Contracts
As said before StakingContract is a several contracts:
- `CommunityCoinFactory.sol` is a factory contract that can produce `CommunityCoin` by clone it from implementation
- `CommunityCoin.sol` is a template contract and ERC777 token `ITRc`. contract can produce staking pool.
- `CommunityStakingPool.sol` is a contract that represented pool. Pools are holders of LP tokens(Liquidity Pools)
- `CommunityStakingPoolERC20.sol` is a contract that represented pool too, but as opposed to staking pool there are no Uniswap interactions. Here just using ERC20 token to use as traded and reserved
- `Rewards.sol` - optional contract that implements `IHook` interface. Used for grant additional bonus of any token as the user more and more unstake ITRc.
- `Taxes` - optional contract  that implements `ITaxes` interface. Used to correct amount of transfer ITRc tokens.

# Interactions
Here we will describe main user cases like: stake, unstake, redeem, remove liquidity, etc.
## Preparing to correct work
if using usual `CommunityStakingPool` then:
- make sure that in uniswap(pancakeSwap, etc) have exists necessary pairs, like [tradedToken]:[reserveToken], 
[reserveToken]:[WETH],
[reserveToken]:[payingToken]

## Steps to deploy
in progress
### produce instances and desribed parameters

## Steps to use
in progress

## How to stake
There are several ways:

1. `buyAndStakeLiquidity` (via ETH)
User send network coins(ETH,BNB,MATIC,etc) directly(or with payable method) into the `CommunityStakingPool`. 
Contract do following:
	- swap coins  will converts into WrappedCoins(WETH).  
	- swap WETH into `reserveToken`. 
	- then using Formula#1 converts part of reserve tokens to traded to make sure that adding to liquidity happens without remainder.
	> if uniswap pair [reserveToken]:[WETH] does not exists then transactions will revert.
	
2. `buyAndStakeLiquidity` (via paying token)
User make `ERC20::approve`  paying tokens into `CommunityStakingPool` contract and call `buyAndStakeLiquidity`.  
Contract do following:
	- swap paying tokens into `reserveToken`. 
	- then using Formula#1 converts part of reserve tokens to traded to make sure that adding to liquidity happens without remainder.
	> if uniswap pair [reserveToken]:[payingToken] does not exists then transactions will revert.
	
3. `buyAndStakeLiquidity` (via reserve token)
User make `ERC20::approve` reserve tokens into `CommunityStakingPool` contract and call `buyAndStakeLiquidity`.  
Contract do following:
	- using Formula#1 converts part of reserve tokens to traded to make sure that adding to liquidity happens without remainder.

4. `sellAndStakeLiquidity`
used in cases when user already have `tradedToken` but didn't get enough reserved tokens. So user make `ERC20::approve` traded tokens into `CommunityStakingPool` contract and call `sellAndStakeLiquidity`.  

5. `stakeLiquidity` 
used in cases when user have already LP tokens. Could be obtained after unstake/redeem or transfered by another user. So user make the same as before: make `ERC20::approve` LP tokens into `CommunityStakingPool` contract and call `sellAndStakeLiquidity`.  

6. `addAndStakeLiquidity`
used in cases when user have traded and reserve tokens. So user make the same as before: make `ERC20::approve` both tokens into `CommunityStakingPool` contract and call `addAndStakeLiquidity`.  Keep in mind that there are no calculation to add liquidity without remainder. If one of tokens fully consuming but other not, then all that left will refund to user back.


```mermaid
flowchart TB
WETH(convert coins to WETH)
reserveToken(convert to reserveToken)
doUniswap1(swap reserveToken to tradedToken partly)
doUniswap2(swap tradedToken to reserveToken partly)
PayingToken(PayingToken)
AddLiquidity(adding liquidity to Uniswap)
PoolObtainLP(Pool Obtained LP)
mintITRcAndReturnBackToUser(mint ITRc to user)
StakeLPDirectly( stake LP directly in a pool)
End[[end]]
subgraph Buy And Stake Logic
doUniswap1 --> AddLiquidity --> PoolObtainLP --> mintITRcAndReturnBackToUser
doUniswap2 --> AddLiquidity
StakeLPDirectly --> mintITRcAndReturnBackToUser
end

1[[1]] -.-> WETH --swap--> reserveToken --> doUniswap1 
2[[2]] -.-> PayingToken --swap--> reserveToken 
3[[3]] -.-> reserveToken 
4[[4]] -.-> doUniswap2
5[[5]] -.-> AddLiquidity 
6[[6]] -.-> StakeLPDirectly
mintITRcAndReturnBackToUser --> End
```
## How to unstake
[in progress]

## How to redeem
[in progress]

## CommunityContract
using external Community Contract as a contraсt that checking users rights
[in progress]

## Bonuses
General information about bonuses. how, where, when.
[in progress]

## Taxes

## Formulas 
#### **Formula#1**. 

> How much tokens need to swap from one reserve to get another and fully
> added to liquidity without remainder

<img src="https://latex.codecogs.com/gif.latex?r3=\sqrt{(r1+r2)*r1}-r1"/>
Where:<br>
r1 - reserve at uniswap(reserve side 1)<br>
r2 - incoming amount of reserve(side 1) token<br>
r3 - tokens amount from reserve side1 that need to use `swapExactTokensForTokens`<br>

