import { buildModule } from '@nomicfoundation/ignition-core'

/**
 * Deploys Treasury contract.
 * The Treasury is deployed along with
 * other DAO contracts using the Governor module.
 */
const treasuryModule = buildModule('Treasury', m => {
  const owner = m.getParameter('owner')
  const guardian = m.getParameter('guardian')
  const treasury = m.contract('TreasuryRootstockCollective', [owner, guardian])

  return { treasury }
})
export default treasuryModule
