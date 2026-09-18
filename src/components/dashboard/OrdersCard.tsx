export default function OrdersCard({ count }: { count: number }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-gray-600">Orders</p>
      <p className="text-2xl font-semibold">{count.toLocaleString()}</p>
    </div>
  );
}
