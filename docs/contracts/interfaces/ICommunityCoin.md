# ICommunityCoin

contracts/interfaces/ICommunityCoin.sol

# Overview

Once installed will be use methods:

| **method name** | **called by** | **description** |
|-|-|-|
|<a href="#initialize">initialize</a>|everyone||
|<a href="#issuewallettokens">issueWalletTokens</a>|everyone||
## *Events*
### InstanceCreated

Arguments

| **name** | **type** | **description** |
|-|-|-|
| tokenA | address | indexed |
| tokenB | address | indexed |
| instance | address | not indexed |



## *Functions*
### initialize

Arguments

| **name** | **type** | **description** |
|-|-|-|
| poolImpl | address |  |
| hook | address |  |
| instancesImpl | address |  |
| discountSensitivity | uint256 |  |



### issueWalletTokens

Arguments

| **name** | **type** | **description** |
|-|-|-|
| account | address |  |
| amount | uint256 |  |
| priceBeforeStake | uint256 |  |


