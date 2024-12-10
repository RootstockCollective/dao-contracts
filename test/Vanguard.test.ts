import { ethers, ignition } from 'hardhat'
import {
  GovernorRootstockCollective,
  RIFToken,
  StRIFToken,
  VotingVanguardsRootstockCollective,
} from '../typechain-types'
import VotingVanguardsModule from '../ignition/modules/VotingVanguardsModule'
import { deployContracts } from './deployContracts'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { randomBytes, hexlify, formatEther, ZeroAddress } from 'ethers'
import { loadFixture, mine } from '@nomicfoundation/hardhat-network-helpers'
import { VoteType } from '../types'

const ZERO_BYTE = '0x00'
const rootstockGasPriceAverage = 63228564n

describe('Vanguard NFT', () => {
  // The number of proposals that need to be checked to determine whether the user voted for any of them
  const proposalAmountToCheck = 3
  const ipfsFolderCid = 'QmZYHgFMjZ9SNvFwP9rCxtDEgF2JfJwQtaSg2fqxTX31eG'
  const stRifThreshold = 50n * 10n ** 18n
  const votingPower = 100n * 10n ** 18n
  const maxSupply = 1000
  const mintLimit = 200

  let deployer: SignerWithAddress
  let voter: SignerWithAddress
  let proposalTarget: SignerWithAddress

  before(async () => {
    ;[deployer, voter, proposalTarget] = await ethers.getSigners()
  })

  // give voting power
  const enfranchise = async (rif: RIFToken, stRIF: StRIFToken) => {
    // give voting power to deployer to be able to create a proposal
    await rif.approve(await stRIF.getAddress(), votingPower).then(tx => tx.wait())
    await stRIF.depositAndDelegate(deployer.address, votingPower).then(tx => tx.wait())
    // give voting power to voter
    await rif.transfer(voter.address, votingPower).then(tx => tx.wait())
    await rif
      .connect(voter)
      .approve(await stRIF.getAddress(), votingPower)
      .then(tx => tx.wait())
    await stRIF
      .connect(voter)
      .depositAndDelegate(voter.address, votingPower)
      .then(tx => tx.wait())
  }

  const deploy = async () => {
    const contracts = await deployContracts()
    const vanguard = (
      await ignition.deploy(VotingVanguardsModule, {
        parameters: {
          VanguardNFT: {
            maxSupply,
            mintLimit,
            stRifThreshold,
            stRif: await contracts.stRIF.getAddress(),
            governor: await contracts.governor.getAddress(),
            proposalAmountToCheck,
            ipfsFolderCid,
          },
        },
      })
    ).VanguardNFT as unknown as VotingVanguardsRootstockCollective
    await enfranchise(contracts.rif, contracts.stRIF)
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

  describe('NFT lifecycle', () => {
    let governor: GovernorRootstockCollective
    let vanguard: VotingVanguardsRootstockCollective
    let stRif: StRIFToken

    before(async () => {
      const contracts = await loadFixture(deploy)
      governor = contracts.governor
      vanguard = contracts.vanguard
      stRif = contracts.stRIF
    })

    describe('Upon deployment', async () => {
      it('Contract names should be set after the deployment', async () => {
        expect(await governor.name()).to.equal('GovernorRootstockCollective')
        expect(await vanguard.name()).to.equal('VotingVanguardsRootstockCollective')
      })
      it('number of past votes to be checked should be set up', async () => {
        expect(await vanguard.proposalAmountToCheck()).to.equal(proposalAmountToCheck)
      })
      it('StRif threshold should be set', async () => {
        expect(await vanguard.stRifThreshold()).to.equal(stRifThreshold)
      })
      it('StRif address should be set in the Vanguard contract', async () => {
        expect(await vanguard.stRif()).to.equal(await stRif.getAddress())
      })
      it('Mint limit should be set', async () => {
        expect(await vanguard.mintLimit()).to.equal(mintLimit)
      })
      it('All tokens should be available for minting', async () => {
        expect(await vanguard.tokensAvailable()).to.equal(maxSupply)
      })

      it('Voter`s StRif balance should be above the StRif threshold', async () => {
        expect(await stRif.balanceOf(voter.address)).to.be.greaterThanOrEqual(stRifThreshold)
      })
      it('Voter should have enough voting power to vote', async () => {
        expect(await stRif.getVotes(voter.address)).to.equal(votingPower)
      })
    })

    describe('Minting NFTs', () => {
      it('Voter should not be able to mint NFT before voting', async () => {
        await expect(vanguard.connect(voter).mint()).to.be.revertedWithCustomError(vanguard, 'HasNotVoted')
      })
      it('hasVoted should detect that voter hasn`t voted yet', async () => {
        expect(await vanguard.hasVoted(voter.address)).to.be.false
      })
      it('Governor should now store 0 proposals', async () => {
        expect(await governor.proposalCount()).to.equal(0)
      })
      it('Voter should NOT be able to mint an NFT if he voted long ago (before `proposalAmountToCheck`)', async () => {
        const id = await createProposal(governor)

        await governor.connect(voter).castVote(id, VoteType.For)
        // voter misses 3 proposals
        await createProposal(governor)
        await createProposal(governor)
        await createProposal(governor)
        expect(await vanguard.hasVoted(voter.address)).to.be.false
      })
      it('voter should vote for a proposal', async () => {
        const id = await createProposal(governor)
        await expect(governor.connect(voter).castVote(id, VoteType.For)).to.emit(governor, 'VoteCast')
        expect(await governor.hasVoted(id, voter.address)).to.be.true
      })
      it('should create 2 more proposals', async () => {
        for (let i = 0; i < 2; i++) {
          await createProposal(governor)
        }
      })
      it('hasVoted should detect that voter has already voted', async () => {
        expect(await vanguard.hasVoted(voter.address)).to.be.true
      })
      it('Voter should not be a community member before minting', async () => {
        expect(await vanguard.isMember(voter.address)).to.be.false
      })
      it('Voter should be able to mint NFT after voting', async () => {
        await expect(vanguard.connect(voter).mint())
          .to.emit(vanguard, 'Transfer')
          .withArgs(ZeroAddress, voter.address, 1)
      })
      it('Voter should now be a community member after minting', async () => {
        expect(await vanguard.isMember(voter.address)).to.be.true
      })
      it('Voter should NOT be able to mint NFT second time', async () => {
        await expect(vanguard.connect(voter).mint()).to.be.revertedWithCustomError(
          vanguard,
          'ERC721InvalidOwner',
        )
      })
      it('Member cannot transfer his NFT to no one because the NFT is untransferable', async () => {
        await expect(
          vanguard.connect(voter).transferFrom(voter.address, deployer.address, 1),
        ).to.be.revertedWithCustomError(vanguard, 'TransfersDisabled')
      })
    })
  })

  describe('Measuring gas', () => {
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
        gasFee: +formatEther(rootstockGasPriceAverage * gasUsed),
      }
    }

    it('Fees paid for a single proposal check should be reasonable', async () => {
      const gasFees: number[] = []
      for (let i = 0; i < proposalAmountToCheck; i++) {
        const { gasFee } = await testMintGas(i)
        gasFees.push(gasFee)
      }
      const feesPerProposalCheck = gasFees.slice(1).map((current, index) => current - gasFees[index])
      const averageFeePerProposalCheck =
        feesPerProposalCheck.reduce((sum, diff) => sum + diff, 0) / feesPerProposalCheck.length
      expect(averageFeePerProposalCheck).lessThan(0.000002)
    })
  })
})
