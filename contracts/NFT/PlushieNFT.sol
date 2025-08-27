// SPDX-License-Identifier: MIT

pragma solidity ^0.8.30;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import {ERC721URIStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract PlushieNFT is
  Initializable,
  ERC721Upgradeable,
  ERC721EnumerableUpgradeable,
  ERC721URIStorageUpgradeable,
  AccessControlEnumerableUpgradeable,
  UUPSUpgradeable
{
  using Strings for uint256;
  /// @notice potential NFT owner in the period between whitelisting and minting
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

  /// @notice admin responsible for whitelisting minters
  bytes32 public constant WHITELIST_GUARD_ROLE = keccak256("WHITELIST_GUARD_ROLE");

  uint256 private _totalMinted;
  // number of metadata files
  uint256 private _maxSupply;
  // IPFS CID of the tokens metadata directory
  string private _folderIpfsCid;

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  error PlushieNftOutOfTokens(uint256 maxSupply);
  error PlushieNftAdminRoleViolation();
  event PlushieNftTokenParamsChanged(uint256 maxSupply, string folderIpfsCid);
  error PlushieNftTransfersDisabled();

  function initialize(
    address defaultAdmin,
    uint256 maxSupply,
    string calldata ipfsFolderCid
  ) public initializer {
    __ERC721_init("PlushieNFT", "PLU");
    __ERC721Enumerable_init();
    __ERC721URIStorage_init();
    __AccessControl_init();
    __UUPSUpgradeable_init();

    // Set up role hierarchy: only whitelisters can assign the minter role
    _setRoleAdmin(MINTER_ROLE, WHITELIST_GUARD_ROLE);

    _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
    _grantRole(WHITELIST_GUARD_ROLE, defaultAdmin);

    setTokenParams(maxSupply, ipfsFolderCid);
  }

  function setTokenParams(
    uint256 newMaxSupply,
    string calldata newIpfsCid
  ) public virtual onlyRole(DEFAULT_ADMIN_ROLE) {
    require(newMaxSupply >= _maxSupply, "PlushieNFT: Invalid max supply");
    _maxSupply = newMaxSupply;
    _folderIpfsCid = newIpfsCid;
    emit PlushieNftTokenParamsChanged(newMaxSupply, newIpfsCid);
  }

  function addToWhitelist(address[] calldata minters) external virtual onlyRole(WHITELIST_GUARD_ROLE) {
    for (uint256 i = 0; i < minters.length; i++) {
      _grantRole(MINTER_ROLE, minters[i]);
    }
  }

  function removeFromWhitelist(address[] calldata minters) external virtual onlyRole(WHITELIST_GUARD_ROLE) {
    for (uint256 i = 0; i < minters.length; i++) {
      _revokeRole(MINTER_ROLE, minters[i]);
    }
  }

  function addWhitelistGuards(address[] calldata guards) external virtual onlyRole(DEFAULT_ADMIN_ROLE) {
    for (uint256 i = 0; i < guards.length; i++) {
      _grantRole(WHITELIST_GUARD_ROLE, guards[i]);
    }
  }

  function removeWhitelistGuards(address[] calldata guards) external virtual onlyRole(DEFAULT_ADMIN_ROLE) {
    for (uint256 i = 0; i < guards.length; i++) {
      _revokeRole(WHITELIST_GUARD_ROLE, guards[i]);
    }
  }

  function mint() public onlyRole(MINTER_ROLE) returns (uint256) {
    address caller = _msgSender();
    if (balanceOf(caller) > 0) revert ERC721InvalidOwner(caller);
    if (tokensAvailable() == 0) revert PlushieNftOutOfTokens(_maxSupply);
    uint256 tokenId = ++_totalMinted;
    string memory fileName = string.concat(tokenId.toString(), ".json");
    _safeMint(caller, tokenId);
    _setTokenURI(tokenId, fileName);
    // token holder is no longer a Minter after acquiring his token
    _revokeRole(MINTER_ROLE, caller);
    return tokenId;
  }

  /**
   * @dev Returns the number of tokens available for minting
   */
  function tokensAvailable() public view virtual returns (uint256) {
    if (_totalMinted >= _maxSupply) return 0;
    return _maxSupply - _totalMinted;
  }

  function _baseURI() internal pure override returns (string memory) {
    return "ipfs://";
  }

  function renounceRole(
    bytes32 role,
    address callerConfirmation
  ) public virtual override(AccessControlUpgradeable, IAccessControl) {
    // Prevent the last admin from renouncing their role
    if (role == DEFAULT_ADMIN_ROLE && getRoleMemberCount(DEFAULT_ADMIN_ROLE) == 1) {
      revert PlushieNftAdminRoleViolation();
    }
    super.renounceRole(role, callerConfirmation);
  }

  function grantRole(
    bytes32 role,
    address account
  ) public virtual override(AccessControlUpgradeable, IAccessControl) {
    if (role == DEFAULT_ADMIN_ROLE && getRoleMemberCount(DEFAULT_ADMIN_ROLE) >= 1) {
      revert PlushieNftAdminRoleViolation();
    }
    super.grantRole(role, account);
  }

  /**
   * @dev This function is overridden to disable transfers.
   */
  function transferFrom(address, address, uint256) public virtual override(ERC721Upgradeable, IERC721) {
    revert PlushieNftTransfersDisabled();
  }

  /**
   * @dev This function is overridden to prevent from granting roles to zero address.
   */
  function _grantRole(bytes32 role, address receiver) internal virtual override returns (bool) {
    if (receiver == address(0)) revert PlushieNftAdminRoleViolation();
    return super._grantRole(role, receiver);
  }

  function _authorizeUpgrade(
    address newImplementation
  ) internal virtual override onlyRole(DEFAULT_ADMIN_ROLE) {}

  // The following functions are overrides required by Solidity.

  function _update(
    address to,
    uint256 tokenId,
    address auth
  ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) returns (address) {
    return super._update(to, tokenId, auth);
  }

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
      AccessControlEnumerableUpgradeable
    )
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }
}
