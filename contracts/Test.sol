// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Плохо отформатированный контракт с ошибками
contract badContract {
  uint256 public badVariable;
  mapping(address => uint256) badMapping;

  function badFunction(uint256 _param) public {
    badVariable = _param;
  }

  // Функция без visibility modifier (ошибка solhint)
  function anotherBadFunction() {
    return;
  }

  // Неиспользуемая переменная
  uint256 unusedVar;
}
