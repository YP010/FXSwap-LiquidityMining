const { ethers } = require('hardhat');

function token(n) {
   return web3.utils.toWei(n, 'ether')
 }

async function deploy() {
   [account] = await ethers.getSigners();
   deployerAddress = account.address;
   console.log(`Deploying contracts using ${deployerAddress}`);

   const masterChef = await ethers.getContractFactory("MasterChef");
   const masterChefInstance = await upgrades.deployProxy(masterChef, ["0x3452e23F9c4cC62c70B7ADAd699B264AF3549C19", token("0.001"), 7599000], {kind: 'uups'})
   await masterChefInstance.deployed()
   console.log(`MasterChef deployed to : ${masterChefInstance.address}`);

   await masterChefInstance.add(1000, "0xd107cBa4501e8D9165947Bb3F7CA109Cc4F9396A", 0) // Add WFX-USDT LP Token with allocPoint 1000 to Farm
   await masterChefInstance.add(2000, "0xE7Fd385FDf5e31a414343D129770ae8fDa81492A", 0) // Add WFX-PUNDIX LP Token with allocPoint 2000 to Farm

   const masterChefV2 = await ethers.getContractFactory("MasterChefV2")
   const masterChefV2Instance = await upgrades.upgradeProxy(masterChefInstance.address, masterChefV2)
   console.log(`MasterChefV2 deployed to : ${masterChefV2Instance.address}`);

   const rewardToken = await ethers.getContractFactory("RewardToken")
   const rewardTokenInstance = await rewardToken.deploy()
   await rewardTokenInstance.deployed()
   console.log(`RewardToken deployed to : ${rewardTokenInstance.address}`);

   const rewarderViaMultiplier = await ethers.getContractFactory("RewarderViaMultiplier")
   const rewarderViaMultiplierInstance = await upgrades.deployProxy(rewarderViaMultiplier, [[rewardTokenInstance.address], [token("500")] , 18, masterChefV2Instance.address], {kind: 'uups'})
   await rewarderViaMultiplierInstance.deployed()
   console.log(`RewarderViaMultiplier deployed to : ${rewarderViaMultiplierInstance.address}`);

   await rewardTokenInstance.mint(rewarderViaMultiplierInstance.address, token("1000000000")) // Mint 1 Billion to RewarderViaMultiplier

   // TO DO after deployment
   // Deposit WFX to Masterchef
   // Deposit LP Token then Add Rewarder
}

deploy()
   .then(() => process.exit(0))
   .catch((error) => {
      console.error(error);
      process.exit(1);
   });