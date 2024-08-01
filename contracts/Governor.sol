// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {GovernorUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/GovernorUpgradeable.sol";
import {GovernorSettingsUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorSettingsUpgradeable.sol";
import {GovernorCountingSimpleUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorCountingSimpleUpgradeable.sol";
import {GovernorStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorStorageUpgradeable.sol";
import {GovernorVotesUpgradeable, IVotes} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorVotesUpgradeable.sol";
import {GovernorVotesQuorumFractionUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorVotesQuorumFractionUpgradeable.sol";
import {GovernorTimelockControlUpgradeable, TimelockControllerUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorTimelockControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract RootDao is
  Initializable,
  GovernorUpgradeable,
  GovernorSettingsUpgradeable,
  GovernorCountingSimpleUpgradeable,
  GovernorStorageUpgradeable,
  GovernorVotesUpgradeable,
  GovernorVotesQuorumFractionUpgradeable,
  GovernorTimelockControlUpgradeable,
  OwnableUpgradeable,
  UUPSUpgradeable
{
  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  /**
   * @dev Initializes the contract.
   * @param voteToken The address of the vote token contract.
   * @param timelockController The address of the timelock controller contract.
   * @param initialOwner The address of the initial owner.
   */
  function initialize(
    IVotes voteToken,
    TimelockControllerUpgradeable timelockController,
    address initialOwner
  ) public initializer {
    __Governor_init("RootDao");
    __GovernorSettings_init(1 /* 1 block */, 240 /* 2 hours */, 10 * 10 ** 18);
    __GovernorCountingSimple_init();
    __GovernorStorage_init();
    __GovernorVotes_init(voteToken);
    __GovernorVotesQuorumFraction_init(4);
    __GovernorTimelockControl_init(timelockController);
    __Ownable_init(initialOwner);
    __UUPSUpgradeable_init();
  }

  // The following functions are overrides required by Solidity.

  /**
   * @dev Returns the voting delay.
   * @return The voting delay.
   */
  function votingDelay()
    public
    view
    override(GovernorUpgradeable, GovernorSettingsUpgradeable)
    returns (uint256)
  {
    return super.votingDelay();
  }

  /**
   * @dev Returns the voting period.
   * @return The voting period.
   */
  function votingPeriod()
    public
    view
    override(GovernorUpgradeable, GovernorSettingsUpgradeable)
    returns (uint256)
  {
    return super.votingPeriod();
  }

  /**
   * @dev Returns the quorum for a given block number.
   * @param blockNumber The block number.
   * @return The quorum.
   */
  function quorum(uint256 blockNumber)
    public
    view
    override(GovernorUpgradeable, GovernorVotesQuorumFractionUpgradeable)
    returns (uint256)
  {
    return super.quorum(blockNumber);
  }

  /**
   * @dev Returns the state of a proposal.
   * @param proposalId The ID of the proposal.
   * @return The state of the proposal.
   */
  function state(uint256 proposalId)
    public
    view
    override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
    returns (ProposalState)
  {
    return super.state(proposalId);
  }

  /**
   * @dev Checks if a proposal needs queuing.
   * @param proposalId The ID of the proposal.
   * @return True if the proposal needs queuing, false otherwise.
   */
  function proposalNeedsQueuing(uint256 proposalId)
    public
    view
    override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
    returns (bool)
  {
    return super.proposalNeedsQueuing(proposalId);
  }

  /**
   * @dev Returns the proposal threshold.
   * @return The proposal threshold.
   */
  function proposalThreshold()
    public
    view
    override(GovernorUpgradeable, GovernorSettingsUpgradeable)
    returns (uint256)
  {
    return super.proposalThreshold();
  }

  /**
   * @dev Returns the votes for a proposal.
   * @param proposalId The ID of the proposal.
   * @return againstVotes forVotes abstainVotes proposalState The votes against, votes for, abstain votes, and proposal state.
   */
  function getStateAndVotes(uint256 proposalId)
    public
    view
    returns (
      uint256 againstVotes,
      uint256 forVotes,
      uint256 abstainVotes,
      ProposalState proposalState
    )
  {
    (uint256 minus, uint256 plus, uint256 neutral) = super.proposalVotes(proposalId);
    ProposalState _state = super.state(proposalId);

    return (minus, plus, neutral, _state);
  }

  // /**
  //  * @dev Returns the votes for an account at a given timepoint.
  //  * @param account The address of the account.
  //  * @param timepoint The timepoint.
  //  * @return The votes.
  //  */
  // function getVotes(address account, uint256 timepoint) override public view virtual returns (uint256) {
  //   int48 sevenDays = _sevenDaysInTermsOfBlocks();
  //   uint48 _timepoint = sevenDays <= 0 ? 0 : uint48(sevenDays);

  //   return
  //     _getVotes(account, timepoint > _timepoint ? _timepoint : timepoint, _defaultParams());
  // }
  
  // /**
  //  * @dev Validates the state bitmap for a given proposal.
  //  * @param proposalId The ID of the proposal.
  //  * @param allowedStates The allowed states bitmap.
  //  * @return The current state of the proposal.
  //  */
  // function validateStateBitmap(uint256 proposalId, bytes32 allowedStates)
  //   private
  //   view
  //   returns (ProposalState)
  // {
  //   ProposalState currentState = state(proposalId);
  //   if (_encodeStateBitmap(currentState) & allowedStates == bytes32(0)) {
  //     revert GovernorUnexpectedProposalState(proposalId, currentState, allowedStates);
  //   }
  //   return currentState;
  // }

  /**
   * @dev Proposes a new action.
   * @param targets The addresses of the targets.
   * @param values The values to send.
   * @param calldatas The calldatas.
   * @param description The description of the proposal.
   * @param proposer The address of the proposer.
   * @return The ID of the proposal.
   */
  function _propose(
    address[] memory targets,
    uint256[] memory values,
    bytes[] memory calldatas,
    string memory description,
    address proposer
  ) internal override(GovernorUpgradeable, GovernorStorageUpgradeable) returns (uint256) {
    return super._propose(targets, values, calldatas, description, proposer);
  }

  /**
   * @dev Queues the operations of a proposal.
   * @param proposalId The ID of the proposal.
   * @param targets The addresses of the targets.
   * @param values The values to send.
   * @param calldatas The calldatas.
   * @param descriptionHash The hash of the description.
   * @return The timepoint of the queue.
   */
  function _queueOperations(
    uint256 proposalId,
    address[] memory targets,
    uint256[] memory values,
    bytes[] memory calldatas,
    bytes32 descriptionHash
  ) internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) returns (uint48) {
    return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
  }

  /**
   * @dev Executes the operations of a proposal.
   * @param proposalId The ID of the proposal.
   * @param targets The addresses of the targets.
   * @param values The values to send.
   * @param calldatas The calldatas.
   * @param descriptionHash The hash of the description.
   */
  function _executeOperations(
    uint256 proposalId,
    address[] memory targets,
    uint256[] memory values,
    bytes[] memory calldatas,
    bytes32 descriptionHash
  ) internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) {
    super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
  }

  /**
   * @dev Cancels a proposal.
   * @param targets The addresses of the targets.
   * @param values The values to send.
   * @param calldatas The calldatas.
   * @param descriptionHash The hash of the description.
   * @return The ID of the proposal.
   */
  function _cancel(
    address[] memory targets,
    uint256[] memory values,
    bytes[] memory calldatas,
    bytes32 descriptionHash
  ) internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) returns (uint256) {
    return super._cancel(targets, values, calldatas, descriptionHash);
  }

  /**
   * @dev Returns the executor.
   * @return The executor.
   */
  function _executor()
    internal
    view
    override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
    returns (address)
  {
    return super._executor();
  }

  // /**
  //  * @dev Casts a vote for a proposal.
  //  * @param proposalId The ID of the proposal.
  //  * @param account The address of the account.
  //  * @param support The support value.
  //  * @param reason The reason for the vote.
  //  * @param params The vote parameters.
  //  * @return The weight of the vote.
  //  */
  // function _castVote(
  //   uint256 proposalId,
  //   address account,
  //   uint8 support,
  //   string memory reason,
  //   bytes memory params
  // ) override internal virtual returns (uint256) {
  //   validateStateBitmap(proposalId, _encodeStateBitmap(ProposalState.Active));

  //   int48 sevenDays = _sevenDaysInTermsOfBlocks();
  //   uint256 timepoint = sevenDays <= 0 ? 0 : uint48(sevenDays);

  //   uint256 weight = _getVotes(account, timepoint, params);
  //   _countVote(proposalId, account, support, weight, params);

  //   if (params.length == 0) {
  //     emit VoteCast(account, proposalId, support, weight, reason);
  //   } else {
  //     emit VoteCastWithParams(account, proposalId, support, weight, reason, params);
  //   }

  //   return weight;
  // }

  // /**
  //  * @dev Returns the number of blocks in seven days.
  //  * @return The number of blocks.
  //  */
  // function _sevenDaysInTermsOfBlocks() internal view returns (int48) {
  //   return int48(clock()) - 20160;
  // }

  /**
   * @dev Authorizes the upgrade to a new implementation contract.
   * @param newImplementation The address of the new implementation contract.
   */
  function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
