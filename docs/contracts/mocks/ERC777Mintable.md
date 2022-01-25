# ERC777Mintable

contracts/mocks/ERC777Mintable.sol

> Details: Extension of {ERC20} that allows token holders to destroy both their own tokens and those that they have an allowance for, in a way that can be recognized off-chain (via event analysis).

# Overview

Once installed will be use methods:

| **method name** | **called by** | **description** |
|-|-|-|
|<a href="#allowance">allowance</a>|everyone|everyone|
|<a href="#approve">approve</a>|everyone|everyone|
|<a href="#authorizeOperator">authorizeOperator</a>|everyone|everyone|
|<a href="#balanceOf">balanceOf</a>|everyone|everyone|
|<a href="#burn">burn</a>|everyone|everyone|
|<a href="#decimals">decimals</a>|everyone|everyone|
|<a href="#defaultOperators">defaultOperators</a>|everyone|everyone|
|<a href="#granularity">granularity</a>|everyone|everyone|
|<a href="#isOperatorFor">isOperatorFor</a>|everyone|everyone|
|<a href="#mint">mint</a>|everyone|everyone|
|<a href="#name">name</a>|everyone|everyone|
|<a href="#operatorBurn">operatorBurn</a>|everyone|everyone|
|<a href="#operatorSend">operatorSend</a>|everyone|everyone|
|<a href="#revokeOperator">revokeOperator</a>|everyone|everyone|
|<a href="#send">send</a>|everyone|everyone|
|<a href="#symbol">symbol</a>|everyone|everyone|
|<a href="#totalSupply">totalSupply</a>|everyone|everyone|
|<a href="#transfer">transfer</a>|everyone|everyone|
|<a href="#transferFrom">transferFrom</a>|everyone|everyone|
## *Constructor*


Arguments

| **name** | **type** | **description** |
|-|-|-|
| name | string |  |
| symbol | string |  |



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



### RevokedOperator

Arguments

| **name** | **type** | **description** |
|-|-|-|
| operator | address | indexed |
| tokenHolder | address | indexed |



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



### Transfer

Arguments

| **name** | **type** | **description** |
|-|-|-|
| from | address | indexed |
| to | address | indexed |
| value | uint256 | not indexed |



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



### authorizeOperator

> Details: See {IERC777-authorizeOperator}.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| operator | address |  |



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



### decimals

> Details: See {ERC20-decimals}. Always returns 18, as per the [ERC777 EIP](https://eips.ethereum.org/EIPS/eip-777#backward-compatibility).

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | uint8 |  |



### defaultOperators

> Details: See {IERC777-defaultOperators}.

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | address[] |  |



### granularity

> Details: See {IERC777-granularity}. This implementation always returns `1`.

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | uint256 |  |



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



### mint

Arguments

| **name** | **type** | **description** |
|-|-|-|
| account | address |  |
| amount | uint256 |  |



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


