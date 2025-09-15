// SPDX-License-Identifier: MIT

pragma solidity ^0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title Rootling Series 1 NFT Collection
 * @notice Non-transferrable POAP-style NFTs for Asia Token 2049 conference participants
 * @dev Whitelisted users can mint once per address. Requires minimum stRIF balance.
 */
contract RootlingSeries1RootstockCollective is
  Initializable,
  ERC721Upgradeable,
  ERC721EnumerableUpgradeable,
  AccessControlEnumerableUpgradeable,
  UUPSUpgradeable
{
  // CONSTANTS

  /// @notice potential NFT owner in the period between whitelisting and minting
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

  /// @notice admin responsible for whitelisting minters
  bytes32 public constant WHITELIST_GUARD_ROLE = keccak256("WHITELIST_GUARD_ROLE");

  // STATE VARIABLES. Storage packing optimization (4 slots total)

  // Slot 1: 32 bytes
  uint256 private _totalMinted;

  // Slot 2: 32 bytes
  /// @notice Minimum underlying token balance to claim NFT.
  uint256 public underlyingTokenThreshold;

  // Slot 3: 32 bytes
  /// @notice Maximum number of tokens
  uint256 public maxSupply;

  // Slot 4: 20 bytes + 12 bytes free
  /// @notice Token contract for balance verification
  IERC20 public underlyingToken; // 20 bytes

  // Slot 5+: dynamic
  /// @notice Single tokens metadata file IPFS CID
  string private _metadataIpfsCid;

  /**
   * @dev STORAGE GAP: reserved space for future variable additions to preserve storage layout
   * in upgradeable contract. New state variables must be inserted above this line and the
   * array size decreased accordingly.
   */
  uint256[50] private __gap;

  // EVENTS

  event RootlingNftUnderlyingTokenChanged(IERC20 indexed oldToken, IERC20 indexed newToken);
  event RootlingNftTokenThresholdChanged(uint256 indexed oldThreshold, uint256 indexed newThreshold);
  event RootlingNftMaxSupplyChanged(uint256 indexed oldMaxSupply, uint256 indexed newMaxSupply);
  event RootlingNftFolderIpfsCidChanged(string oldCid, string newCid);

  // ERRORS

  error RootlingNftOutOfTokens(uint256 maxSupply);
  error RootlingNftAdminRoleViolation();
  error RootlingNftTransfersDisabled();
  error RootlingNftBelowTokenThreshold(uint256 balance, uint256 threshold);
  error RootlingNftInvalidMaxSupply(uint256 newMaxSupply, uint256 currentMaxSupply);
  error RootlingNftInvalidAddress(address);

  // INITIALIZERS

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(
    address defaultAdmin,
    IERC20 token,
    uint256 tokenThreshold,
    uint256 initialSupply,
    string calldata ipfsFolderCid
  ) public initializer {
    // solhint-disable-next-line gas-small-strings
    __ERC721_init("RootlingSeries1RootstockCollective", "RS1");
    __ERC721Enumerable_init();
    __AccessControl_init();
    __AccessControlEnumerable_init();
    __UUPSUpgradeable_init();

    _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
    _grantRole(WHITELIST_GUARD_ROLE, defaultAdmin);

    // Set up role hierarchy: whitelisters can assign the minter role
    _setRoleAdmin(MINTER_ROLE, WHITELIST_GUARD_ROLE);

    setUnderlyingToken(token);
    setTokenThreshold(tokenThreshold);
    setMaxSupply(initialSupply);
    setFolderIpfsCid(ipfsFolderCid);
  }

  // USER FUNCTIONS

  /**
   * @notice Called by whitelisted member (Minter) to mint his NFT.
   * @dev The Minter role is revoked after minting to monitor the number of minters.
   */
  function mint() external onlyRole(MINTER_ROLE) returns (uint256) {
    address caller = _msgSender();
    // checks
    if (balanceOf(caller) > 0) revert ERC721InvalidOwner(caller);
    if (tokensAvailable() == 0) revert RootlingNftOutOfTokens(maxSupply);
    uint256 balance = underlyingToken.balanceOf(caller);
    if (balance < underlyingTokenThreshold)
      revert RootlingNftBelowTokenThreshold(balance, underlyingTokenThreshold);
    // minting
    uint256 tokenId = ++_totalMinted;
    _safeMint(caller, tokenId);
    // token holder is no longer a Minter after acquiring his token
    _revokeRole(MINTER_ROLE, caller);
    return tokenId;
  }

  // ADMIN FUNCTIONS

  /// @notice Add addresses to minter whitelist
  function addToWhitelist(address[] calldata minters) external virtual onlyRole(WHITELIST_GUARD_ROLE) {
    for (uint256 i = 0; i < minters.length; ) {
      _grantRole(MINTER_ROLE, minters[i]);
      unchecked {
        ++i;
      }
    }
  }

  /// @notice Remove addresses from minter whitelist
  function removeFromWhitelist(address[] calldata minters) external virtual onlyRole(WHITELIST_GUARD_ROLE) {
    for (uint256 i = 0; i < minters.length; ) {
      _revokeRole(MINTER_ROLE, minters[i]);
      unchecked {
        ++i;
      }
    }
  }

  /// @notice Add guards who can manage the minter whitelist
  function addWhitelistGuards(address[] calldata guards) external virtual onlyRole(DEFAULT_ADMIN_ROLE) {
    for (uint256 i = 0; i < guards.length; ) {
      _grantRole(WHITELIST_GUARD_ROLE, guards[i]);
      unchecked {
        ++i;
      }
    }
  }

  /// @notice Remove guards who can manage the minter whitelist
  function removeWhitelistGuards(address[] calldata guards) external virtual onlyRole(DEFAULT_ADMIN_ROLE) {
    for (uint256 i = 0; i < guards.length; ) {
      _revokeRole(WHITELIST_GUARD_ROLE, guards[i]);
      unchecked {
        ++i;
      }
    }
  }

  /**
   * @notice Transfer DEFAULT_ADMIN_ROLE to another address in a single atomic operation
   * @dev This function grants the role to the receiver and revokes it from the caller atomically
   * @param receiver The address to receive the DEFAULT_ADMIN_ROLE
   */
  function transferDefaultAdminRole(address receiver) external virtual onlyRole(DEFAULT_ADMIN_ROLE) {
    if (receiver == address(0)) revert RootlingNftInvalidAddress(receiver);
    _grantRole(DEFAULT_ADMIN_ROLE, receiver);
    _revokeRole(DEFAULT_ADMIN_ROLE, _msgSender());
  }

  // ADMIN PARAMETER SETTERS

  /// @notice Set IPFS folder CID for token metadata
  function setFolderIpfsCid(string calldata cid) public virtual onlyRole(DEFAULT_ADMIN_ROLE) {
    string memory oldCid = _metadataIpfsCid;
    _metadataIpfsCid = cid;
    emit RootlingNftFolderIpfsCidChanged(oldCid, cid);
  }

  /// @notice Set maximum supply of tokens (can only increase)
  function setMaxSupply(uint256 newMaxSupply) public virtual onlyRole(DEFAULT_ADMIN_ROLE) {
    if (newMaxSupply < maxSupply) revert RootlingNftInvalidMaxSupply(newMaxSupply, maxSupply);
    uint256 oldMaxSupply = maxSupply;
    maxSupply = newMaxSupply;
    emit RootlingNftMaxSupplyChanged(oldMaxSupply, newMaxSupply);
  }

  /// @notice Set minimum token balance required for minting
  function setTokenThreshold(uint256 threshold) public virtual onlyRole(DEFAULT_ADMIN_ROLE) {
    uint256 oldThreshold = underlyingTokenThreshold;
    underlyingTokenThreshold = threshold;
    emit RootlingNftTokenThresholdChanged(oldThreshold, threshold);
  }

  /// @notice Set underlying token contract address
  function setUnderlyingToken(IERC20 newToken) public virtual onlyRole(DEFAULT_ADMIN_ROLE) {
    if (newToken == IERC20(address(0))) revert RootlingNftInvalidAddress(address(newToken));
    IERC20 oldToken = underlyingToken;
    underlyingToken = newToken;
    emit RootlingNftUnderlyingTokenChanged(oldToken, newToken);
  }

  // VIEW FUNCTIONS

  /// @notice Returns the number of tokens available for minting
  function tokensAvailable() public view virtual returns (uint256) {
    // Safe subtraction: maxSupply >= _totalMinted is guaranteed by contract invariants
    // (mint() reverts when tokensAvailable() == 0, preventing overflow)
    return maxSupply - _totalMinted;
  }

  // OVERRIDES
  /// @dev This function is overridden to provide a single metadata file for all the minters
  function tokenURI(uint256 tokenId) public view override returns (string memory) {
    _requireOwned(tokenId);
    return string.concat("ipfs://", _metadataIpfsCid);
  }

  /// @dev This function is overridden to prevent the last admin from renouncing his role.
  function renounceRole(
    bytes32 role,
    address callerConfirmation
  ) public virtual override(AccessControlUpgradeable, IAccessControl) {
    if (role == DEFAULT_ADMIN_ROLE && getRoleMemberCount(DEFAULT_ADMIN_ROLE) == 1) {
      revert RootlingNftAdminRoleViolation();
    }
    super.renounceRole(role, callerConfirmation);
  }

  /// @dev This function is overridden to prevent from making 2 default admins.
  function grantRole(
    bytes32 role,
    address account
  ) public virtual override(AccessControlUpgradeable, IAccessControl) {
    if (role == DEFAULT_ADMIN_ROLE && getRoleMemberCount(DEFAULT_ADMIN_ROLE) == 1) {
      revert RootlingNftAdminRoleViolation();
    }
    super.grantRole(role, account);
  }

  /// @dev This function is overridden to disable transfers.
  function _update(
    address to,
    uint256 tokenId,
    address auth
  ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) returns (address) {
    address from = _ownerOf(tokenId);
    // restrict usual transfers (except burning and minting)
    if (from != address(0) && to != address(0)) revert RootlingNftTransfersDisabled();

    return super._update(to, tokenId, auth);
  }

  /// @dev This function is overridden to prevent from granting roles to zero address.
  function _grantRole(bytes32 role, address receiver) internal virtual override returns (bool) {
    if (receiver == address(0)) revert RootlingNftAdminRoleViolation();
    return super._grantRole(role, receiver);
  }

  /// @dev Restricts contract upgrades to accounts with DEFAULT_ADMIN_ROLE
  function _authorizeUpgrade(
    address newImplementation
  )
    internal
    virtual
    override
    onlyRole(DEFAULT_ADMIN_ROLE) // solhint-disable-next-line no-empty-blocks
  {
    // Intentionally empty - authorization handled by access control
  }

  // The following functions are overrides required by Solidity.

  function _increaseBalance(
    address account,
    uint128 value
  ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
    super._increaseBalance(account, value);
  }

  function supportsInterface(
    bytes4 interfaceId
  )
    public
    view
    override(ERC721Upgradeable, ERC721EnumerableUpgradeable, AccessControlEnumerableUpgradeable)
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }
}
