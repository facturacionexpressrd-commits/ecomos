import { NextRequest } from "next/server";
import { handleComplianceWebhook, handleShopRedact } from "@/lib/shopify/compliance";

export async function POST(request: NextRequest) {
  return handleComplianceWebhook(request, handleShopRedact);
}
