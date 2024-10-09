// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/interfaces/IERC165.sol";

import {IBIMCheckString} from "../interfaces/IBIMCheckString.sol";

contract ContractSupportsButWrongReturn is IERC165, IBIMCheckString {
  address public blockedAddress;

  constructor(address _blockedAddress) {
    blockedAddress = _blockedAddress;
  }

  function setBlockedAddress(address _blockedAddress) external {
    blockedAddress = _blockedAddress;
  }

  function canWithdraw(address target) external view returns (string memory) {
    if (target == blockedAddress) {
      return "not allowed";
    } else {
      return "allowed";
    }
  }

  function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
    return interfaceId == type(IERC165).interfaceId || interfaceId == type(IBIMCheckString).interfaceId;
  }
}
