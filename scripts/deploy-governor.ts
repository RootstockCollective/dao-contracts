import hre, { ethers, upgrades } from 'hardhat'
import { RootDao } from '../typechain-types'

export const deployGovernor = async (
  tokenAddress: string,
  deployerAddress: string,
  timelockAddress: string,
) => {
  const timelock = await hre.ethers.getContractAt('DaoTimelockUpgradable', timelockAddress)
  const RootDAOFactory = await ethers.getContractFactory('RootDao')
  const rootDAOGovernor = (await upgrades.deployProxy(
    RootDAOFactory,
    [tokenAddress, timelockAddress, deployerAddress],
    {
      initializer: 'initialize',
      kind: 'uups',
      timeout: 0,
    },
  )) as unknown as RootDao
  await rootDAOGovernor.waitForDeployment()
  const governorAddr = await rootDAOGovernor.getAddress()

  // grant Proposer role to the Governor
  const proposerRole = await timelock.PROPOSER_ROLE()
  const grantProposerTx = await timelock.grantRole(proposerRole, governorAddr)
  await grantProposerTx.wait()

  // grant Executor role to the Governor
  const executorRole = await timelock.EXECUTOR_ROLE()
  const grantExecutorRoleTx = await timelock.grantRole(executorRole, governorAddr)
  await grantExecutorRoleTx.wait()

  // renounce Admin role - this operation should be finally done by the DAO deployer
  const adminRole = await timelock.DEFAULT_ADMIN_ROLE()
  const [deployer] = await hre.ethers.getSigners()
  const renounceTx = await timelock.renounceRole(adminRole, deployer.address)
  await renounceTx.wait()

  console.log(`Deployed Governor on ${hre.network.name} with address ${await rootDAOGovernor.getAddress()}`)

  return rootDAOGovernor
}
