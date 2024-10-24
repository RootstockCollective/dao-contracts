import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export const ogFoundersEpProxyModule = buildModule('OgFoundersEP', m => {
  // deploy implementation
  const implementation = m.contract('OgFoundersEcosystemPartner', [], { id: 'Implementation' })

  // initializer parameters
  const contractName = m.getParameter('contractName')
  const contractSymbol = m.getParameter('symbol')
  const deployer = m.getAccount(0)

  // deploy proxy
  const proxy = m.contract('ERC1967Proxy', [
    implementation,
    m.encodeFunctionCall(implementation, 'initialize', [contractName, contractSymbol, deployer], {
      id: 'Proxy',
    }),
  ])
  const ogFoundersEp = m.contractAt('OgFoundersEcosystemPartner', proxy, {
    id: 'Contract',
  })

  return { ogFoundersEp }
})

export default ogFoundersEpProxyModule
