// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20PermitUpgradeable, NoncesUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import {ERC20VotesUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import {ERC20WrapperUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20WrapperUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title Stake RIF Token
 * @author Rootstock Labs
 * @notice This smart contract is a wrapper around RIF token
 * providing ERC20 votes compatibility
 */
contract StRIFToken is
  Initializable,
  ERC20Upgradeable,
  ERC20PermitUpgradeable,
  ERC20VotesUpgradeable,
  ERC20WrapperUpgradeable,
  OwnableUpgradeable,
  UUPSUpgradeable
{
  error DepositFailed(address spender, address target, uint256 amount);

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

  function depositAndDelegate(address account, uint256 value) public {
    // don't allow zero amount
    if (value == 0) revert DepositFailed(_msgSender(), account, value);
    // don't allow to deposit to RIF in order not to loose RIFs
    address rif = address(underlying());
    if (account == rif) revert ERC20InvalidReceiver(rif);
    // trying to deposit. Other checks are within the functions
    bool success = depositFor(account, value);
    if (!success) revert DepositFailed(_msgSender(), account, value);
    delegate(account);
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
