import { BigNumberish, BytesLike } from 'ethers'

export enum ProposalState {
  Pending,
  Active,
  Canceled,
  Defeated,
  Succeeded,
  Queued,
  Expired,
  Executed,
}

export enum VoteType {
  Against,
  For,
  Abstain,
}

export type Proposal = [string[], BigNumberish[], BytesLike[]]

export enum OperationState {
  Unset,
  Waiting,
  Ready,
  Done,
}
