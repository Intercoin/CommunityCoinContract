# CommunityCoinFactory

This is factory contract.<br>Provide a functionality to create CommunityCoin

# Overview

Once installed will be use methods:

| **method name** | **called by** | **description** |
|-|-|-|
|<a href="#instances">instances</a>|everyone|public list of created instances|
|<a href="#instancescount">instancesCount</a>|everyone|view amount of created instances|
|<a href="#owner">owner</a>|everyone|owner of staking contract. Part of `Ownable` contract|
|<a href="#produce">produce</a>|everyone|creation instance|
|<a href="#renounceownership">renounceOwnership</a>|everyone|Part of `Ownable` contract|
|<a href="#transferownership">transferOwnership</a>|everyone|Part of `Ownable` contract|
## *Constructor*


Arguments

| **name** | **type** | **description** |
|-|-|-|
| communityCoinImpl | address | address of CommunityCoin implementation |
| stakingPoolImpl | address | address of StakingPool implementation |



## *Events*
### InstanceCreated

Arguments

| **name** | **type** | **description** |
|-|-|-|
| instance | address | not indexed |
| instancesCount | uint256 | not indexed |



### OwnershipTransferred

Arguments

| **name** | **type** | **description** |
|-|-|-|
| previousOwner | address | indexed |
| newOwner | address | indexed |



## *StateVariables*
### communityCoinImplementation

> Notice: CommunityCoin implementation address


| **type** |
|-|
|address|



### stakingPoolImplementation

> Notice: StakingPool implementation address


| **type** |
|-|
|address|



## *Functions*
### instances

> Details: public list of created instances

Arguments

| **name** | **type** | **description** |
|-|-|-|
| -/- | uint256 |  |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | address |  |



### instancesCount

> Details: view amount of created instances

Outputs

| **name** | **type** | **description** |
|-|-|-|
| amount | uint256 | amount instances |



### owner

> Details: Returns the address of the current owner.

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | address |  |



### produce

Arguments

| **name** | **type** | **description** |
|-|-|-|
| hook | address | address of contract implemented IHook interface and used to calculation bonus tokens amount |
| discountSensitivity | uint256 | discountSensitivity value that manage amount tokens in redeem process. multiplied by `FRACTION`(10**5 by default) |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| instance | address | address of created instance pool `CommunityCoin` |



### renounceOwnership

> Details: Leaves the contract without owner. It will not be possible to call `onlyOwner` functions anymore. Can only be called by the current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby removing any functionality that is only available to the owner.



### transferOwnership

> Details: Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| newOwner | address |  |


