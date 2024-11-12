// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/interfaces/IERC165.sol";

contract ContractDoesNotSupportICollectiveRewardsCheck is IERC165 {
  constructor() {}

  function foo() internal pure returns (string memory) {
    return "foo";
  }

  function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
    return interfaceId == type(IERC165).interfaceId;
  }
}
