/**
 * @title RIF Token Faucet
 * @author IOV Labs
 * @notice Original source code is taken from the repository:
 * https://github.com/riflabs/rif-faucet/blob/master/contracts/TokenFaucet.sol
 */

pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract TokenFaucet is Ownable {
  IERC20 public immutable tokenContract;

  mapping(address => uint) cannotDispenseUntil;

  uint256 public dispenseValue = 11 * 10 ** 18; // 11 tRIFs
  uint256 public dispenceFrequency = 1 hours;

  event DispenceFrequencyChanged(address changer, uint256 oldValue, uint256 newValue);
  event DispenceValueChanged(address changer, uint256 oldValue, uint256 newValue);

  modifier canDispense(address to) {
    require(cannotDispenseUntil[to] < block.timestamp, "CANNOT DISPENSE MORE THAN 1 TIME PER HOUR");
    _;
  }

  constructor(IERC20 rifToken) Ownable(msg.sender) {
    tokenContract = rifToken;
  }

  function recover() public returns (bool) {
    uint256 totalAmount = tokenContract.balanceOf(address(this));
    return tokenContract.transfer(owner(), totalAmount);
  }

  function dispense(address to) public canDispense(to) returns (bool) {
    cannotDispenseUntil[to] = block.timestamp + dispenceFrequency;
    return tokenContract.transfer(to, dispenseValue);
  }

  function setDispenseValue(uint256 value) public onlyOwner {
    emit DispenceValueChanged(msg.sender, dispenseValue, value);
    dispenseValue = value;
  }

  function setDispenseFrequency(uint256 freqSeconds) public onlyOwner {
    emit DispenceFrequencyChanged(msg.sender, dispenceFrequency, freqSeconds);
    dispenceFrequency = freqSeconds;
  }
}
