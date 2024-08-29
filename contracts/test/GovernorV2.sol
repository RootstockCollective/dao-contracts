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

contract GovernorV2 is
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
  bytes32 private constant ALL_PROPOSAL_STATES_BITMAP =
    bytes32((2 ** (uint8(type(ProposalState).max) + 1)) - 1);

  // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.Governor")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 private constant GovernorStorageLocation =
    0x7c712897014dbe49c045ef1299aa2d5f9e67e48eea4403efa21f1e0f3ac0cb00;

  // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.GovernorStorage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 private constant GovernorStorageStorageLocation =
    0x7fd223d3380145bd26132714391e777c488a0df7ac2dd4b66419d8549fb3a600;

  /// @notice The actual version of the contract
  uint64 public actualVersion;

  /// @notice The address of the Governor Guardian
  address public guardian;

  /// @notice returns the storage slot for GovernorStorageStorage
  function getGovernorStorageStorage() private pure returns (GovernorStorageStorage storage $) {
    assembly {
      $.slot := GovernorStorageStorageLocation
    }
  }

  /// @notice returns the storage slot for GovernorStorage
  function getGovernorStorage() private pure returns (GovernorStorage storage $) {
    assembly {
      $.slot := GovernorStorageLocation
    }
  }

  modifier onlyGuardian() {
    require(_msgSender() == guardian, "OPERATION NOT PERMITTED!");
    _;
  }

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
    __Governor_init("RootstockCollective");
    __GovernorSettings_init(1 /* 1 block */, 240 /* 2 hours */, 10 * 10 ** 18);
    __GovernorCountingSimple_init();
    __GovernorStorage_init();
    __GovernorVotes_init(voteToken);
    __GovernorVotesQuorumFraction_init(4);
    __GovernorTimelockControl_init(timelockController);
    __Ownable_init(initialOwner);
    __UUPSUpgradeable_init();
    guardian = initialOwner;
    actualVersion = 1;
  }

  /**
   * @dev Initializes the contract.
   */
  function reInitialize(uint64 versionAfterUpgrade) public reinitializer(versionAfterUpgrade) onlyProxy {
    require(
      versionAfterUpgrade > actualVersion,
      "RootstockCollective: given version must be greater than actual version"
    );
    actualVersion = versionAfterUpgrade;
  }

  /// @notice Returns the version of the contract
  function version() public view override returns (string memory) {
    return string(abi.encodePacked(actualVersion));
  }

  /// @notice this will validate the current proposal state against the allowed states
  /// @param proposalId The ID of the proposal.
  /// @param allowedStates The allowed states.
  /// @return The current state of the proposal.
  function validateStateBitmap(
    uint256 proposalId,
    bytes32 allowedStates
  ) private view returns (ProposalState) {
    ProposalState currentState = state(proposalId);
    if (_encodeStateBitmap(currentState) & allowedStates == bytes32(0)) {
      revert GovernorUnexpectedProposalState(proposalId, currentState, allowedStates);
    }
    return currentState;
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
  function quorum(
    uint256 blockNumber
  ) public view override(GovernorUpgradeable, GovernorVotesQuorumFractionUpgradeable) returns (uint256) {
    return super.quorum(blockNumber);
  }

  /**
   * @dev Returns the state of a proposal.
   * @param proposalId The ID of the proposal.
   * @return The state of the proposal.
   */
  function state(
    uint256 proposalId
  ) public view override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) returns (ProposalState) {
    return super.state(proposalId);
  }

  /**
   * @dev Checks if a proposal needs queuing.
   * @param proposalId The ID of the proposal.
   * @return True if the proposal needs queuing, false otherwise.
   */
  function proposalNeedsQueuing(
    uint256 proposalId
  ) public view override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) returns (bool) {
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
  function getStateAndVotes(
    uint256 proposalId
  )
    public
    view
    returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes, ProposalState proposalState)
  {
    (uint256 minus, uint256 plus, uint256 neutral) = super.proposalVotes(proposalId);
    ProposalState _state = super.state(proposalId);

    return (minus, plus, neutral, _state);
  }

  /**
   * @dev ProposalId version of {IGovernor-cancel}.
   */
  function cancel(uint256 proposalId) public override(GovernorStorageUpgradeable) {
    GovernorStorageStorage storage $ = getGovernorStorageStorage();
    ProposalDetails storage details = $._proposalDetails[proposalId];
    cancel(details.targets, details.values, details.calldatas, details.descriptionHash);
  }

  /// @notice this is a custom implementation of the GovernorUpgradeable cancel function
  /// @param targets The addresses of the targets.
  /// @param values The values to send.
  /// @param calldatas The calldatas.
  /// @param descriptionHash The hash of the description.
  /// @return The ID of the proposal.
  function cancel(
    address[] memory targets,
    uint256[] memory values,
    bytes[] memory calldatas,
    bytes32 descriptionHash
  ) public override(GovernorUpgradeable) returns (uint256) {
    // The proposalId will be recomputed in the `_cancel` call further down. However we need the value before we
    // do the internal call, because we need to check the proposal state BEFORE the internal `_cancel` call
    // changes it. The `hashProposal` duplication has a cost that is limited, and that we accept.
    uint256 proposalId = hashProposal(targets, values, calldatas, descriptionHash);

    if (_msgSender() != guardian) {
      // public cancel restrictions (on top of existing _cancel restrictions).
      validateStateBitmap(proposalId, _encodeStateBitmap(ProposalState.Pending));
    }

    if (_msgSender() != guardian && _msgSender() != proposalProposer(proposalId)) {
      revert GovernorOnlyProposer(_msgSender());
    }

    return _cancel(targets, values, calldatas, descriptionHash);
  }

  /**
   * @dev Internal cancel mechanism with minimal restrictions. A proposal can be cancelled in any state other than
   * Canceled, Expired, or Executed. Once cancelled a proposal can't be re-submitted.
   *
   * Emits a {IGovernor-ProposalCanceled} event.
   */
  function _cancel(
    address[] memory targets,
    uint256[] memory values,
    bytes[] memory calldatas,
    bytes32 descriptionHash
  ) internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) returns (uint256) {
    GovernorStorage storage $ = getGovernorStorage();
    uint256 proposalId = hashProposal(targets, values, calldatas, descriptionHash);

    if (_msgSender() != guardian) {
      validateStateBitmap(
        proposalId,
        ALL_PROPOSAL_STATES_BITMAP ^
          _encodeStateBitmap(ProposalState.Canceled) ^
          _encodeStateBitmap(ProposalState.Expired) ^
          _encodeStateBitmap(ProposalState.Executed)
      );
    }

    $._proposals[proposalId].canceled = true;
    emit ProposalCanceled(proposalId);

    return proposalId;
  }

  /// @notice set the guardian address only by the owner
  /// @param _guardian The address of the guardian
  function setGuardian(address _guardian) public onlyOwner {
    guardian = _guardian;
  }

  /**
   * @dev Proposes a new action.
   * @param targets The addresses of the targets.
   * @param values The values to send.
   * @param calldatas The calldatas.
   * @param description The description of the proposal.
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

  /**
   * @dev Authorizes the upgrade to a new implementation contract.
   * @param newImplementation The address of the new implementation contract.
   */
  function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
