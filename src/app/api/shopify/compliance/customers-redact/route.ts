import { NextRequest } from "next/server";
import { handleComplianceWebhook, handleCustomersRedact } from "@/lib/shopify/compliance";

export async function POST(request: NextRequest) {
  return handleComplianceWebhook(request, handleCustomersRedact);
}
