import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export const VanguardNFTModule = buildModule('VanguardNFT', m => {
  // deploy implementation
  const implementation = m.contract('VanguardNFTRootstockCollective', [], { id: 'Implementation' })

  // initializer parameters
  const deployer = m.getAccount(0)
  const governor = m.getParameter('governor')
  const maxSupply = m.getParameter('maxSupply')
  const ipfsFolderCid = m.getParameter('ipfsFolderCid')

  // deploy proxy
  const proxy = m.contract('ERC1967Proxy', [
    implementation,
    m.encodeFunctionCall(implementation, 'initialize', [deployer, governor, maxSupply, ipfsFolderCid], {
      id: 'Proxy',
    }),
  ])
  const VanguardNFT = m.contractAt('VanguardNFTRootstockCollective', proxy, {
    id: 'Contract',
  })

  return { VanguardNFT }
})

export default VanguardNFTModule
