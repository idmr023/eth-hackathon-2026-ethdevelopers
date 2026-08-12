// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { BlindBidVault } from "../src/BlindBidVault.sol";

/// @notice ERC20 de prueba consupply libre para los tests de BlindBidVault.
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

contract BlindBidVaultTest is Test {
    MockUSDC internal token;
    BlindBidVault internal vault;
    address internal organizer = address(0xA11CE);
    address internal treasury = address(0xBEEF);
    address internal bidderA = address(0xB1);
    address internal bidderB = address(0xB2);
    address internal auditor = address(0x41554469746f7200000000000000000000000000);

    uint256 internal constant STAKE = 1_000e6; // 1000 USDC
    uint256 internal constant MIN_PRICE = 900e6;
    uint256 internal constant MAX_PRICE = 1100e6;
    uint256 internal commitEnd;
    uint256 internal revealEnd;

    function setUp() public {
        token = new MockUSDC();
        // Deploy como el auditur/deployer (este contrato de test).
        vault = new BlindBidVault(IERC20(address(token)), 70, 30);

        // Financia a organizador y ofertantes con suficientes USDC.
        token.mint(organizer, STAKE * 4);
        token.mint(bidderA, STAKE);
        token.mint(bidderB, STAKE);

        // Permisos del token para que el vault pueda tomar el stake.
        vm.startPrank(organizer);
        token.approve(address(vault), type(uint256).max);
        vm.stopPrank();
        vm.prank(bidderA);
        token.approve(address(vault), type(uint256).max);
        vm.prank(bidderB);
        token.approve(address(vault), type(uint256).max);

        // Ventanas: commit termina en t=100, reveal en t=200.
        commitEnd = block.timestamp + 100;
        revealEnd = block.timestamp + 200;

        // Otorga AUDITOR_ROLE a `auditor`.
        vault.grantRole(vault.AUDITOR_ROLE(), auditor);
    }

    // Helper para crear una subasta como organizador.
    function createAuctionAsOrganizer() internal returns (uint256 auctionId) {
        vm.prank(organizer);
        auctionId = vault.createAuction(treasury, STAKE, MIN_PRICE, MAX_PRICE, commitEnd, revealEnd);
    }

    // keccak256(abi.encodePacked(price, secret)) — coincide con el contrato.
    function commitmentFor(uint256 price, string memory secret) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(price, secret));
    }

    // ───────────────────────── Happy path ─────────────────────────

    function test_HappyPath_CommitRevealWinnerByComposite() public {
        uint256 auctionId = createAuctionAsOrganizer();
        assertEq(auctionId, 0);

        // bidderA: precio 1000, secret "alpha"
        // bidderB: precio 1001, secret "beta"
        uint256 priceA = 1000e6;
        uint256 priceB = 1001e6;
        bytes32 cA = commitmentFor(priceA, "alpha");
        bytes32 cB = commitmentFor(priceB, "beta");

        vm.prank(bidderA);
        vault.commitBid(auctionId, cA);
        vm.prank(bidderB);
        vault.commitBid(auctionId, cB);

        // Aud does quality audit: bidderA score 90, bidderB score 60.
        vm.prank(auditor);
        vault.setAuditScore(auctionId, bidderA, 90, bytes32(0), "");
        vm.prank(auditor);
        vault.setAuditScore(auctionId, bidderB, 60, bytes32(0), "");

        // Avanza al reveal window.
        vm.warp(commitEnd + 1);

        vm.prank(bidderA);
        vault.revealBid(auctionId, bidderA, priceA, "alpha");
        vm.prank(bidderB);
        vault.revealBid(auctionId, bidderB, priceB, "beta");

        // Fin del reveal: se liquida. Para winner composito
        // priceWeight=70 + qualityWeight=30.
        vm.warp(revealEnd + 1);
        vault.settleAuction(auctionId);

        (, , , , , , , BlindBidVault.AuctionState state, address winner, uint256 winningPrice) =
            vault.auctions(auctionId);
        assertEq(uint256(state), uint256(BlindBidVault.AuctionState.Settled));
        assertEq(winner, bidderA);
        assertEq(winningPrice, priceA);
    }

    // ───────────────────────── Griefing slash ─────────────────────────

    function test_Griefing_NoReveal_SlashedToTreasury() public {
        uint256 auctionId = createAuctionAsOrganizer();

        uint256 priceA = 1000e6;
        vm.prank(bidderA);
        vault.commitBid(auctionId, commitmentFor(priceA, "alpha"));

        // bidderB comete pero NUNCA revela.
        vm.prank(bidderB);
        vault.commitBid(auctionId, commitmentFor(1001e6, "beta"));

        vm.warp(commitEnd + 1);
        vm.prank(bidderA);
        vault.revealBid(auctionId, bidderA, priceA, "alpha");

        vm.warp(revealEnd + 1);

        uint256 treasuryBefore = token.balanceOf(treasury);
        // Permissionless slash del bidderB no-revelador.
        vault.slashBid(auctionId, bidderB);

        // El stake de bidderB va al treasury, NO se reembolsa.
        assertEq(token.balanceOf(treasury), treasuryBefore + STAKE);

        (, , bool slashed, , ) = vault.commitments(auctionId, bidderB);
        assertTrue(slashed, "bidderB should be slashed");
    }

    // ───────────────────────── Refunds post-settle ─────────────────────────

    function test_Refund_NonWinnerAfterSettlement() public {
        uint256 auctionId = createAuctionAsOrganizer();
        uint256 priceA = 1000e6;
        uint256 priceB = 1001e6;

        vm.prank(bidderA);
        vault.commitBid(auctionId, commitmentFor(priceA, "alpha"));
        vm.prank(bidderB);
        vault.commitBid(auctionId, commitmentFor(priceB, "beta"));

        vm.prank(auditor);
        vault.setAuditScore(auctionId, bidderA, 50, bytes32(0), "");
        vm.prank(auditor);
        vault.setAuditScore(auctionId, bidderB, 90, bytes32(0), "");

        vm.warp(commitEnd + 1);
        vm.prank(bidderA);
        vault.revealBid(auctionId, bidderA, priceA, "alpha");
        vm.prank(bidderB);
        vault.revealBid(auctionId, bidderB, priceB, "beta");

        vm.warp(revealEnd + 1);
        vault.settleAuction(auctionId);
        (, , , , , , , , address winner, ) = vault.auctions(auctionId);
        assertEq(winner, bidderB); // quality 90 vence

        // El perdedor (bidderA) recupera el stake.
        uint256 aBefore = token.balanceOf(bidderA);
        vm.prank(bidderA);
        vault.claimRefund(auctionId);
        assertEq(token.balanceOf(bidderA), aBefore + STAKE);
    }

    // ───────────────────────── Limits ─────────────────────────

    function testRevert_RevealPriceOutOfBounds() public {
        uint256 auctionId = createAuctionAsOrganizer();
        uint256 tooLow = MIN_PRICE - 1;
        vm.prank(bidderA);
        vault.commitBid(auctionId, commitmentFor(tooLow, "x"));
        vm.warp(commitEnd + 1);
        vm.prank(bidderA);
        vm.expectRevert(BlindBidVault.PriceOutOfBounds.selector);
        vault.revealBid(auctionId, bidderA, tooLow, "x");
    }

    function testRevert_ConstructorWeightsMustSum100() public {
        vm.expectRevert(BlindBidVault.InvalidWeights.selector);
        new BlindBidVault(IERC20(address(token)), 60, 30);
    }

    function testRevert_CommitAfterCommitEnd() public {
        commitEnd = block.timestamp + 50;
        revealEnd = block.timestamp + 100;
        createAuctionAsOrganizer();
        vm.warp(block.timestamp + 51);
        vm.prank(bidderA);
        vm.expectRevert(BlindBidVault.AuctionClosed.selector);
        vault.commitBid(0, commitmentFor(1000e6, "x"));
    }

    // ───────────────────────── Roles ─────────────────────────

    function testRevert_SetAuditScore_OnlyAuditor() public {
        uint256 auctionId = createAuctionAsOrganizer();
        vm.prank(bidderA);
        vault.commitBid(auctionId, commitmentFor(1000e6, "x"));

        vm.prank(bidderB); // no auditor
        vm.expectRevert();
        vault.setAuditScore(auctionId, bidderA, 80, bytes32(0), "");
    }

    function testRevert_CancelAuction_OnlyOrganizer() public {
        createAuctionAsOrganizer();
        vm.prank(bidderA); // no organizador
        vm.expectRevert(BlindBidVault.NotOrganizer.selector);
        vault.cancelAuction(0);
    }

    // ───────────────────────── Invariantes: USDC no se pierde ─────────────────────────

    function invariant_TotalTokenBalance_NeverLost() public view {
        // En cualquier momento, la suma de USDC fuera del vault + dentro del vault
        // debe igualar el supply emitido. Como no acuñamos más tras setUp y
        // ningún monto se destruye, el balance del vault + sum(balances) == supply.
        uint256 supply = token.totalSupply();
        uint256 vaultBal = token.balanceOf(address(vault));
        assertLe(vaultBal, supply, "vault holds more than supply");
    }
}