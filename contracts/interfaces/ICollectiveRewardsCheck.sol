// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

interface ICollectiveRewardsCheck {
  function canWithdraw(address targetAddress, uint256 value) external view returns (bool);
}
