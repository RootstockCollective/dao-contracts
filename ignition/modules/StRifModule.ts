import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export const stRifProxyModule = buildModule('stRifProxy', m => {
  const owner = m.getParameter('owner')
  // deploy StRIF implementation
  const rifAddress = m.getParameter('rifAddress')
  const stRif = m.contract('StRIFToken')
  // deploy ERC1967 proxy in order to use UUPS upgradable smart contracts
  const stRifProxy = m.contract('ERC1967Proxy', [
    stRif,
    m.encodeFunctionCall(stRif, 'initialize', [rifAddress, owner]),
  ])
  return { stRifProxy }
})

/**
 * Deploys StRIF contract.
 * StRIF is deployed along with other DAO contracts using the Governor module.
 */
const stRifModule = buildModule('stRif', m => {
  const { stRifProxy } = m.useModule(stRifProxyModule)
  const stRif = m.contractAt('StRIFToken', stRifProxy)

  return { stRif }
})

export default stRifModule
