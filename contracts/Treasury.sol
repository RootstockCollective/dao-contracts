// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;


import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ITreasury} from "./ITreasury.sol";


using SafeERC20 for IERC20;

contract TreasuryDao is AccessControl, ReentrancyGuard, ITreasury {

  event TokenWhitelisted(address indexed token);

  event TokenUnwhitelisted(address indexed token);

  error GuardianUnauthorizedAccount(address account);
  
  error InvalidGuardian(address account);

  mapping(address => bool) public whitelist;
  bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
  /**
   * @dev Sets the values for {initialOwner} and {guardian}
   * @param initialOwner Initial owner 
   * @param guardian Guardian
   */
  constructor(address initialOwner, address guardian) {
      _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
      _grantRole(GUARDIAN_ROLE, initialOwner);
      _grantRole(GUARDIAN_ROLE, guardian);
  }

  /**
   * @dev Receives RBTC
   */
  receive() external payable {
    emit Deposited(msg.sender, msg.value);
  }


  /**
   * @dev Withdraw an ERC20 token to a third-party address.
   * @param token The ERC20 token
   * @param to The third-party address
   * @param amount The value to send
   */
  function withdrawERC20(address token, address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
    require(whitelist[token], "Token forbidden");
    require(IERC20(token).balanceOf(address(this)) >= amount, "Insufficient ERC20 balance");
    IERC20(token).safeTransfer(to, amount);
    emit WithdrawnERC20(token, to, amount);
  }

  /**
   * @dev Withdraw an ERC20 token to a third-party address.
   * @param token The ERC20 token
   * @param to The third-party address
   */
  function emergencyWithdrawERC20(address token, address to) external onlyRole(GUARDIAN_ROLE) nonReentrant {
    require(whitelist[token], "Token forbidden");
    require(to != address(0), "Zero Address is not allowed");
    uint256 amount = IERC20(token).balanceOf(address(this));
    IERC20(token).safeTransfer(to, amount);
    emit WithdrawnERC20(token, to, amount);
  }

  /**
   * @dev Withdraw RBTC to a third-party address.
   * @param to The third-party address
   * @param amount The value to send
   */
  function withdraw(address payable to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
    require(address(this).balance >= amount, "Insufficient Balance");
    require(to != address(0), "Zero Address is not allowed");
    bool success = to.send(amount);
    require(success, "Failed to sent");
    emit Withdrawn(to, amount);
  }

  /**
   * @dev Withdraw RBTC to a third-party address.
   * @param to The third-party address.
   */
  function emergencyWithdraw(address to) external nonReentrant onlyRole(GUARDIAN_ROLE){
    require(to != address(0), "Zero Address is not allowed");
    uint256 amount = address(this).balance;
    bool success = payable(to).send(amount);
    require(success, "Failed to sent");
    emit Withdrawn(to, amount);
  }

  /**
   * @dev Add to whitelist a new ERC20 token
   * @param token ERC20 token
   */
  function addToWhitelist(address token) public onlyRole(GUARDIAN_ROLE) {
    whitelist[token] = true;
    emit TokenWhitelisted(token);
  }

  /**
   * @dev Remove from whitelist an ERC20 token
   * @param token ERC20 token
   */
  function removeFromWhitelist(address token) public onlyRole(GUARDIAN_ROLE) {
    whitelist[token] = false;
    emit TokenUnwhitelisted(token);
  }

  function batchAddWhitelist(address[] memory tokens) external onlyRole(GUARDIAN_ROLE) {
    for (uint256 i=0; i<tokens.length; i++) {
      addToWhitelist(tokens[i]);
    }
  }

  function batchRemoveWhitelist(address[] memory tokens) external onlyRole(GUARDIAN_ROLE) {
    for (uint256 i=0; i<tokens.length; i++) {
      removeFromWhitelist(tokens[i]);
    }
  }
  
}