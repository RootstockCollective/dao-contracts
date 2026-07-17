import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export const stRifV02ProxyModule = buildModule('stRifV02Proxy', m => {
  const owner = m.getParameter('owner')
  // deploy StRIF V02 implementation
  const rifAddress = m.getParameter('rifAddress')
  const stRifV02 = m.contract('StRIFTokenV02', [], { id: 'Implementation' })
  // deploy ERC1967 proxy in order to use UUPS upgradable smart contracts
  const stRifV02Proxy = m.contract(
    'ERC1967Proxy',
    [stRifV02, m.encodeFunctionCall(stRifV02, 'initialize', [rifAddress, owner])],
    { id: 'Proxy' },
  )
  return { stRifV02Proxy }
})

/**
 * Deploys StRIF V02 contract with CollectiveRewards support.
 * This is for fresh deployments, not upgrades.
 */
const stRifV02DeployModule = buildModule('stRifV02', m => {
  const { stRifV02Proxy } = m.useModule(stRifV02ProxyModule)
  const stRifV02 = m.contractAt('StRIFTokenV02', stRifV02Proxy)

  return { stRif: stRifV02 }
})

export default stRifV02DeployModule
