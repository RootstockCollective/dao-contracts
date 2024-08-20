// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;


import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";


using SafeERC20 for IERC20;

contract TreasuryDao is Ownable, ReentrancyGuard {

  event Deposited(address indexed sender, uint256 amount);
  event Withdrawn(address indexed recipient, uint256 amount);
  event WithdrawnERC20(address indexed token, address indexed recipient, uint256 amount);

  constructor(address initialOwner) Ownable(initialOwner) {

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
  function withdrawERC20(address token, address to, uint256 amount) external onlyOwner nonReentrant {
    require(IERC20(token).balanceOf(address(this)) >= amount, "Insufficient ERC20 balance");
    IERC20(token).safeTransfer(to, amount);
    emit WithdrawnERC20(token, to, amount);
  }

  /**
   * @dev Withdraw RBTC to a third-party address.
   * @param to The third-party address
   * @param amount The value to send
   */
  function withdraw(address payable to, uint256 amount) external onlyOwner nonReentrant {
    require(address(this).balance >= amount, "Insufficient Balance");
    require(to != address(0), "Zero Address is not allowed");
    bool success = to.send(amount);
    require(success, "Failed to sent");
    emit Withdrawn(to, amount);
  }
  
}