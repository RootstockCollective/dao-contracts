import hre, { ethers, upgrades } from 'hardhat'
import { GovernorTimelockControlUpgradeable, RootDao } from '../typechain-types'

export const deployGovernor = async (tokenAddress: string, deployerAddress: string) => {
  const RootDAOFactory = await ethers.getContractFactory('RootDao')
  const TimelockFactory = await ethers.getContractFactory('DaoTimelockUpgradable')
  // TODO: figure out why it allows to put only a single argument
  const timelock = (await upgrades.deployProxy(TimelockFactory, [1, [], [], ethers.ZeroAddress], {
    initializer: 'initialize(uint256,address[],address[],address)',
    kind: 'uups',
    timeout: 0,
  })) as unknown as GovernorTimelockControlUpgradeable

  const rootDAOGovernor = (await upgrades.deployProxy(
    RootDAOFactory,
    [tokenAddress, await timelock.getAddress(), deployerAddress],
    {
      initializer: 'initialize',
      kind: 'uups',
      timeout: 0,
    },
  )) as unknown as RootDao

  const rootDAOContact = await rootDAOGovernor.waitForDeployment()

  console.log(`Deployed Governor on ${hre.network.name} with address ${await rootDAOContact.getAddress()}`)

  return rootDAOContact
}
