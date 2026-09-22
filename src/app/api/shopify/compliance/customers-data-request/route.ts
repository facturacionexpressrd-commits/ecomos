import { NextRequest } from "next/server";
import { handleComplianceWebhook, handleCustomersDataRequest } from "@/lib/shopify/compliance";

export async function POST(request: NextRequest) {
  return handleComplianceWebhook(request, handleCustomersDataRequest);
}
