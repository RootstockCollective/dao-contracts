import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export const RootcampModule = buildModule('Rootcamp', m => {
  const implementation = m.contract('RootcampRootstockCollective', [], { id: 'Implementation' })

  const deployer = m.getAccount(0)
  const stRif = m.getParameter('stRif')
  const stRifThreshold = m.getParameter('stRifThreshold')
  const maxSupply = m.getParameter('maxSupply')
  const ipfsFolderCid = m.getParameter('ipfsFolderCid')

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
  const Rootcamp = m.contractAt('RootcampRootstockCollective', proxy, {
    id: 'Contract',
  })

  const whitelistGuards = m.getParameter<string[]>('whitelistGuards')
  m.call(Rootcamp, 'addWhitelistGuards', [whitelistGuards], { id: 'AddWhitelistGuards' })

  return { Rootcamp }
})

export default RootcampModule
