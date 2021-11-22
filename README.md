# StakingContract
Contracts to let people stake various tokens and use the trust that was built up in Intercoin's factory code.

## Overview
Once installed will be use methods:

<table>
<thead>
	<tr>
		<th>method name</th>
		<th>called by</th>
		<th>description</th>
	</tr>
</thead>
<tbody>
	<tr>
		<td><a href="#buyliquidityandstake">buyLiquidityAndStake</a></td>
		<td>Anyone</td>
		<td>buying liquidity and adding to Stake</td>
	</tr>
	<tr>
		<td><a href="#redeemandremoveliquidity">redeemAndRemoveLiquidity</a></td>
		<td>Anyone</td>
		<td>redeem and remove liquidity</td>
	</tr>
	<tr>
		<td><a href="#stakeliquidity">stakeLiquidity</a></td>
		<td>Anyone</td>
		<td>just stake liquidity</td>
	</tr>
	<tr>
		<td><a href="#redeem">redeem</a></td>
		<td>Anyone</td>
		<td>just redeem liquidity</td>
	</tr>
	<tr>
		<td><a href="#addrewardtoken">addRewardToken</a></td>
		<td>owner</td>
		<td>add reward token to list</td>
	</tr>
	<tr>
		<td><a href="#removerewardtoken">removeRewardToken</a></td>
		<td>owner</td>
		<td>remove reward token from list</td>
	</tr>
	<tr>
		<td><a href="#viewrewardtokenslist">viewRewardTokensList</a></td>
		<td>Anyone</td>
		<td>view reward token list</td>
	</tr>
</tbody>	
</table>

## Methods


#### buyLiquidityAndStake
payble method will get ETH,  convert it to WETH, exchange to reserve token via uniswap. Then will add to liquidity ans stake it
Params:   
<table><thead><th>name</th><th>type</th><th>description</th></thead><tbody><tr><td colspan=3 align=center>no params</td></tr></tbody></table>  
        
#### buyLiquidityAndStake
method will get PayingToken, exchange to reserve token via uniswap. Then will add to liquidity ans stake it
Params:    
name  | type | description
--|--|--
payingToken|address|paying token
amount|uint256|amount

#### buyLiquidityAndStake
method will get reserve token, exchange to reserve token via uniswap. Then will add to liquidity ans stake it
Params:    
name  | type | description
--|--|--
amount|uint256|amount

#### redeemAndRemoveLiquidity    
redeeem and removing liquidity    
Params:    
name  | type | description
--|--|--
amount|uint256|amount

#### stakeLiquidity    
staking liquidity only    
Params:    
name  | type | description
--|--|--
liquidityTokenAmount|uint256|liquidityTokenAmount

#### redeem    
just redeem liquidity  
Params:    
name  | type | description
--|--|--
amount|uint256|amount

#### addRewardToken    
adding token to reward list    
Params:    
name  | type | description
--|--|--
addr|address|token

#### removeRewardToken    
removing token to reward list    
Params:    
name  | type | description
--|--|--
addr|address|token

#### viewRewardTokensList    
view token's reward list    
Params:    
name  | type | description
--|--|--
ret|address[]|list
	