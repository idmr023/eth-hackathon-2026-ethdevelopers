// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { IEAS } from "interfaces/IEAS.sol";
import { ISchemaRegistry } from "interfaces/ISchemaRegistry.sol";
import { ISchemaResolver } from "interfaces/resolver/ISchemaResolver.sol";

contract DeployEasSchema is Script {
    // Arbitrum Sepolia (Chain ID 421614)
    // EAS: 0x2521021fc8BF070473E1e1801D3c7B4aB701E1dE
    // SchemaRegistry: 0x45CB6Fa0870a8Af06796Ac15915619a0f22cd475

    address public EAS_CONTRACT_ADDRESS = 0x2521021fc8BF070473E1e1801D3c7B4aB701E1dE;
    address public SCHEMA_REGISTRY_ADDRESS = 0x45CB6Fa0870a8Af06796Ac15915619a0f22cd475;

    // Schema para las credenciales de Licitabien
    string public constant LICITABIEN_SCHEMA = "string title,string description,string issuer,address recipientWallet,uint256 auctionId,uint256 winningPrice,uint256 aiScore,string badge,string evidenceUri";

    function run() public returns (bytes32 schemaUID) {
        vm.startBroadcast();

        ISchemaRegistry schemaRegistry = ISchemaRegistry(SCHEMA_REGISTRY_ADDRESS);

        // Registrar el schema
        // resolverAddress: Cero address para resolver por defecto (no se necesita un resolver custom)
        // revocable: true, las credenciales pueden ser revocadas por el emisor (el protocolo)
        schemaUID = schemaRegistry.register(LICITABIEN_SCHEMA, ISchemaResolver(address(0)), true);
        
        console.log("Schema Licitabien registered with UID: %s", vm.toString(schemaUID));

        vm.stopBroadcast();
    }
}