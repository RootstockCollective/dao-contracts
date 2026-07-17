// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";

contract DaoTimelockUpgradableRootstockCollective is UUPSUpgradeable, TimelockControllerUpgradeable {
  error InvalidTimelockBootstrap();

  function initialize(
    uint256 minDelay,
    address[] memory proposers,
    address[] memory executors,
    address admin
  ) public initializer {
    if (admin == address(0) && (proposers.length == 0 || executors.length == 0)) {
      revert InvalidTimelockBootstrap();
    }
    __UUPSUpgradeable_init();
    __AccessControl_init();
    __TimelockController_init(minDelay, proposers, executors, admin);
  }

  /**
   * @dev Restricts contract upgrades to accounts with DEFAULT_ADMIN_ROLE.
   *
   * We use AccessControl (not Ownable) because TimelockController is built on role-based
   * access permissions. Using DEFAULT_ADMIN_ROLE for upgrades keeps authorization
   * consistent with the DAO's modular permission model (proposers, executors, upgraders).
   *
   * Avoids mixing authorization patterns (e.g. Ownable + AccessControl), which could
   * introduce security ambiguity. This role can be assigned to a multisig or DAO-controlled address.
   */

  function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
