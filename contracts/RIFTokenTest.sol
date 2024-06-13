// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.4.24;

import "rif-token-contracts/contracts/RIF/RIFToken.sol";
// File must exist, else test/RIFTokenTest.ts will fail
contract RIFTokenTest is RIFToken {
    constructor () RIFToken () {

    }
}
