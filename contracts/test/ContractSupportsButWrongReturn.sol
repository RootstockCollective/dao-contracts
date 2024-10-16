// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/interfaces/IERC165.sol";

import {ICollectiveRewardsCheckString} from "../interfaces/ICollectiveRewardsCheckString.sol";

contract ContractSupportsButWrongReturn is IERC165, ICollectiveRewardsCheckString {
  address public blockedAddress;

  constructor(address _blockedAddress) {
    blockedAddress = _blockedAddress;
  }

  function setBlockedAddress(address _blockedAddress) external {
    blockedAddress = _blockedAddress;
  }

  function canWithdraw(address target, uint256 value) external view returns (string memory) {
    if (target == blockedAddress || value < 0) {
      return "not allowed";
    } else {
      return "allowed";
    }
  }

  function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
    return
      interfaceId == type(IERC165).interfaceId ||
      interfaceId == type(ICollectiveRewardsCheckString).interfaceId;
  }
}
