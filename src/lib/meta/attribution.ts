import { prisma } from "@/lib/db";

/**
 * Attribute Shopify orders to Meta campaigns via utm_campaign tracking.
 *
 * Extracts utm_campaign parameter from order source URL, matches to MetaCampaign by name,
 * and creates OrderAttributionMeta records.
 */

interface AttributionResult {
  totalOrders: number;
  attributed: number;
  failed: number;
  errors: Array<{ orderId: string; reason: string }>;
}

export async function attributeOrders(storeId: string): Promise<AttributionResult> {
  const result: AttributionResult = {
    totalOrders: 0,
    attributed: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Get all unattributed orders for this store
    const orders = await prisma.order.findMany({
      where: {
        storeId,
        metaAttribution: null, // not yet attributed
      },
      select: {
        id: true,
        shopifyGid: true,
        raw: true,
      },
    });

    result.totalOrders = orders.length;

    // Get all Meta campaigns for this store
    const campaigns = await prisma.metaCampaign.findMany({
      where: { storeId },
      select: {
        id: true,
        name: true,
      },
    });

    // Build campaign lookup (name → id)
    const campaignByName = new Map(campaigns.map((c) => [c.name.toLowerCase(), c.id]));

    // Process each order
    for (const order of orders) {
      try {
        const utmCampaign = extractUtmCampaign(order.raw as Record<string, any>);
        if (!utmCampaign) {
          result.errors.push({
            orderId: order.id,
            reason: "No utm_campaign found in order source",
          });
          continue;
        }

        // Try exact match first
        let campaignId = campaignByName.get(utmCampaign.toLowerCase());
        let confidence = 1.0;
        let method = "utm_exact";

        // If no exact match, try fuzzy match (first 80% of name)
        if (!campaignId && utmCampaign.length > 5) {
          const fuzzyPattern = utmCampaign.substring(0, Math.ceil(utmCampaign.length * 0.8));
          for (const [campName, campId] of campaignByName) {
            if (campName.includes(fuzzyPattern.toLowerCase())) {
              campaignId = campId;
              confidence = 0.8;
              method = "utm_fuzzy";
              break;
            }
          }
        }

        if (!campaignId) {
          result.errors.push({
            orderId: order.id,
            reason: `Campaign "${utmCampaign}" not found or not synced yet`,
          });
          continue;
        }

        // Create attribution record
        await prisma.orderAttributionMeta.create({
          data: {
            orderId: order.id,
            storeId,
            metaCampaignId: campaignId,
            utmCampaign,
            confidence,
            method,
          },
        });

        result.attributed++;
      } catch (err) {
        result.failed++;
        result.errors.push({
          orderId: order.id,
          reason: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return result;
  } catch (err) {
    console.error("[Attribution] Error:", err);
    throw err;
  }
}

/**
 * Extract utm_campaign from Shopify order source.
 *
 * Shopify stores source as JSON with `source_name` (e.g., "facebook") and
 * `source_identifier` (tracking ID). We need to extract the utm_campaign
 * parameter from the order's source.
 *
 * In modern Shopify + Meta pixel setup, utm_campaign is typically in:
 * 1. order.source_name (if set to campaign name)
 * 2. order.raw.attributions[].title
 * 3. URL in order.raw.referring_site
 */
function extractUtmCampaign(orderRaw: Record<string, any>): string | null {
  // Try 1: Check attribution object (Shopify post-purchase API)
  if (Array.isArray(orderRaw.attributions)) {
    for (const attr of orderRaw.attributions) {
      if (attr.title && attr.source?.name?.toLowerCase().includes("meta")) {
        // Extract campaign from attribution title (e.g., "Meta - Campaign Name")
        const parts = attr.title.split(" - ");
        if (parts.length > 1) {
          return parts.slice(1).join(" - ").trim();
        }
      }
    }
  }

  // Try 2: Check referring_site for UTM parameters
  if (orderRaw.referring_site) {
    const match = orderRaw.referring_site.match(/utm_campaign=([^&]+)/i);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  // Try 3: Check source_name (if user set it to campaign name)
  if (orderRaw.source_name) {
    // Only use if it looks like a Meta attribution (contains campaign keywords)
    const source = orderRaw.source_name.toLowerCase();
    if (
      source.includes("facebook") ||
      source.includes("meta") ||
      source.includes("instagram") ||
      source.includes("paid_search")
    ) {
      return orderRaw.source_name;
    }
  }

  // Try 4: Check landing_site URL for UTM params
  if (orderRaw.landing_site) {
    const match = orderRaw.landing_site.match(/utm_campaign=([^&]+)/i);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
}

/**
 * Get attribution statistics for a campaign.
 */
export async function getCampaignAttributions(campaignId: string) {
  const attributions = await prisma.orderAttributionMeta.findMany({
    where: { metaCampaignId: campaignId },
    include: {
      order: {
        select: {
          id: true,
          name: true,
          totalPrice: true,
          placedAt: true,
        },
      },
    },
  });

  const totalRevenue = attributions.reduce(
    (sum, a) => sum + a.order.totalPrice.toNumber(),
    0
  );

  return {
    count: attributions.length,
    totalRevenue,
    avgOrderValue: attributions.length > 0 ? totalRevenue / attributions.length : 0,
    attributions,
  };
}
