# StakingPool

This it ERC777 contract (pool).<br>Can be created by factory (StakingFactory contract).<br>Provide a functionality to buy and stake liquidity and getting in return WalletTokens(See StakingFactory contract).

# Overview

Once installed will be use methods:

| **method name** | **called by** | **description** |
|-|-|-|
|<a href="#buyliquidityandstake">buyLiquidityAndStake</a>|everyone|the way to buy liquidity and stake via paying token|
|<a href="#buyliquidityandstake">buyLiquidityAndStake</a>|everyone|the way to buy liquidity and stake via reserveToken|
|<a href="#buyliquidityandstake">buyLiquidityAndStake</a>|everyone|the way to buy liquidity and stake via ETH|
|<a href="#initialize">initialize</a>|everyone|initialize method. Called once by the factory at time of deployment|
|<a href="#redeem">redeem</a>|staking contract|redeem lp tokens|
|<a href="#redeemandremoveliquidity">redeemAndRemoveLiquidity</a>|staking contract|redeem and remove liquidity|
|<a href="#stakeliquidity">stakeLiquidity</a>|everyone|way to stake LP tokens|
## *Events*
### Redeemed

Arguments

| **name** | **type** | **description** |
|-|-|-|
| account | address | indexed |
| amount | uint256 | not indexed |



### RewardGranted

Arguments

| **name** | **type** | **description** |
|-|-|-|
| token | address | indexed |
| account | address | indexed |
| amount | uint256 | not indexed |



### Staked

Arguments

| **name** | **type** | **description** |
|-|-|-|
| account | address | indexed |
| amount | uint256 | not indexed |
| priceBeforeStake | uint256 | not indexed |



## *StateVariables*
### FRACTION

> Notice: `FRACTION` constant - 100000


| **type** |
|-|
|uint64|



### lpClaimFraction

> Notice: fraction of LP token multiplied by `FRACTION`


| **type** |
|-|
|uint64|



### reserveToken

> Notice: address of reserve token. ie WETH,USDC,USDT,etc


| **type** |
|-|
|address|



### reserveTokenClaimFraction

> Notice: fraction of reserved token multiplied by `FRACTION`


| **type** |
|-|
|uint64|



### tradedToken

> Notice: address of traded token. ie investor token - ITR


| **type** |
|-|
|address|



### tradedTokenClaimFraction

> Notice: fraction of traded token multiplied by `FRACTION`


| **type** |
|-|
|uint64|



### uniswapV2Pair

> Notice: uniswap v2 pair


| **type** |
|-|
|address|



## *Functions*
### buyLiquidityAndStake

> Notice: method will receive payingToken token, exchange to reserve token via uniswap.  Finally will add to liquidity pool and stake it. User will obtain shares 

Arguments

| **name** | **type** | **description** |
|-|-|-|
| payingToken | address |  |
| amount | uint256 |  |



### buyLiquidityAndStake

> Notice: method will receive reserveToken token then will add to liquidity pool and stake it. User will obtain shares 

Arguments

| **name** | **type** | **description** |
|-|-|-|
| tokenBAmount | uint256 |  |



### buyLiquidityAndStake

> Notice: payble method will receive ETH, convert it to WETH, exchange to reserve token via uniswap.  Finally will add to liquidity pool and stake it. User will obtain shares 



### initialize

> Notice: initialize method. Called once by the factory at time of deployment

Arguments

| **name** | **type** | **description** |
|-|-|-|
| reserveToken_ | address | address of reserve token. ie WETH,USDC,USDT,etc |
| tradedToken_ | address | address of traded token. ie investor token - ITR |
| tradedTokenClaimFraction_ | uint64 | fraction of traded token multiplied by `FRACTION`.  |
| reserveTokenClaimFraction_ | uint64 | fraction of reserved token multiplied by `FRACTION`.  |
| lpClaimFraction_ | uint64 | fraction of LP token multiplied by `FRACTION`.  |



### redeem

> Notice: way to redeem via approve/transferFrom. Another way is send directly to contract. User will obtain uniswap-LP tokens

Arguments

| **name** | **type** | **description** |
|-|-|-|
| account | address | account address will redeemed from!!! |
| amount | uint256 | The number of shares that will be redeemed.!!!! |



### redeemAndRemoveLiquidity

> Notice: way to redeem and remove liquidity via approve/transferFrom shares. User will obtain reserve and traded tokens back

Arguments

| **name** | **type** | **description** |
|-|-|-|
| account | address | account address will redeemed from |
| amount | uint256 | The number of shares that will be redeemed. |



### stakeLiquidity

> Notice: way to stake LP tokens of current pool(traded/reserve tokens)

> Details: keep in mind that user can redeem lp token from other staking contract with same pool but different duration and use here.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| lpAmount | uint256 | liquidity tokens's amount |


