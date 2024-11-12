// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/interfaces/IERC165.sol";

import {ICollectiveRewardsCheck} from "../interfaces/ICollectiveRewardsCheck.sol";

contract ContractSupportsERC165andICollectiveRewardscheck is IERC165, ICollectiveRewardsCheck {
  address public blockedAddress;

  constructor(address _blockedAddress) {
    blockedAddress = _blockedAddress;
  }

  function setBlockedAddress(address _blockedAddress) external {
    blockedAddress = _blockedAddress;
  }

  function canWithdraw(address target, uint256 value) external view returns (bool) {
    if (target == blockedAddress || value < 0) {
      return false;
    } else {
      return true;
    }
  }

  function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
    return
      interfaceId == type(IERC165).interfaceId || interfaceId == type(ICollectiveRewardsCheck).interfaceId;
  }
}
