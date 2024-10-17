import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export const ogFoundersEpProxyModule = buildModule('OgFoundersEP', m => {
  // deploy implementation
  const implementation = m.contract('OgFoundersEcosystemPartner', [], { id: 'Implementation' })

  // initializer parameters
  const contractName = m.getParameter('contractName')
  const contractSymbol = m.getParameter('symbol')
  const deployer = m.getAccount(0)
  const maxNftSupply = m.getParameter('maxNftSupply')

  // deploy proxy
  const proxy = m.contract('ERC1967Proxy', [
    implementation,
    m.encodeFunctionCall(
      implementation,
      'initialize',
      [contractName, contractSymbol, deployer, maxNftSupply],
      { id: 'Proxy' },
    ),
  ])
  const ogFoundersEp = m.contractAt('OgFoundersEcosystemPartner', proxy, {
    id: 'Contract',
  })

  // Airdrop
  const ipfsCids = m.getParameter('ipfsCids')
  const airdropAddresses = m.getParameter('airdropAddresses')
  m.call(ogFoundersEp, 'airdrop', [ipfsCids, airdropAddresses])

  return { ogFoundersEp }
})

export default ogFoundersEpProxyModule
