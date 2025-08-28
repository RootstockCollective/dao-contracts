import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export const PlushieSeries1Module = buildModule('PlushieSeries1', m => {
  // deploy implementation
  const implementation = m.contract('PlushieSeries1RootstockCollective', [], { id: 'Implementation' })

  const deployer = m.getAccount(0)
  const stRif = m.getParameter('stRif')
  const stRifThreshold = m.getParameter('stRifThreshold')
  const maxSupply = m.getParameter('maxSupply')
  const ipfsFolderCid = m.getParameter('ipfsFolderCid')
  // deploy proxy
  const proxy = m.contract('ERC1967Proxy', [
    implementation,
    m.encodeFunctionCall(
      implementation,
      'initialize',
      [deployer, stRif, stRifThreshold, maxSupply, ipfsFolderCid],
      {
        id: 'Proxy',
      },
    ),
  ])
  const plushieSeries1 = m.contractAt('PlushieSeries1RootstockCollective', proxy, {
    id: 'Contract',
  })

  return { plushieSeries1 }
})

export default PlushieSeries1Module
