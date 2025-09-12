import { task } from 'hardhat/config'
import { resolve } from 'path'
import { readJSON } from 'fs-extra'
import { ProposalState } from '../types/index.js'
import { isAddress, type Signer } from 'ethers'
import { GovernorRootstockCollective } from '../types/ethers-contracts/index.js'
import { ArgumentType } from 'hardhat/types/arguments'

const paramsFilename = 'cancel-proposal.json'

interface JsonParams {
  proposalId?: string
  governorAddress?: string
}

/**
 * Validates and returns a trimmed Governor address string.
 * Throws an error if the address is missing or invalid.
 */
async function validateGovernorAddress(governorAddress?: string): Promise<string> {
  if (!governorAddress) {
    throw new Error('Governor address is missing')
  }

  const trimmedAddress = governorAddress.trim()

  if (!isAddress(trimmedAddress)) {
    throw new Error('Governor address is not valid')
  }

  return trimmedAddress
}

/**
 * Parses and returns the Proposal ID as a bigint.
 * Throws an error if the Proposal ID is missing or cannot be converted to a bigint.
 */
function parseProposalId(proposalIdRaw?: string): bigint {
  if (!proposalIdRaw) {
    throw new Error('Proposal ID is missing')
  }

  try {
    return BigInt(proposalIdRaw.trim())
  } catch {
    throw new Error('Proposal ID is not a valid bigint')
  }
}

/**
 * Validates that the proposal is in a state that allows cancellation.
 * Throws an error if the proposal is not in a valid state.
 */
async function validateProposalState(
  governor: GovernorRootstockCollective,
  proposalId: bigint,
): Promise<void> {
  const allowedStates: ProposalState[] = [
    ProposalState.Pending,
    ProposalState.Active,
    ProposalState.Succeeded,
    ProposalState.Queued,
  ]

  const state = Number(await governor.state(proposalId))
  if (!allowedStates.includes(state)) {
    const stateStr = ProposalState[state] || 'Unknown'
    throw new Error(`Illegal proposal state (${stateStr})`)
  }
}

/**
 * Validates that the caller has the necessary rights (is the Guardian) to cancel the proposal.
 * Throws an error if the caller is not the Guardian.
 */
async function validateGuardianRights(
  ethers: { getSigners: () => Promise<Signer[]> },
  governor: GovernorRootstockCollective,
): Promise<void> {
  const [signer] = await ethers.getSigners()
  const guardian = await governor.guardian()

  if ((await signer.getAddress()) !== guardian) {
    throw new Error('You are not the Guardian and not allowed to cancel proposals')
  }
}

/**
 * Validates all parameters required to cancel a proposal.
 * Ensures the Governor address is valid, the proposal ID is correct, and the caller is authorized.
 * Returns the validated Governor contract and proposal ID.
 */
async function validateParams(
  ethers: {
    getSigners: () => Promise<Signer[]>
    getContractAt: (name: string, address: string) => Promise<unknown>
  },
  governorAddress?: string,
  proposalIdRaw?: string,
): Promise<{ governor: GovernorRootstockCollective; proposalId: bigint }> {
  const validatedGovernorAddress = await validateGovernorAddress(governorAddress)

  const proposalId = parseProposalId(proposalIdRaw)
  const governor = (await ethers.getContractAt(
    'GovernorRootstockCollective',
    validatedGovernorAddress,
  )) as GovernorRootstockCollective

  await validateProposalState(governor, proposalId)

  await validateGuardianRights(ethers, governor)

  return { governor, proposalId }
}

/**
 * Cancels the proposal with the given ID on the specified Governor contract.
 * Waits for the transaction to be confirmed and logs the new state of the proposal.
 */
async function cancelProposal(governor: GovernorRootstockCollective, proposalId: bigint) {
  const tx = await governor['cancel(uint256)'](proposalId)
  await tx.wait()

  const state = Number(await governor.state(proposalId))
  const stateStr = ProposalState[state] || 'Unknown'

  console.info(
    `You have successfully cancelled proposal #${String(proposalId).slice(0, 6)}... Now the proposal is in the "${stateStr}" state`,
  )
}

/**
 * Defines a Hardhat task to cancel a proposal by its ID.
 * Validates inputs, reads parameters from a file if necessary, and performs the cancellation.
 */
task('cancel-proposal', 'Guardian can cancel a proposal by ID')
  .addOption({
    name: 'governor',
    description: 'Deployed Governor address',
    defaultValue: '',
    type: ArgumentType.STRING,
  })
  .addOption({
    name: 'id',
    description: 'Proposal ID to cancel',
    defaultValue: '',
    type: ArgumentType.STRING,
  })
  .setAction(async () => ({
    default: async ({ governor, id }, hre) => {
      try {
        const jsonFile = resolve('.', 'tasks', paramsFilename)
        let jsonParams: JsonParams = {}

        try {
          jsonParams = await readJSON(jsonFile)
        } catch (error) {
          console.error(error instanceof Error ? error.message : error)
        }

        const governorAddress = governor || jsonParams.governorAddress
        const proposalIdRaw = id || jsonParams.proposalId

        const { ethers } = await hre.network.connect()
        const { governor: governorContract, proposalId } = await validateParams(
          ethers,
          governorAddress,
          proposalIdRaw,
        )
        await cancelProposal(governorContract, proposalId)
      } catch (error) {
        console.error(`Error running the task: `, error instanceof Error ? error.message : error)
      }
    },
  }))
