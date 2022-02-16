# StakingContract
Contracts to let people stake various tokens and use the trust that was built up in Intercoin's factory code.

## Short description or how it works
There are 2 stages: preparing and working with contracts.  
Preparing:  
Owners should do:  
a:  
1. deploy instances(that will be used as a logic): CommunityStakingPool and CommunityCoin  
2. deploy CommunityCoinFactory   
3. call CommunityCoinFactory:initialize with logic instances(deployed above)  
4. call CommunityCoinFactory:produce and obtain CommunityCoin address from emitted event [InstanceCreated](docs/contracts/CommunityCoinFactory.md#instancecreated)  

b:
1. now anyone (or owner with extend options) can create pools by calling CommunityCoin:produce (obtained above in a.4) and obtained CommunityStakingPool's address from from emitted event [InstanceCreated](docs/contracts/CommunityCoin.md#instancecreated)  
2. keep in mind that UNISWAP PAIR between(Traded and Reserved tokens), that will be created after calling CommunityCoin:produce must be exists or created before b.1  
  
Working:  
So after preparing we have one CommunityCoin that will produced Community coins(CC) and couple of CommunityStakingPools  
  
Anyone can buy CC by calling [CommunityStakingPool::buyLiquidityAndStake](docs/contracts/CommunityStakingPool.md#buyliquidityandstake) to exchange own Reserved tokens  
  
What are the reasons to get CC:  
- couple of services will be use CC as a pay  
- it's the way to obtain back more than was staked(we will give you some bonus Community coins)  
- and finally investors can put his ETH into uniswap pools(ITR-ETH, ITR-USDT) to get dividends  
  
So every pools have a locked time. it's time holding your tokens after staking.  
User can unstake(withdraw) and obtain uniswap LP tokens after time passed. And exchange on uniswap or stake again by calling [CommunityCoin::stakeLiquidity](docs/contracts/CommunityCoin.md#stakeliquidity).  
Note that user can unstake only tokens that he have staked and haven't transfer  to someone and hold time are passed. But tokens can be transfered in any time  
Tokens that was transfered can be redeemed by users with Redeem role. Such role can be granted by owner of the CommunityCoin  

## Whitepapers

![Truly decentralized system](https://github.com/Intercoin/StakingContract/blob/assets/images/whitepapers/truly-decentralized-system.jpg)
![Staking liquidity in community](https://github.com/Intercoin/StakingContract/blob/assets/images/whitepapers/staking-liquidity-in-community.jpg)
  
## Diagrams
[Sequence](https://github.com/Intercoin/StakingContract/wiki/Diagrams/sequence)  
[Example with several factories](https://github.com/Intercoin/StakingContract/wiki/Diagrams/example-with-several-factories)

## Contracts MD
[CommunityCoinFactory.md](docs/contracts/CommunityCoinFactory.md)<br>
[CommunityCoin.md](docs/contracts/CommunityCoin.md)<br>
[CommunityStakingPool.md](docs/contracts/CommunityStakingPool.md)<br>

