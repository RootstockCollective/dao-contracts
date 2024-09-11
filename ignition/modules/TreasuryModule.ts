import { buildModule } from '@nomicfoundation/ignition-core'

/**
 * Usage:
 * ```shell
 * npx hardhat ignition deploy \
 *   ignition/modules/TreasuryModule.ts \
 *   --parameters params/testnet.json \
 *   --network rootstockTestnet
 * ```
 */
const treasuryModule = buildModule('Treasury', m => {
  const owner = m.getParameter('owner')
  const guardian = m.getParameter('guardian')
  const treasury = m.contract('TreasuryRootstockCollective', [owner, guardian])

  return { treasury }
})
export default treasuryModule
