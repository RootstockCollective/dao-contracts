// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Контракт только с warnings (без errors)
contract TestWarnings {
  uint256 public badVariableName; // warning: var-name-mixedcase

  // warning: func-visibility (но настроен как warn, не error)
  function badFunction() {
    // warning: no-empty-blocks
  }

  // warning: func-name-mixedcase
  function BAD_FUNCTION_NAME() public {
    // warning: no-empty-blocks
  }
}
