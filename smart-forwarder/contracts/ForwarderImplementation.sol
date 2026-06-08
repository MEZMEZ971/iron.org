// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @notice Per-user deposit proxy; forwards native coin and ERC20 (e.g. USDT) to MAIN_PARTNER wallet.
contract ForwarderImplementation {
    address public centralWallet;
    address public factory;
    bool public initialized;

    event TokensForwarded(address indexed token, uint256 amount, address indexed to);
    event ETHForwarded(uint256 amount, address indexed to);

    function initialize(address _mainPartnerWallet, address _factory) external {
        require(!initialized, "Already initialized");
        require(_mainPartnerWallet != address(0), "Invalid main partner wallet");
        centralWallet = _mainPartnerWallet;
        factory = _factory;
        initialized = true;
    }

    function flushToken(address tokenAddress) external {
        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No balance to flush");
        require(token.transfer(centralWallet, balance), "Transfer failed");
        emit TokensForwarded(tokenAddress, balance, centralWallet);
    }

    function flushETH() external {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to flush");
        (bool success, ) = centralWallet.call{value: balance}("");
        require(success, "ETH transfer failed");
        emit ETHForwarded(balance, centralWallet);
    }

    receive() external payable {
        if (msg.value > 0) {
            (bool success, ) = centralWallet.call{value: msg.value}("");
            require(success, "ETH forward failed");
            emit ETHForwarded(msg.value, centralWallet);
        }
    }
}