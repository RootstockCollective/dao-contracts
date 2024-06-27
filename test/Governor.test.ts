import { expect } from 'chai'
import { ethers } from 'hardhat'
import { loadFixture, mine } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { randBetween } from 'bigint-crypto-utils'
import { deployRif } from '../scripts/deploy-rif'
import { deployGovernor } from '../scripts/deploy-governor'
import { RIFToken, RootDao, StRIFToken, TokenFaucet } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { deployStRIF } from '../scripts/deploy-stRIF'
import { parseEther, solidityPackedKeccak256 } from 'ethers'
import { Proposal } from '../types'

describe('RootDAO Contact', () => {
  const initialVotingDelay = 7200 // secs 1 day
  const initialVotingPeriod = 50400 // secs 1 week
  const initialProposalThreshold = 10n * 10n ** 18n

  let rif: { rifToken: RIFToken; rifAddress: string; tokenFaucet: TokenFaucet }
  let stRIF: StRIFToken
  let governor: RootDao
  let holders: SignerWithAddress[]
  let deployer: SignerWithAddress

  //   const rifTotalSupply = 10n ** 27n
  //   const votingPower = 10n ** 5n

  before(async () => {
    ;[deployer, ...holders] = await ethers.getSigners()
    const deployRIF = () => deployRif(deployer)
    rif = await loadFixture(deployRIF)
    const deployGovToken = async () => deployStRIF(rif.rifAddress, deployer.address)
    stRIF = await loadFixture(deployGovToken)

    const deployDAO = async () => deployGovernor(await stRIF.getAddress(), deployer.address)
    governor = await loadFixture(deployDAO)
  })

  describe('Upon deployment', () => {
    it('should deploy all contracts', async () => {
      expect(rif.rifAddress).to.be.properAddress
      expect(await stRIF.getAddress()).to.be.properAddress
      expect(await governor.getAddress()).to.be.properAddress
      expect(await rif.tokenFaucet.getAddress()).to.be.properAddress
    })

    it('voting delay should be initialized', async () => {
      expect(await governor.votingDelay()).to.equal(initialVotingDelay)
    })

    it('voting period length should be initialized', async () => {
      expect(await governor.votingPeriod()).to.equal(initialVotingPeriod)
    })

    it('proposal threshold should be initialized', async () => {
      expect(await governor.proposalThreshold()).to.equal(initialProposalThreshold)
    })
  })

  describe('Governance', () => {
    const proposalDescription = solidityPackedKeccak256(['string'], ['transfer money to acc2 address'])
    const proposalDescHash = solidityPackedKeccak256(['string'], [proposalDescription])
    const sendAmount = '2'
    let proposal: Proposal
    let proposalId: bigint
    // let proposalCalldata: string
    let proposalSnapshot: bigint

    describe('Proposal Creation', () => {
      it('participants should gain voting power proportional to RIF tokens', async () => {
        await Promise.all(
          [deployer, ...holders].map(async (voter, i) => {
            const dispenseTx = await rif.tokenFaucet.connect(voter).dispense(voter.address)
            await dispenseTx.wait()
            const rifBalance = await rif.rifToken.balanceOf(voter.address)
            const votingPower = i === 0 ? rifBalance : randBetween(rifBalance)
            const approvalTx = await rif.rifToken
              .connect(voter)
              .approve(await stRIF.getAddress(), votingPower)
            await approvalTx.wait()
            const depositTx = await stRIF.connect(voter).depositFor(voter.address, votingPower)
            await depositTx.wait()
            const delegateTx = await stRIF.connect(voter).delegate(voter.address)
            await delegateTx.wait()
            const votes = await stRIF.getVotes(voter.address)
            expect(votes).to.equal(votingPower)
          }),
        )
      })

      it('deployer should have enough voting power to initiate a proposal (above the Proposal Threshold)', async () => {
        const balance = await stRIF.balanceOf(deployer.address)
        const threshold = await governor.proposalThreshold()
        expect(balance).greaterThanOrEqual(threshold)
      })

      it('holders stRIF balances should be below the Proposal Threshold', async () => {
        const threshold = await governor.proposalThreshold()
        await Promise.all(
          holders.map(async holder => {
            const balance = await stRIF.balanceOf(holder.address)
            expect(balance).lessThan(threshold)
          }),
        )
      })

      it('should create a proposalID', async () => {
        proposal = [[await holders[1].getAddress()], [parseEther(sendAmount)], ['0x00']]
        proposalId = await governor.hashProposal(...proposal, proposalDescHash)

        await mine(1)
      })

      it('no one of the holders should be able to create proposal', async () => {
        await Promise.all(
          holders.map(async holder => {
            const tx = governor.connect(holder).propose(...proposal, proposalDescription)
            await expect(tx).to.be.reverted
          }),
        )
      })

      it('deployer should be able to create proposal', async () => {
        const blockHeight = await ethers.provider.getBlockNumber()
        const votingPeriod = await governor.votingPeriod()
        const votingDelay = await governor.votingDelay()
        const tx = governor.connect(deployer).propose(...proposal, proposalDescription)
        const snapshot = votingDelay + BigInt(blockHeight) + 1n
        const snapshotPlusDuration = votingPeriod + votingDelay + BigInt(blockHeight) + 1n
        //   emit ProposalCreated(
        //     proposalId,
        //     proposer,
        //     targets,
        //     values,
        //     new string[](targets.length),
        //     calldatas,
        //     snapshot,
        //     snapshot + duration,
        //     description
        // );

        const ProposalCreatedEvent = [
          proposalId,
          deployer.address, // proposer
          proposal[0], // targets
          proposal[1], // values
          [''], // ?
          proposal[2], // calldatas
          snapshot,
          snapshotPlusDuration,
          proposalDescription,
        ]

        await expect(tx)
          .to.emit(governor, 'ProposalCreated')
          .withArgs(...ProposalCreatedEvent)
      })

      it('proposal creation should initiate a Proposal Snapshot creation', async () => {
        const votingDelay = await governor.votingDelay()
        const block = await ethers.provider.getBlockNumber()
        proposalSnapshot = await governor.proposalSnapshot(proposalId)
        expect(votingDelay + BigInt(block)).equal(proposalSnapshot)
      })

      it('should calculate the quorum correctly', async () => {
        await mine((await governor.votingDelay()) + 1n)

        const quorum = await governor.quorum(proposalSnapshot)

        const snapshotTotalSupply = await stRIF.getPastTotalSupply(proposalSnapshot)
        expect(quorum).to.equal((snapshotTotalSupply * 4n) / 100n)
      })

      it('remaining votes should be equal to quorum', async () => {
        const { abstainVotes, forVotes } = await governor.proposalVotes(proposalId)
        const quorum = await governor.quorum(proposalSnapshot)
        const totalVotes = forVotes + abstainVotes
        const remainingVotes = quorum - totalVotes
        expect(remainingVotes).equal(quorum) // because no votes were cast yet
      })
    })

    describe('Voting', () => {
      it('holders should be able to cast vote', async () => {
        // cast FOR vote, system: 0 = Against, 1 = For, 2 = Abstain
        const tx = await governor.connect(holders[1]).castVote(proposalId, 1)
        tx.wait()
        const hasVoted = await governor.hasVoted(proposalId, holders[1])
        expect(hasVoted).to.be.true
        const { forVotes } = await governor.proposalVotes(proposalId)
        expect(forVotes).to.be.equal(await stRIF.getVotes(holders[1]))

        const tx2 = await governor.connect(holders[15]).castVote(proposalId, 0)
        tx2.wait()
        const hasVoted2 = await governor.hasVoted(proposalId, holders[15])
        expect(hasVoted2).to.be.true
        const { againstVotes } = await governor.proposalVotes(proposalId)
        expect(againstVotes).to.be.equal(await stRIF.getVotes(holders[15]))
      })
    })
  })
})
