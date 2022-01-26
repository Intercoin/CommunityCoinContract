module.exports = function dataExtend() {
    return {
        'contracts/StakingFactory.sol': {
            'description': [
                'This it ERC777 contract "WalletTokens".',
                'Providing a functionality to create StakingContract (pools) and way to redeem WalletTokens from this pools where user can stake own tokens.'
            ].join("<br>"),
            //'constructor':{'custom:shortd': 'part of ERC20'},
            'exclude': [
                'ADMIN_ROLE', 'DEFAULT_ADMIN_ROLE', 'REDEEM_ROLE', 
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
                'transferOwnership': {'custom:shortd': 'transfers ownership of the contract to a new account'},
                
            },
        },
        'contracts/StakingContract.sol': {
            'description': [
                'This it ERC777 contract (pool).',
                'Can be created by factory (StakingFactory contract).',
                'Provide a functionality to buy and stake liquidity and getting in return WalletTokens(See StakingFactory contract).'
            ].join("<br>"),
            'exclude': [
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
                'granularity': {'custom:shortd': 'part of ERC777'},
                'isOperatorFor': {'custom:shortd': 'part of ERC777'},
                'name': {'custom:shortd': 'name of LP token'},
                'operatorBurn': {'custom:shortd': 'part of ERC777'},
                'operatorSend': {'custom:shortd': 'part of ERC777'},
                'revokeOperator': {'custom:shortd': 'part of ERC777'},
                'send': {'custom:shortd': 'part of ERC777'},
                'symbol': {'custom:shortd': 'symbol of LP token'},
                'totalSupply': {'custom:shortd': 'total amount of LP token'},
                'transfer': {'custom:shortd': 'part of ERC777'},
                'transferFrom': {'custom:shortd': 'part of ERC777'},
                
            }
        },
    };
}
