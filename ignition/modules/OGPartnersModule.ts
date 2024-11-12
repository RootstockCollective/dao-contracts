import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export const ogPartnersModule = buildModule('OGPartners', m => {
  // deploy implementation
  const implementation = m.contract('OGPartnersRootstockCollective', [], { id: 'Implementation' })

  // initializer parameters
  const deployer = m.getAccount(0)

  // deploy proxy
  const proxy = m.contract('ERC1967Proxy', [
    implementation,
    m.encodeFunctionCall(implementation, 'initialize', [deployer], {
      id: 'Proxy',
    }),
  ])
  const ogFoundersEp = m.contractAt('OGPartnersRootstockCollective', proxy, {
    id: 'Contract',
  })

  return { ogFoundersEp }
})

export default ogPartnersModule
