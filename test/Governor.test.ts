import { expect } from 'chai'
import { ethers } from 'hardhat'
import { loadFixture, mine, time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { deployRif } from '../scripts/deploy-rif'
import { deployGovernor } from '../scripts/deploy-governor'
import { deployTimelock } from '../scripts/deploy-timelock'
import { RIFToken, RootDao, StRIFToken, TokenFaucet, DaoTimelockUpgradable } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { deployStRIF } from '../scripts/deploy-stRIF'
import { parseEther, solidityPackedKeccak256 } from 'ethers'
import { Proposal, ProposalState, OperationState } from '../types'

describe('RootDAO Contact', () => {
  const initialVotingDelay = 1n // secs 1 day
  const initialVotingPeriod = 60n // secs 1 week
  const initialProposalThreshold = 10n * 10n ** 18n

  let rif: { rifToken: RIFToken; rifAddress: string; tokenFaucet: TokenFaucet }
  let stRIF: StRIFToken
  let timelock: DaoTimelockUpgradable
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
    timelock = await loadFixture(deployTimelock)
    const deployDAO = async () =>
      deployGovernor(await stRIF.getAddress(), deployer.address, await timelock.getAddress())
    governor = await loadFixture(deployDAO)
  })

  describe('Upon deployment', () => {
    it('should deploy all contracts', async () => {
      expect(rif.rifAddress).to.be.properAddress
      expect(await stRIF.getAddress()).to.be.properAddress
      expect(await timelock.getAddress()).to.be.properAddress
      expect(await governor.getAddress()).to.be.properAddress
      expect(await rif.tokenFaucet.getAddress()).to.be.properAddress
    })

    it('min delay should be set on the Timelock', async () => {
      expect(await timelock.getMinDelay())
    })

    it('Timelock should be set on the Governor', async () => {
      expect(await governor.timelock()).to.equal(await timelock.getAddress())
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
    const sendAmount = '2'
    let proposal: Proposal
    let proposalId: bigint
    let proposalSnapshot: bigint
    // let proposalCalldata: string

    const getState = async () => await governor.state(proposalId)

    const defaultDescription = 'transfer money to acc2 address'
    const otherDesc = 'test success case'
    const generateDescriptionHash = (proposalDesc?: string) =>
      solidityPackedKeccak256(['string'], [proposalDesc ?? defaultDescription])

    const createProposal = async (proposalDesc = defaultDescription) => {
      const blockHeight = await ethers.provider.getBlockNumber()
      const votingDelay = await governor.votingDelay()

      // proposal = [[await holders[1].getAddress()], [parseEther(sendAmount)], ['0x00']]
      const calldata = stRIF.interface.encodeFunctionData('symbol')
      proposal = [[await stRIF.getAddress()], [0n], [calldata]]

      proposalId = await governor
        .connect(holders[0])
        .hashProposal(proposal[0], proposal[1], proposal[2], generateDescriptionHash(proposalDesc))

      const proposalTx = await governor.connect(holders[0]).propose(...proposal, proposalDesc)
      await proposalTx.wait()
      proposalSnapshot = votingDelay + BigInt(blockHeight) + 1n
      return proposalTx
    }

    const checkVotes = async () => {
      const { forVotes } = await governor.proposalVotes(proposalId)

      return forVotes
    }

    describe('Proposal Creation', () => {
      it('participants should gain voting power proportional to RIF tokens', async () => {
        await Promise.all(
          holders.map(async (voter, i) => {
            const dispenseTx = await rif.tokenFaucet.connect(voter).dispense(voter.address)
            await dispenseTx.wait()
            const rifBalance = await rif.rifToken.balanceOf(voter.address)
            const votingPower = i === 0 ? rifBalance : rifBalance - parseEther(sendAmount)

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

      it('holder[0] should have enough voting power to initiate a proposal (above the Proposal Threshold)', async () => {
        const balance = await stRIF.balanceOf(holders[0])
        const threshold = await governor.proposalThreshold()
        expect(balance).greaterThanOrEqual(threshold)
      })

      it('other holders except holder[0] stRIF balances should be below the Proposal Threshold', async () => {
        const threshold = await governor.proposalThreshold()
        await Promise.all(
          holders.slice(1).map(async holder => {
            const balance = await stRIF.balanceOf(holder.address)
            expect(balance).lessThan(threshold)
          }),
        )
      })

      it('holder[0] should be able to create proposal', async () => {
        const proposalTx = await createProposal()
        const votingPeriod = await governor.votingPeriod()
        const ProposalCreatedEvent = [
          proposalId,
          holders[0].address, // proposer
          proposal[0], // targets
          proposal[1], // values
          [''], // ?
          proposal[2], // calldatas
          proposalSnapshot,
          proposalSnapshot + votingPeriod,
          defaultDescription,
        ]

        await expect(proposalTx)
          .to.emit(governor, 'ProposalCreated')
          .withArgs(...ProposalCreatedEvent)
      })

      it('proposal creation should initiate a Proposal Snapshot creation', async () => {
        expect(await governor.proposalSnapshot(proposalId)).equal(proposalSnapshot)
      })

      it('the rest of the holders should not be able to create proposal', async () => {
        await Promise.all(
          holders.slice(1).map(async holder => {
            const tx = governor.connect(holder).propose(...proposal, defaultDescription)
            await expect(tx).to.be.revertedWithCustomError(
              { interface: governor.interface },
              'GovernorInsufficientProposerVotes',
            )
          }),
        )
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

        const tx2 = await governor.connect(holders[2]).castVote(proposalId, 0)
        tx2.wait()
        const hasVoted2 = await governor.hasVoted(proposalId, holders[2])
        expect(hasVoted2).to.be.true
        const { againstVotes } = await governor.proposalVotes(proposalId)
        expect(againstVotes).to.be.equal(await stRIF.getVotes(holders[2]))
      })

      it('the same holder should not be able to cast the vote for the same proposal', async () => {
        const govInterface = { interface: governor.interface }

        expect(governor.connect(holders[1]).castVote(proposalId, 2)).to.be.revertedWithCustomError(
          govInterface,
          'GovernorAlreadyCastVote',
        )
        expect(governor.connect(holders[2]).castVote(proposalId, 2)).to.be.revertedWithCustomError(
          govInterface,
          'GovernorAlreadyCastVote',
        )
      })

      it('the proposal should not be executed if there is not enough votes', async () => {
        expect(governor.connect(holders[2])['execute(uint256)'](proposalId)).to.be.revertedWithCustomError(
          { interface: governor.interface },
          'GovernorUnexpectedProposalState',
        )
      })

      it('should set the state of the proposal to Defeated when the votingPeriod finished but quorum has not been reached', async () => {
        await mine(512)
        const state = await getState()

        expect(state).to.equal(ProposalState.Defeated)
      })

      it('when proposal reaches quorum and votingPeriod is reached proposal state should become ProposalState.Succeeded', async () => {
        await createProposal(otherDesc)

        await mine((await governor.votingDelay()) + 1n)

        proposalSnapshot = await governor.proposalSnapshot(proposalId)
        const quorum = await governor.quorum(proposalSnapshot)

        for (const holder of holders.slice(2, holders.length)) {
          if ((await checkVotes()) <= quorum) {
            await governor.connect(holder).castVote(proposalId, 1)
          }
        }

        await mine(initialVotingPeriod + 1n)

        expect(await getState()).to.be.equal(ProposalState.Succeeded)
      })
    })

    describe('Queueing the Proposal', () => {
      let eta: bigint = 0n
      let timelockPropId: string
      /* 
      https://docs.openzeppelin.com/contracts/5.x/api/governance#IGovernor-queue-address---uint256---bytes---bytes32-
      Queue a proposal. Some governors require this step to be performed before execution
      can happen. If queuing is not necessary, this function may revert. Queuing a proposal
      requires the quorum to be reached, the vote to be successful, and the deadline to be reached.
      */
      it('proposal should need queueing before execution', async () => {
        expect(await governor.proposalNeedsQueuing(proposalId)).to.be.true
      })
      it('proposer should put the proposal to the execution queue', async () => {
        const minDelay = await timelock.getMinDelay()
        const lastBlockTimestamp = await time.latest()
        // Estimated Time of Arrival
        eta = BigInt(lastBlockTimestamp) + minDelay + 1n
        const from = await time.latestBlock()
        const tx = await governor['queue(uint256)'](proposalId)
        //event ProposalQueued(uint256 proposalId, uint256 etaSeconds)
        await expect(tx).to.emit(governor, 'ProposalQueued').withArgs(proposalId, eta)
        await tx.wait()

        /* 
        There is a second event emitted by the same tx: it is Timelock's `CallScheduled`.

        event CallScheduled(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes data, bytes32 predecessor, uint256 delay)

        Let's take a look at its arguments. We are going to extract Timelock proposal ID
        which differs from Governor's proposal ID. Knowing this ID we can query some info
        from the Timelock directly
        */

        const latestBlock = await time.latestBlock()
        const filter =
          timelock.filters['CallScheduled(bytes32,uint256,address,uint256,bytes,bytes32,uint256)']
        const [event] = await timelock.queryFilter(filter, from, latestBlock)
        const [id, , target, value, data, , delay] = event.args
        timelockPropId = id // save timelock proposal ID
        expect(target).to.equal(proposal[0][0])
        expect(value).to.equal(proposal[1][0])
        expect(data).to.equal(proposal[2][0])
        expect(delay).to.equal(minDelay) // 86400
      })

      it('proposal should be in the Timelock`s OperationState.Waiting state after queueing', async () => {
        const timelockState = await timelock.getOperationState(timelockPropId)
        expect(timelockState).to.equal(OperationState.Waiting)
      })
      it('proposal should be in the Governor`s ProposalState.Queued state after queueing', async () => {
        expect(await governor.state(proposalId)).to.equal(ProposalState.Queued)
      })

      it('proposal ETA (Estimated Time of Arrival) should be recorded on the governor', async () => {
        expect(await governor.proposalEta(proposalId)).to.equal(eta)
      })

      it('should increase blockchain node time to proposal ETA', async () => {
        await time.increaseTo(eta)
        const block = await ethers.provider.getBlock('latest')
        expect(block?.timestamp).to.equal(eta)
      })

      it('proposal should move to the OperationState.Ready state on the Timelock', async () => {
        const timelockState = await timelock.getOperationState(timelockPropId)
        expect(timelockState).to.equal(OperationState.Ready)
        // the same info
        expect(await timelock.isOperationReady(timelockPropId)).to.be.true
      })

      it('should execute proposal on the Governor after the ETA', async () => {
        const tx = await governor['execute(address[],uint256[],bytes[],bytes32)'](
          ...proposal,
          generateDescriptionHash(otherDesc),
        )
        await expect(tx).to.emit(governor, 'ProposalExecuted').withArgs(proposalId)
      })

      it('proposal should move to Executed state after execution', async () => {
        const state = await governor.state(proposalId)
        expect(state).to.equal(ProposalState.Executed)
      })
    })
  })
})
