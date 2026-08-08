// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Script, console2 } from "forge-std/Script.sol";
import { BlindBidVault } from "../src/BlindBidVault.sol";

/// @notice Deploys BlindBidVault to Arbitrum Sepolia using Circle testnet USDC.
/// @dev Deployer ends up with DEFAULT_ADMIN_ROLE (from constructor) plus
///      AUDITOR_ROLE so the backend operator (same key) can write audit scores.
contract DeployBlindBidVault is Script {
    address internal constant USDC_ARB_SEPOLIA =
        0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d;

    function run() external returns (BlindBidVault vault) {
        uint256 priceWeight = 70;
        uint256 qualityWeight = 30;

        vm.startBroadcast();
        vault = new BlindBidVault(IERC20(USDC_ARB_SEPOLIA), priceWeight, qualityWeight);
        vault.grantRole(vault.AUDITOR_ROLE(), msg.sender);
        vm.stopBroadcast();

        console2.log("BlindBidVault deployed at:", address(vault));
        console2.log("Admin + Auditor (deployer):", msg.sender);
    }
}
