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

  // Temporarily allow transfers to conduct the airdrop
  const allowTransfers = m.call(ogFoundersEp, 'setTransfersAllowed', [true])

  // Airdrop
  const ipfsCids = m.getParameter('ipfsCids')
  const airdropAddresses = m.getParameter('airdropAddresses')
  const airdrop = m.call(ogFoundersEp, 'airdrop', [ipfsCids, airdropAddresses], { after: [allowTransfers] })

  // Disable tokens transfer
  m.call(ogFoundersEp, 'setTransfersAllowed', [false], { id: 'DisallowTransfers', after: [airdrop] })
  return { ogFoundersEp }
})
