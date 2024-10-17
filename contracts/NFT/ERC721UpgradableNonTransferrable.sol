// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721UpgradableBase} from "./ERC721UpgradableBase.sol";

abstract contract ERC721UpgradableNonTransferrable is ERC721UpgradableBase {
  error TransfersDisabled();

  /**
   * @dev This function is overridden to disable transfers.
   */
  function transferFrom(address, address, uint256) public virtual override(ERC721Upgradeable, IERC721) {
    revert TransfersDisabled();
  }

  /**
   * @dev This function is overridden to disable transfers.
   */
  function approve(address, uint256) public virtual override(ERC721Upgradeable, IERC721) {
    revert TransfersDisabled();
  }

  /**
   * @dev This function is overridden to disable transfers.
   */
  function setApprovalForAll(address, bool) public virtual override(ERC721Upgradeable, IERC721) {
    revert TransfersDisabled();
  }
}
