// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;


import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";


using SafeERC20 for IERC20;

contract TreasuryDao is Ownable, ReentrancyGuard {

  error GuardianUnauthorizedAccount(address account);
  error InvalidGuardian(address account);

  event Deposited(address indexed sender, uint256 amount);
  event Withdrawn(address indexed recipient, uint256 amount);
  event WithdrawnERC20(address indexed token, address indexed recipient, uint256 amount);
  event GuardianshipTransferred(address indexed previousGuardian, address indexed newGuardian);

  mapping(address => bool) public whitelist;
  address public guardian;

  modifier onlyGuardian() {
    if (guardian != _msgSender()) {
        revert GuardianUnauthorizedAccount(_msgSender());
    }
    _;
  }
  constructor(address initialOwner, address _guardian) Ownable(initialOwner) {
    guardian = _guardian;
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
    require(whitelist[token], "Token forbidden");
    require(IERC20(token).balanceOf(address(this)) >= amount, "Insufficient ERC20 balance");
    IERC20(token).safeTransfer(to, amount);
    emit WithdrawnERC20(token, to, amount);
  }

  /**
   * @dev Withdraw an ERC20 token to the guardian.
   * @param token The ERC20 token
   */
  function withdrawERC20ToGuardian(address token) external onlyGuardian nonReentrant {
    uint256 amount = IERC20(token).balanceOf(address(this));
    IERC20(token).safeTransfer(guardian, amount);
    emit WithdrawnERC20(token, guardian, amount);
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

  /**
   * @dev Withdraw RBTC to the guardian.
   */
  function withdrawToGuardian() external nonReentrant onlyGuardian{
    uint256 amount = address(this).balance;
    bool success = payable(address(this)).send(amount);
    require(success, "Failed to sent");
    emit Withdrawn(guardian, amount);
  }

  /**
   * @dev Add to whitelist a new ERC20 token
   * @param token ERC20 token
   */
  function addToWhitelist(address token) public onlyOwner {
    whitelist[token] = true;
  }

  /**
   * @dev Remove from whitelist an ERC20 token
   * @param token ERC20 token
   */
  function removeFromWhitelist(address token) public onlyOwner {
    whitelist[token] = false;
  }

  function transferGuardianship(address newGuardian) public virtual onlyGuardian {
    if (newGuardian == address(0)) {
        revert InvalidGuardian(address(0));
    }
    address oldGuardian = guardian;
    guardian = newGuardian;
    emit GuardianshipTransferred(oldGuardian, newGuardian);
  }
  
}