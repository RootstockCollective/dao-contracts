import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export const extContributersEpProxyModule = buildModule('ExtContributorsEP', m => {
  // deploy implementation
  const implementation = m.contract('ExternalContributorsEcosystemPartner', [], { id: 'Implementation' })

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
  const ExtContributorsEP = m.contractAt('ExternalContributorsEcosystemPartner', proxy, {
    id: 'Contract',
  })

  // Airdrop
  const ipfsCids = m.getParameter('ipfsCids')
  const airdropAddresses = m.getParameter('airdropAddresses')
  m.call(ExtContributorsEP, 'airdrop', [ipfsCids, airdropAddresses])

  return { ExtContributorsEP }
})

export default extContributersEpProxyModule
