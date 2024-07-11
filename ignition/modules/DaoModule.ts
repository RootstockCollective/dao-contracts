import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import StRifModule from './StRifModule'
import TimelockModule from './TimelockModule'
import GovernorModule from './GovernorModule'

/**
 * Deploys all the DAO smart contracts.
 * Module is used in tests. For deployment of all DAO contracts
 * use GovernorModule instead
 */
export default buildModule('DaoModule', m => {
  const { stRif } = m.useModule(StRifModule)
  const { timelock } = m.useModule(TimelockModule)
  const { governor } = m.useModule(GovernorModule)
  return { stRif, timelock, governor }
})
