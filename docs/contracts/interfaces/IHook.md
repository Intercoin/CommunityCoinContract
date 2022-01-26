# IHook

contracts/interfaces/IHook.sol

# Overview

Once installed will be use methods:

| **method name** | **called by** | **description** |
|-|-|-|
|<a href="#bonuscalculation">bonusCalculation</a>|everyone||
|<a href="#transferhook">transferHook</a>|everyone||
## *Functions*
### bonusCalculation

Arguments

| **name** | **type** | **description** |
|-|-|-|
| instance | address |  |
| account | address |  |
| duration | uint64 |  |
| amount | uint256 |  |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | uint256 |  |



### transferHook

Arguments

| **name** | **type** | **description** |
|-|-|-|
| operator | address |  |
| from | address |  |
| to | address |  |
| amount | uint256 |  |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | bool |  |


