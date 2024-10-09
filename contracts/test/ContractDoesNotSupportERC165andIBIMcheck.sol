// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

contract ContractDoesNotSupportERC165andIBIMcheck {
  constructor() {}

  function foo() internal pure returns (string memory) {
    return "foo";
  }
}
