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

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
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

	
    const RELEASE_MANAGER = hre.network.name == 'mumbai'? process.env.RELEASE_MANAGER_MUMBAI : process.env.RELEASE_MANAGER;
	console.log(
		"Deploying contracts with the account:",
		deployer_auxiliary.address
	);

	// var options = {
	// 	//gasPrice: ethers.utils.parseUnits('50', 'gwei'), 
	// 	gasLimit: 10e6
	// };

	console.log("Account balance:", (await ethers.provider.getBalance(deployer_auxiliary.address)).toString());

	const RewardsF = await ethers.getContractFactory("Rewards");

	let rewards         			= await RewardsF.connect(deployer_auxiliary).deploy();
	
	await rewards.waitForDeployment();
	
	console.log("Implementations:");
	console.log("  rewards deployed at:                     ", rewards.target);
    
	data_object.releaseManager              = RELEASE_MANAGER;
	data_object.rewards						= rewards.target;

	//---
	const ts_updated = Date.now();
    data_object.time_updated = ts_updated;
    data_object_root[`${hre.network.name}`] = data_object;
    data_object_root.time_updated = ts_updated;
    let data_to_write = JSON.stringify(data_object_root, null, 2);
	console.log(data_to_write);
    await write_data(data_to_write);

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
                
                await hre.run("verify:verify", {address: rewards.target, constructorArguments: []});
				
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