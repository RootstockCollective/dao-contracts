// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import {ERC721UpgradableNonTransferrable} from "./ERC721UpgradableNonTransferrable.sol";

abstract contract ERC721UpgradableAirdroppable is ERC721UpgradableNonTransferrable {
  struct AirdroppableStorage {
    uint256 _nextTokenId;
    uint256 _maxNftSupply;
  }
  // keccak256(abi.encode(uint256(keccak256("rootstock.storage.ERC721Airdroppable")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 private constant storageLocation =
    0xb0b7c350b577073edef3635128030d229b37650766e59f19e264b4b50f30a500;

  function _getStorage() private pure returns (AirdroppableStorage storage $) {
    assembly {
      $.slot := storageLocation
    }
  }

  function __ERC721Airdroppable_init(uint256 maxNftSupply) internal onlyInitializing {
    AirdroppableStorage storage $ = _getStorage();
    $._maxNftSupply = maxNftSupply;
  }

  /**
   * @dev Distributes tokens to a list of addresses.
   *
   * @param ipfsCids An array of content identifiers (IPFS CIDs) for the token URIs.
   * @param airdropAddresses An array of addresses to receive the tokens.
   */

  function airdrop(string[] calldata ipfsCids, address[] calldata airdropAddresses) public onlyOwner {
    AirdroppableStorage storage $ = _getStorage();
    require(ipfsCids.length == airdropAddresses.length, "Arrays must be of the same length");
    require(airdropAddresses.length <= $._maxNftSupply, "Too many airdrops at once");
    uint256 tokenId = $._nextTokenId;
    unchecked {
      for (uint256 i = 0; i < airdropAddresses.length; i++) {
        tokenId++;
        _safeMint(airdropAddresses[i], tokenId);
        _setTokenURI(tokenId, ipfsCids[i]);
      }
    }
    $._nextTokenId = tokenId;
  }
}
