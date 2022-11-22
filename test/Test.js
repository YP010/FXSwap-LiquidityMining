const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

function token(n) {
  return web3.utils.toWei(n, 'ether')
}

describe("MasterChefV2 Contract Test", function () {
  async function deployFixture() {
    const [owner, userA, userB, userC] = await ethers.getSigners()

    const wfxContract = await ethers.getContractFactory("WFXUpgradable") // Block 1
    const wfx = await upgrades.deployProxy(wfxContract, {kind: 'uups'})
    await wfx.deployed()

    const rewardTokenContract = await ethers.getContractFactory("RewardToken")
    const rewardToken = await rewardTokenContract.deploy()
    await rewardToken.deployed()

    const masterChefContract = await ethers.getContractFactory("MasterChef");
    const masterChef = await upgrades.deployProxy(masterChefContract, [wfx.address, token("1"), 10], {kind: 'uups'})
    await masterChef.deployed()

    const rewarderViaMultiplierContract = await ethers.getContractFactory("RewarderViaMultiplier")
    const rewarderViaMultiplier = await upgrades.deployProxy(rewarderViaMultiplierContract, [[rewardToken.address], [token("500")] , 18, masterChef.address], {kind: 'uups'}) // 500X
    await rewarderViaMultiplier.deployed()

    const pairAcontract = await ethers.getContractFactory("FXSwapPairA")
    const pairA = await pairAcontract.deploy()
    await pairA.deployed()

    const pairBcontract = await ethers.getContractFactory("FXSwapPairB")
    const pairB = await pairBcontract.deploy()
    await pairB.deployed()

    await wfx.mint(masterChef.address, token("1000000")) // Block 13

    await masterChef.add(1000, pairA.address, 0) // Add LP Token A with allocPoint 1000 to Farm
    await masterChef.add(2000, pairB.address, 0) // Add LP Token B with allocPoint 2000 to Farm

    await pairA.mint(userA.address, token("100"))
    await pairA.connect(userA).approve(masterChef.address, token("100"))
    await masterChef.connect(userA).deposit(0, token("14")) // Block 18

    await pairB.mint(userB.address, token("100"))
    await pairB.connect(userB).approve(masterChef.address, token("100"))
    await masterChef.connect(userB).deposit(1, token("2")) // Block 21

    await pairB.mint(userC.address, token("100"))
    await pairB.connect(userC).approve(masterChef.address, token("100"))
    await masterChef.connect(userC).deposit(1, token("6")) // Block 24

    await rewardToken.mint(rewarderViaMultiplier.address, token("1000000"))

    await hre.network.provider.send("hardhat_mine", ["0x1"]); // Mine 1 Block
    
    return { owner, userA, userB, userC, wfx, masterChef, pairA, pairB, rewardToken, rewarderViaMultiplier}
  }
  
  it("User receives the correct WFX when deposit / withdraw before contract upgrade", async function () {
    const { wfx, masterChef, userA, userB } = await loadFixture(deployFixture)

    // console.log(await hre.ethers.provider.getBlock("latest"))

    await masterChef.connect(userB).deposit(1, token("3")) 
    const userBWFX = await wfx.balanceOf(userB.address)
    expect(userBWFX.toString()).to.equal(token("2.5")) // (3 x 2/3) + [(27-24) x 2/3 x 2/8]

    await masterChef.connect(userA).withdraw(0, token("4"))
    const userAWFX = await wfx.balanceOf(userA.address)
    expect(userAWFX.toString()).to.equal(token("3.33333333333")) // (28-18) x 1/3

    await expect(masterChef.connect(userA).deposit(2, token("10"))) // Block 29
    .to.be.revertedWith("reverted with panic code 0x32 (Array accessed at an out-of-bounds or negative index)")
  });

  it("User receives the correct WFX when deposit / withdraw after contract upgrade (No Rewarder Added)", async function () {
    const { wfx, masterChef, userA, userB, rewardToken } = await loadFixture(deployFixture)

    await masterChef.connect(userB).deposit(1, token("3")) 
    let userBWFX = await wfx.balanceOf(userB.address)
    expect(userBWFX.toString()).to.equal(token("2.5")) // (3 x 2/3) + [(27-24) x 2/3 x 2/8]

    await masterChef.connect(userA).withdraw(0, token("4"))
    let userAWFX = await wfx.balanceOf(userA.address)
    expect(userAWFX.toString()).to.equal(token("3.33333333333")) // (28-18) x 1/3

    const masterChefV2Contract = await ethers.getContractFactory("MasterChefV2")
    const masterChefV2 = await upgrades.upgradeProxy(masterChef.address, masterChefV2Contract)

    await masterChefV2.addRewarder(["0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000"])

    await masterChef.connect(userA).deposit(0, token("8"))
    userAWFX = await wfx.balanceOf(userA.address)
    expect(userAWFX.toString()).to.equal(token("4.66666666666")) // (32-18) x 1/3
    const userARewardToken = await rewardToken.balanceOf(userA.address)
    expect(userARewardToken.toString()).to.equal(token("0"))

    await masterChef.connect(userB).withdraw(1, token("1"))
    userBWFX = await wfx.balanceOf(userB.address)
    expect(userBWFX.toString()).to.equal(token("4.31818181818")) // (3 x 2/3) + [(27-24) x 2/3 x 2/8] + [(33-27) x 2/3 x 5/11]
    const userBRewardToken = await rewardToken.balanceOf(userB.address)
    expect(userBRewardToken.toString()).to.equal(token("0"))
  });
    
  it("User receives the correct WFX and Reward Token when deposit / withdraw after contract upgrade (Rewarder Added with One Reward Token)", async function () {
    const { wfx, masterChef, userA, userB, rewardToken, rewarderViaMultiplier} = await loadFixture(deployFixture)

    await masterChef.connect(userB).deposit(1, token("3")) 
    let userBWFX = await wfx.balanceOf(userB.address)
    expect(userBWFX.toString()).to.equal(token("2.5")) // (3 x 2/3) + [(27-24) x 2/3 x 2/8]

    await masterChef.connect(userA).withdraw(0, token("4"))
    let userAWFX = await wfx.balanceOf(userA.address)
    expect(userAWFX.toString()).to.equal(token("3.33333333333")) // (28-18) x 1/3

    const masterChefV2Contract = await ethers.getContractFactory("MasterChefV2")
    const masterChefV2 = await upgrades.upgradeProxy(masterChef.address, masterChefV2Contract)

    await masterChefV2.addRewarder([rewarderViaMultiplier.address, rewarderViaMultiplier.address])

    await masterChef.connect(userA).deposit(0, token("8"))
    userAWFX = await wfx.balanceOf(userA.address)
    expect(userAWFX.toString()).to.equal(token("4.66666666666")) // (32-18) x 1/3
    const userARewardToken = await rewardToken.balanceOf(userA.address)
    expect(userARewardToken.toString()).to.equal(token("666.666666665")) // (32-28) x 1/3 x 500

    await masterChef.connect(userB).withdraw(1, token("1"))
    userBWFX = await wfx.balanceOf(userB.address)
    expect(userBWFX.toString()).to.equal(token("4.31818181818")) // (3 x 2/3) + [(27-24) x 2/3 x 2/8] + [(33-27) x 2/3 x 5/11]
    const userBRewardToken = await rewardToken.balanceOf(userB.address)
    expect(userBRewardToken.toString()).to.equal(token("909.09090909")) // (33-27) x 2/3 x 5/11 x 500
  });

  it("User receives the correct WFX and Reward Token when deposit / withdraw after contract upgrade (Rewarder Added with Extra Reward Token)", async function () {
    const { wfx, masterChef, userA, userB, rewardToken, rewarderViaMultiplier} = await loadFixture(deployFixture)

    await masterChef.connect(userB).deposit(1, token("3")) 
    let userBWFX = await wfx.balanceOf(userB.address)
    expect(userBWFX.toString()).to.equal(token("2.5")) // (3 x 2/3) + [(27-24) x 2/3 x 2/8]

    await masterChef.connect(userA).withdraw(0, token("4"))
    let userAWFX = await wfx.balanceOf(userA.address)
    expect(userAWFX.toString()).to.equal(token("3.33333333333")) // (28-18) x 1/3

    const masterChefV2Contract = await ethers.getContractFactory("MasterChefV2")
    const masterChefV2 = await upgrades.upgradeProxy(masterChef.address, masterChefV2Contract)

    await masterChefV2.addRewarder([rewarderViaMultiplier.address, rewarderViaMultiplier.address])

    const rewardTokenExtraContract = await ethers.getContractFactory("RewardTokenExtra")
    const rewardTokenExtra = await rewardTokenExtraContract.deploy()
    await rewardTokenExtra.deployed()

    await rewarderViaMultiplier.addRewardToken(rewardTokenExtra.address, token("20"))
    await rewardTokenExtra.mint(rewarderViaMultiplier.address, token("1000000"))

    await masterChef.connect(userA).deposit(0, token("8"))
    userAWFX = await wfx.balanceOf(userA.address)
    expect(userAWFX.toString()).to.equal(token("5.66666666666")) // (35-18) x 1/3
    const userARewardToken = await rewardToken.balanceOf(userA.address)
    expect(userARewardToken.toString()).to.equal(token("1166.666666665")) // (35-28) x 1/3 x 500
    const userARewardTokenExtra = await rewardTokenExtra.balanceOf(userA.address)
    expect(userARewardTokenExtra.toString()).to.equal(token("46.6666666666")) // (35-28) x 1/3 x 20

    await masterChef.connect(userB).withdraw(1, token("1"))
    userBWFX = await wfx.balanceOf(userB.address)
    expect(userBWFX.toString()).to.equal(token("5.22727272727")) // (3 x 2/3) + [(27-24) x 2/3 x 2/8] + [(36-27) x 2/3 x 5/11]
    const userBRewardToken = await rewardToken.balanceOf(userB.address)
    expect(userBRewardToken.toString()).to.equal(token("1363.636363635")) // (36-27) x 2/3 x 5/11 x 500
    const userBRewardTokenExtra = await rewardTokenExtra.balanceOf(userB.address)
    expect(userBRewardTokenExtra.toString()).to.equal(token("54.5454545454")) // (36-27) x 2/3 x 5/11 x 20
  });

  it("Only MasterChefV2 can access the RewarderViaMultiplier contract", async function () {
    const { wfx, userA, pairA, rewarderViaMultiplier} = await loadFixture(deployFixture)

    const xMasterChefContract = await ethers.getContractFactory("XMasterChef");
    const xMasterChef = await upgrades.deployProxy(xMasterChefContract, [wfx.address, token("1"), 10], {kind: 'uups'})
    await xMasterChef.deployed()

    await wfx.mint(xMasterChef.address ,token("1000000"))

    await xMasterChef.add(1000, pairA.address, rewarderViaMultiplier.address, 0) // Add LP Token A with allocPoint 1000 to Farm

    await pairA.mint(userA.address, token("100"))
    await pairA.connect(userA).approve(xMasterChef.address, token("100"))
    await xMasterChef.connect(userA).deposit(0, token("14"))
    
    await expect(xMasterChef.connect(userA).withdraw(0, token("4")))
    .to.be.revertedWith('Only MCV2 can call this function.');
  });
});