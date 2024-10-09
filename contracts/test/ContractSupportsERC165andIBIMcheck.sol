// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "hardhat/console.sol";

import {IBIMCheck} from "../interfaces/IBIMCheck.sol";

contract ContractSupportsERC165andIBIMcheck is IERC165, IBIMCheck {
  address public blockedAddress;

  constructor(address _blockedAddress) {
    blockedAddress = _blockedAddress;
  }

  function setBlockedAddress(address _blockedAddress) external {
    blockedAddress = _blockedAddress;
  }

  function canWithdraw(address target) external view returns (bool) {
    if (target == blockedAddress) {
      console.log("THIS ADDRESS IS BLOCKED", target);
      return false;
    } else {
      return true;
    }
  }

  function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
    return interfaceId == type(IERC165).interfaceId || interfaceId == type(IBIMCheck).interfaceId;
  }
}
