export default function InventoryCard({ unitsAvailable }: { unitsAvailable: number }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-gray-600">Inventory on hand</p>
      <p className="text-2xl font-semibold">{unitsAvailable.toLocaleString()}</p>
    </div>
  );
}
