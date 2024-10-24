// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import {ERC721UpgradableBase} from "./ERC721UpgradableBase.sol";

struct AirdropItem {
  address receiver;
  string ipfsCid;
}
struct AirdroppableStorage {
  uint256 _nextTokenId;
}

abstract contract ERC721UpgradableAirdroppable is ERC721UpgradableBase {
  // keccak256(abi.encode(uint256(keccak256("rootstock.storage.ERC721Airdroppable")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 private constant storageLocation =
    0xb0b7c350b577073edef3635128030d229b37650766e59f19e264b4b50f30a500;

  event AirdropExecuted(uint256 numMinted);

  function _getStorage() private pure returns (AirdroppableStorage storage $) {
    assembly {
      $.slot := storageLocation
    }
  }

  /**
   * @dev Distributes tokens to a list of addresses.
   *
   * @param receivers an array of receivers with corresponding IPFS CIDS
   */
  function airdrop(AirdropItem[] calldata receivers) external virtual onlyOwner {
    AirdroppableStorage storage $ = _getStorage();
    uint256 tokenId = $._nextTokenId;
    for (uint256 i = 0; i < receivers.length; i++) {
      tokenId++;
      AirdropItem calldata item = receivers[i];
      _safeMint(item.receiver, tokenId);
      _setTokenURI(tokenId, item.ipfsCid);
    }
    $._nextTokenId = tokenId;
    emit AirdropExecuted(receivers.length);
  }
}
