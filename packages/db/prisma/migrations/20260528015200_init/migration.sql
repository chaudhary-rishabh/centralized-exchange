-- CreateEnum
CREATE TYPE "Side" AS ENUM ('Bid', 'Ask');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('Open', 'PartiallyFilled', 'Filled', 'Cancelled');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('Market', 'Limit');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "markets" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "marketId" INTEGER NOT NULL,
    "side" "Side" NOT NULL,
    "orderType" "OrderType" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'Open',
    "price" DECIMAL(20,8),
    "qty" DECIMAL(20,8) NOT NULL,
    "filledQty" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "initialMargin" DECIMAL(20,8) NOT NULL,
    "slippage" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fills" (
    "id" SERIAL NOT NULL,
    "marketId" INTEGER NOT NULL,
    "makerOrderId" INTEGER NOT NULL,
    "takerOrderId" INTEGER NOT NULL,
    "makerId" INTEGER NOT NULL,
    "takerId" INTEGER NOT NULL,
    "qty" DECIMAL(20,8) NOT NULL,
    "price" DECIMAL(20,8) NOT NULL,
    "makerFee" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "takerFee" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "markets_slug_key" ON "markets"("slug");

-- CreateIndex
CREATE INDEX "markets_slug_idx" ON "markets"("slug");

-- CreateIndex
CREATE INDEX "orders_marketId_status_side_idx" ON "orders"("marketId", "status", "side");

-- CreateIndex
CREATE INDEX "orders_userId_status_idx" ON "orders"("userId", "status");

-- CreateIndex
CREATE INDEX "orders_marketId_price_side_status_idx" ON "orders"("marketId", "price", "side", "status");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX "fills_marketId_createdAt_idx" ON "fills"("marketId", "createdAt");

-- CreateIndex
CREATE INDEX "fills_makerId_idx" ON "fills"("makerId");

-- CreateIndex
CREATE INDEX "fills_takerId_idx" ON "fills"("takerId");

-- CreateIndex
CREATE INDEX "fills_makerOrderId_idx" ON "fills"("makerOrderId");

-- CreateIndex
CREATE INDEX "fills_takerOrderId_idx" ON "fills"("takerOrderId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fills" ADD CONSTRAINT "fills_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fills" ADD CONSTRAINT "fills_makerOrderId_fkey" FOREIGN KEY ("makerOrderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fills" ADD CONSTRAINT "fills_takerOrderId_fkey" FOREIGN KEY ("takerOrderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fills" ADD CONSTRAINT "fills_makerId_fkey" FOREIGN KEY ("makerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fills" ADD CONSTRAINT "fills_takerId_fkey" FOREIGN KEY ("takerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
