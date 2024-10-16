// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

interface IBIMCheck {
  function canWithdraw(address targetAddress, uint256 value) external view returns (bool);
}
