import { ethers, ignition } from 'hardhat'
import { GovernorRootstockCollective, VanguardNFTRootstockCollective } from '../typechain-types'
import VanguardNFTModule from '../ignition/modules/VanguardNFTModule'
import { deployContracts } from './deployContracts'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { randomBytes, hexlify, formatEther } from 'ethers'
import { loadFixture, mine } from '@nomicfoundation/hardhat-network-helpers'
import { VoteType } from '../types'

const ZERO_BYTE = '0x00'

describe('Vanguard NFT', () => {
  const proposalCount = 10
  const ipfsFolderCid = 'QmZYHgFMjZ9SNvFwP9rCxtDEgF2JfJwQtaSg2fqxTX31eG'

  let deployer: SignerWithAddress
  let voter: SignerWithAddress
  let proposalTarget: SignerWithAddress

  before(async () => {
    ;[deployer, voter, proposalTarget] = await ethers.getSigners()
  })

  // The number of proposals that need to be checked to determine whether the user voted for any of them

  const deploy = async () => {
    const contracts = await deployContracts()
    const vanguard = (
      await ignition.deploy(VanguardNFTModule, {
        parameters: {
          VanguardNFT: {
            governor: await contracts.governor.getAddress(),
            maxSupply: 10n,
            proposalCount,
            ipfsFolderCid,
          },
        },
      })
    ).VanguardNFT as unknown as VanguardNFTRootstockCollective
    const votingPower = 100n * 10n ** 18n
    await contracts.rif.approve(await contracts.stRIF.getAddress(), votingPower).then(tx => tx.wait())
    await contracts.stRIF.depositAndDelegate(deployer.address, votingPower).then(tx => tx.wait())
    return { ...contracts, vanguard }
  }

  const createProposal = async (governor: GovernorRootstockCollective) => {
    const receipt = await governor
      .propose([proposalTarget.address], [0n], [ZERO_BYTE], hexlify(randomBytes(32)))
      .then(tx => tx.wait())
    await mine(1)
    const [event] = await governor.queryFilter(governor.filters.ProposalCreated, receipt?.blockNumber)
    return event.args.proposalId
  }

  const testMintGas = async (numAdditionalProposals: number) => {
    const { governor, vanguard } = await loadFixture(deploy)

    // Create and vote for the initial proposal
    const id = await createProposal(governor)
    await governor
      .connect(voter)
      .castVote(id, VoteType.For)
      .then(tx => tx.wait())

    // Create additional proposals
    for (let i = 0; i < numAdditionalProposals; i++) {
      await createProposal(governor)
    }

    // Mint and measure gas
    const mintTx = await vanguard.connect(voter).mint()
    const mintReceipt = await mintTx.wait()
    if (!mintReceipt) throw new Error('Unable to mint')
    const { gasPrice, gasUsed } = mintReceipt
    return {
      gasPrice,
      gasUsed,
      gasFee: +formatEther(gasPrice * gasUsed),
    }
  }

  describe('measuring gas', () => {
    it('mint after 0 - 10 proposals', async () => {
      let totalGasPrice = 0n
      for (let i = 0; i < proposalCount; i++) {
        const { gasPrice } = await testMintGas(i)
        totalGasPrice += gasPrice
      }
      console.log('average gas price', totalGasPrice / BigInt(proposalCount))
    })
  })
})

/* describe.skip('Upon deployment', () => {
    it('Contract names should be set after the deployment', async () => {
      expect(await governor.name()).to.equal('GovernorRootstockCollective')
      expect(await vanguard.name()).to.equal('VanguardNFTRootstockCollective')
    })
    it('number of past votes to be checked should be set up', async () => {
      expect(await vanguard.proposalCount()).to.equal(proposalCount)
    })
  })
  describe.skip('Minting NFTs', () => {
    it('Voter should not be able to mint NFT before voting', async () => {
      await expect(vanguard.connect(voter).mint()).to.be.revertedWithCustomError(vanguard, 'HasNotVoted')
    })
    it.skip('voter should vote for a proposal', async () => {
      const id = await createProposal()
      proposalIds.push(id)
      await expect(governor.connect(voter).castVote(id, VoteType.For)).to.emit(governor, 'VoteCast')
      expect(await governor.hasVoted(id, voter.address)).to.be.true
    })
    it('should create 10 proposals', async () => {
      for (let i = 0; i < proposalCount; i++) {
        await createProposal()
      }
    })
    it('hasVoted should detect that voter hasn`t voted yet', async () => {
      expect(await vanguard.hasVoted(voter.address, proposalCount)).to.be.false
    })
    it('Voter should be able to mint NFT after voting', async () => {
      await expect(vanguard.connect(voter).mint()).to.emit(vanguard, 'Transfer')
    })
   */
