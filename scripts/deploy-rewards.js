async function main() {
	//----------------

	const [deployer] = await ethers.getSigners();
	
	const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
	console.log(
		"Deploying contracts with the account:",
		deployer.address
	);

	// var options = {
	// 	//gasPrice: ethers.utils.parseUnits('50', 'gwei'), 
	// 	gasLimit: 10e6
	// };

	console.log("Account balance:", (await deployer.getBalance()).toString());


  	const RewardsFactoryF = await ethers.getContractFactory("RewardsFactory");
  	const RewardsF = await ethers.getContractFactory("Rewards");

	let rewards         = await RewardsF.connect(deployer).deploy();
	
	console.log("Implementations:");
	console.log("  rewards deployed at:               ", rewards.address);
	
    var options = {
		//gasPrice: ethers.utils.parseUnits('150', 'gwei'), 
		gasLimit: 5e6
    };
    let _params = [rewards.address];
	let params = [..._params, options];
	
	this.factory = await RewardsFactoryF.connect(deployer).deploy(...params);

	console.log("RewardsFactory deployed at:", this.factory.address);
	console.log("with params:", [..._params]);
    
}

main()
  .then(() => process.exit(0))
  .catch(error => {
	console.error(error);
	process.exit(1);
  });