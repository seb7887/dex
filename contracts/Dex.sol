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
    event RemoveLiquidity(
        address indexed provider,
        uint256 indexed ethAmount,
        uint256 indexed tknAmount
    );
    event TokenPurchase(
        address buyer,
        uint256 indexed ethSold,
        uint256 indexed tknsBought
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

    function removeLiquidity(uint256 _amount)
        public
        returns (uint256, uint256)
    {
        require(_amount > 0, "invalid amount to withdraw");

        uint256 supply = totalSupply();
        uint256 ethAmount = _amount.mul(address(this).balance) / supply;
        uint256 tknAmount = _amount.mul(getReserve()) / supply;

        _burn(msg.sender, _amount);
        payable(msg.sender).transfer(ethAmount);
        IERC20(tknAddress).transfer(msg.sender, tknAmount);

        emit RemoveLiquidity(msg.sender, ethAmount, tknAmount);

        return (ethAmount, tknAmount);
    }

    function getReserve() public view returns (uint256) {
        return IERC20(tknAddress).balanceOf(address(this));
    }

    function getAmount(
        uint256 inputAmount,
        uint256 inputReserve,
        uint256 outputReserve
    ) private pure returns (uint256) {
        require(inputReserve > 0 && outputReserve > 0, "invalid reserves");

        uint256 inputAmountWithFee = inputReserve.mul(99);
        uint256 numerator = inputAmountWithFee.mul(outputReserve);
        uint256 denominator = (inputReserve.mul(100)).add(inputAmountWithFee);

        return numerator / denominator;
    }

    function getTokenAmount(uint256 _ethSold) public view returns (uint256) {
        require(_ethSold > 0, "ethers sold cannot be zero");
        uint256 tknReserve = getReserve();
        return getReserve(_ethSold, address(this).balance, tknReserve);
    }

    function getEthAmount(uint256 _tknSold) public view returns (uint256) {
        require(_tknSold > 0, "tokens sold cannot be zero");
        uint256 tknReserve = getReserve();
        return getReserve(_tknSold, tknReserve, address(this).balance);
    }

    function ethToToken(uint256 _minTokens, address _recipient) private {
        uint256 tknReserve = getReserve();
        uint256 tknsBought = getAmount(
            msg.value,
            address(this).balance - msg.value,
            tknReserve
        );

        require(tknsBought >= _minTokens, "insufficient output amount");
        IERC20(tknAddress).transfer(_recipient, tknsBought);

        emit TokenPurchase(msg.sender, msg.value, tknsBought);
    }

    function ethToTokenSwap(uint256 _minTokens) public payable {
        ethToToken(_minTokens, msg.sender);
    }
}
