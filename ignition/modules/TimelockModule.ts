import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

/**
 * Deploys proxy for the Timelock
 */
export const timelockProxyModule = buildModule('TimelockProxy', m => {
  /* 
  https://docs.openzeppelin.com/contracts/5.x/api/governance#TimelockController
  Initialize the Timelock contract with the following parameters:
      minDelay: initial minimum delay in seconds for operations
      proposers: accounts to be granted proposer and canceller roles
      executors: accounts to be granted executor role
      admin: optional account to be granted admin role; disable with zero address
  */
  const minDelay = m.getParameter('minDelay')
  const proposers: string[] = []
  const executors: string[] = []
  const admin = m.getParameter('admin')
  // deploy implementation
  const timelock = m.contract('DaoTimelockUpgradableRootstockCollective')
  // deploy ERC1967 proxy
  const timelockProxy = m.contract('ERC1967Proxy', [
    timelock,
    m.encodeFunctionCall(timelock, 'initialize', [minDelay, proposers, executors, admin]),
  ])
  return { timelockProxy }
})

/**
 * Deploys Timelock contract.
 * Timelock is deployed along with other DAO contracts using the Governor module.
 */
const timelockModule = buildModule('Timelock', m => {
  const { timelockProxy } = m.useModule(timelockProxyModule)
  const timelock = m.contractAt('DaoTimelockUpgradableRootstockCollective', timelockProxy)
  return { timelock }
})

export default timelockModule
