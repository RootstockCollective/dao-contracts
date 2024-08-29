import { ignition, ethers } from 'hardhat'
import {
  RIFToken,
  StRIFToken,
  DaoTimelockUpgradable,
  Governor,
  TreasuryDao,
  EarlyAdopters,
} from '../typechain-types'
import RifModule from '../ignition/modules/RifModule'
import GovernorModule from '../ignition/modules/GovernorModule'
import TreasuryModule from '../ignition/modules/TreasuryModule'
import EarlyAdoptersModule from '../ignition/modules/EarlyAdoptersModule'

export const deployContracts = async (maxNftSupply: number, ipfsCid: string, stRifThreshold: bigint) => {
  // deploy RIF before the rest DAO contracts
  const { rif } = await ignition.deploy(RifModule)
  // deploy Treasury
  const { treasury } = await ignition.deploy(TreasuryModule)
  // insert RIF address as a parameter to stRIF deployment module
  const dao = await ignition.deploy(GovernorModule, {
    parameters: {
      stRifProxy: {
        rifAddress: await rif.getAddress(),
      },
    },
  })
  // deploy Early Adopters NFT
  const [defaultAdmin, upgrader] = await ethers.getSigners()
  const { ea } = await ignition.deploy(EarlyAdoptersModule, {
    parameters: {
      EarlyAdoptersProxy: {
        ipfs: ipfsCid,
        numFiles: maxNftSupply,
        defaultAdmin: defaultAdmin.address,
        upgrader: upgrader.address,
        stRif: await dao.stRif.getAddress(),
        stRifThreshold,
      },
    },
  })
  return {
    rif: rif as unknown as RIFToken,
    stRIF: dao.stRif as unknown as StRIFToken,
    timelock: dao.timelock as unknown as DaoTimelockUpgradable,
    governor: dao.governor as unknown as Governor,
    treasury: treasury as unknown as TreasuryDao,
    ea: ea as unknown as EarlyAdopters,
  }
}
