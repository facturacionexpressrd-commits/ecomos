-- Create OrderRoute table
CREATE TABLE "OrderRoute" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "lineItemId" TEXT NOT NULL,
  "supplierOfferId" TEXT NOT NULL,
  "routedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "routedBy" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OrderRoute_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE,
  CONSTRAINT "OrderRoute_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE,
  CONSTRAINT "OrderRoute_lineItemId_fkey" FOREIGN KEY ("lineItemId") REFERENCES "OrderLineItem" ("id") ON DELETE CASCADE,
  CONSTRAINT "OrderRoute_supplierOfferId_fkey" FOREIGN KEY ("supplierOfferId") REFERENCES "SupplierOffer" ("id") ON DELETE RESTRICT
);

CREATE UNIQUE INDEX "OrderRoute_storeId_lineItemId_key" ON "OrderRoute"("storeId", "lineItemId");
CREATE INDEX "OrderRoute_orderId_idx" ON "OrderRoute"("orderId");
CREATE INDEX "OrderRoute_supplierOfferId_idx" ON "OrderRoute"("supplierOfferId");

-- Create SupplierOrder table
CREATE TABLE "SupplierOrder" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "supplier" TEXT NOT NULL,
  "supplierOrderId" TEXT,
  "totalCost" DECIMAL(12, 2) NOT NULL,
  "totalShipping" DECIMAL(12, 2) NOT NULL,
  "estimatedMargin" DECIMAL(12, 2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SupplierOrder_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE,
  CONSTRAINT "SupplierOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "SupplierOrder_orderId_supplier_key" ON "SupplierOrder"("orderId", "supplier");
CREATE INDEX "SupplierOrder_storeId_status_idx" ON "SupplierOrder"("storeId", "status");
CREATE INDEX "SupplierOrder_supplier_idx" ON "SupplierOrder"("supplier");

-- Create Fulfillment table
CREATE TABLE "Fulfillment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "supplierOrderId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "failureReason" TEXT,
  "shipmentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Fulfillment_supplierOrderId_fkey" FOREIGN KEY ("supplierOrderId") REFERENCES "SupplierOrder" ("id") ON DELETE CASCADE
);

CREATE INDEX "Fulfillment_supplierOrderId_idx" ON "Fulfillment"("supplierOrderId");
CREATE INDEX "Fulfillment_status_idx" ON "Fulfillment"("status");

-- Create Shipment table
CREATE TABLE "Shipment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "supplierOrderId" TEXT NOT NULL UNIQUE,
  "carrier" TEXT,
  "trackingNumber" TEXT,
  "estimatedDelivery" TIMESTAMP(3),
  "actualDelivery" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Shipment_supplierOrderId_fkey" FOREIGN KEY ("supplierOrderId") REFERENCES "SupplierOrder" ("id") ON DELETE CASCADE
);

CREATE INDEX "Shipment_trackingNumber_idx" ON "Shipment"("trackingNumber");

-- Create TrackingEvent table
CREATE TABLE "TrackingEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "shipmentId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "message" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TrackingEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment" ("id") ON DELETE CASCADE
);

CREATE INDEX "TrackingEvent_shipmentId_timestamp_idx" ON "TrackingEvent"("shipmentId", "timestamp");

-- Create FulfillmentException table
CREATE TABLE "FulfillmentException" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "supplierOrderId" TEXT NOT NULL,
  "exceptionType" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'medium',
  "description" TEXT NOT NULL,
  "recommendedAction" TEXT,
  "isResolved" BOOLEAN NOT NULL DEFAULT false,
  "resolvedAt" TIMESTAMP(3),
  "resolvedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FulfillmentException_supplierOrderId_fkey" FOREIGN KEY ("supplierOrderId") REFERENCES "SupplierOrder" ("id") ON DELETE CASCADE
);

CREATE INDEX "FulfillmentException_supplierOrderId_isResolved_idx" ON "FulfillmentException"("supplierOrderId", "isResolved");
CREATE INDEX "FulfillmentException_severity_idx" ON "FulfillmentException"("severity");

-- Update Fulfillment table to add shipmentId foreign key constraint
ALTER TABLE "Fulfillment" ADD CONSTRAINT "Fulfillment_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment" ("id") ON DELETE SET NULL;

-- Enable RLS on all new tables
ALTER TABLE "OrderRoute" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupplierOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Fulfillment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Shipment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TrackingEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FulfillmentException" ENABLE ROW LEVEL SECURITY;
