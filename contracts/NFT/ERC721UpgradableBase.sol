// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import {ERC721URIStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

abstract contract ERC721UpgradableBase is
  Initializable,
  ERC721Upgradeable,
  ERC721EnumerableUpgradeable,
  ERC721URIStorageUpgradeable,
  OwnableUpgradeable,
  UUPSUpgradeable
{
  function __ERC721UpgradableBase_init(
    string calldata name,
    string calldata symbol,
    address initialOwner
  ) internal onlyInitializing {
    __ERC721_init(name, symbol);
    __ERC721Enumerable_init();
    __ERC721URIStorage_init();
    __Ownable_init(initialOwner);
    __UUPSUpgradeable_init();
  }

  // The following functions are overrides required by Solidity.

  function _increaseBalance(
    address account,
    uint128 value
  ) internal virtual override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
    super._increaseBalance(account, value);
  }

  function _update(
    address to,
    uint256 tokenId,
    address auth
  ) internal virtual override(ERC721Upgradeable, ERC721EnumerableUpgradeable) returns (address) {
    return super._update(to, tokenId, auth);
  }

  function supportsInterface(
    bytes4 interfaceId
  )
    public
    view
    virtual
    override(ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721URIStorageUpgradeable)
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }

  function tokenURI(
    uint256 tokenId
  ) public view virtual override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (string memory) {
    return super.tokenURI(tokenId);
  }
}
