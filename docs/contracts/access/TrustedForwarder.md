# TrustedForwarder

contracts/access/TrustedForwarder.sol

# Overview

Once installed will be use methods:

| **method name** | **called by** | **description** |
|-|-|-|
|<a href="#istrustedforwarder">isTrustedForwarder</a>|everyone|checking if forwarder is trusted|
|<a href="#owner">owner</a>|everyone||
|<a href="#renounceownership">renounceOwnership</a>|everyone||
|<a href="#settrustedforwarder">setTrustedForwarder</a>|owner|setup trusted forwarder|
|<a href="#transferownership">transferOwnership</a>|everyone||
## *Events*
### OwnershipTransferred

Arguments

| **name** | **type** | **description** |
|-|-|-|
| previousOwner | address | indexed |
| newOwner | address | indexed |



## *Functions*
### isTrustedForwarder

> Details: checking if forwarder is trusted

Arguments

| **name** | **type** | **description** |
|-|-|-|
| forwarder | address | trustedforwarder's address to check |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | bool |  |



### owner

> Details: Returns the address of the current owner.

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | address |  |



### renounceOwnership

> Details: Leaves the contract without owner. It will not be possible to call `onlyOwner` functions anymore. Can only be called by the current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby removing any functionality that is only available to the owner.



### setTrustedForwarder

> Details: setup trusted forwarder address

Arguments

| **name** | **type** | **description** |
|-|-|-|
| forwarder | address | trustedforwarder's address to set |



### transferOwnership

> Details: Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| newOwner | address |  |


