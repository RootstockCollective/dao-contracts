import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export const extContributersEpProxyModule = buildModule('ExtContributorsEP', m => {
  // deploy implementation
  const implementation = m.contract('ExternalContributorsEcosystemPartner', [], { id: 'Implementation' })

  const deployer = m.getAccount(0)
  // deploy proxy
  const proxy = m.contract('ERC1967Proxy', [
    implementation,
    m.encodeFunctionCall(implementation, 'initialize', [deployer], {
      id: 'Proxy',
    }),
  ])
  const ExtContributorsEP = m.contractAt('ExternalContributorsEcosystemPartner', proxy, {
    id: 'Contract',
  })

  return { ExtContributorsEP }
})

export default extContributersEpProxyModule
