const fs = require('fs');
//const HDWalletProvider = require('truffle-hdwallet-provider');

function get_data(_message) {
    return new Promise(function(resolve, reject) {
        fs.readFile('./scripts/arguments.json', (err, data) => {
            if (err) {
                if (err.code == 'ENOENT' && err.syscall == 'open' && err.errno == -4058) {
                    let obj = {};
					data = JSON.stringify(obj, null, "");
                    fs.writeFile('./scripts/arguments.json', data, (err) => {
                        if (err) throw err;
                        resolve(data);
                    });
                } else {
                    throw err;
                }
            }
    
            resolve(data);
        });
    });
}

function write_data(_message) {
    return new Promise(function(resolve, reject) {
        fs.writeFile('./scripts/arguments.json', _message, (err) => {
            if (err) throw err;
            console.log('Data written to file');
            resolve();
        });
    });
}

async function main() {
	var data = await get_data();

    var data_object_root = JSON.parse(data);
	var data_object = {};
	if (typeof data_object_root[hre.network.name] === 'undefined') {
        data_object.time_created = Date.now()
    } else {
        data_object = data_object_root[hre.network.name];
    }
	//----------------

	const [deployer] = await ethers.getSigners();
	
	const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
    const RELEASE_MANAGER = hre.network.name == 'mumbai'? process.env.RELEASE_MANAGER_MUMBAI : process.env.RELEASE_MANAGER;
	console.log(
		"Deploying contracts with the account:",
		deployer.address
	);

	// var options = {
	// 	//gasPrice: ethers.utils.parseUnits('50', 'gwei'), 
	// 	gasLimit: 10e6
	// };

	console.log("Account balance:", (await deployer.getBalance()).toString());

	const PoolStakesLibF = await ethers.getContractFactory("PoolStakesLib");
	let poolStakesLib = await PoolStakesLibF.connect(deployer).deploy();

	const CommunityCoinF = await ethers.getContractFactory("CommunityCoin", {
		libraries: {
			"contracts/libs/PoolStakesLib.sol:PoolStakesLib": poolStakesLib.address
		}
	});

  	const CommunityStakingPoolFactoryF = await ethers.getContractFactory("CommunityStakingPoolFactory");
  	const CommunityStakingPoolF = await ethers.getContractFactory("CommunityStakingPool");
	const RewardsF = await ethers.getContractFactory("Rewards");

	let communityCoin         		= await CommunityCoinF.connect(deployer).deploy();
	let communityStakingPoolFactory = await CommunityStakingPoolFactoryF.connect(deployer).deploy();
	let communityStakingPool    	= await CommunityStakingPoolF.connect(deployer).deploy();
	let rewards         			= await RewardsF.connect(deployer).deploy();
	//let communityRolesManagement    = await CommunityRolesManagementF.connect(deployer).deploy();

	console.log("Implementations:");
	console.log("  communityCoin deployed at:               ", communityCoin.address);
	console.log("  communityStakingPoolFactory deployed at: ", communityStakingPoolFactory.address);
	console.log("  communityStakingPool deployed at:        ", communityStakingPool.address);
	console.log("Libraries:");
	console.log("  poolStakesLib deployed at:    ", poolStakesLib.address);

	data_object.communityCoin 				= communityCoin.address;
	data_object.communityStakingPoolFactory	= communityStakingPoolFactory.address;
	data_object.communityStakingPool		= communityStakingPool.address;
	data_object.poolStakesLib				= poolStakesLib.address;
	data_object.releaseManager              = RELEASE_MANAGER;
	data_object.rewards						= rewards.address;

	//---
	const ts_updated = Date.now();
    data_object.time_updated = ts_updated;
    data_object_root[`${hre.network.name}`] = data_object;
    data_object_root.time_updated = ts_updated;
    let data_to_write = JSON.stringify(data_object_root, null, 2);
	console.log(data_to_write);
    await write_data(data_to_write);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
	console.error(error);
	process.exit(1);
  });