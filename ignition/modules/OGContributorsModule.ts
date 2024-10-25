import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export const ogContributorsModule = buildModule('OGContributors', m => {
  // deploy implementation
  const implementation = m.contract('OGContributorsRootstockCollective', [], { id: 'Implementation' })

  const deployer = m.getAccount(0)
  // deploy proxy
  const proxy = m.contract('ERC1967Proxy', [
    implementation,
    m.encodeFunctionCall(implementation, 'initialize', [deployer], {
      id: 'Proxy',
    }),
  ])
  const ExtContributorsEP = m.contractAt('OGContributorsRootstockCollective', proxy, {
    id: 'Contract',
  })

  return { ExtContributorsEP }
})

export default ogContributorsModule
