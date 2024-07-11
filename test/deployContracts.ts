import { ignition } from 'hardhat'
import { RIFToken, StRIFToken, DaoTimelockUpgradable, RootDao } from '../typechain-types'
import RifModule from '../ignition/modules/RifModule'
import GovernorModule from '../ignition/modules/GovernorModule'

export const deployContracts = async () => {
  // deploy RIF before the rest DAO contracts
  const { rif } = await ignition.deploy(RifModule)
  // insert RIF address as a parameter to stRIF deployment module
  const dao = await ignition.deploy(GovernorModule, {
    parameters: {
      stRifProxy: {
        rifAddress: await rif.getAddress(),
      },
    },
  })
  return {
    rif: rif as unknown as RIFToken,
    stRif: dao.stRif as unknown as StRIFToken,
    timelock: dao.timelock as unknown as DaoTimelockUpgradable,
    governor: dao.governor as unknown as RootDao,
  }
}
