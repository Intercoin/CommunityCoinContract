module.exports = function dataExtend() {
    return {
        'contracts/StakingFactory.sol': {
            'exclude': ['ADMIN_ROLE', 'DEFAULT_ADMIN_ROLE', 'REDEEM_ROLE'],
            'fix': {
                'approve': {
                    //'custom:calledby': 'AAAAAA'
                    'custom:shortd': 'part of ERC777:approve'
                },
            },
        },
        'contracts/StakingContract.sol': {},
    };
}