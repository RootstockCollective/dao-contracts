// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import {ERC721URIStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

import {ERC721UpgradableBase} from "./ERC721UpgradableBase.sol";
import {ERC721UpgradableNonTransferrable} from "./ERC721UpgradableNonTransferrable.sol";

import "hardhat/console.sol";

contract OGFounders is ERC721Upgradeable, ERC721UpgradableNonTransferrable {
  using Strings for uint8;

  error WasNotEnoughStRIFToMint(uint stRIF);
  error CouldNotGetVotes(string);
  error CouldNotGetVotesBytes(bytes);
  error OutOfTokens(uint256 maxSupply);
  error ThisAddressAlreadyOwnsTheToken(address owner);

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  address public stRIF;
  uint256 public firstProposalDate;
  // Counter for the total number of minted tokens
  uint8 private _totalMinted;
  // number of metadata files in the IPFS directory
  uint8 private _maxSupply;

  function initialize(
    string calldata contractName,
    string calldata symbol,
    address initialOwner,
    address stRIFAddress,
    uint256 _firstProposalDate
  ) public initializer {
    __ERC721UpgradableBase_init(contractName, symbol, initialOwner);
    stRIF = stRIFAddress;
    firstProposalDate = _firstProposalDate;
    _maxSupply = 150;
  }

  /**
   * @dev Returns the number of tokens available for minting
   */
  function tokensAvailable() public view virtual returns (uint256) {
    if (_totalMinted >= _maxSupply) return 0;
    return _maxSupply - _totalMinted;
  }

  /**
   * @dev Returns the token ID for a given owner address.
   * This is a simplified version of the `tokenOfOwnerByIndex` function without the index
   * parameter, since a community member can only own one token.
   */
  function tokenIdByOwner(address owner) public view virtual returns (uint256) {
    return tokenOfOwnerByIndex(owner, 0);
  }

  /**
   * @dev Returns the token IPFS URI for the given owner address.
   * This utility function combines two view functions.
   */
  function tokenUriByOwner(address owner) public view virtual returns (string memory) {
    return tokenURI(tokenIdByOwner(owner));
  }

  function mint() external virtual {
    address caller = _msgSender();
    //5623028
    try IVotes(stRIF).getPastVotes(caller, firstProposalDate) returns (uint _votes) {
      if (_votes < 1) {
        revert WasNotEnoughStRIFToMint(_votes);
      }
      // make sure we still have some CIDs for minting new tokens
      if (tokensAvailable() == 0) revert OutOfTokens(_maxSupply);

      // minting
      uint8 tokenId = ++_totalMinted;
      string memory fileName = string.concat(tokenId.toString(), ".json"); // 1.json, 2.json ...
      _safeMint(caller, tokenId);
      _setTokenURI(tokenId, fileName);
    } catch Error(string memory reason) {
      revert CouldNotGetVotes(reason);
    } catch (bytes memory reason) {
      revert CouldNotGetVotesBytes(reason);
    }
  }

  function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}

  function _baseURI() internal pure override returns (string memory) {
    return "ipfs://";
  }

  /**
   * @dev Prevents the transfer and mint of tokens to addresses that already own one.
   * Ensures that one address cannot own more than one token.
   */
  function _update(
    address to,
    uint256 tokenId,
    address auth
  ) internal override(ERC721Upgradeable, ERC721UpgradableBase) returns (address) {
    // Disallow transfers by smart contracts, as only EOAs can be community members
    // slither-disable-next-line tx-origin
    if (_msgSender() != tx.origin) revert ERC721InvalidOwner(_msgSender());
    // disallow transfers to members (excluding zero-address for enabling burning)
    // disable minting more than one token
    if (to != address(0) && balanceOf(to) > 0) revert ERC721InvalidOwner(to);
    return super._update(to, tokenId, auth);
  }

  // overrides required

  function transferFrom(
    address from,
    address to,
    uint256 tokenId
  ) public virtual override(ERC721UpgradableNonTransferrable, ERC721Upgradeable) {
    super.transferFrom(from, to, tokenId);
  }

  function approve(
    address to,
    uint256 tokenId
  ) public virtual override(ERC721UpgradableNonTransferrable, ERC721Upgradeable) {
    super.approve(to, tokenId);
  }

  function setApprovalForAll(
    address operator,
    bool approved
  ) public virtual override(ERC721UpgradableNonTransferrable, ERC721Upgradeable) {
    super.setApprovalForAll(operator, approved);
  }

  function tokenURI(
    uint256 tokenId
  ) public view virtual override(ERC721Upgradeable, ERC721UpgradableBase) returns (string memory) {
    return super.tokenURI(tokenId);
  }

  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(ERC721UpgradableBase, ERC721Upgradeable) returns (bool) {
    return super.supportsInterface(interfaceId);
  }

  function _increaseBalance(
    address account,
    uint128 value
  ) internal override(ERC721UpgradableBase, ERC721Upgradeable) {
    super._increaseBalance(account, value);
  }
}
