// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721UpgradableAirdroppable} from "./ERC721UpgradableAirdroppable.sol";
import {ERC721UpgradableNonTransferrable} from "./ERC721UpgradableNonTransferrable.sol";

contract OgFoundersEcosystemPartner is ERC721UpgradableAirdroppable, ERC721UpgradableNonTransferrable {
  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(address initialOwner) public initializer {
    __ERC721UpgradableBase_init("OgFoundersEcosystemPartner", "OGFEP", initialOwner);
  }

  function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}

  function _baseURI() internal pure override returns (string memory) {
    return "ipfs://";
  }

  /* Overrides required by Solidity */

  function approve(
    address to,
    uint256 tokenId
  ) public virtual override(IERC721, ERC721Upgradeable, ERC721UpgradableNonTransferrable) {
    super.approve(to, tokenId);
  }

  function setApprovalForAll(
    address operator,
    bool approved
  ) public virtual override(IERC721, ERC721Upgradeable, ERC721UpgradableNonTransferrable) {
    super.setApprovalForAll(operator, approved);
  }

  function transferFrom(
    address from,
    address to,
    uint256 tokenId
  ) public virtual override(IERC721, ERC721Upgradeable, ERC721UpgradableNonTransferrable) {
    super.transferFrom(from, to, tokenId);
  }
}
