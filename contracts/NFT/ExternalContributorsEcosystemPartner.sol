// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import {ERC721UpgradableAirdroppable} from "./ERC721UpgradableAirdroppable.sol";

contract ExternalContributorsEcosystemPartner is ERC721UpgradableAirdroppable {
  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(
    string calldata contractName,
    string calldata symbol,
    address initialOwner,
    uint256 maxNftSupply
  ) public initializer {
    __ERC721Airdroppable_init(maxNftSupply);
    __ERC721UpgradableBase_init(contractName, symbol, initialOwner);
  }

  function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}

  function _baseURI() internal pure override returns (string memory) {
    return "ipfs://";
  }
}
