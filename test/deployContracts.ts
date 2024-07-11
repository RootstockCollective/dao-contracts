import { ignition } from 'hardhat'
import { RIFToken, StRIFToken, DaoTimelockUpgradable, RootDao } from '../typechain-types'
import DaoModule from '../ignition/modules/DaoModule'

export const deployContracts = async () => {
  const contracts = await ignition.deploy(DaoModule)
  return {
    rif: contracts.rif as unknown as RIFToken,
    stRif: contracts.stRif as unknown as StRIFToken,
    timelock: contracts.timelock as unknown as DaoTimelockUpgradable,
    governor: contracts.governor as unknown as RootDao,
  }
}
