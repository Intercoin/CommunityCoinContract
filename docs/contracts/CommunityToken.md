# CommunityToken

This it ERC777 contract "CommunityTokens".<br>Providing a functionality to create StakingPool and way to redeem CommunityTokens from this pools where user can stake own tokens.

# Overview

Once installed will be use methods:

| **method name** | **called by** | **description** |
|-|-|-|
|<a href="#allowance">allowance</a>|everyone|part of ERC20|
|<a href="#approve">approve</a>|everyone|part of ERC20|
|<a href="#balanceof">balanceOf</a>|everyone|part of ERC777|
|<a href="#burn">burn</a>|everyone|part of ERC777|
|<a href="#discountsensitivity">discountSensitivity</a>|everyone|view fraction of discount applied in redeem groups|
|<a href="#getinstance">getInstance</a>|everyone|instances list|
|<a href="#getinstanceinfo">getInstanceInfo</a>|everyone|view instance info|
|<a href="#getroleadmin">getRoleAdmin</a>|everyone|returns the admin role that controls `role`.|
|<a href="#getrolemember">getRoleMember</a>|everyone|returns one of the accounts that have `role`|
|<a href="#getrolemembercount">getRoleMemberCount</a>|everyone|returns the number of accounts that have `role`|
|<a href="#grantrole">grantRole</a>|everyone|grants `role` to `account`|
|<a href="#granularity">granularity</a>|everyone|part of ERC777|
|<a href="#hasrole">hasRole</a>|everyone|returns `true` if `account` has been granted `role`|
|<a href="#hook">hook</a>|everyone|view address of hook contract|
|<a href="#implementation">implementation</a>|everyone|view address of pool implementation|
|<a href="#initialize">initialize</a>|StakingFactory contract |initializing contract. called by StakingFactory contract|
|<a href="#instances">instances</a>|everyone|public list of created instances|
|<a href="#instancescount">instancesCount</a>|everyone|view amount of created instances|
|<a href="#isoperatorfor">isOperatorFor</a>|everyone|part of ERC777|
|<a href="#istrustedforwarder">isTrustedForwarder</a>|everyone||
|<a href="#issuewallettokens">issueWalletTokens</a>|staking-pool|distibute wallet tokens|
|<a href="#name">name</a>|everyone|name of WalletToken|
|<a href="#operatorburn">operatorBurn</a>|everyone|part of ERC777|
|<a href="#operatorsend">operatorSend</a>|everyone|part of ERC777|
|<a href="#owner">owner</a>|everyone|contract factory's owner |
|<a href="#produce">produce</a>|everyone|creation instance with simple options|
|<a href="#produce">produce</a>|owner|creation instance with extended options|
|<a href="#redeem">redeem</a>|everyone|redeem tokens with preferredInstances|
|<a href="#redeem">redeem</a>|everyone|redeem tokens|
|<a href="#redeemandremoveliquidity">redeemAndRemoveLiquidity</a>|everyone|redeem tokens and remove liquidity|
|<a href="#redeemandremoveliquidity">redeemAndRemoveLiquidity</a>|everyone|redeem tokens and remove liquidity with preferredInstances|
|<a href="#renounceownership">renounceOwnership</a>|owner|leaves the contract without owner and owner role|
|<a href="#renouncerole">renounceRole</a>|owner|revokes `role` from the calling account.|
|<a href="#revokeoperator">revokeOperator</a>|everyone|part of ERC777|
|<a href="#revokerole">revokeRole</a>|owner|evokes `role` from `account`|
|<a href="#send">send</a>|everyone|part of ERC777|
|<a href="#settrustedforwarder">setTrustedForwarder</a>|everyone||
|<a href="#symbol">symbol</a>|everyone|symbol of WalletToken|
|<a href="#totalsupply">totalSupply</a>|everyone|total amount of WalletToken|
|<a href="#transfer">transfer</a>|everyone|part of ERC777|
|<a href="#transferfrom">transferFrom</a>|everyone|part of ERC777|
|<a href="#transferownership">transferOwnership</a>|everyone|transfers ownership of the contract to a new account|
|<a href="#unstake">unstake</a>|everyone|unstake own tokens|
|<a href="#viewlockedwallettokens">viewLockedWalletTokens</a>|everyone|view locked tokens|
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



### InstanceCreated

Arguments

| **name** | **type** | **description** |
|-|-|-|
| tokenA | address | indexed |
| tokenB | address | indexed |
| instance | address | not indexed |
| instancesCount | uint256 | not indexed |



### Minted

Arguments

| **name** | **type** | **description** |
|-|-|-|
| operator | address | indexed |
| to | address | indexed |
| amount | uint256 | not indexed |
| data | bytes | not indexed |
| operatorData | bytes | not indexed |



### OwnershipTransferred

Arguments

| **name** | **type** | **description** |
|-|-|-|
| previousOwner | address | indexed |
| newOwner | address | indexed |



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



### RoleAdminChanged

Arguments

| **name** | **type** | **description** |
|-|-|-|
| role | bytes32 | indexed |
| previousAdminRole | bytes32 | indexed |
| newAdminRole | bytes32 | indexed |



### RoleGranted

Arguments

| **name** | **type** | **description** |
|-|-|-|
| role | bytes32 | indexed |
| account | address | indexed |
| sender | address | indexed |



### RoleRevoked

Arguments

| **name** | **type** | **description** |
|-|-|-|
| role | bytes32 | indexed |
| account | address | indexed |
| sender | address | indexed |



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



### discountSensitivity

> Details: view fraction of discount applied in redeem groups

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | uint256 |  |



### getInstance

> Details: instances list

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



### getRoleAdmin

> Details: Returns the admin role that controls `role`. See {grantRole} and {revokeRole}. To change a role's admin, use {_setRoleAdmin}.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| role | bytes32 |  |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | bytes32 |  |



### getRoleMember

> Details: Returns one of the accounts that have `role`. `index` must be a value between 0 and {getRoleMemberCount}, non-inclusive. Role bearers are not sorted in any particular way, and their ordering may change at any point. WARNING: When using {getRoleMember} and {getRoleMemberCount}, make sure you perform all queries on the same block. See the following https://forum.openzeppelin.com/t/iterating-over-elements-on-enumerableset-in-openzeppelin-contracts/2296[forum post] for more information.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| role | bytes32 |  |
| index | uint256 |  |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | address |  |



### getRoleMemberCount

> Details: Returns the number of accounts that have `role`. Can be used together with {getRoleMember} to enumerate all bearers of a role.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| role | bytes32 |  |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | uint256 |  |



### grantRole

> Details: Grants `role` to `account`. If `account` had not been already granted `role`, emits a {RoleGranted} event. Requirements: - the caller must have ``role``'s admin role.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| role | bytes32 |  |
| account | address |  |



### granularity

> Details: See {IERC777-granularity}. This implementation always returns `1`.

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | uint256 |  |



### hasRole

> Details: Returns `true` if `account` has been granted `role`.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| role | bytes32 |  |
| account | address |  |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | bool |  |



### hook

> Details: view address of hook contract

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | address |  |



### implementation

> Details: view address of pool implementation

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | address |  |



### initialize

Arguments

| **name** | **type** | **description** |
|-|-|-|
| impl | address | address of StakingPool implementation |
| hook_ | address | address of contract implemented IHook interface and used to calculation bonus tokens amount |
| discountSensitivity_ | uint256 | discountSensitivity value that manage amount tokens in redeem process. multiplied by `FRACTION`(10**5 by default) |



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



### issueWalletTokens

> Notice: method to distribute tokens after user stake. called externally onle by pool contract

Arguments

| **name** | **type** | **description** |
|-|-|-|
| account | address | address of user that tokens will mint for |
| amount | uint256 | token's amount |
| priceBeforeStake | uint256 | price that was before adding liquidity in pool |



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



### owner

> Details: Returns the address of the current owner.

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | address |  |



### produce

> Details: function has overloaded. it's simple version for create instance pool.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| reserveToken | address | address of reserve token. like a WETH, USDT,USDC, etc. |
| tradedToken | address | address of traded token. usual it intercoin investor token |
| duration | uint64 | duration represented in amount of `LOCKUP_INTERVAL` |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| instance | address | address of created instance pool `StakingPool` |



### produce

> Details: function has overloaded. it's simple version for create instance pool.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| reserveToken | address | address of reserve token. like a WETH, USDT,USDC, etc. |
| tradedToken | address | address of traded token. usual it intercoin investor token |
| duration | uint64 | duration represented in amount of `LOCKUP_INTERVAL` |
| reserveTokenClaimFraction | uint64 | fraction of reserved token multiplied by {StakingPool::FRACTION}. See more in {StakingPool::initialize} |
| tradedTokenClaimFraction | uint64 | fraction of traded token multiplied by {StakingPool::FRACTION}. See more in {StakingPool::initialize} |
| lpClaimFraction | uint64 | fraction of LP token multiplied by {StakingPool::FRACTION}. See more in {StakingPool::initialize} |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| instance | address | address of created instance pool `StakingPool` |



### redeem

> Notice: way to redeem via approve/transferFrom. Another way is send directly to contract. User will obtain uniswap-LP tokens

> Details: function has overloaded. wallet tokens will be redeemed from pools in order from `preferredInstances`. tx reverted if amoutn is unsufficient even if it is enough in other pools

Arguments

| **name** | **type** | **description** |
|-|-|-|
| amount | uint256 | The number of wallet tokens that will be redeemed. |
| preferredInstances | address[] | preferred instances for redeem first |



### redeem

> Notice: way to redeem via approve/transferFrom. Another way is send directly to contract. User will obtain uniswap-LP tokens

> Details: function has overloaded. wallet tokens will be redeemed from pools in order from deployed

Arguments

| **name** | **type** | **description** |
|-|-|-|
| amount | uint256 | The number of wallet tokens that will be redeemed. |



### redeemAndRemoveLiquidity

> Notice: way to redeem and remove liquidity via approve/transferFrom wallet tokens. User will obtain reserve and traded tokens back

> Details: function has overloaded. wallet tokens will be redeemed from pools in order from deployed

Arguments

| **name** | **type** | **description** |
|-|-|-|
| amount | uint256 | The number of wallet tokens that will be redeemed. |



### redeemAndRemoveLiquidity

> Notice: way to redeem and remove liquidity via approve/transferFrom wallet tokens. User will obtain reserve and traded tokens back

> Details: function has overloaded. wallet tokens will be redeemed from pools in order from `preferredInstances`. tx reverted if amoutn is unsufficient even if it is enough in other pools

Arguments

| **name** | **type** | **description** |
|-|-|-|
| amount | uint256 | The number of wallet tokens that will be redeemed. |
| preferredInstances | address[] | preferred instances for redeem first |



### renounceOwnership

> Details: Leaves the contract without owner. It will not be possible to call `onlyOwner` functions anymore. Can only be called by the current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby removing any functionality that is only available to the owner.



### renounceRole

> Details: Revokes `role` from the calling account. Roles are often managed via {grantRole} and {revokeRole}: this function's purpose is to provide a mechanism for accounts to lose their privileges if they are compromised (such as when a trusted device is misplaced). If the calling account had been revoked `role`, emits a {RoleRevoked} event. Requirements: - the caller must be `account`.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| role | bytes32 |  |
| account | address |  |



### revokeOperator

> Details: See {IERC777-revokeOperator}.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| operator | address |  |



### revokeRole

> Details: Revokes `role` from `account`. If `account` had been granted `role`, emits a {RoleRevoked} event. Requirements: - the caller must have ``role``'s admin role.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| role | bytes32 |  |
| account | address |  |



### send

> Details: See {IERC777-send}. Also emits a {IERC20-Transfer} event for ERC20 compatibility.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| recipient | address |  |
| amount | uint256 |  |
| data | bytes |  |



### setTrustedForwarder

> Details: setup trusted forwarder address

Arguments

| **name** | **type** | **description** |
|-|-|-|
| forwarder | address | trustedforwarder's address to set |



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



### transferOwnership

> Details: Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| newOwner | address |  |



### unstake

> Notice: method like redeem but can applicable only for own staked tokens that haven't transfer yet. so no need to have redeem role for this

Arguments

| **name** | **type** | **description** |
|-|-|-|
| amount | uint256 | The number of wallet tokens that will be unstaked. |



### viewLockedWalletTokens

> Notice: way to view locked tokens that still can be unstakeable by user

Arguments

| **name** | **type** | **description** |
|-|-|-|
| account | address | address |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| amount | uint256 |  |


