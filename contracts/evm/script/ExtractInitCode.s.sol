// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {x402ExactPermit2Proxy} from "../src/x402ExactPermit2Proxy.sol";
import {x402UptoPermit2Proxy} from "../src/x402UptoPermit2Proxy.sol";

/**
 * @title ExtractInitCode
 * @notice Extracts raw init code (creation bytecode + constructor args) for reproducible deployments
 * @dev Run with: forge script script/ExtractInitCode.s.sol
 *
 *      This script generates the raw init code that was used to mine the vanity salts,
 *      enabling anyone to deploy to the same deterministic addresses on any EVM chain
 *      without needing to reproduce the exact build environment.
 *
 *      Output files:
 *      - deployments/x402ExactPermit2Proxy.initcode
 *      - deployments/x402UptoPermit2Proxy.initcode
 *      - deployments/x402ExactPermit2Proxy.salt
 *      - deployments/x402UptoPermit2Proxy.salt
 */
contract ExtractInitCode is Script {
    /// @notice Canonical Permit2 address (same on all EVM chains)
    address constant CANONICAL_PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    /// @notice Salt for x402ExactPermit2Proxy deterministic deployment
    /// @dev Vanity mined for address 0x402085c248eea27d92e8b30b2c58ed07f9e20001
    bytes32 constant EXACT_SALT = 0x0000000000000000000000000000000000000000000000003000000007263b0e;

    /// @notice Salt for x402UptoPermit2Proxy deterministic deployment  
    /// @dev Vanity mined for address 0x402039b3d6e6bec5a02c2c9fd937ac17a6940002
    bytes32 constant UPTO_SALT = 0x0000000000000000000000000000000000000000000000000000000000edb738;

    /// @notice Arachnid's deterministic CREATE2 deployer (same on all EVM chains)
    address constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    function run() public {
        console2.log("");
        console2.log("============================================================");
        console2.log("  x402 Init Code Extraction for Reproducible Deployments");
        console2.log("============================================================");
        console2.log("");

        // Extract init code for both contracts
        _extractExactInitCode();
        _extractUptoInitCode();

        console2.log("");
        console2.log("Init code extraction complete!");
        console2.log("");
        console2.log("Files written:");
        console2.log("- deployments/x402ExactPermit2Proxy.initcode");
        console2.log("- deployments/x402UptoPermit2Proxy.initcode");
        console2.log("- deployments/x402ExactPermit2Proxy.salt");
        console2.log("- deployments/x402UptoPermit2Proxy.salt");
        console2.log("");
        console2.log("Use these files to deploy to deterministic addresses on any EVM chain.");
        console2.log("See deployments/README.md for deployment instructions.");
    }

    function _extractExactInitCode() internal {
        console2.log("------------------------------------------------------------");
        console2.log("  x402ExactPermit2Proxy Init Code Extraction");
        console2.log("------------------------------------------------------------");

        // Generate init code: creation bytecode + constructor args
        bytes memory initCode = abi.encodePacked(
            type(x402ExactPermit2Proxy).creationCode,
            abi.encode(CANONICAL_PERMIT2)
        );
        
        bytes32 initCodeHash = keccak256(initCode);
        address expectedAddress = _computeCreate2Addr(EXACT_SALT, initCodeHash, CREATE2_DEPLOYER);
        
        console2.log("Init code length:", initCode.length);
        console2.log("Init code hash:", vm.toString(initCodeHash));
        console2.log("Expected address:", expectedAddress);
        console2.log("Salt:", vm.toString(EXACT_SALT));

        // Write init code to file
        string memory initCodeHex = vm.toString(initCode);
        vm.writeFile("deployments/x402ExactPermit2Proxy.initcode", initCodeHex);
        
        // Write salt to file (without 0x prefix for easier use with cast)
        string memory saltHex = _removeHexPrefix(vm.toString(EXACT_SALT));
        vm.writeFile("deployments/x402ExactPermit2Proxy.salt", saltHex);

        console2.log("* Init code written to deployments/x402ExactPermit2Proxy.initcode");
        console2.log("* Salt written to deployments/x402ExactPermit2Proxy.salt");
        console2.log("");
    }

    function _extractUptoInitCode() internal {
        console2.log("------------------------------------------------------------");
        console2.log("  x402UptoPermit2Proxy Init Code Extraction");
        console2.log("------------------------------------------------------------");

        // Generate init code: creation bytecode + constructor args
        bytes memory initCode = abi.encodePacked(
            type(x402UptoPermit2Proxy).creationCode,
            abi.encode(CANONICAL_PERMIT2)
        );
        
        bytes32 initCodeHash = keccak256(initCode);
        address expectedAddress = _computeCreate2Addr(UPTO_SALT, initCodeHash, CREATE2_DEPLOYER);
        
        console2.log("Init code length:", initCode.length);
        console2.log("Init code hash:", vm.toString(initCodeHash));
        console2.log("Expected address:", expectedAddress);
        console2.log("Salt:", vm.toString(UPTO_SALT));

        // Write init code to file
        string memory initCodeHex = vm.toString(initCode);
        vm.writeFile("deployments/x402UptoPermit2Proxy.initcode", initCodeHex);
        
        // Write salt to file (without 0x prefix for easier use with cast)
        string memory saltHex = _removeHexPrefix(vm.toString(UPTO_SALT));
        vm.writeFile("deployments/x402UptoPermit2Proxy.salt", saltHex);

        console2.log("* Init code written to deployments/x402UptoPermit2Proxy.initcode");
        console2.log("* Salt written to deployments/x402UptoPermit2Proxy.salt");
        console2.log("");
    }

    function _computeCreate2Addr(
        bytes32 salt,
        bytes32 initCodeHash,
        address deployer
    ) internal pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), deployer, salt, initCodeHash)))));
    }

    function _removeHexPrefix(string memory hexString) internal pure returns (string memory) {
        bytes memory hexBytes = bytes(hexString);
        require(hexBytes.length >= 2 && hexBytes[0] == "0" && hexBytes[1] == "x", "Invalid hex string");
        
        bytes memory result = new bytes(hexBytes.length - 2);
        for (uint256 i = 2; i < hexBytes.length; i++) {
            result[i - 2] = hexBytes[i];
        }
        
        return string(result);
    }
}