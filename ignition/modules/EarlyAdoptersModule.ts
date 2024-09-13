import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

/**
 * Deploys Early Adopters NFT. Usage:
 * ```shell
 * npx hardhat ignition deploy \
 *   ignition/modules/EarlyAdoptersModule.ts \
 *   --parameters params/testnet.json \
 *   --network rootstockTestnet
 * ```
 */
export const earlyAdoptersProxyModule = buildModule('EarlyAdoptersProxy', m => {
  const deployer = m.getAccount(0)
  // deploy implementation
  const ea = m.contract('EarlyAdoptersRootstockCollective')
  // deploy ERC1967 proxy in order to use UUPS upgradable smart contracts
  const defaultAdmin = m.getParameter('defaultAdmin', deployer)
  const upgrader = m.getParameter('upgrader', deployer)
  const numFiles = m.getParameter('numFiles')
  const ipfs = m.getParameter('ipfs')
  const stRif = m.getParameter('stRif')
  const stRifThreshold = m.getParameter('stRifThreshold')
  const eaProxy = m.contract('ERC1967Proxy', [
    ea,
    m.encodeFunctionCall(ea, 'initialize', [defaultAdmin, upgrader, stRif, stRifThreshold, numFiles, ipfs]),
  ])
  return { eaProxy }
})

const earlyAdoptersModule = buildModule('EarlyAdopters', m => {
  const { eaProxy } = m.useModule(earlyAdoptersProxyModule)
  // Use proxy address to interact with the deployed contract
  const ea = m.contractAt('EarlyAdoptersRootstockCollective', eaProxy)
  return { ea }
})

export default earlyAdoptersModule
