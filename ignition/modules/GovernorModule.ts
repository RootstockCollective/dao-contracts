import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import TimelockModule from './TimelockModule'
import StRifModule from './StRifModule'
import TreasuryModule from './TreasuryModule'

/**
 * Deploys proxy contract before deploying the Governor
 */
export const governorProxyModule = buildModule('GovernorProxy', m => {
  const owner = m.getParameter('owner')
  const guardian = m.getParameter('guardian')
  const votingDelay = m.getParameter('votingDelay')
  const votingPeriod = m.getParameter('votingPeriod')
  const proposalThreshold = m.getParameter('proposalThreshold')
  const quorumFraction = m.getParameter('quorumFraction')
  // deploy implementation
  const governor = m.contract('GovernorRootstockCollective')
  // deploy ERC1967 proxy in order to use UUPS upgradable smart contracts
  const { timelock } = m.useModule(TimelockModule)
  const { stRif } = m.useModule(StRifModule)
  const governorProxy = m.contract('ERC1967Proxy', [
    governor,
    m.encodeFunctionCall(governor, 'initialize', [
      stRif,
      timelock,
      owner,
      guardian,
      votingDelay,
      votingPeriod,
      proposalThreshold,
      quorumFraction,
    ]),
  ])
  return { governorProxy, timelock, stRif }
})

/**
 * Main DAO deployment module.
 * Deploys Governor along with other related contracts
 * (Timelock, StRIF, Treasury). Usage:
 * ```shell
 * npx hardhat ignition deploy \
 *   ignition/modules/GovernorModule.ts \
 *   --parameters params/testnet.json \
 *   --network rootstockTestnet
 * ```
 */
const governorModule = buildModule('Governor', m => {
  const { governorProxy, timelock, stRif } = m.useModule(governorProxyModule)

  // set Timelock as the Executor on the Treasury
  const { treasury } = m.useModule(TreasuryModule)
  const treasuryExecutorRole = m.staticCall(treasury, 'EXECUTOR_ROLE')
  m.call(treasury, 'grantRole', [treasuryExecutorRole, timelock])

  // Use proxy address to interact with the deployed Governor contract
  const governor = m.contractAt('GovernorRootstockCollective', governorProxy)

  // grant Timelock Proposer role to the Governor
  const proposerRole = m.staticCall(timelock, 'PROPOSER_ROLE')
  m.call(timelock, 'grantRole', [proposerRole, governor], {
    id: 'grant_proposer_role',
  })

  // grant Timelock Executor role to the Governor
  const timelockExecutorRole = m.staticCall(timelock, 'EXECUTOR_ROLE')
  m.call(timelock, 'grantRole', [timelockExecutorRole, governor], {
    id: 'grant_executor_role',
  })

  return { governor, timelock, stRif, treasury }
})

export default governorModule
