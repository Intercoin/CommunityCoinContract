async function main() {

    var CommunityCoinFactory;
    var CommunityCoin;

	//const [deployer] = await ethers.getSigners();
	const [,deployer] = await ethers.getSigners();
	
	const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const discountSensitivity = 0;

	console.log("Deploying contracts with the account:",deployer.address);
	console.log("Account balance:", (await deployer.getBalance()).toString());

  var options = {
    //gasPrice: ethers.utils.parseUnits('150', 'gwei'), 
    gasLimit: 8e6
  };

  const CommunityCoinFactoryF = await ethers.getContractFactory("CommunityCoinFactory");
  const CommunityCoinF = await ethers.getContractFactory("CommunityCoin");
  const CommunityStakingPoolF = await ethers.getContractFactory("MockCommunityStakingPool");
  const CommunityStakingPoolFactoryF = await ethers.getContractFactory("CommunityStakingPoolFactory");

  var implementationCommunityCoin = await CommunityCoinF.connect(deployer).deploy(options);

  var implementationCommunityStakingPoolFactory = await CommunityStakingPoolFactoryF.connect(deployer).deploy(options);
  var implementationCommunityStakingPool = await CommunityStakingPoolF.connect(deployer).deploy(options);

  var CommunityCoinFactory  = await CommunityCoinFactoryF.connect(deployer).deploy(
      implementationCommunityCoin.address, 
      implementationCommunityStakingPoolFactory.address, 
      implementationCommunityStakingPool.address
      , options
  );

  let tx,rc,event,instance,instancesCount;
  // without hook
  tx = await CommunityCoinFactory.connect(deployer).produce(ZERO_ADDRESS, discountSensitivity, options);
  rc = await tx.wait(); // 0ms, as tx is already confirmed
  event = rc.events.find(event => event.event === 'InstanceCreated');
  [instance, instancesCount] = event.args;
  var CommunityCoin = await ethers.getContractAt("CommunityCoin", instance);

  console.log("CommunityCoinFactory deployed at:", CommunityCoinFactory.address);
  console.log("CommunityCoin deployed at:", CommunityCoin.address);

}

main()
  .then(() => process.exit(0))
  .catch(error => {
	console.error(error);
	process.exit(1);
  });