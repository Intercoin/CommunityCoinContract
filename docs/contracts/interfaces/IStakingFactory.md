# IStakingFactory

contracts/interfaces/IStakingFactory.sol

# Overview

Once installed will be use methods:

| **method name** | **called by** | **description** |
|-|-|-|
|<a href="#getInstance">getInstance</a>|everyone||
|<a href="#instances">instances</a>|everyone||
|<a href="#instancesCount">instancesCount</a>|everyone||
|<a href="#issueWalletTokens">issueWalletTokens</a>|everyone||
## *Events*
### InstanceCreated

Arguments

| **name** | **type** | **description** |
|-|-|-|
| tokenA | address | indexed |
| tokenB | address | indexed |
| instance | address | not indexed |
| instancesCount | uint256 | not indexed |



## *Functions*
### getInstance

Arguments

| **name** | **type** | **description** |
|-|-|-|
| reserveToken | address |  |
| tradedToken | address |  |
| lockupIntervalCount | uint256 |  |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| instance | address |  |



### instances

Arguments

| **name** | **type** | **description** |
|-|-|-|
| index | uint256 |  |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| instance | address |  |



### instancesCount

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | uint256 |  |



### issueWalletTokens

Arguments

| **name** | **type** | **description** |
|-|-|-|
| account | address |  |
| amount | uint256 |  |
| priceBeforeStake | uint256 |  |


