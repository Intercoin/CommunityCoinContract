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
            } else {
            	resolve(data);
			}
        });
    });
}

async function main() {

	var data = await get_data();
    var data_object_root = JSON.parse(data);
	if (typeof data_object_root[hre.network.name] === 'undefined') {
		throw("Arguments file: missed data");
    } else if (typeof data_object_root[hre.network.name] === 'undefined') {
		throw("Arguments file: missed network data");
    }
	data_object = data_object_root[hre.network.name];
	if (
		typeof data_object.communityCoin === 'undefined' ||
		typeof data_object.communityStakingPoolFactory === 'undefined' ||
		typeof data_object.communityStakingPool === 'undefined' ||
		typeof data_object.releaseManager === 'undefined' ||
		//typeof data_object.communityRolesManagement === 'undefined' ||
		!data_object.communityCoin ||
		!data_object.communityStakingPoolFactory ||
		!data_object.communityStakingPool ||
		!data_object.releaseManager
		/* ||
		!data_object.communityRolesManagement*/
	) {
		throw("Arguments file: wrong addresses");
	}
    
	var signers = await ethers.getSigners();
	var deployer_communitycoin;
    if (signers.length == 1) {
        deployer_communitycoin = signers[0];
    } else {
        [,,deployer_communitycoin] = signers;
    }
	
	
	const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
	const linkedContract = '0x1111cCCBd70ff1eE6fa49BC411b75D16dC321111';
	const liquidityLib = '0x1eA4C4613a4DfdAEEB95A261d11520c90D5d6252';
  	// const discountSensitivity = 0;

	var options = {
		//gasPrice: ethers.utils.parseUnits('150', 'gwei'), 
		//gasLimit: 5e6
	};
	let _params = [
		data_object.communityCoin,
		data_object.communityStakingPoolFactory,
		data_object.communityStakingPool,
		// linkedContract CANNOT BE EMPTY
		linkedContract, // ZERO_ADDRESS, // linkedContract_,
		liquidityLib,
		///////////////////////////////////////
		ZERO_ADDRESS, // costmanager
		data_object.releaseManager
	]
	let params = [
		..._params,
		options
	]

	console.log("Deploying contracts with the account:",deployer_communitycoin.address);
	console.log("Account balance:", (await ethers.provider.getBalance(deployer_communitycoin.address)).toString());
	console.log(_params);  
  	const CommunityCoinFactoryF = await ethers.getContractFactory("CommunityCoinFactory");
	  
	this.factory = await CommunityCoinFactoryF.connect(deployer_communitycoin).deploy(...params);
	
	this.factory.waitForDeployment();

	console.log("Factory deployed at:", this.factory.target);
	console.log("with params:", [..._params]);

	console.log("registered with release manager:", data_object.releaseManager);

	console.log("Starting verifying:");
	await hre.run("verify:verify", {
		address: this.factory.target, 
		constructorArguments: _params
	});
	
}

main()
  .then(() => process.exit(0))
  .catch(error => {
	console.error(error);
	process.exit(1);
  });