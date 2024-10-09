// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

interface IBIMCheck {
  function canWithdraw(address targetAddress) external view returns (bool);
}
