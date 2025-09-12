// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Контракт с серьезными ошибками solhint
contract TestBad {
  // Переменная должна быть private/internal, но public без getter
  uint256 public CONSTANT_VALUE = 100; // должно быть constant

  // Функция без visibility modifier
  function badFunction() {
    // Пустая функция
  }

  // Функция с неправильным naming
  function BAD_NAMING() public {
    // Функция в верхнем регистре
  }

  // Fallback функция без payable
  fallback() external {
    // Пустой fallback
  }
}
