// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20PermitUpgradeable, NoncesUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import {ERC20VotesUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import {ERC20WrapperUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20WrapperUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract StRIFTokenV2 is
  Initializable,
  ERC20Upgradeable,
  ERC20PermitUpgradeable,
  ERC20VotesUpgradeable,
  ERC20WrapperUpgradeable,
  OwnableUpgradeable,
  UUPSUpgradeable
{
  /// @notice The actual version of the contract
  uint64 public actualVersion;

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(IERC20 rifToken, address initialOwner) public initializer {
    __ERC20_init("StRIFToken", "stRIF");
    __ERC20Permit_init("StRIFToken");
    __ERC20Votes_init();
    __ERC20Wrapper_init(rifToken);
    __Ownable_init(initialOwner);
    __UUPSUpgradeable_init();
  }

  /**
   * @dev Initializes the contract.
   */
  function reInitialize(uint64 versionAfterUpgrade) public reinitializer(versionAfterUpgrade) onlyProxy {
    require(
      versionAfterUpgrade > actualVersion,
      "StRIFToken: given version must be greater than actual version"
    );
    actualVersion = versionAfterUpgrade;
  }

  /// @notice Returns the version of the contract
  function version() public view returns (string memory) {
    return string(abi.encodePacked(actualVersion));
  }

  /**
   * @dev Allows token holder to transfer tokens to another account, after which
   * the recipient automatically delegates votes to themselves if they do
   * not already have a delegate.
   * Transfer and delegation happen within one transaction.
   * @param to The address of the recipient of the token transfer
   * @param value The amount of tokens being transferred
   */
  function transferAndDelegate(address to, uint256 value) public virtual {
    transfer(to, value);
    _autoDelegate(to, value);
  }

  /**
   * @dev Allows a token holder to transfer tokens from one account to another account,
   * after which the recipient automatically delegates votes to themselves if they do
   * not already have a delegate. This function is analogous to `transferAndDelegate` and
   * exists as a counterpart to the `transferFrom` function from the ERC-20 standard.
   *
   * @param from The address of the account to transfer tokens from
   * @param to The address of the recipient of the token transfer
   * @param value The amount of tokens being transferred
   */
  function transferFromAndDelegate(address from, address to, uint256 value) public virtual {
    transferFrom(from, to, value);
    _autoDelegate(to, value);
  }

  /**
   * @dev Allows to mint stRIFs from underlying RIF tokens (stake)
   * and delegate gained voting power to a provided address
   * @param to a target address for minting and delegation
   * @param value amount of RIF tokens to stake
   */
  function depositAndDelegate(address to, uint256 value) public virtual {
    depositFor(to, value);
    _autoDelegate(to, value);
  }

  /**
   * @dev Internal function to automatically delegate votes to the recipient
   * after a token transfer, if the recipient does not already have a delegate.
   * Delegation only occurs if the transfer amount is greater than zero.
   *
   * @param to The address of the recipient of the token transfer.
   * @param value The amount of tokens being transferred.
   */
  function _autoDelegate(address to, uint256 value) internal virtual {
    if (value == 0 || delegates(to) != address(0)) return;
    _delegate(to, to);
  }

  // The following functions are overrides required by Solidity.

  //solhint-disable-next-line no-empty-blocks
  function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

  function decimals() public view override(ERC20Upgradeable, ERC20WrapperUpgradeable) returns (uint8) {
    return super.decimals();
  }

  function _update(
    address from,
    address to,
    uint256 value
  ) internal override(ERC20Upgradeable, ERC20VotesUpgradeable) {
    super._update(from, to, value);
  }

  function nonces(
    address owner
  ) public view override(ERC20PermitUpgradeable, NoncesUpgradeable) returns (uint256) {
    return super.nonces(owner);
  }
}
