// SPDX-License-Identifier: MIT

pragma solidity ^0.8.30;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

abstract contract ERC721NonTransferrable is IERC721 {
    error TransfersDisabled();

    /**
     * @dev This function is overridden to disable transfers.
     */
    function transferFrom(address, address, uint256) public virtual override {
        revert TransfersDisabled();
    }

    /**
     * @dev This function is overridden to disable transfers.
     */
    function approve(address, uint256) public virtual override {
        revert TransfersDisabled();
    }

    /**
     * @dev This function is overridden to disable transfers.
     */
    function setApprovalForAll(address, bool) public virtual override {
        revert TransfersDisabled();
    }
}
