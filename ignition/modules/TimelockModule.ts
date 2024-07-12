import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export const timelockProxyModule = buildModule('TimelockProxy', m => {
  /* 
  https://docs.openzeppelin.com/contracts/5.x/api/governance#TimelockController
  Initialize the TImelock contract with the following parameters:
      minDelay: initial minimum delay in seconds for operations
      proposers: accounts to be granted proposer and canceller roles
      executors: accounts to be granted executor role
      admin: optional account to be granted admin role; disable with zero address
  */
  const minDelay = m.getParameter('minDelay', 60 * 60 * 24) // 24 hours in seconds
  const proposers: string[] = []
  const executors: string[] = []
  const admin = m.getAccount(0)
  // deploy implementation
  const timelock = m.contract('DaoTimelockUpgradable')
  // deploy ERC1967 proxy
  const timelockProxy = m.contract('ERC1967Proxy', [
    timelock,
    m.encodeFunctionCall(timelock, 'initialize', [minDelay, proposers, executors, admin]),
  ])
  return { timelockProxy }
})

const timelockModule = buildModule('Timelock', m => {
  const { timelockProxy } = m.useModule(timelockProxyModule)
  const timelock = m.contractAt('DaoTimelockUpgradable', timelockProxy)
  return { timelock }
})

export default timelockModule
