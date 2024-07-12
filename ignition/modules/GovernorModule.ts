import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import TimelockModule from './TimelockModule'
import StRifModule from './StRifModule'

export const governorProxyModule = buildModule('GovernorProxy', m => {
  const deployer = m.getAccount(0)
  // deploy implementation
  const governor = m.contract('RootDao')
  // deploy ERC1967 proxy in order to use UUPS upgradable smart contracts
  const { timelock } = m.useModule(TimelockModule)
  const { stRif } = m.useModule(StRifModule)
  const governorProxy = m.contract('ERC1967Proxy', [
    governor,
    m.encodeFunctionCall(governor, 'initialize', [stRif, timelock, deployer]),
  ])
  return { governorProxy, timelock, stRif }
})

const governorModule = buildModule('Governor', m => {
  const deployer = m.getAccount(0)
  const { governorProxy, timelock, stRif } = m.useModule(governorProxyModule)
  // Use proxy address to interact with the deployed contract
  const governor = m.contractAt('RootDao', governorProxy)

  // grant Proposer role to the Governor
  const proposerRole = m.staticCall(timelock, 'PROPOSER_ROLE')
  const grantProposerRole = m.call(timelock, 'grantRole', [proposerRole, governor], {
    id: 'grant_proposer_role',
  })

  // grant Executor role to the Governor
  const executorRole = m.staticCall(timelock, 'EXECUTOR_ROLE')
  const grantExecutorRole = m.call(timelock, 'grantRole', [executorRole, governor], {
    id: 'grant_executor_role',
  })

  // renounce Admin role - this operation should be finally done by the DAO deployer
  const adminRole = m.staticCall(timelock, 'DEFAULT_ADMIN_ROLE')
  m.call(timelock, 'renounceRole', [adminRole, deployer], {
    after: [grantExecutorRole, grantProposerRole],
  })

  return { governor, timelock, stRif }
})

export default governorModule
