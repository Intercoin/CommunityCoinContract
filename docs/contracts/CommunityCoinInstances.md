# CommunityCoinInstances

contracts/CommunityCoinInstances.sol

# Overview

Once installed will be use methods:

| **method name** | **called by** | **description** |
|-|-|-|
|<a href="#_instanceinfos">_instanceInfos</a>|everyone||
|<a href="#creator">creator</a>|everyone||
|<a href="#getinstance">getInstance</a>|everyone||
|<a href="#getinstanceinfo">getInstanceInfo</a>|everyone|view instance info|
|<a href="#getinstanceinfobypooladdress">getInstanceInfoByPoolAddress</a>|everyone||
|<a href="#implementation">implementation</a>|everyone||
|<a href="#initialize">initialize</a>|everyone||
|<a href="#instances">instances</a>|everyone||
|<a href="#instancesbyindex">instancesByIndex</a>|everyone||
|<a href="#instancescount">instancesCount</a>|everyone|view amount of created instances|
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
### _instanceInfos

Arguments

| **name** | **type** | **description** |
|-|-|-|
| -/- | address |  |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| reserveToken | address |  |
| duration | uint64 |  |
| tradedToken | address |  |
| reserveTokenClaimFraction | uint64 |  |
| tradedTokenClaimFraction | uint64 |  |
| lpClaimFraction | uint64 |  |
| numerator | uint64 |  |
| denominator | uint64 |  |
| exists | bool |  |



### creator

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | address |  |



### getInstance

Arguments

| **name** | **type** | **description** |
|-|-|-|
| -/- | address |  |
| -/- | address |  |
| -/- | uint256 |  |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | address |  |



### getInstanceInfo

> Notice: view instance info by reserved/traded tokens and duration

> Details: note that `duration` is 365 and `LOCKUP_INTERVAL` is 86400 (seconds) means that tokens locked up for an year

Arguments

| **name** | **type** | **description** |
|-|-|-|
| reserveToken | address | address of reserve token. like a WETH, USDT,USDC, etc. |
| tradedToken | address | address of traded token. usual it intercoin investor token |
| duration | uint64 | duration represented in amount of `LOCKUP_INTERVAL` |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | tuple |  |



### getInstanceInfoByPoolAddress

Arguments

| **name** | **type** | **description** |
|-|-|-|
| addr | address |  |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | tuple |  |



### implementation

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | address |  |



### initialize

Arguments

| **name** | **type** | **description** |
|-|-|-|
| impl | address |  |



### instances

Outputs

| **name** | **type** | **description** |
|-|-|-|
| instances_ | address[] |  |



### instancesByIndex

Arguments

| **name** | **type** | **description** |
|-|-|-|
| index | uint256 |  |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| instance_ | address |  |



### instancesCount

> Details: view amount of created instances

Outputs

| **name** | **type** | **description** |
|-|-|-|
| amount | uint256 | amount instances |



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


