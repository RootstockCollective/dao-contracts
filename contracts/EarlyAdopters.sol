// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import {ERC721URIStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import {ERC721BurnableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title Early Adopters Community NFT
 * @notice This contract allows the minting of NFTs that grant membership to the Early Adopters Community.
 * Each token is linked to metadata stored in an IPFS directory. The maximum number of tokens
 * that can be minted is limited by the number of metadata files uploaded to the IPFS directory.
 * To increase the number of metadata files, you need to create a new IPFS directory, 
 * place the old and new files there, then call the `setIpfsFolder` function and pass the new 
 * CID and the new number of files in the parameters.
 */
contract EarlyAdopters is
  Initializable,
  ERC721Upgradeable,
  ERC721EnumerableUpgradeable,
  ERC721URIStorageUpgradeable,
  ERC721BurnableUpgradeable,
  AccessControlUpgradeable,
  UUPSUpgradeable
{
  using Strings for uint256;
  bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
  // Counter for the total number of minted tokens
  uint256 public totalMinted;
  uint256 public maxSupply;
  string private _folderIpfsCid;

  error InvalidMaxSupply(uint256 invalidMaxSupply, uint256 maxSupply);
  error OutOfTokens(uint256 maxSupply);
  event IpfsFolderChanged(uint256 newNumFiles, string newIpfs);

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  /**
   * @dev Called during deployment instead of a constructor to initialize the contract.
   * @param defaultAdmin EOA with admin privileges
   * @param upgrader EOA able to upgrade the contract and set new max supply
   * @param numFiles the number of NFT meta JSON files, stored in the IPFS folder
   * @param ipfsCid IPFS CID of NFT metadata folder
   */
  function initialize(
    address defaultAdmin,
    address upgrader,
    uint256 numFiles,
    string calldata ipfsCid
  ) public initializer {
    __ERC721_init("EarlyAdopters", "EA");
    __ERC721Enumerable_init();
    __ERC721URIStorage_init();
    __ERC721Burnable_init();
    __AccessControl_init();
    __UUPSUpgradeable_init();

    _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
    _grantRole(UPGRADER_ROLE, upgrader);

    _setIpfsFolder(numFiles, ipfsCid);
  }

  /**
   * @dev Mints an NFT for a new member of the Early Adopters community.
   * Ensures that one address can hold a maximum of one token.
   * The collection starts from token ID #1
   */
  function mint() external virtual {
    uint256 tokenId = ++totalMinted;
    if (tokenId > maxSupply) revert OutOfTokens(maxSupply);
    string memory fileName = string.concat(tokenId.toString(), ".json"); // 1.json, 2.json ...
    _safeMint(_msgSender(), tokenId);
    _setTokenURI(tokenId, fileName);
  }

  /**
   * Burns the token and leaves the community.
   * `ERC721Burnable` already has a function `burn(uint256)` to burn token by ID.
   * Here it's allowed to own only one token, thus there's no reason for specifying an ID.
   */
  function burn() external virtual {
    burn(tokenIdByOwner(_msgSender()));
  }

  /**
   * @dev Sets a new IPFS folder and updates the maximum supply of tokens that can be minted.
   * This function is meant to be called by an admin when the metadata folder on IPFS is updated.
   * It ensures that the new maximum supply is greater than the previous one.
   * @param newMaxSupply The new maximum number of tokens that can be minted.
   * @param newIpfsCid The new IPFS CID for the metadata folder.
   */
  function setIpfsFolder(
    uint256 newMaxSupply,
    string calldata newIpfsCid
  ) external virtual onlyRole(DEFAULT_ADMIN_ROLE) {
    _setIpfsFolder(newMaxSupply, newIpfsCid);
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

  /**
   * @dev Prevents the transfer of tokens to addresses that already own one.
   * Ensures that one address cannot own more than one token.
   */
  function _update(
    address to,
    uint256 tokenId,
    address auth
  ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) returns (address) {
    // Disallow transfers by smart contracts, as only EOAs can be community members
    // slither-disable-next-line tx-origin
    if (_msgSender() != tx.origin) revert ERC721InvalidOwner(_msgSender());
    // allow multiple transfers to zero address to enable burning
    if (to != address(0) && balanceOf(to) > 0) revert ERC721InvalidOwner(to);
    return super._update(to, tokenId, auth);
  }

  /**
   * @dev Returns the base URI used for constructing the token URI.
   * @return The base URI string.
   */
  function _baseURI() internal view virtual override returns (string memory) {
    return string.concat("ipfs://", _folderIpfsCid, "/");
  }

  /**
   * @dev Internal function to set the IPFS folder and update the maximum supply of tokens.
   * @param newMaxSupply The new maximum number of tokens that can be minted.
   * @param ipfs The new IPFS CID for the metadata folder.
   */
  function _setIpfsFolder(uint256 newMaxSupply, string calldata ipfs) internal virtual {
    if (newMaxSupply <= maxSupply) revert InvalidMaxSupply(newMaxSupply, maxSupply);
    maxSupply = newMaxSupply;
    _folderIpfsCid = ipfs;
    emit IpfsFolderChanged(newMaxSupply, ipfs);
  }

  function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {
    // empty function body
  }

  // The following functions are overrides required by Solidity.

  function _increaseBalance(
    address account,
    uint128 value
  ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
    super._increaseBalance(account, value);
  }

  function tokenURI(
    uint256 tokenId
  ) public view override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (string memory) {
    return super.tokenURI(tokenId);
  }

  function supportsInterface(
    bytes4 interfaceId
  )
    public
    view
    override(
      ERC721Upgradeable,
      ERC721EnumerableUpgradeable,
      ERC721URIStorageUpgradeable,
      AccessControlUpgradeable
    )
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }
}
