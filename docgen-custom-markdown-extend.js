module.exports = function dataExtend() {
    return {
        'contracts/CommunityCoin.sol': {
            'description': [
                'This it ERC777 contract "CommunityCoins".',
                'Providing a functionality to create CommunityStakingPool and way to redeem CommunityCoins from this pools where user can stake own tokens.'
            ].join("<br>"),
            //'constructor':{'custom:shortd': 'part of ERC20'},
            'exclude': [
                'ADMIN_ROLE', 'DEFAULT_ADMIN_ROLE', 'REDEEM_ROLE', 'CIRCULATION_ROLE', 'CIRCULATION_DEFAULT', 
                'authorizeOperator',
                'decimals',
                'defaultOperators',
                'tokensReceived',
                'supportsInterface',
            ],
            'fix': {
                'allowance': {'custom:shortd': 'part of ERC20'},
                'approve': {'custom:shortd': 'part of ERC20'},
                'balanceOf': {'custom:shortd': 'part of ERC777'},
                'burn': {'custom:shortd': 'part of ERC777'},
                'discountSensitivity': {'custom:shortd': 'view fraction of discount applied in redeem groups'},
                'getInstance': {'custom:shortd': 'instances list'},
                'getRoleAdmin': {'custom:shortd': 'returns the admin role that controls `role`.'},
                'getRoleMember': {'custom:shortd': 'returns one of the accounts that have `role`'},
                'getRoleMemberCount': {'custom:shortd': 'returns the number of accounts that have `role`'},
                'grantRole': {'custom:shortd': 'grants `role` to `account`'},
                'granularity': {'custom:shortd': 'part of ERC777'},
                'hasRole': {'custom:shortd': 'returns `true` if `account` has been granted `role`'},
                'hook': {'custom:shortd': 'view address of hook contract'},
                'implementation': {'custom:shortd': 'view address of pool implementation'},
                'instances': {'custom:shortd': 'public list of created instances'},
                'isOperatorFor': {'custom:shortd': 'part of ERC777'},
                'operatorBurn': {'custom:shortd': 'part of ERC777'},
                'operatorSend': {'custom:shortd': 'part of ERC777'},
                'name': {'custom:shortd': 'name of WalletToken'},
                'owner': {'custom:shortd': 'contract factory\'s owner '},
                'renounceOwnership': {'custom:calledby': 'owner', 'custom:shortd': 'leaves the contract without owner and owner role'},
                'renounceRole': {'custom:calledby': 'owner','custom:shortd': 'revokes `role` from the calling account.'},
                'revokeOperator': {'custom:shortd': 'part of ERC777'},
                'revokeRole': {'custom:calledby': 'owner','custom:shortd': 'evokes `role` from `account`'},
                'send': {'custom:shortd': 'part of ERC777'},
                'symbol': {'custom:shortd': 'symbol of WalletToken'},
                'totalSupply': {'custom:shortd': 'total amount of WalletToken'},
                'transfer': {'custom:shortd': 'part of ERC777'},
                'transferFrom': {'custom:shortd': 'part of ERC777'},
                'transferOwnership': {'custom:shortd': 'transfer ownership contract to newOwner'},
                
            },
        },
        'contracts/CommunityStakingPool.sol': {
            'description': [
                'This is pool contract.',
                'Can be created by CommunityCoin contract.',
                'Provide a functionality to buy and stake liquidity and getting in return Community Coins(See CommunityCoin contract).'
            ].join("<br>"),
            'exclude': [
                'authorizeOperator',
                'decimals',
                'defaultOperators',
                'tokensReceived',
                'supportsInterface',
            ],
            'fix': {
                'name': {'custom:shortd': 'name of LP token'},
                'symbol': {'custom:shortd': 'symbol of LP token'},
            }
        },
        'contracts/CommunityCoinFactory.sol': {
            'description': [
                'This is factory contract.',
                'Provide a functionality to create CommunityCoin'
            ].join("<br>"),
            'exclude': [],
            'fix': {
                'getInstance': {'custom:shortd': 'instances list'},
                'instances': {'custom:shortd': 'public list of created instances'},
                'owner': {'custom:shortd': 'owner of staking contract. Part of `Ownable` contract'},
                'renounceOwnership': {'custom:shortd': 'Part of `Ownable` contract'},
                'transferOwnership': {'custom:shortd': 'Part of `Ownable` contract'},
            },
        },
    };
}
