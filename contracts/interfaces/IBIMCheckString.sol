// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

interface IBIMCheckString {
  function canWithdraw(address targetAddress) external view returns (string memory);
}
