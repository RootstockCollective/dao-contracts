import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import RIFModule from './RifModule'

const stRifProxyModule = buildModule('stRifProxy', m => {
  const upgrader = m.getAccount(0)
  // deploy StRIF implementation
  const { rif } = m.useModule(RIFModule)
  const stRif = m.contract('StRIFToken')
  // deploy ERC1967 proxy in order to use UUPS upgradable smart contracts
  const proxy = m.contract('ERC1967Proxy', [
    stRif,
    m.encodeFunctionCall(stRif, 'initialize', [rif, upgrader]),
  ])
  return { proxy, rif }
})

// Use proxy address to interact with StRIF
const stRifModule = buildModule('stRif', m => {
  const { proxy, rif } = m.useModule(stRifProxyModule)
  const stRif = m.contractAt('StRIFToken', proxy)

  return { rif, stRif, proxy }
})

export default stRifModule
