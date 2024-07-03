import hre, { ethers, upgrades } from 'hardhat'
import { DaoTimelockUpgradable } from '../typechain-types'

export const deployTimelock = async () => {
  const [owner] = await hre.ethers.getSigners()
  const TimelockFactory = await ethers.getContractFactory('DaoTimelockUpgradable')
  /* 
  https://docs.openzeppelin.com/contracts/5.x/api/governance#TimelockController
  Initialize the TImelock contract with the following parameters:
      minDelay: initial minimum delay in seconds for operations
      proposers: accounts to be granted proposer and canceller roles
      executors: accounts to be granted executor role
      admin: optional account to be granted admin role; disable with zero address
  */
  const minDelay = 60 * 60 * 24 // 24 hours in seconds
  const proposers: string[] = []
  const executors = [] as string[]
  const admin = owner.address
  const timelock = await upgrades.deployProxy(TimelockFactory, [minDelay, proposers, executors, admin], {
    initializer: 'initialize',
    kind: 'uups',
    timeout: 0,
  })
  await timelock.waitForDeployment()

  console.log(`Deployed Timelock on ${hre.network.name} with address ${await timelock.getAddress()}`)

  return timelock as unknown as DaoTimelockUpgradable
}
