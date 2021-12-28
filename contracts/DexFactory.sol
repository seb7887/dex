// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Dex.sol";

contract DexFactory {
    mapping(address => address) public tokenToDex;

    event NewDex(address indexed token, address indexed dex);

    function createDex(address _tknAddress) public returns (address) {
        require(_tknAddress != address(0), "invalid token address");
        require(tokenToDex[_tknAddress] == address(0), "dex already exists");

        Dex dex = new Dex(_tknAddress);
        tokenToDex[_tknAddress] = address(dex);

        emit NewDex(_tknAddress, address(dex));

        return address(dex);
    }

    function getDex(address _tknAddress) public view returns (address) {
        return tokenToDex[_tknAddress];
    }
}
