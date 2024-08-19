// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;


import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ITreasury} from "./ITreasury.sol";


using SafeERC20 for IERC20;

contract TreasuryDao is Ownable, ReentrancyGuard, ITreasury {

  event GuardianshipTransferred(address indexed previousGuardian, address indexed newGuardian);

  error GuardianUnauthorizedAccount(address account);
  
  error InvalidGuardian(address account);
  
  mapping(address => bool) public whitelist;
  address public guardian;

  modifier onlyGuardian() {
    if (guardian != _msgSender()) {
        revert GuardianUnauthorizedAccount(_msgSender());
    }
    _;
  }
  /**
   * @dev Sets the values for {initialOwner} and {guardian}
   * @param initialOwner Initial owner 
   * @param _guardian Guardian
   */
  constructor(address initialOwner, address _guardian) Ownable(initialOwner) {
    require(_guardian != address(0), "Guardian can not be Zero Address");
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
   * @dev Withdraw an ERC20 token to a third-party address.
   * @param token The ERC20 token
   * @param to The third-party address
   */
  function withdrawAllERC20(address token, address to) external onlyGuardian nonReentrant {
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
  function withdraw(address payable to, uint256 amount) external onlyOwner nonReentrant {
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
  function withdrawAll(address to) external nonReentrant onlyGuardian{
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
  function addToWhitelist(address token) external onlyOwner {
    whitelist[token] = true;
  }

  /**
   * @dev Remove from whitelist an ERC20 token
   * @param token ERC20 token
   */
  function removeFromWhitelist(address token) external onlyOwner {
    whitelist[token] = false;
  }

  /**
   * @dev Transfer guardianship to another guardian
   * @param newGuardian new guardian address
   */
  function transferGuardianship(address newGuardian) external virtual onlyGuardian {
    if (newGuardian == address(0)) {
        revert InvalidGuardian(address(0));
    }
    address oldGuardian = guardian;
    guardian = newGuardian;
    emit GuardianshipTransferred(oldGuardian, newGuardian);
  }
  
}