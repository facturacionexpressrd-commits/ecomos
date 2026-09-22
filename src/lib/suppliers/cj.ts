/**
 * CJ Dropshipping API v2 client. Docs: https://developers.cjdropshipping.com/en/api/api2/
 * Every response is an envelope { code, result, message, data }; result=false means failure even on HTTP 200.
 * All prices are USD.
 */
const BASE = "https://developers.cjdropshipping.com/api2.0/v1";

export class CjError extends Error {
  constructor(message: string, readonly code?: number) {
    super(message);
    this.name = "CjError";
  }
}

type Envelope<T> = { code: number; result: boolean; message: string; data: T };

async function call<T>(path: string, init: { token?: string; method?: "GET" | "POST"; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(init.token ? { "CJ-Access-Token": init.token } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(20_000),
  });
  let json: Envelope<T>;
  try {
    json = (await res.json()) as Envelope<T>;
  } catch {
    throw new CjError(`CJ returned HTTP ${res.status} with no JSON body`);
  }
  if (!res.ok || !json.result) throw new CjError(json.message || `CJ request failed (HTTP ${res.status})`, json.code);
  return json.data;
}

// ---------- auth ----------

/** Exchanges the account's API key for an access token (valid ~180 days per CJ's docs). */
export async function getAccessToken(apiKey: string) {
  const data = await call<{ accessToken: string; accessTokenExpiryDate: string }>("/authentication/getAccessToken", {
    method: "POST",
    body: { apiKey },
  });
  const expires = new Date(data.accessTokenExpiryDate);
  // Fall back to a conservative 30 days if CJ's date string ever fails to parse.
  return {
    accessToken: data.accessToken,
    expiresAt: Number.isNaN(expires.getTime()) ? new Date(Date.now() + 30 * 86_400_000) : expires,
  };
}

// ---------- products ----------

export type CjVariant = { vid: string; sku: string | null; name: string | null; price: number };

type RawVariant = {
  vid: string;
  variantSku?: string | null;
  variantNameEn?: string | null;
  variantName?: string | null;
  variantSellPrice?: number | string | null;
};

const toVariant = (v: RawVariant): CjVariant => ({
  vid: v.vid,
  sku: v.variantSku ?? null,
  name: v.variantNameEn ?? v.variantName ?? null,
  price: Number(v.variantSellPrice ?? 0),
});

// CJ's "invalid API key or access token" code. Must surface as an error, never as "variant not found".
const CJ_AUTH_ERROR = 1600001;
const isNotFound = (err: unknown) => err instanceof CjError && err.code !== CJ_AUTH_ERROR;

/** Accepts either a CJ variant ID (vid) or a CJ variant SKU, since merchants copy whichever CJ shows them. */
export async function findVariant(token: string, ref: string): Promise<CjVariant | null> {
  const q = encodeURIComponent(ref.trim());
  try {
    const byVid = await call<RawVariant | null>(`/product/variant/queryByVid?vid=${q}`, { token });
    if (byVid?.vid) return toVariant(byVid);
  } catch (err) {
    if (!isNotFound(err)) throw err; // not a vid; fall through to SKU lookup
  }
  try {
    const product = await call<{ variants?: RawVariant[] } | null>(`/product/query?variantSku=${q}`, { token });
    const match = product?.variants?.find((v) => v.variantSku?.toLowerCase() === ref.trim().toLowerCase());
    return match ? toVariant(match) : null;
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export type CjStock = { countryCode: string; qty: number };

export async function getStock(token: string, vid: string): Promise<CjStock[]> {
  const rows = await call<{ countryCode?: string; totalInventoryNum?: number; storageNum?: number }[] | null>(
    `/stock/queryByVid?vid=${encodeURIComponent(vid)}`,
    { token }
  );
  return (rows ?? []).map((r) => ({ countryCode: r.countryCode ?? "CN", qty: Number(r.totalInventoryNum ?? r.storageNum ?? 0) }));
}

/** Ship from a warehouse in the destination country when it has stock (fastest), else the one with the most stock. */
export function pickOrigin(stock: CjStock[], shipTo: string): string {
  const local = stock.find((s) => s.countryCode === shipTo && s.qty > 0);
  if (local) return local.countryCode;
  const best = [...stock].sort((a, b) => b.qty - a.qty)[0];
  return best && best.qty > 0 ? best.countryCode : "CN";
}

// ---------- shipping ----------

export type CjFreight = { method: string; price: number; days: string };

export async function quoteFreight(
  token: string,
  from: string,
  to: string,
  products: { vid: string; quantity: number }[]
): Promise<CjFreight[]> {
  const rows = await call<{ logisticName: string; logisticPrice: number | string; logisticAging?: string }[] | null>(
    "/logistic/freightCalculate",
    { token, method: "POST", body: { startCountryCode: from, endCountryCode: to, products } }
  );
  return (rows ?? []).map((r) => ({ method: r.logisticName, price: Number(r.logisticPrice), days: r.logisticAging ?? "" }));
}

/** Cheapest method wins; ties go to the faster one (lower upper bound of CJ's "min-max" day range). */
export function cheapest(options: CjFreight[]): CjFreight | null {
  const maxDays = (d: string) => Number(d.split("-").pop()) || Infinity;
  return [...options].sort((a, b) => a.price - b.price || maxDays(a.days) - maxDays(b.days))[0] ?? null;
}

// ---------- orders ----------

export type CjOrderInput = {
  orderNumber: string;
  shippingCountryCode: string;
  shippingCountry: string;
  shippingProvince: string;
  shippingCity: string;
  shippingAddress: string;
  shippingAddress2?: string;
  shippingZip?: string;
  shippingPhone?: string;
  shippingCustomerName: string;
  email?: string;
  logisticName: string;
  fromCountryCode: string;
  products: { vid: string; quantity: number }[];
};

/**
 * payType 3 = create the order WITHOUT paying. The merchant reviews and pays it in their CJ account,
 * so EcomOS never spends their CJ balance on its own.
 */
export async function createOrder(token: string, input: CjOrderInput): Promise<{ orderId: string }> {
  const data = await call<{ orderId: string }>("/shopping/order/createOrderV2", {
    token,
    method: "POST",
    body: { ...input, payType: 3 },
  });
  return { orderId: data.orderId };
}

export type CjOrderDetail = {
  orderStatus: string;
  trackNumber: string | null;
  logisticName: string | null;
  productAmount: number | null;
  postageAmount: number | null;
};

export async function getOrderDetail(token: string, orderId: string): Promise<CjOrderDetail> {
  const d = await call<{
    orderStatus: string;
    trackNumber?: string | null;
    logisticName?: string | null;
    productAmount?: number | string | null;
    postageAmount?: number | string | null;
  }>(`/shopping/order/getOrderDetail?orderId=${encodeURIComponent(orderId)}`, { token });
  const num = (v: number | string | null | undefined) => (v == null || v === "" ? null : Number(v));
  return {
    orderStatus: d.orderStatus,
    trackNumber: d.trackNumber || null,
    logisticName: d.logisticName || null,
    productAmount: num(d.productAmount),
    postageAmount: num(d.postageAmount),
  };
}

/** CJ order status -> EcomOS SupplierOrder.status. */
export function mapOrderStatus(cjStatus: string): string {
  switch (cjStatus) {
    case "CREATED":
    case "IN_CART":
    case "UNPAID":
      return "awaiting_payment";
    case "PENDING":
    case "PROCESSING":
    case "UNSHIPPED":
      return "processing";
    case "SHIPPED":
      return "shipped";
    case "DELIVERED":
      return "delivered";
    case "CANCELLED":
      return "cancelled";
    default:
      return "processing";
  }
}
