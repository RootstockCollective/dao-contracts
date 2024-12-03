import { ethers, ignition } from 'hardhat'
import { GovernorRootstockCollective, VanguardNFTRootstockCollective } from '../typechain-types'
import VanguardNFTModule from '../ignition/modules/VanguardNFTModule'
import { expect } from 'chai'
import { HDNodeWallet, Wallet } from 'ethers'

const deployVanguard = async () => {
  const governor = await ethers.getContractAt(
    'GovernorRootstockCollective',
    '0x91a8E4A070B4BA4bf2e2a51Cb42BdeDf8FFB9b5a',
  )

  const vanguardNFT = await ethers.getContractAt(
    'VanguardNFTRootstockCollective',
    '0x6c8A59784aD6a2BBcFe4940A587D88DeF24b6A32',
  )

  //   const ipfsFolderCid = 'QmPaCP36tFjXp7xqcPi4ggatL7w4dsWKGTv1kpaSVkv9KW'

  const address = await governor.getAddress()
  console.log('address', address)

  //   const contract = await ignition.deploy(VanguardNFTModule, {
  //     parameters: {
  //       VanguardNFT: {
  //         governor: address,
  //         maxSupply: 20,
  //         ipfsFolderCid,
  //       },
  //     },
  //   })
  //   const vanguardNFT = contract.VanguardNFT as unknown as VanguardNFTRootstockCollective

  console.log('vanguardNFT address', await vanguardNFT.getAddress())

  return { governor, vanguardNFT }
}

describe('NFT GAS CHECK', () => {
  let vanguardNFT: VanguardNFTRootstockCollective
  let governor: GovernorRootstockCollective

  before(async () => {
    try {
      ;({ governor, vanguardNFT } = await deployVanguard())
    } catch (err) {
      console.log('ERROR IN ASYNC', err)
    }
  })

  it('should successfully deploy', async () => {
    expect(await vanguardNFT.getAddress()).to.be.properAddress
    expect(await governor.getAddress()).to.be.properAddress
  })

  it('should not mint', async () => {
    const provider = ethers.getDefaultProvider()
    const signer = new Wallet('b15963931c7e8bdb293596040e86dd18e4c885868c5ffffc1d91ff2d0fd84f07', provider)
    console.log('signer address', await signer.getAddress())
    const tx = await vanguardNFT.connect(signer).mint()

    await expect(tx).to.be.revertedWithCustomError({ interface: vanguardNFT.interface }, 'VanguardCannotMint')
  })

  //   it('should fetch proposal count', async () => {
  //     proposalCount = await governor.proposalCount()
  //     console.log('proposalCount', proposalCount)
  //     expect(proposalCount).to.be.greaterThan(0n)
  //   })

  //   it('should be able to fetch proposalDetails by index', async () => {
  //     const proposalDetails = await governor.proposalDetailsAt(proposalCount - 1n)
  //     expect(typeof proposalDetails[0]).to.equal(typeof 0n)
  //   })

  //   it('check gas', async () => {
  //     const proposalsHasVoted = []

  //     await Promise.all(
  //       [10n, 9n, 8n, 7n, 6n, 5n, 4n, 3n, 2n, 1n].map(async i => {
  //         const proposalDetails = await governor.proposalDetailsAt(proposalCount - i)
  //         const hasVoted = await governor.hasVoted(
  //           proposalDetails[0],
  //           '0x0C48e53E5852780Cb0a5Bf168eb92DE3B88Ebe89',
  //         )
  //         proposalsHasVoted.push({ id: proposalDetails[0], hasVoted })
  //       }),
  //     )

  //     console.log('proposalsHasVoted', proposalsHasVoted, proposalsHasVoted.length)

  //     proposalsHasVoted.forEach(obj => {

  //     })
  //   })
})
