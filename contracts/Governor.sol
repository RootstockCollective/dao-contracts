// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/governance/GovernorUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorSettingsUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorCountingSimpleUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorVotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorVotesQuorumFractionUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorTimelockControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

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

  function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

  // this is for _castVote finction to work and follow original _castVote function
  function validateStateBitmap(uint256 proposalId, bytes32 allowedStates) private view returns (ProposalState) {
      ProposalState currentState = state(proposalId);
      if (_encodeStateBitmap(currentState) & allowedStates == bytes32(0)) {
          revert GovernorUnexpectedProposalState(proposalId, currentState, allowedStates);
      }
      return currentState;
  }

  // The following functions are overrides required by Solidity.

  function votingDelay()
    public
    view
    override(GovernorUpgradeable, GovernorSettingsUpgradeable)
    returns (uint256)
  {
    return super.votingDelay();
  }

  function votingPeriod()
    public
    view
    override(GovernorUpgradeable, GovernorSettingsUpgradeable)
    returns (uint256)
  {
    return super.votingPeriod();
  }

  function quorum(
    uint256 blockNumber
  ) public view override(GovernorUpgradeable, GovernorVotesQuorumFractionUpgradeable) returns (uint256) {
    return super.quorum(blockNumber);
  }

  function state(
    uint256 proposalId
  ) public view override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) returns (ProposalState) {
    return super.state(proposalId);
  }

  function proposalNeedsQueuing(
    uint256 proposalId
  ) public view override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) returns (bool) {
    return super.proposalNeedsQueuing(proposalId);
  }

  function proposalThreshold()
    public
    view
    override(GovernorUpgradeable, GovernorSettingsUpgradeable)
    returns (uint256)
  {
    return super.proposalThreshold();
  }

  function _propose(
    address[] memory targets,
    uint256[] memory values,
    bytes[] memory calldatas,
    string memory description,
    address proposer
  ) internal override(GovernorUpgradeable, GovernorStorageUpgradeable) returns (uint256) {
    return super._propose(targets, values, calldatas, description, proposer);
  }

  function _queueOperations(
    uint256 proposalId,
    address[] memory targets,
    uint256[] memory values,
    bytes[] memory calldatas,
    bytes32 descriptionHash
  ) internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) returns (uint48) {
    return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
  }

  function _executeOperations(
    uint256 proposalId,
    address[] memory targets,
    uint256[] memory values,
    bytes[] memory calldatas,
    bytes32 descriptionHash
  ) internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) {
    super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
  }

  function _cancel(
    address[] memory targets,
    uint256[] memory values,
    bytes[] memory calldatas,
    bytes32 descriptionHash
  ) internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) returns (uint256) {
    return super._cancel(targets, values, calldatas, descriptionHash);
  }

  function _executor()
    internal
    view
    override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
    returns (address)
  {
    return super._executor();
  }

  function getVotes(address account, uint256 timepoint) override public view virtual returns (uint256) {
      int48 sevenDays = int48(clock()) - 20160;
      uint48 _timepoint = sevenDays <= 0 ? 0 : uint48(sevenDays);

      return _getVotes(
          account, 
          timepoint > _timepoint ? _timepoint : timepoint, 
          _defaultParams()
      );
  }

  function _castVote(
      uint256 proposalId,
      address account,
      uint8 support,
      string memory reason,
      bytes memory params
  ) override internal virtual returns (uint256) {
      validateStateBitmap(proposalId, _encodeStateBitmap(ProposalState.Active));

      int48 sevenDays = int48(clock()) - 20160;
      uint256 timepoint = sevenDays <= 0 ? 0 : uint48(sevenDays);

      uint256 weight = _getVotes(account, timepoint, params);
      _countVote(proposalId, account, support, weight, params);

      if (params.length == 0) {
          emit VoteCast(account, proposalId, support, weight, reason);
      } else {
          emit VoteCastWithParams(account, proposalId, support, weight, reason, params);
      }

      return weight;
  }

  function getStateAndVotes (uint256 proposalId) 
    public 
    view 
    returns(uint256 againstVotes, uint256 forVotes, uint256 abstainVotes, ProposalState proposalState) {
      (uint256 minus, uint256 plus, uint256 neutral) = super.proposalVotes(proposalId);
      ProposalState _state = super.state(proposalId);

      return (minus, plus, neutral, _state);
  }
}
