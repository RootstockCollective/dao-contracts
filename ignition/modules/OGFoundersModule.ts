import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export const OGFoundersModule = buildModule('OGFounders', m => {
  // deploy implementation
  const implementation = m.contract('OGFoundersRootstockCollective', [], { id: 'Implementation' })

  // initializer parameters
  const deployer = m.getAccount(0)
  const stRIFAddress = m.getParameter('stRIFAddress')
  const firstProposalDate = m.getParameter('firstProposalDate')

  // deploy proxy
  const proxy = m.contract('ERC1967Proxy', [
    implementation,
    m.encodeFunctionCall(implementation, 'initialize', [deployer, stRIFAddress, firstProposalDate], {
      id: 'Proxy',
    }),
  ])
  const OGFounders = m.contractAt('OGFoundersRootstockCollective', proxy, {
    id: 'Contract',
  })

  return { OGFounders }
})

export default OGFoundersModule
