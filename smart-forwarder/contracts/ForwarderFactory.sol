// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IForwarder {
    function initialize(address _mainPartnerWallet, address _factory) external;
    function flushToken(address tokenAddress) external;
    function flushETH() external;
}

/// @title ForwarderFactory — CREATE2 deposit address factory
/// @notice `centralWallet` is the production MAIN_PARTNER wallet passed at deploy time (never hardcoded).
contract ForwarderFactory is Ownable {
    using Clones for address;

    address public immutable implementation;
    /// @dev Destination for all forwarded native coin and ERC20 deposits (MAIN_PARTNER_WALLET_ADDRESS).
    address public centralWallet;

    mapping(bytes32 => address) public userForwarders;
    mapping(address => bytes32) public forwarderToUser;

    event ForwarderCreated(bytes32 indexed userId, address indexed forwarderAddress);
    event BatchFlushed(address[] forwarders, address token);

    /// @param _implementation Forwarder clone template (ForwarderImplementation).
    /// @param _mainPartnerWallet Live treasury wallet — configured via deploy script env, not bytecode.
    constructor(
        address _implementation,
        address _mainPartnerWallet
    ) Ownable(msg.sender) {
        require(_implementation != address(0), "Invalid implementation");
        require(_mainPartnerWallet != address(0), "Invalid main partner wallet");
        implementation = _implementation;
        centralWallet = _mainPartnerWallet;
    }

    function createForwarder(bytes32 userId)
        external
        onlyOwner
        returns (address forwarderAddress)
    {
        require(userForwarders[userId] == address(0), "User already has forwarder");
        forwarderAddress = implementation.cloneDeterministic(userId);
        IForwarder(forwarderAddress).initialize(centralWallet, address(this));
        userForwarders[userId] = forwarderAddress;
        forwarderToUser[forwarderAddress] = userId;
        emit ForwarderCreated(userId, forwarderAddress);
        return forwarderAddress;
    }

    function predictForwarderAddress(bytes32 userId)
        external
        view
        returns (address)
    {
        return implementation.predictDeterministicAddress(userId);
    }

    function batchFlushTokens(
        address[] calldata forwarders,
        address tokenAddress
    ) external onlyOwner {
        for (uint256 i = 0; i < forwarders.length; i++) {
            try IForwarder(forwarders[i]).flushToken(tokenAddress) {}
            catch {}
        }
        emit BatchFlushed(forwarders, tokenAddress);
    }

    function batchFlushETH(address[] calldata forwarders) external onlyOwner {
        for (uint256 i = 0; i < forwarders.length; i++) {
            try IForwarder(forwarders[i]).flushETH() {}
            catch {}
        }
    }

    function updateCentralWallet(address newMainPartnerWallet) external onlyOwner {
        require(newMainPartnerWallet != address(0), "Invalid address");
        centralWallet = newMainPartnerWallet;
    }
}