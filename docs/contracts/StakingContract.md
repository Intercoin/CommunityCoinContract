# StakingContract

This it ERC777 contract (pool).<br>Can be create by factory (StakingFactory contract).<br>Providing a functionality to buy and stake liquidity and getting in return WalletTokens(See StakingFactory contract).

# Overview

Once installed will be use methods:

| **method name** | **called by** | **description** |
|-|-|-|
|<a href="#allowance">allowance</a>|everyone|part of ERC20|
|<a href="#approve">approve</a>|everyone|part of ERC20|
|<a href="#balanceof">balanceOf</a>|everyone|part of ERC777|
|<a href="#burn">burn</a>|everyone|part of ERC777|
|<a href="#buyliquidityandstake">buyLiquidityAndStake</a>|everyone|the way to buy liquidity and stake via paying token|
|<a href="#buyliquidityandstake">buyLiquidityAndStake</a>|everyone|the way to buy liquidity and stake via reserveToken|
|<a href="#buyliquidityandstake">buyLiquidityAndStake</a>|everyone|the way to buy liquidity and stake via ETH|
|<a href="#granularity">granularity</a>|everyone|part of ERC777|
|<a href="#initialize">initialize</a>|everyone|initialize method. Called once by the factory at time of deployment|
|<a href="#isoperatorfor">isOperatorFor</a>|everyone|part of ERC777|
|<a href="#name">name</a>|everyone|name of LP token|
|<a href="#operatorburn">operatorBurn</a>|everyone|part of ERC777|
|<a href="#operatorsend">operatorSend</a>|everyone|part of ERC777|
|<a href="#redeem">redeem</a>|factory|redeem lp tokens|
|<a href="#redeemandremoveliquidity">redeemAndRemoveLiquidity</a>|factory|redeem and remove liquidity|
|<a href="#revokeoperator">revokeOperator</a>|everyone|part of ERC777|
|<a href="#send">send</a>|everyone|part of ERC777|
|<a href="#stakeliquidity">stakeLiquidity</a>|everyone|way to stake LP tokens|
|<a href="#symbol">symbol</a>|everyone|symbol of LP token|
|<a href="#totalsupply">totalSupply</a>|everyone|total amount of LP token|
|<a href="#transfer">transfer</a>|everyone|part of ERC777|
|<a href="#transferfrom">transferFrom</a>|everyone|part of ERC777|
## *Events*
### Approval

Arguments

| **name** | **type** | **description** |
|-|-|-|
| owner | address | indexed |
| spender | address | indexed |
| value | uint256 | not indexed |



### AuthorizedOperator

Arguments

| **name** | **type** | **description** |
|-|-|-|
| operator | address | indexed |
| tokenHolder | address | indexed |



### Burned

Arguments

| **name** | **type** | **description** |
|-|-|-|
| operator | address | indexed |
| from | address | indexed |
| amount | uint256 | not indexed |
| data | bytes | not indexed |
| operatorData | bytes | not indexed |



### Minted

Arguments

| **name** | **type** | **description** |
|-|-|-|
| operator | address | indexed |
| to | address | indexed |
| amount | uint256 | not indexed |
| data | bytes | not indexed |
| operatorData | bytes | not indexed |



### Redeemed

Arguments

| **name** | **type** | **description** |
|-|-|-|
| account | address | indexed |
| amount | uint256 | not indexed |



### RevokedOperator

Arguments

| **name** | **type** | **description** |
|-|-|-|
| operator | address | indexed |
| tokenHolder | address | indexed |



### RewardGranted

Arguments

| **name** | **type** | **description** |
|-|-|-|
| token | address | indexed |
| account | address | indexed |
| amount | uint256 | not indexed |



### Sent

Arguments

| **name** | **type** | **description** |
|-|-|-|
| operator | address | indexed |
| from | address | indexed |
| to | address | indexed |
| amount | uint256 | not indexed |
| data | bytes | not indexed |
| operatorData | bytes | not indexed |



### Staked

Arguments

| **name** | **type** | **description** |
|-|-|-|
| account | address | indexed |
| amount | uint256 | not indexed |
| priceBeforeStake | uint256 | not indexed |



### Transfer

Arguments

| **name** | **type** | **description** |
|-|-|-|
| from | address | indexed |
| to | address | indexed |
| value | uint256 | not indexed |



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
### allowance

> Details: See {IERC20-allowance}. Note that operator and allowance concepts are orthogonal: operators may not have allowance, and accounts with allowance may not be operators themselves.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| holder | address |  |
| spender | address |  |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | uint256 |  |



### approve

> Details: See {IERC20-approve}. Note that accounts cannot have allowance issued by their operators.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| spender | address |  |
| value | uint256 |  |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | bool |  |



### balanceOf

> Details: Returns the amount of tokens owned by an account (`tokenHolder`).

Arguments

| **name** | **type** | **description** |
|-|-|-|
| tokenHolder | address |  |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | uint256 |  |



### burn

> Details: See {IERC777-burn}. Also emits a {IERC20-Transfer} event for ERC20 compatibility.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| amount | uint256 |  |
| data | bytes |  |



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



### granularity

> Details: See {IERC777-granularity}. This implementation always returns `1`.

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | uint256 |  |



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



### isOperatorFor

> Details: See {IERC777-isOperatorFor}.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| operator | address |  |
| tokenHolder | address |  |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | bool |  |



### name

> Details: See {IERC777-name}.

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | string |  |



### operatorBurn

> Details: See {IERC777-operatorBurn}. Emits {Burned} and {IERC20-Transfer} events.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| account | address |  |
| amount | uint256 |  |
| data | bytes |  |
| operatorData | bytes |  |



### operatorSend

> Details: See {IERC777-operatorSend}. Emits {Sent} and {IERC20-Transfer} events.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| sender | address |  |
| recipient | address |  |
| amount | uint256 |  |
| data | bytes |  |
| operatorData | bytes |  |



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



### revokeOperator

> Details: See {IERC777-revokeOperator}.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| operator | address |  |



### send

> Details: See {IERC777-send}. Also emits a {IERC20-Transfer} event for ERC20 compatibility.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| recipient | address |  |
| amount | uint256 |  |
| data | bytes |  |



### stakeLiquidity

> Notice: way to stake LP tokens of current pool(traded/reserve tokens)

> Details: keep in mind that user can redeem lp token from other staking contract with same pool but different duration and use here.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| lpAmount | uint256 | liquidity tokens's amount |



### symbol

> Details: See {IERC777-symbol}.

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | string |  |



### totalSupply

> Details: See {IERC777-totalSupply}.

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | uint256 |  |



### transfer

> Details: See {IERC20-transfer}. Unlike `send`, `recipient` is _not_ required to implement the {IERC777Recipient} interface if it is a contract. Also emits a {Sent} event.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| recipient | address |  |
| amount | uint256 |  |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | bool |  |



### transferFrom

> Details: See {IERC20-transferFrom}. Note that operator and allowance concepts are orthogonal: operators cannot call `transferFrom` (unless they have allowance), and accounts with allowance cannot call `operatorSend` (unless they are operators). Emits {Sent}, {IERC20-Transfer} and {IERC20-Approval} events.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| holder | address |  |
| recipient | address |  |
| amount | uint256 |  |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | bool |  |


