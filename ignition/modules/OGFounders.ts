import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export const OGFoundersProxyModule = buildModule('OGFounders', m => {
  // deploy implementation
  const implementation = m.contract('OGFounders', [], { id: 'Implementation' })

  // initializer parameters
  const contractName = m.getParameter('contractName')
  const contractSymbol = m.getParameter('symbol')
  const deployer = m.getAccount(0)
  const stRIFAddress = m.getParameter('stRIFAddress')
  const firstProposalDate = m.getParameter('firstProposalDate')

  // deploy proxy
  const proxy = m.contract('ERC1967Proxy', [
    implementation,
    m.encodeFunctionCall(
      implementation,
      'initialize',
      [contractName, contractSymbol, deployer, stRIFAddress, firstProposalDate],
      { id: 'Proxy' },
    ),
  ])
  const OGFounders = m.contractAt('OGFounders', proxy, {
    id: 'Contract',
  })

  return { OGFounders }
})

export default OGFoundersProxyModule
