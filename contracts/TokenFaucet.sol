/**
 * @title RIF Token Faucet
 * @author IOV Labs
 * @notice Original source code is taken from the repository:
 * https://github.com/riflabs/rif-faucet/blob/master/contracts/TokenFaucet.sol
 */

pragma solidity >=0.4.21 <0.6.0;

import "./RIFToken.sol";

contract TokenFaucet {
    address public owner;
    RIFToken public tokenContract;

    mapping(address => uint) cannotDispenseUntil;

    uint public dispenseValue = 10 * 10 ** 18;
    uint public dispenceFrequency = 1 hours;

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    modifier canDispense(address to) {
        require(cannotDispenseUntil[to] < now, "CANNOT DISPENSE MORE THAN 1 TIME PER HOUR");
        _;
    }

    constructor(RIFToken _tokenContract) public {
        owner = msg.sender;
        tokenContract = _tokenContract;
    }

    function recover() public {
        uint totalAmount = tokenContract.balanceOf(address(this));
        tokenContract.transfer(owner, totalAmount);
    }

    function dispense(address to) public canDispense(to) {
        tokenContract.transfer(to, dispenseValue);
        cannotDispenseUntil[to] = now + dispenceFrequency;
    }

    function setDispenseValue(uint value) public onlyOwner {
        dispenseValue = value;
    }

    function setDispenseFrequency(uint _seconds) public onlyOwner {
        dispenceFrequency = _seconds;
    }
}