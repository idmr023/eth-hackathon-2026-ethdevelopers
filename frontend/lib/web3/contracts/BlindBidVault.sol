// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title BlindBidVault
 * @notice Sealed-bid auction (licitación) using a commit-reveal scheme on Arbitrum.
 * @dev Bidders stake USDC and commit to keccak256(price, secret). During the
 *      reveal window they (or their AI auto-reveal agent) disclose the secret.
 *      The winner is the bidder with the highest composite score: a normalized
 *      price term weighted against an on-chain AI audit score.
 *
 *      - Bidders that never reveal are slashed (griefing): their stake goes to
 *        the organizer's treasury, NOT to other bidders.
 *      - AUDITOR_ROLE writes AI quality scores (0-100) before revealEnd.
 */
contract BlindBidVault is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    enum AuctionState { Active, Settled, Cancelled }

    struct Auction {
        address organizer;
        address treasury; // receiver of slashed stakes
        uint256 stakeAmount; // USDC required to participate
        uint256 minPrice;
        uint256 maxPrice;
        uint256 commitEnd; // commit window: [created, commitEnd)
        uint256 revealEnd; // reveal window:  [commitEnd, revealEnd]
        AuctionState state;
        address winner;
        uint256 winningPrice;
        address[] bidders;
    }

    struct Commitment {
        bytes32 hash; // keccak256(abi.encodePacked(price, secret))
        bool revealed;
        bool slashed;
        bool refunded;
        uint256 price;
    }

    IERC20 public immutable token;
    uint256 public immutable priceWeight; // e.g. 70
    uint256 public immutable qualityWeight; // e.g. 30 (must sum to 100)

    uint256 public nextAuctionId;
    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => mapping(address => Commitment)) public commitments;
    mapping(uint256 => mapping(address => bool)) public hasCommitted;
    mapping(uint256 => mapping(address => uint256)) public auditScores; // 0..100

    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed organizer,
        address treasury,
        uint256 stakeAmount,
        uint256 minPrice,
        uint256 maxPrice,
        uint256 commitEnd,
        uint256 revealEnd
    );
    event BidCommitted(uint256 indexed auctionId, address indexed bidder, bytes32 commitment);
    event BidRevealed(uint256 indexed auctionId, address indexed bidder, uint256 price);
    event BidSlashed(uint256 indexed auctionId, address indexed bidder, uint256 amount, address treasury);
    event AuctionSettled(uint256 indexed auctionId, address indexed winner, uint256 winningPrice);
    event AuctionCancelled(uint256 indexed auctionId);
    event StakeRefunded(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event AuditScoreSet(
        uint256 indexed auctionId, address indexed bidder, uint256 aiScore, bytes32 docHash, string summaryUri
    );

    error InvalidWeights();
    error InvalidTiming();
    error InvalidAmount();
    error InvalidPrice();
    error InvalidScore();
    error AuctionNotFound();
    error AuctionClosed();
    error NotOrganizer();
    error AlreadyCommitted();
    error NotCommitted();
    error AlreadyRevealed();
    error AlreadySlashed();
    error InvalidReveal();
    error PriceOutOfBounds();
    error AlreadyRefunded();
    error RevealNotOpen();
    error AlreadySettled();
    error AlreadyCancelled();

    constructor(IERC20 _token, uint256 _priceWeight, uint256 _qualityWeight) {
        if (_priceWeight + _qualityWeight != 100) revert InvalidWeights();
        token = _token;
        priceWeight = _priceWeight;
        qualityWeight = _qualityWeight;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    modifier duringCommit(uint256 auctionId) {
        Auction storage a = auctions[auctionId];
        if (a.organizer == address(0)) revert AuctionNotFound();
        if (a.state != AuctionState.Active || block.timestamp >= a.commitEnd) revert AuctionClosed();
        _;
    }

    modifier duringReveal(uint256 auctionId) {
        Auction storage a = auctions[auctionId];
        if (a.organizer == address(0)) revert AuctionNotFound();
        if (a.state != AuctionState.Active) revert AuctionClosed();
        if (block.timestamp < a.commitEnd || block.timestamp > a.revealEnd) revert RevealNotOpen();
        _;
    }

    /**
     * @notice Creates a new sealed-bid auction. The organizer also acts as the
     *         recipient of slashed stakes unless a separate treasury is given.
     */
    function createAuction(
        address treasury,
        uint256 stakeAmount,
        uint256 minPrice,
        uint256 maxPrice,
        uint256 commitEnd,
        uint256 revealEnd
    )
        external
        returns (uint256 auctionId)
    {
        if (stakeAmount == 0) revert InvalidAmount();
        if (minPrice == 0 || maxPrice <= minPrice) revert InvalidPrice();
        if (block.timestamp >= commitEnd || commitEnd >= revealEnd) revert InvalidTiming();

        auctionId = nextAuctionId++;
        auctions[auctionId] = Auction({
            organizer: msg.sender,
            treasury: treasury == address(0) ? msg.sender : treasury,
            stakeAmount: stakeAmount,
            minPrice: minPrice,
            maxPrice: maxPrice,
            commitEnd: commitEnd,
            revealEnd: revealEnd,
            state: AuctionState.Active,
            winner: address(0),
            winningPrice: 0,
            bidders: new address[](0)
        });

        emit AuctionCreated(
            auctionId, msg.sender, auctions[auctionId].treasury, stakeAmount, minPrice, maxPrice, commitEnd, revealEnd
        );
    }

    /**
     * @notice Commits a blinded bid and locks the USDC stake.
     * @param commitment keccak256(abi.encodePacked(price, secret))
     */
    function commitBid(uint256 auctionId, bytes32 commitment) external duringCommit(auctionId) nonReentrant {
        if (hasCommitted[auctionId][msg.sender]) revert AlreadyCommitted();
        Auction storage a = auctions[auctionId];

        token.safeTransferFrom(msg.sender, address(this), a.stakeAmount);
        a.bidders.push(msg.sender);
        hasCommitted[auctionId][msg.sender] = true;
        commitments[auctionId][msg.sender] = Commitment(commitment, false, false, false, 0);

        emit BidCommitted(auctionId, msg.sender, commitment);
    }

    /**
     * @notice Reveals a blinded bid. Anyone holding the true (price, secret)
     *         pair can reveal on behalf of a bidder: the hash binding is what
     *         authenticates, so a delegated auto-reveal agent (or the bidder
     *         themselves) may settle the bid without exposing it early.
     */
    function revealBid(uint256 auctionId_, address bidder, uint256 price, string calldata secret)
        external
        duringReveal(auctionId_)
    {
        Auction storage a = auctions[auctionId_];
        Commitment storage c = commitments[auctionId_][bidder];
        if (!hasCommitted[auctionId_][bidder]) revert NotCommitted();
        if (c.revealed) revert AlreadyRevealed();
        if (c.slashed) revert AlreadySlashed();
        if (keccak256(abi.encodePacked(price, secret)) != c.hash) revert InvalidReveal();
        if (price < a.minPrice || price > a.maxPrice) revert PriceOutOfBounds();

        c.revealed = true;
        c.price = price;

        emit BidRevealed(auctionId_, bidder, price);
    }

    /**
     * @notice Slashes a bidder that failed to reveal before revealEnd. The stake
     *         is transferred to the organizer's treasury. Permissionless so
     *         anyone can punish griefers.
     */
    function slashBid(uint256 auctionId, address bidder) external {
        Auction storage a = auctions[auctionId];
        if (a.organizer == address(0)) revert AuctionNotFound();
        if (a.state != AuctionState.Active) revert AuctionClosed();
        if (block.timestamp <= a.revealEnd) revert RevealNotOpen();

        Commitment storage c = commitments[auctionId][bidder];
        if (!hasCommitted[auctionId][bidder]) revert NotCommitted();
        if (c.revealed) revert AlreadyRevealed();
        if (c.slashed) revert AlreadySlashed();

        c.slashed = true;
        token.safeTransfer(a.treasury, a.stakeAmount);

        emit BidSlashed(auctionId, bidder, a.stakeAmount, a.treasury);
    }

    /**
     * @notice Settles the auction: picks the winner by composite score
     *         (normalized price * priceWeight + AI quality * qualityWeight).
     *         Ties resolve to the earliest bidder in the array.
     */
    function settleAuction(uint256 auctionId) external {
        Auction storage a = auctions[auctionId];
        if (a.organizer == address(0)) revert AuctionNotFound();
        if (a.state != AuctionState.Active) revert AlreadySettled();
        if (block.timestamp <= a.revealEnd) revert RevealNotOpen();

        a.state = AuctionState.Settled;

        uint256 best = 0;
        for (uint256 i = 0; i < a.bidders.length; i++) {
            address bidder = a.bidders[i];
            Commitment storage c = commitments[auctionId][bidder];
            if (!c.revealed) continue;

            uint256 priceScore = ((a.maxPrice - c.price) * 1e4) / (a.maxPrice - a.minPrice); // 0..10000
            uint256 qualityScore = auditScores[auctionId][bidder] * 100; // 0..10000
            uint256 composite = priceScore * priceWeight + qualityScore * qualityWeight; // max 1_000_000

            if (composite > best) {
                best = composite;
                a.winner = bidder;
                a.winningPrice = c.price;
            }
        }

        emit AuctionSettled(auctionId, a.winner, a.winningPrice);
    }

    /**
     * @notice Refunds a committed bidder's stake after settlement or
     *         cancellation. Slashed bidders are excluded.
     */
    function claimRefund(uint256 auctionId) external nonReentrant {
        Auction storage a = auctions[auctionId];
        if (a.organizer == address(0)) revert AuctionNotFound();
        if (a.state != AuctionState.Settled && a.state != AuctionState.Cancelled) revert AuctionClosed();

        Commitment storage c = commitments[auctionId][msg.sender];
        if (!hasCommitted[auctionId][msg.sender]) revert NotCommitted();
        if (c.slashed) revert AlreadySlashed();
        if (c.refunded) revert AlreadyRefunded();

        c.refunded = true;
        token.safeTransfer(msg.sender, a.stakeAmount);

        emit StakeRefunded(auctionId, msg.sender, a.stakeAmount);
    }

    /**
     * @notice Cancels an auction before the commit window closes (organizer only).
     */
    function cancelAuction(uint256 auctionId) external {
        Auction storage a = auctions[auctionId];
        if (a.organizer == address(0)) revert AuctionNotFound();
        if (msg.sender != a.organizer) revert NotOrganizer();
        if (a.state != AuctionState.Active) revert AlreadyCancelled();
        if (block.timestamp >= a.commitEnd) revert AuctionClosed();

        a.state = AuctionState.Cancelled;

        emit AuctionCancelled(auctionId);
    }

    /**
     * @notice AI Auditor writes a quality score (0-100) for a bidder's technical
     *         proposal. Must be recorded before revealEnd so settlement can use it.
     */
    function setAuditScore(
        uint256 auctionId,
        address bidder,
        uint256 aiScore,
        bytes32 docHash,
        string calldata summaryUri
    )
        external
        onlyRole(AUDITOR_ROLE)
    {
        Auction storage a = auctions[auctionId];
        if (a.organizer == address(0)) revert AuctionNotFound();
        if (a.state != AuctionState.Active || block.timestamp > a.revealEnd) revert AuctionClosed();
        if (!hasCommitted[auctionId][bidder]) revert NotCommitted();
        if (aiScore > 100) revert InvalidScore();

        auditScores[auctionId][bidder] = aiScore;

        emit AuditScoreSet(auctionId, bidder, aiScore, docHash, summaryUri);
    }
}
