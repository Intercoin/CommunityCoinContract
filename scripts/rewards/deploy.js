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
		typeof data_object.rewards === 'undefined' ||
		typeof data_object.releaseManager === 'undefined' ||
		//typeof data_object.communityRolesManagement === 'undefined' ||
		!data_object.releaseManager ||
		!data_object.rewards
		/* ||
		!data_object.communityRolesManagement*/
	) {
		throw("Arguments file: wrong addresses");
	}
	//----------------

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
	console.log(
		"Deploying contracts with the account:",
		deployer_rewards.address
	);

	// var options = {
	// 	//gasPrice: ethers.utils.parseUnits('50', 'gwei'), 
	// 	gasLimit: 10e6
	// };

	console.log("Account balance:", (await ethers.provider.getBalance(deployer_rewards.address)).toString());


  	const RewardsFactoryF = await ethers.getContractFactory("RewardsFactory");
	
    var options = {
		//gasPrice: ethers.utils.parseUnits('150', 'gwei'), 
		gasLimit: 5e6
    };
    let _params = [
		data_object.rewards,
		///////////////////////////////////////
		ZERO_ADDRESS, // costmanager
		data_object.releaseManager
	];
	let params = [..._params, options];
	
	this.factory = await RewardsFactoryF.connect(deployer_rewards).deploy(...params);

	console.log("RewardsFactory deployed at:", this.factory.target);
	console.log("with params:", [..._params]);

	const releaseManager = await ethers.getContractAt("ReleaseManager",data_object.releaseManager);
    let txNewRelease = await releaseManager.connect(deployer_releasemanager).newRelease(
        [this.factory.target], 
        [
            [
                23,//uint8 factoryIndex; 
                23,//uint16 releaseTag; 
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