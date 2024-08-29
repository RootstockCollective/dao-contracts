import { ethers, ignition } from 'hardhat'
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

export const deployContracts = async () => {
  const [sender] = await ethers.getSigners()
  // deploy RIF before the rest DAO contracts
  const { rif } = await ignition.deploy(RifModule, { defaultSender: sender?.address })
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
  return {
    rif: rif as unknown as RIFToken,
    stRIF: dao.stRif as unknown as StRIFToken,
    timelock: dao.timelock as unknown as DaoTimelockUpgradable,
    governor: dao.governor as unknown as Governor,
    treasury: treasury as unknown as TreasuryDao,
  }
}

export async function deployNFT(
  ipfsCid: string,
  initialNftSupply: number,
  stRifAddress: string,
  stRifThreshold: bigint,
) {
  const [defaultAdmin, upgrader] = await ethers.getSigners()
  const { ea } = await ignition.deploy(EarlyAdoptersModule, {
    parameters: {
      EarlyAdoptersProxy: {
        ipfs: ipfsCid,
        numFiles: initialNftSupply,
        defaultAdmin: defaultAdmin.address,
        upgrader: upgrader.address,
        stRif: stRifAddress,
        stRifThreshold,
      },
    },
  })
  return ea as unknown as EarlyAdopters
}
