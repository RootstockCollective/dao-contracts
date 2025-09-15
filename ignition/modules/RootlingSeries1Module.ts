import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export const rootlingSeries1Module = buildModule('RootlingSeries1', m => {
  // deploy implementation
  const implementation = m.contract('RootlingSeries1RootstockCollective', [], { id: 'Implementation' })

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
  const RootlingSeries1 = m.contractAt('RootlingSeries1RootstockCollective', proxy, {
    id: 'Contract',
  })

  return { RootlingSeries1 }
})

export default rootlingSeries1Module
