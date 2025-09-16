// SPDX-License-Identifier: MIT

pragma solidity ^0.4.24;

import {RIFToken as RIF} from "rif-token-contracts/contracts/RIF/RIFToken.sol";

/**
 * @dev RIF token original implementation for testing its wrapping with StRIF
 */
contract RIFToken is RIF {
  constructor() public RIF() {}
}
