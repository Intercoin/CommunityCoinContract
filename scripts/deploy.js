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
function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
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
    const networkName = hre.network.name;
	var signers = await ethers.getSigners();
	
	var deployer,
        deployer_auxiliary,
        deployer_releasemanager,
        deployer_communitycoin,
        deployer_rewards;
    if (signers.length == 1) {
		deployer = signers[0];
        deployer_auxiliary = signers[0];
        deployer_releasemanager = signers[0];
        deployer_communitycoin = signers[0];
        deployer_rewards = signers[0];
    } else {
        [
			deployer,
			deployer_auxiliary,
			deployer_releasemanager,
			deployer_communitycoin,
			deployer_rewards
		] = signers;
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

	const releaseManager = await ethers.getContractAt("ReleaseManager",data_object.releaseManager);
    let txNewRelease = await releaseManager.connect(deployer_releasemanager).newRelease(
        [this.factory.target], 
        [
            [
                3,//uint8 factoryIndex; 
                3,//uint16 releaseTag; 
                "0x53696c766572000000000000000000000000000000000000"//bytes24 factoryChangeNotes;
            ]
        ]
    );

    console.log('newRelease - waiting');
    await txNewRelease.wait(3);
    console.log('newRelease - mined');

	if (networkName == 'hardhat') {
        console.log("skipping verifying for  'hardhat' network");
    } else {
        
		var attempt = 0;
        var loopExit = false;
        console.log("Starting verifying:");
        while (!loopExit && attempt < 3) {

            try {
                console.log('Attempt #',attempt+1);
                console.log('waiting 5 sec');
                await sleep(5000);
                
                await hre.run("verify:verify", {
					address: this.factory.target,
					constructorArguments: _params
				});
				
                loopExit = true;
                console.log('successfull');
            } catch (error) {
                attempt++;
            }
        }
        if (!loopExit) {
            console.log('verifying failed');
        }
    }
	
}

main()
  .then(() => process.exit(0))
  .catch(error => {
	console.error(error);
	process.exit(1);
  });