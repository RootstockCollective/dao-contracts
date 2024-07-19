import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export const earlyAdoptersProxyModule = buildModule('EarlyAdoptersProxy', m => {
  const deployer = m.getAccount(0)
  // deploy implementation
  const ea = m.contract('EarlyAdopters')
  // deploy ERC1967 proxy in order to use UUPS upgradable smart contracts
  const defaultAdmin = m.getParameter('defaultAdmin', deployer)
  const upgrader = m.getParameter('upgrader', deployer)
  const cidsLoader = m.getParameter('cidsLoader', deployer)
  const eaProxy = m.contract('ERC1967Proxy', [
    ea,
    m.encodeFunctionCall(ea, 'initialize', [defaultAdmin, upgrader, cidsLoader]),
  ])
  return { eaProxy }
})

const earlyAdoptersModule = buildModule('EarlyAdopters', m => {
  const { eaProxy } = m.useModule(earlyAdoptersProxyModule)
  // Use proxy address to interact with the deployed contract
  const ea = m.contractAt('EarlyAdopters', eaProxy)
  return { ea }
})

export default earlyAdoptersModule
