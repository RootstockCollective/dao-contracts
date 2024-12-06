import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export const betaBuildersModule = buildModule('BetaBuilders', m => {
  // deploy implementation
  const implementation = m.contract('BetaBuildersRootstockCollective', [], { id: 'Implementation' })

  const deployer = m.getAccount(0)
  // deploy proxy
  const proxy = m.contract('ERC1967Proxy', [
    implementation,
    m.encodeFunctionCall(implementation, 'initialize', [deployer], {
      id: 'Proxy',
    }),
  ])
  const ExtBetaBuildersEP = m.contractAt('BetaBuildersRootstockCollective', proxy, {
    id: 'Contract',
  })

  return { ExtBetaBuildersEP }
})

export default betaBuildersModule
