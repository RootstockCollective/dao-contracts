/**
 * This Hardhat Ignition module upgrades StRIF contract v.1 to v.2
 */
import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export const stRifV02Module = buildModule('StRIFTokenV02', m => {
  const stRIFTokenProxyAddress = m.getParameter('StRifAddress')

  const stRIFTokenProxy = m.contractAt('StRIFToken', stRIFTokenProxyAddress)

  const newImplementation = m.contract('StRIFTokenV02', [], { id: 'Implementation02' })

  const reInitCall = m.encodeFunctionCall(newImplementation, 'initializeV2', [])

  m.call(stRIFTokenProxy, 'upgradeToAndCall', [newImplementation, reInitCall], { id: 'Reinitialize02' })

  const stRifV02 = m.contractAt('StRIFTokenV02', stRIFTokenProxy, { id: 'Contract02' })

  return { stRifV02 }
})
export default stRifV02Module
