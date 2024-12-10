import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export const VanguardNFTModule = buildModule('VanguardNFT', m => {
  // deploy implementation
  const implementation = m.contract('VotingVanguardsRootstockCollective', [], { id: 'Implementation' })

  // initializer parameters
  const maxSupply = m.getParameter<number>('maxSupply')
  const mintLimit = m.getParameter<number>('mintLimit')
  const stRifThreshold = m.getParameter<bigint>('stRifThreshold')
  const initialOwner = m.getAccount(0)
  const stRif = m.getParameter<string>('stRif')
  const governor = m.getParameter<string>('governor')
  const proposalAmountToCheck = m.getParameter<number>('proposalAmountToCheck')
  const ipfsFolderCid = m.getParameter<string>('ipfsFolderCid')

  // deploy proxy
  const proxy = m.contract('ERC1967Proxy', [
    implementation,
    m.encodeFunctionCall(
      implementation,
      'initialize',
      [
        maxSupply,
        mintLimit,
        stRifThreshold,
        initialOwner,
        stRif,
        governor,
        proposalAmountToCheck,
        ipfsFolderCid,
      ],
      {
        id: 'Proxy',
      },
    ),
  ])
  const VanguardNFT = m.contractAt('VotingVanguardsRootstockCollective', proxy, {
    id: 'Contract',
  })

  return { VanguardNFT }
})

export default VanguardNFTModule
