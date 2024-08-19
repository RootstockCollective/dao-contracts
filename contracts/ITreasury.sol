// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

interface ITreasury {

  /**
   * @dev Emitted when `amount` tokens are moved from one account (`sender`) to
   * another Treasury.
   *
   * Note that `amount` may be zero.
   */
  event Deposited(address indexed sender, uint256 amount);

  /**
   * @dev Emitted when `amount` RBTC are moved from Treasury to
   * another account(`recipient`).
   *
   * Note that `amount` may be zero.
   */
  event Withdrawn(address indexed recipient, uint256 amount);

  /**
   * @dev Emitted when `amount` token(`token`) are moved from Treasury to
   * another account(`recipient`).
   *
   * Note that `amount` may be zero.
   */
  event WithdrawnERC20(address indexed token, address indexed recipient, uint256 amount);

  /**
   * @dev Withdraw an ERC20 token to a third-party address.
   * @param token The ERC20 token
   * @param to The third-party address
   * @param amount The value to send
   * 
   * Emits an {WithdrawnERC20} event.
   */
  function withdrawERC20(address token, address to, uint256 amount) external;


  /**
   * @dev Withdraw an ERC20 token to a third-party address.
   * @param token The ERC20 token
   * @param to The third-party address
   * 
   * Emits an {WithdrawnERC20} event.
   */
  function withdrawAllERC20(address token, address to) external;


  /**
   * @dev Withdraw RBTC to a third-party address.
   * @param to The third-party address
   * @param amount The value to send
   * 
   * Emits an {Withdrawn} event.
   */
  function withdraw(address payable to, uint256 amount) external;


  /**
   * @dev Withdraw RBTC to a third-party address.
   * @param to The third-party address.
   * 
   * Emits an {Withdrawn} event.
   */
  function withdrawAll(address to) external;

}