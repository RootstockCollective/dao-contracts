// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC1967Proxy as OZProxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @dev Simple wrapper around OpenZeppelin's ERC1967Proxy for Hardhat artifacts
 */
contract ERC1967Proxy is OZProxy {
  constructor(address _logic, bytes memory _data) OZProxy(_logic, _data) {}
}
