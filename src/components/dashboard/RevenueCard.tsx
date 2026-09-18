export default function RevenueCard({ amount, currency }: { amount: number; currency: string }) {
  const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-gray-600">Revenue</p>
      <p className="text-2xl font-semibold">{formatted}</p>
    </div>
  );
}
