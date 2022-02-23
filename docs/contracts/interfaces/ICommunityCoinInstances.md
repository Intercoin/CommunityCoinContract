# ICommunityCoinInstances

contracts/interfaces/ICommunityCoinInstances.sol

# Overview

Once installed will be use methods:

| **method name** | **called by** | **description** |
|-|-|-|
|<a href="#getinstance">getInstance</a>|everyone||
|<a href="#getinstanceinfobypooladdress">getInstanceInfoByPoolAddress</a>|everyone||
|<a href="#initialize">initialize</a>|everyone||
|<a href="#instances">instances</a>|everyone||
|<a href="#instancesbyindex">instancesByIndex</a>|everyone||
|<a href="#instancescount">instancesCount</a>|everyone||
|<a href="#produce">produce</a>|everyone||
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



### getInstanceInfoByPoolAddress

Arguments

| **name** | **type** | **description** |
|-|-|-|
| addr | address |  |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | tuple |  |



### initialize

Arguments

| **name** | **type** | **description** |
|-|-|-|
| impl | address |  |



### instances

Outputs

| **name** | **type** | **description** |
|-|-|-|
| instances | address[] |  |



### instancesByIndex

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



### produce

Arguments

| **name** | **type** | **description** |
|-|-|-|
| reserveToken | address |  |
| tradedToken | address |  |
| duration | uint64 |  |
| reserveTokenClaimFraction | uint64 |  |
| tradedTokenClaimFraction | uint64 |  |
| lpClaimFraction | uint64 |  |
| numerator | uint64 |  |
| denominator | uint64 |  |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| instance | address |  |


