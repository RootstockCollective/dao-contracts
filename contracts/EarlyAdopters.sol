// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import {ERC721URIStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title Early Adopters Community NFT
 * @notice Owning one token grants membership in the Early Adopters Community.
 */
contract EarlyAdopters is
  Initializable,
  ERC721Upgradeable,
  ERC721EnumerableUpgradeable,
  ERC721URIStorageUpgradeable,
  AccessControlUpgradeable,
  UUPSUpgradeable
{
  bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
  bytes32 public constant CIDS_LOADER_ROLE = keccak256("CIDS_LOADER_ROLE");
  uint256 private _nextTokenId;
  string[] private _ipfsCids;

  error InvalidCidsAmount(uint256 amount, uint256 maxAmount);
  error OutOfCids();
  event CidsLoaded(uint256 numCids, uint256 totalCids);

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(address defaultAdmin, address upgrader, address cidsLoader) public initializer {
    __ERC721_init("EarlyAdopters", "EA");
    __ERC721Enumerable_init();
    __ERC721URIStorage_init();
    __AccessControl_init();
    __UUPSUpgradeable_init();

    _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
    _grantRole(UPGRADER_ROLE, upgrader);
    _grantRole(CIDS_LOADER_ROLE, cidsLoader);
  }

  /**
   * @dev Mints an NFT for a new member of the Early Adopters community.
   * Ensures that one address can hold a maximum of one token.
   */
  function mint() external virtual {
    // stop minting if the contract ran out of images
    if (cidsAvailable() == 0) revert OutOfCids();

    string memory uri = _ipfsCids[_nextTokenId];
    uint256 tokenId = _nextTokenId++;
    _safeMint(msg.sender, tokenId);
    _setTokenURI(tokenId, uri);
  }

  /**
   * @dev Allows an admin with the `CIDS_LOADER_ROLE` to upload IPFS CIDs with NFT metadata.
   * @param ipfsCIDs - An array of strings representing IPFS CIDs, e.g., `QmQR9mfvZ9fDFJuBne1xnRoeRCeKZdqajYGJJ9MEDchgqX`.
   * The array length should not exceed 50 CIDs. If there are more than 50 tokens to upload,
   * call this function multiple times.
   */
  function loadCids(string[] calldata ipfsCIDs) external virtual onlyRole(CIDS_LOADER_ROLE) {
    /* 
    The block gas limit is 6,800,000 gas units. Uploading 1 CID costs about 68,000 gas units.
    How many CIDs should be loaded within one transaction (one block)?

    To ensure space for other transactions in the block, let’s assume we use half of the block
    gas limit, which is 3,400,000 gas units. Dividing this by 68,000 gas units per CID, we can
    load exactly 50 CIDs per transaction.
      */
    uint256 maxCids = 50;
    uint256 length = ipfsCIDs.length;
    if (length > maxCids) revert InvalidCidsAmount(length, maxCids);
    for (uint256 i = 0; i < length; i++) _ipfsCids.push(ipfsCIDs[i]);
    emit CidsLoaded(length, _ipfsCids.length);
  }

  /**
   * @dev Returns the number of IPFS CIDs available for minting tokens
   */
  function cidsAvailable() public view virtual returns (uint256) {
    if (_nextTokenId > _ipfsCids.length) return 0;
    return _ipfsCids.length - _nextTokenId;
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
    if (balanceOf(to) > 0) revert ERC721InvalidOwner(to);
    return super._update(to, tokenId, auth);
  }

  function _baseURI() internal pure virtual override returns (string memory) {
    return "ipfs://";
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
