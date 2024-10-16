import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export const ogFoundersEpProxyModule = buildModule('OgFoundersEP', m => {
  // deploy implementation
  const implementation = m.contract('OgFoundersEcosystemPartner')

  // initializer parameters
  const deployer = m.getAccount(0)

  // deploy proxy
  const proxy = m.contract('ERC1967Proxy', [
    implementation,
    m.encodeFunctionCall(implementation, 'initialize', [deployer]),
  ])
  const ogFoundersEp = m.contractAt('OgFoundersEcosystemPartner', proxy, {
    id: 'OgFoundersEPProxy',
  })

  // Airdrop
  const ipfsCids = m.getParameter('ipfsCids')
  const airdropAddresses = m.getParameter('airdropAddresses')
  m.call(ogFoundersEp, 'airdrop', [ipfsCids, airdropAddresses])

  return { ogFoundersEp }
})
