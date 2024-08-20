// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

/**
 * @dev A test smart contract intended to be a proposal target for the Governor in tests
 */
contract ProposalTarget {
  event Executed(address sender);

  function logExecutor() public {
    emit Executed(msg.sender);
  }
}
