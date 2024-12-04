/**
 * StRIF contract v.2 implementation deployment module
 */
import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export const stRifV02ImplementationModule = buildModule('stRifV02Implementation', m => {
  const stRifV02Implementation = m.contract('StRIFTokenV02', [], { id: 'Implementation' })

  return { stRifV02Implementation }
})
export default stRifV02ImplementationModule
