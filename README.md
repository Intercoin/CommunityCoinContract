


# StakingContract
StakingContract is not a single contract but it is a complex mechanism of several contracts that linked between itselfs. \
StakingContract allows to distributed tokens(`tradedToken`) by staking it for a period. 
Here and below we will call it **ITR**, like **I**n**T**e**R**coin token.\
So user should:
- buy it for another erc20 token `reserveToken` like USDT, USDC or native coin ETH. 
- stake it for a period(depends of pool) and obtain `community coins`(we call it **ITRc** like **I**n**T**e**R**coin **c**ommunity token.)
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
StakingContract is a complex of several contracts that linked between itselfs. We developed pattern that any produced instances use the same code deployed before and interact with it through DELEGATE_CALL. So any instance should be produced only by factory.\
So deployed process contains from two steps:
 1. Deploy implementations\
`communityCoin.sol`\
`communityStakingPoolFactory.sol`\
`communityStakingPool.sol`\
`communityStakingPoolErc20.sol`\
`poolStakesLib.sol`\
All contracts have proxy-based upgradeability system. so no constructors can be used in upgradeable contracts.\
example in `./scripts/deploy-implementations.js` 
 2. Deploy factory
deployed `CommunityCoinFactory.sol` with addresses of implementations deployed in the step before and `Costmanager` address that can be empty \
example in `./scripts/deploy.js` 

## Steps to use
1. Need to create CommunityCoin
To produce `CommunityCoin` instance user should call produce with params:

|name|type|description|
|-|-|-|
|reserveToken|address|address of reserve token. like a WETH, USDT,USDC, etc.|
|tradedToken|address|address of traded token. For example the intercoin ITR token|
|hook|address|address of contract implemented IHook interface and used to calculation bonus tokens amount|
|discountSensitivity|uint256|value that manage amount tokens in redeem process. multiplied by `FRACTION`(10**5 by default)|
|communitySettings|tuple|tuple of community settings. see below|

struct CommunitySettings

|name|type|description|
|-|-|-|
|invitedByFraction|uint256|fraction(multiplied by `FRACTION`) that will get inviter when invited person do unstake operation |
|addr|address|address of community contract|
|redeemRoleId|uint8|users with this role can be able to redeem or redeem and remove liquidity|
|circulationRoleId|uint8|users with this role can call `addToCirculation`|
|tariffRoleId|uint8|users with this role can set tariffcall `setComission`|

## How to stake
There are several ways:

1. **`buyAndStakeLiquidity`** (via ETH)   
User send network coins(ETH,BNB,MATIC,etc) directly(or with payable method) into the `CommunityStakingPool`. 
Contract do following:
	- swap coins  will converts into WrappedCoins(WETH).  
	- swap WETH into `reserveToken`. 
	- then using Formula#1 converts part of reserve tokens to traded to make sure that adding to liquidity happens without remainder.
	> if uniswap pair [reserveToken]:[WETH] does not exists then transactions will revert.
	
2. **`buyAndStakeLiquidity`** (via paying token)   
User make `ERC20::approve`  paying tokens into `CommunityStakingPool` contract and call `buyAndStakeLiquidity`.  
Contract do following:
	- swap paying tokens into `reserveToken`. 
	- then using Formula#1 converts part of reserve tokens to traded to make sure that adding to liquidity happens without remainder.
	> if uniswap pair [reserveToken]:[payingToken] does not exists then transactions will revert.
	
3. **`buyAndStakeLiquidity`** (via reserve token)   
User make `ERC20::approve` reserve tokens into `CommunityStakingPool` contract and call `buyAndStakeLiquidity`.  
Contract do following:
	- using Formula#1 converts part of reserve tokens to traded to make sure that adding to liquidity happens without remainder.

4. **`sellAndStakeLiquidity`**   
used in cases when user already have `tradedToken` but didn't get enough reserved tokens. So user make `ERC20::approve` traded tokens into `CommunityStakingPool` contract and call `sellAndStakeLiquidity`.  

5. **`stakeLiquidity`**   
used in cases when user have already LP tokens. Could be obtained after unstake/redeem or transfered by another user. So user make the same as before: make `ERC20::approve` LP tokens into `CommunityStakingPool` contract and call `sellAndStakeLiquidity`.  

6. **`addAndStakeLiquidity`**   
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
**Requirements**:   
- sender should have own unstakeable tokens. Means tokens should be no transferable to someone after staking. Thats tokens can be unstake after locked up period is passed.     

So sender should approve tokens to `CommunityCoin` and call one of such methods:   
 - **`unstake(uint256 amount)`**   
 in this case user will obtain tokens depends of pool :  
	- LP tokens(if pool `CommunityStakingPool`)
	- erc20 tokens (if pool `CommunityStakingPoolErc20`) 
 - **`unstakeAndRemoveLiquidity(uint256 amount)`**   
 in this case user will obtain tokens depends of pool:   
	 - traded and reserve tokens (if pool `CommunityStakingPool`)   
	 - erc20 tokens (if pool `CommunityStakingPoolErc20`) 

[not completed]
## How to redeem
**Requirements**:   
- sender should have a role with Id `redeemRoleId` and have redeemable tokens.    Means tokens should be transfer from someone. It's could be tokens that was transferred after staking and passed locked up period or could be transferred other redeemable tokens.    
   
So sender should approve tokens to `CommunityCoin` and call one of such methods:   
 - **`redeem(uint256 amount)`**  or  
 - **`redeem(uint256 amount, address[] memory preferredInstances)`**   
 in this case user will obtain tokens depends of pool :  
	- LP tokens(if pool `CommunityStakingPool`)
	- erc20 tokens (if pool `CommunityStakingPoolErc20`) 
 - **`redeemAndRemoveLiquidity(uint256 amount)`** or  
 - **`redeemAndRemoveLiquidity(uint256 amount, address[] memory preferredInstances)`**   
 in this case user will obtain tokens depends of pool:   
	 - traded and reserve tokens (if pool `CommunityStakingPool`)   
	 - erc20 tokens (if pool `CommunityStakingPoolErc20`) 

[not completed]

## CommunityContract
using external Community Contract as a contraсt that checking users rights. Settings of Community Contract have pointed in CommunitySettings when producing CommunityCoin. (see "Step to use" section)

## Bonuses
General information about bonuses. how, where, when.  
There are several bonuses can be happens in system:  
- **invitedByFraction**   
parameter, specified in CommunitySettings struct when producing a CommunityCoin. User obtain bonus tokens every time when invited user from community stakes tokens at any pools. Bonus tokens are locked up as usual tokens and spent(unlocked) first on every transfer
- **bonusTokenFraction**   
parameter, specified when creating a pool.   
User obtain bonus tokens every time when stakes tokens. Fraction can be different and depend of pool. Bonus tokens are locked up as usual tokens and spent(unlocked) first on every transfer
- **addToCirculation**   
direct way to add tokens to recipient.  Initiator should have a role with id `circulationRoleId` .  Bonus tokens are not locked. and behave not as bonus tokens. It's like inflation tokens. 
- **Rewards**   
Additional way to get bonus (traded)tokens is defined hook contract, which can be triggered in every unstake operation. Hook contract is a fund contract that can accomulate tokens unstaked by user and claim to user when overall amount exceed threshold defined in rewardsContract.
It's really separate way to get bonus. it can be ITR  or ITRc or any other erc20 tokens.  RewardsContract can send any tokens and implement any different logic.

## Taxes
There are couple of taxes applied in system:
|tax|description|when applied|
|--|--|--|
|**discountSensitivity**|see Formula#2. setup through produced CommunityCoin|every transfer|
|inflation tax|see Formula#3. autocalculated and depend of inflation tokens|every transfer|
|Tariffs|var **unstakeTariff** and **redeemTariff** can be set by owner|unstake / redeem |
|**taxHook**|if external taxHook contract are present then in any transfer it can adjust transferred amount up or down. But not more then MAX_BOOST or not less then MAX_TAX fractions respectively.|in every transfer|
|**lpFraction**|reducing LP tokens by lpFraction tax in pool(not erc20pool)|unstake/redeem|



**Limit for taxes** (multiple by fraction = 100000)
|name|value|description|
|--|--|--|
|MAX_UNSTAKE_TARIFF|10000|10%|
|MAX_REDEEM_TARIFF|10000|10%|
|MAX_TAX|10000|10%|
|MAX_BOOST|10000|10%|

[in progress]

## Formulas 
#### **Formula#1**. 

> How much tokens need to swap from one reserve to get another and fully
> added to liquidity without remainder

<img src="https://latex.codecogs.com/gif.latex?r3=\sqrt{(r1+r2)*r1}-r1"/>
Where:<br>
r1 - reserve at uniswap(reserve side 1)<br>
r2 - incoming amount of reserve(side 1) token<br>
r3 - tokens amount from reserve side1 that need to use `swapExactTokensForTokens`<br>

#### **Formula#2**. 

> How tokens calculated with circulation tokens present 


<img src="https://latex.codecogs.com/gif.latex?amount=amount*totalReserves/totalSupply"/><br>
Where:<br>
totalReserves - tokens over all pools but without bonuses and inflation tokens   
totalSupply - tokens over all pools   

#### **Formula#3**. 
> ratio with discount sensitivity

<img src="https://latex.codecogs.com/gif.latex?ratio=A/(A+B*discountSensitivity)"/><br>
