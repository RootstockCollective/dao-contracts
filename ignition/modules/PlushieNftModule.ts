import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export const PlushieNftModule = buildModule('PlushieNft', m => {
  // deploy implementation
  const implementation = m.contract('PlushieNFT', [], { id: 'Implementation' })

  const deployer = m.getAccount(0)
  const maxSupply = m.getParameter('maxSupply')
  const ipfsFolderCid = m.getParameter('ipfsFolderCid')
  // deploy proxy
  const proxy = m.contract('ERC1967Proxy', [
    implementation,
    m.encodeFunctionCall(implementation, 'initialize', [deployer, maxSupply, ipfsFolderCid], {
      id: 'Proxy',
    }),
  ])
  const plushieNft = m.contractAt('PlushieNFT', proxy, {
    id: 'Contract',
  })

  return { plushieNft }
})

export default PlushieNftModule
