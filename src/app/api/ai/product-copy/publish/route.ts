import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { storeId, copyId, headline, description } = await req.json();

  // Verify user has access
  const access = await prisma.userStoreAccess.findFirst({
    where: { userId: user.id, storeId },
  });

  if (!access) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const copy = await prisma.productAICopy.findFirst({
      where: { id: copyId, storeId },
      include: { product: true },
    });

    if (!copy) {
      return NextResponse.json(
        { error: "Copy not found" },
        { status: 404 }
      );
    }

    const product = copy.product;
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: { metaAccounts: true },
    });

    if (!store) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 }
      );
    }

    // Call Shopify to update product
    const shopifyResponse = await fetch(
      `https://${store.shopDomain}/admin/api/2024-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": store.accessTokenEncrypted!,
        },
        body: JSON.stringify({
          query: `
            mutation UpdateProduct($input: ProductInput!) {
              productUpdate(input: $input) {
                product {
                  id
                  title
                  description
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `,
          variables: {
            input: {
              id: product.shopifyGid,
              title: headline,
              bodyHtml: description.replace(/\n/g, "<br>"),
            },
          },
        }),
      }
    );

    const shopifyData = await shopifyResponse.json();

    if (shopifyData.errors || shopifyData.data?.productUpdate?.userErrors?.length > 0) {
      throw new Error(
        shopifyData.errors?.[0]?.message ||
          shopifyData.data?.productUpdate?.userErrors?.[0]?.message ||
          "Shopify update failed"
      );
    }

    // Mark as published
    const updated = await prisma.productAICopy.update({
      where: { id: copyId },
      data: {
        isPublished: true,
        publishedAt: new Date(),
        publishedHeadline: headline,
        publishedDescription: description,
      },
    });

    return NextResponse.json({ copy: updated }, { status: 200 });
  } catch (error) {
    console.error("Publish error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Publish failed" },
      { status: 500 }
    );
  }
}
