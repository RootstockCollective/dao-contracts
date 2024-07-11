import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import RifModule from './RifModule'
import StRifModule from './StRifModule'
import TimelockModule from './TimelockModule'
import GovernorModule from './GovernorModule'

/**
 * Deploys all the DAO smart contracts
 */
export default buildModule('DaoModule', m => {
  const { rif } = m.useModule(RifModule)
  const { stRif } = m.useModule(StRifModule)
  const { timelock } = m.useModule(TimelockModule)
  const { governor } = m.useModule(GovernorModule)
  return { rif, stRif, timelock, governor }
})
