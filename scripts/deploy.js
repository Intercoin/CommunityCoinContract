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
		typeof data_object.communityStakingPoolErc20 === 'undefined' ||
		typeof data_object.communityRolesManagement === 'undefined' ||
		!data_object.communityCoin ||
		!data_object.communityStakingPoolFactory ||
		!data_object.communityStakingPool ||
		!data_object.communityStakingPoolErc20 ||
		!data_object.communityRolesManagement
	) {
		throw("Arguments file: wrong addresses");
	}
    
	const [deployer] = await ethers.getSigners();
	
	// const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  	// const discountSensitivity = 0;

	var options = {
		//gasPrice: ethers.utils.parseUnits('150', 'gwei'), 
		gasLimit: 5e6
	};
	let _params = [
		data_object.communityCoin,
		data_object.communityStakingPoolFactory,
		data_object.communityStakingPool,
		data_object.communityStakingPoolErc20,
		data_object.communityRolesManagement
	]
	let params = [
		..._params,
		options
	]

	console.log("Deploying contracts with the account:",deployer.address);
	console.log("Account balance:", (await deployer.getBalance()).toString());

  	const CommunityCoinFactoryF = await ethers.getContractFactory("CommunityCoinFactory");

	this.factory = await CommunityCoinFactoryF.connect(deployer).deploy(...params);

	console.log("Factory deployed at:", this.factory.address);
	console.log("with params:", [..._params]);

}

main()
  .then(() => process.exit(0))
  .catch(error => {
	console.error(error);
	process.exit(1);
  });