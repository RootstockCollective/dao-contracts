import { ethers, ignition } from './config.js'
import type {
  RIFToken,
  StRIFToken,
  DaoTimelockUpgradableRootstockCollective,
  GovernorRootstockCollective,
  TreasuryRootstockCollective,
  EarlyAdoptersRootstockCollective,
} from '../types/ethers-contracts/index.js'
import RifModule from '../ignition/modules/RifModule.js'
import GovernorModule from '../ignition/modules/GovernorModule.js'
import EarlyAdoptersModule from '../ignition/modules/EarlyAdoptersModule.js'

export const deployContracts = async () => {
  const [sender] = await ethers.getSigners()
  // deploy RIF before the rest DAO contracts
  const { rif } = await ignition.deploy(RifModule, { defaultSender: await sender?.getAddress() })
  // insert RIF address as a parameter to stRIF deployment module
  const dao = await ignition.deploy(GovernorModule, {
    parameters: {
      stRifProxy: {
        rifAddress: await rif.getAddress(),
        owner: await sender.getAddress(),
      },
      GovernorProxy: {
        owner: await sender.getAddress(),
        guardian: await sender.getAddress(),
        votingDelay: 1,
        votingPeriod: 240,
        proposalThreshold: 10n * 10n ** 18n,
        quorumFraction: 4,
      },
      TimelockProxy: {
        minDelay: 900,
        admin: await sender.getAddress(),
      },
      Treasury: {
        owner: await sender.getAddress(),
        guardian: await sender.getAddress(),
        whitelist: [await rif.getAddress()],
      },
    },
  })
  return {
    rif: rif as unknown as RIFToken,
    stRIF: dao.stRif as unknown as StRIFToken,
    timelock: dao.timelock as unknown as DaoTimelockUpgradableRootstockCollective,
    governor: dao.governor as unknown as GovernorRootstockCollective,
    treasury: dao.treasury as unknown as TreasuryRootstockCollective,
  }
}

export async function deployEarlyAdopters(
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
        defaultAdmin: await defaultAdmin.getAddress(),
        upgrader: await upgrader.getAddress(),
        stRif: stRifAddress,
        stRifThreshold,
      },
    },
  })
  return ea as unknown as EarlyAdoptersRootstockCollective
}
