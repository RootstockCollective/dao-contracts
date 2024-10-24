// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import {ERC721UpgradableBase} from "./ERC721UpgradableBase.sol";

struct AirdropRecipient {
  address receiver;
  string ipfsCid;
}
struct AirdroppableStorage {
  uint256 _nextTokenId;
  bool _locked;
}

interface IAirdroppable {
  event AirdropExecuted(uint256 numMinted);

  function airdrop(AirdropRecipient[] calldata receivers) external;
}

abstract contract ERC721UpgradableAirdroppable is ERC721UpgradableBase, IAirdroppable {
  error AirdropMintingLocked(uint256 numMinted);

  event AirDropLocked(uint256 numMinted);

  // keccak256(abi.encode(uint256(keccak256("rootstock.storage.ERC721Airdroppable")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 private constant STORAGE_LOCATION =
    0xb0b7c350b577073edef3635128030d229b37650766e59f19e264b4b50f30a500;

  function _getStorage() private pure returns (AirdroppableStorage storage $) {
    assembly {
      $.slot := STORAGE_LOCATION
    }
  }

  /**
   * @dev Distributes tokens to a list of addresses.
   *
   * @param receivers an array of receivers with corresponding IPFS CIDS
   */
  function airdrop(AirdropRecipient[] calldata receivers) external virtual override onlyOwner {
    AirdroppableStorage storage $ = _getStorage();

    if ($._locked) {
      revert AirdropMintingLocked(totalSupply());
    }

    uint256 tokenId = $._nextTokenId;
    for (uint256 i = 0; i < receivers.length; i++) {
      tokenId++;
      AirdropRecipient calldata item = receivers[i];
      _safeMint(item.receiver, tokenId);
      _setTokenURI(tokenId, item.ipfsCid);
    }
    $._nextTokenId = tokenId;
    emit AirdropExecuted(receivers.length);
  }

  function lockNFTMinting() external onlyOwner {
    _getStorage()._locked = true;
    emit AirDropLocked(totalSupply());
  }
}
