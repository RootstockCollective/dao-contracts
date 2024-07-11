import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export const stRifProxyModule = buildModule('stRifProxy', m => {
  const upgrader = m.getAccount(0)
  // deploy StRIF implementation
  const rifAddress = m.getParameter('rifAddress')
  const stRif = m.contract('StRIFToken')
  // deploy ERC1967 proxy in order to use UUPS upgradable smart contracts
  const stRifProxy = m.contract('ERC1967Proxy', [
    stRif,
    m.encodeFunctionCall(stRif, 'initialize', [rifAddress, upgrader]),
  ])
  return { stRifProxy }
})

// Use proxy address to interact with StRIF
const stRifModule = buildModule('stRif', m => {
  const { stRifProxy } = m.useModule(stRifProxyModule)
  const stRif = m.contractAt('StRIFToken', stRifProxy)

  return { stRif }
})

export default stRifModule
