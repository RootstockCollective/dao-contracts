import { expect } from 'chai'
import { ethers } from 'hardhat'
import { loadFixture, mine, time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { RIFToken, RootDao, StRIFToken, DaoTimelockUpgradable } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { parseEther, solidityPackedKeccak256 } from 'ethers'
import { Proposal, ProposalState, OperationState } from '../types'
import { deployContracts } from './deployContracts'

describe('RootDAO Contact', () => {
  const initialVotingDelay = 1n
  const initialVotingPeriod = 240n // 2 hours
  const initialProposalThreshold = 10n * 10n ** 18n
  const sevenDays = 20160
  const dispenseValue = parseEther('10')

  let rif: RIFToken
  let rifAddress: string
  let stRIF: StRIFToken
  let timelock: DaoTimelockUpgradable
  let governor: RootDao
  let holders: SignerWithAddress[]

  before(async () => {
    // prettier-ignore
    ;[, ...holders] = await ethers.getSigners();
    ;({ rif, stRIF, timelock, governor } = await loadFixture(deployContracts))
    rifAddress = await rif.getAddress()
  })

  describe('Upon deployment', () => {
    it('should deploy all contracts', async () => {
      expect(rifAddress).to.be.properAddress
      expect(await stRIF.getAddress()).to.be.properAddress
      expect(await timelock.getAddress()).to.be.properAddress
      expect(await governor.getAddress()).to.be.properAddress
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
    const sendAmount = parseEther('2')
    let proposal: Proposal
    let proposalId: bigint
    let proposalSnapshot: bigint
    // let proposalCalldata: string

    const getState = async () => await governor.state(proposalId)
    const insufficientVotes = 'GovernorInsufficientProposerVotes'

    const defaultDescription = 'transfer money to acc2 address'
    const otherDesc = 'test success case'
    const generateDescriptionHash = (proposalDesc?: string) =>
      solidityPackedKeccak256(['string'], [proposalDesc ?? defaultDescription])

    const createProposal = async (proposalDesc = defaultDescription) => {
      const blockHeight = await ethers.provider.getBlockNumber()
      const votingDelay = await governor.votingDelay()

      const calldata = stRIF.interface.encodeFunctionData('symbol')
      proposal = [[await stRIF.getAddress()], [0n], [calldata]]

      proposalId = await governor
        .connect(holders[0])
        .hashProposal(...proposal, generateDescriptionHash(proposalDesc))

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
            const dispenseTx = await rif.transfer(voter.address, dispenseValue)
            await dispenseTx.wait()
            const rifBalance = await rif.balanceOf(voter.address)
            const votingPower = i === 0 ? rifBalance : rifBalance - sendAmount

            const approvalTx = await rif.connect(voter).approve(await stRIF.getAddress(), votingPower)
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

      it('governor should only count voting power at seven days ago', async () => {
        for (let i = 0; i < holders.length; i++) {
          const balance = await stRIF.balanceOf(holders[i])
          const votingPower = await governor.getVotes(holders[i], await ethers.provider.getBlockNumber())
          expect(balance).to.equal(i === 0 ? dispenseValue : dispenseValue - sendAmount)
          expect(votingPower).to.equal(0n)
        }

        await mine(sevenDays + 1)

        for (let i = 0; i < holders.length; i++) {
          const votingPowerAfter = await governor.getVotes(holders[i], await ethers.provider.getBlockNumber())
          expect(votingPowerAfter).to.equal(i === 0 ? dispenseValue : dispenseValue - sendAmount)
        }
      })

      it('holder[0] should have enough voting power to initiate a proposal (above the Proposal Threshold)', async () => {
        const votes = await governor.getVotes(holders[0], await ethers.provider.getBlockNumber())
        const threshold = await governor.proposalThreshold()
        expect(votes).greaterThanOrEqual(threshold)
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
              insufficientVotes,
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

      it('remaining votes should be equal to quorum, because no votes were cast yet', async () => {
        const { abstainVotes, forVotes } = await governor.proposalVotes(proposalId)
        const quorum = await governor.quorum(proposalSnapshot)
        const totalVotes = forVotes + abstainVotes
        const remainingVotes = quorum - totalVotes
        expect(remainingVotes).equal(quorum)
      })

      it('even if other holder add more stRIF they should not be able to create a proposal', async () => {
        const address = holders[1].address
        const blockNumber = await ethers.provider.getBlockNumber()
        const balanceBefore = await stRIF.balanceOf(address)
        const votesBefore = await governor.getVotes(address, blockNumber)

        const dispenseTx = await rif.transfer(address, dispenseValue)
        await dispenseTx.wait()
        const approvalTx = await rif.connect(holders[1]).approve(await stRIF.getAddress(), dispenseValue)
        await approvalTx.wait()
        const depositForTx = await stRIF
          .connect(holders[1])
          .depositAndDelegate(holders[1].address, dispenseValue)
        await depositForTx.wait()
        const balance = await stRIF.balanceOf(holders[1].address)
        expect(balance).to.equal(balanceBefore + dispenseValue)

        await mine(1)

        const currentVotes = await governor.getVotes(
          holders[1].address,
          await ethers.provider.getBlockNumber(),
        )
        expect(currentVotes).to.equal(votesBefore)

        const stRIFBalance = await stRIF.balanceOf(address)
        expect(stRIFBalance).to.be.greaterThan(await governor.proposalThreshold())

        const proposalTx = await createProposal('DO SOMETHING QUICK')
        expect(proposalTx).to.be.revertedWithCustomError({ interface: governor.interface }, insufficientVotes)
      })
    })

    describe('Voting', () => {
      it('voting power of holders should be locked at seven days ago', async () => {
        const address = holders[0].address
        const votesAtTheProposalSnapshot = await governor.getVotes(address, proposalSnapshot)

        const dispenseTx = await rif.transfer(address, dispenseValue)
        await dispenseTx.wait()
        const currentBalance = await rif.balanceOf(address)
        expect(currentBalance).to.equal(dispenseValue)

        const approvalTx = await rif.connect(holders[0]).approve(await stRIF.getAddress(), currentBalance)
        await approvalTx.wait()
        const depositTx = await stRIF.connect(holders[0]).depositAndDelegate(holders[0], currentBalance)
        await depositTx.wait()
        await mine(2)

        const currentVotes = await stRIF.getPastVotes(
          holders[0].address,
          (await ethers.provider.getBlockNumber()) - 1,
        )

        expect(currentVotes).to.equal(dispenseValue * 2n)

        // cast Abstain Vote
        const tx = await governor.connect(holders[0]).castVote(proposalId, 2)
        await tx.wait()

        const { abstainVotes } = await governor.proposalVotes(proposalId)

        expect(abstainVotes).to.be.equal(votesAtTheProposalSnapshot)
      })

      it('holders should be able to cast vote', async () => {
        // cast FOR vote, system: 0 = Against, 1 = For, 2 = Abstain
        const tx = await governor.connect(holders[1]).castVote(proposalId, 1)
        await tx.wait()
        const hasVoted = await governor.hasVoted(proposalId, holders[1])
        expect(hasVoted).to.be.true
        const { forVotes } = await governor.proposalVotes(proposalId)
        expect(forVotes).to.be.equal(
          await governor.getVotes(holders[1].address, await ethers.provider.getBlockNumber()),
        )

        const tx2 = await governor.connect(holders[2]).castVote(proposalId, 0)
        tx2.wait()
        const hasVoted2 = await governor.hasVoted(proposalId, holders[2])
        expect(hasVoted2).to.be.true
        const { againstVotes } = await governor.proposalVotes(proposalId)
        expect(againstVotes).to.be.equal(
          await governor.getVotes(holders[2].address, await ethers.provider.getBlockNumber()),
        )
      })

      it('what happens when after voting holder burns tokens', async () => {
        const value = parseEther('5')
        const votesBefore = await governor.proposalVotes(proposalId)

        const tx = await stRIF.connect(holders[1]).withdrawTo(holders[1], value)
        await tx.wait()

        expect(tx).to.changeEtherBalance(holders[1], value)

        const votesAfter = await governor.proposalVotes(proposalId)

        expect(votesBefore[0]).to.be.equal(votesAfter[0])
        expect(votesBefore[1]).to.be.equal(votesAfter[1])
        expect(votesBefore[2]).to.be.equal(votesAfter[2])
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
        await mine(initialVotingPeriod + 1n)
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
        const fromBlock = await time.latestBlock()
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

        const toBlock = await time.latestBlock()
        const filter =
          timelock.filters['CallScheduled(bytes32,uint256,address,uint256,bytes,bytes32,uint256)']
        const [event] = await timelock.queryFilter(filter, fromBlock, toBlock)
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

    describe('Governor Utils', () => {
      it('should return governor votes and state in getStateAndVotes function', async () => {
        const typeBigint = typeof 0n
        const { againstVotes, abstainVotes, forVotes, proposalState } =
          await governor.getStateAndVotes(proposalId)

        expect(typeof againstVotes).to.equal(typeBigint)
        expect(typeof abstainVotes).to.equal(typeBigint)
        expect(typeof forVotes).to.equal(typeBigint)
        expect(Number(proposalState.toString())).to.be.oneOf([
          ProposalState.Active,
          ProposalState.Canceled,
          ProposalState.Defeated,
          ProposalState.Executed,
          ProposalState.Expired,
          ProposalState.Pending,
          ProposalState.Queued,
          ProposalState.Succeeded,
        ])
      })
    })
  })
})
