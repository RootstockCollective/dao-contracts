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
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import {ICollectiveRewardsCheck} from "./interfaces/ICollectiveRewardsCheck.sol";

contract StRIFTokenV02 is
  Initializable,
  ERC20Upgradeable,
  ERC20PermitUpgradeable,
  ERC20VotesUpgradeable,
  ERC20WrapperUpgradeable,
  OwnableUpgradeable,
  UUPSUpgradeable
{
  using Address for address;
  using ERC165Checker for address;

  /// @notice The address of the CollectiveRewards Contract
  address public collectiveRewardsCheck;
  /// @notice The flag indicating that the CollectiveRewards error
  /// is desired to be skipped
  bool private _shouldErrorBeSkipped;

  error STRIFStakedInCollectiveRewardsCanWithdraw(bool canWithdraw);
  error STRIFSupportsERC165(bool _supports);
  error STRIFSupportsICollectiveRewardsCheck(bool _supports);
  error CollectiveRewardsErrored(string reason);
  error CollectiveRewardsErroredBytes(bytes reason);

  event STRIFCollectiveRewardsErrorSkipChangedTo(bool shouldBeSkipped);
  event CollectiveRewardsAddressHasBeenChanged(address collectiveRewardsAddress);

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

  //checks CollectiveRewards for stake
  modifier _checkCollectiveRewardsForStake(address staker, uint256 value) {
    _;
    if (collectiveRewardsCheck != address(0)) {
      try ICollectiveRewardsCheck(collectiveRewardsCheck).canWithdraw(staker, value) returns (
        bool canWithdraw
      ) {
        if (!canWithdraw) {
          revert STRIFStakedInCollectiveRewardsCanWithdraw(false);
        }
      } catch Error(string memory reason) {
        if (!_shouldErrorBeSkipped) {
          revert CollectiveRewardsErrored(reason);
        }
      } catch (bytes memory reason) {
        if (!_shouldErrorBeSkipped) {
          revert CollectiveRewardsErroredBytes(reason);
        }
      }
    }
  }

  // checks that received address has method which can successfully be called
  // before setting it to state
  function setCollectiveRewardsAddress(address collectiveRewardsAddress) public onlyOwner {
    if (!collectiveRewardsAddress.supportsInterface(type(ICollectiveRewardsCheck).interfaceId)) {
      revert STRIFSupportsICollectiveRewardsCheck(false);
    }

    collectiveRewardsCheck = collectiveRewardsAddress;
    emit CollectiveRewardsAddressHasBeenChanged(collectiveRewardsAddress);
  }

  function setCollectiveRewardsErrorSkipFlag(bool shouldBeSkipped) public onlyOwner {
    _shouldErrorBeSkipped = shouldBeSkipped;
    emit STRIFCollectiveRewardsErrorSkipChangedTo(shouldBeSkipped);
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
  ) internal override(ERC20Upgradeable, ERC20VotesUpgradeable) _checkCollectiveRewardsForStake(from, value) {
    super._update(from, to, value);
  }

  function withdrawTo(
    address account,
    uint256 value
  ) public virtual override _checkCollectiveRewardsForStake(account, value) returns (bool) {
    return super.withdrawTo(account, value);
  }

  function nonces(
    address owner
  ) public view override(ERC20PermitUpgradeable, NoncesUpgradeable) returns (uint256) {
    return super.nonces(owner);
  }
}
