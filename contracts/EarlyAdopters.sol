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
 * @notice Owning one token grants membership in the Early Adopters Community.
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
  bytes32 public constant IPFS_ADMIN = keccak256("IPFS_ADMIN");
  uint256 private _nextTokenId;
  string private _ipns;

  error InvalidCidsAmount(uint256 amount, uint256 maxAmount);
  error OutOfCids();
  event CidsLoaded(uint256 numCids, uint256 totalCids);

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(
    address defaultAdmin,
    address upgrader,
    address ipfsAdmin,
    string calldata ipns
  ) public initializer {
    __ERC721_init("EarlyAdopters", "EA");
    __ERC721Enumerable_init();
    __ERC721URIStorage_init();
    __ERC721Burnable_init();
    __AccessControl_init();
    __UUPSUpgradeable_init();

    _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
    _grantRole(UPGRADER_ROLE, upgrader);
    _grantRole(IPFS_ADMIN, ipfsAdmin);
  }

  function updateIpns(string calldata newIpns) external virtual onlyRole(IPFS_ADMIN) {
    _updateIpns(newIpns);
  }

  function _updateIpns(string calldata newIpns) internal virtual {
    _ipns = newIpns;
  }

  /**
   * @dev Mints an NFT for a new member of the Early Adopters community.
   * Ensures that one address can hold a maximum of one token.
   */
  function mint() external virtual {
    uint256 tokenId = _nextTokenId++;
    string memory fileName = string.concat(tokenId.toString(), ".json"); // 0.json, 1.json
    _safeMint(_msgSender(), tokenId);
    _setTokenURI(tokenId, fileName);
  }

  /**
   * Burns the token an leaves the community.
   * `ERC721Burnable` already has a function `burn(uint256)` to burn token by ID.
   * Here it's allowed to own only one token, thus there's no reason for specifying an ID.
   */
  function burn() external virtual {
    burn(tokenIdByOwner(_msgSender()));
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
    if (_msgSender() != tx.origin) revert ERC721InvalidOwner(_msgSender());
    // allow multiple transfers to zero address to enable burning
    if (to != address(0) && balanceOf(to) > 0) revert ERC721InvalidOwner(to);
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
