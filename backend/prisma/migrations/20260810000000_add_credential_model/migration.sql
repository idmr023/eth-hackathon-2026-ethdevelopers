-- CreateTable
CREATE TABLE "credential" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "schema_uid" VARCHAR(66) NOT NULL,
    "recipient_wallet" VARCHAR(42) NOT NULL,
    "attester" VARCHAR(42) NOT NULL,
    "auction_id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" VARCHAR(2000),
    "issuer" VARCHAR(255) NOT NULL,
    "badge" VARCHAR(100) NOT NULL,
    "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tx_hash" VARCHAR(66),

    CONSTRAINT "credential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credential_uid_key" ON "credential"("uid");

-- CreateIndex
CREATE INDEX "credential_recipient_wallet_idx" ON "credential"("recipient_wallet");

-- CreateIndex
CREATE INDEX "credential_auction_id_idx" ON "credential"("auction_id");
