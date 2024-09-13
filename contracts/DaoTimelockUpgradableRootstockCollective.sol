// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";

contract DaoTimelockUpgradableRootstockCollective is UUPSUpgradeable, TimelockControllerUpgradeable {
  function initialize(
    uint256 minDelay,
    address[] memory proposers,
    address[] memory executors,
    address admin
  ) public initializer {
    __UUPSUpgradeable_init();
    __AccessControl_init();
    __TimelockController_init(minDelay, proposers, executors, admin);
  }

  function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
