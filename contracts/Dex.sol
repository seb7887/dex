// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "hardhat/console.sol";

interface IRegistry {
    function getDex(address _tknAddress) external returns (address);
}

contract Dex is ERC20 {
    using SafeMath for uint256;

    address public tknAddress;
    address public registryAddress;

    event AddLiquidity(
        address indexed provider,
        uint256 indexed tokensSold,
        uint256 indexed ethBought
    );

    constructor(address _tknAddress) ERC20("IaODeX", "LP") {
        require(_tknAddress != address(0), "invalid token address");
        tknAddress = _tknAddress;
        registryAddress = msg.sender;
    }

    function addLiquidity(uint256 _tknAmount) public payable returns (uint256) {
        uint256 liquidity;

        if (getReserve() == 0) {
            liquidity = address(this).balance;
        } else {
            // Enforce the ratio once the pool is initialized to preserve
            // prices, but not before to allow initialization
            uint256 ethReserve = address(this).balance.sub(msg.value);
            uint256 tknReserve = getReserve();
            uint256 tknAmount = msg.value.mul(tknReserve) / ethReserve;
            require(_tknAmount >= tknAmount, "insufficient token amount");
            liquidity = (totalSupply() * msg.value) / ethReserve;
        }

        IERC20 token = IERC20(tknAddress);
        token.transferFrom(msg.sender, address(this), _tknAmount);
        _mint(msg.sender, liquidity);

        emit AddLiquidity(msg.sender, msg.value, _tknAmount);

        return liquidity;
    }

    function getReserve() public view returns (uint256) {
        return IERC20(tknAddress).balanceOf(address(this));
    }
}
