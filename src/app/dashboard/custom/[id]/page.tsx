"use client";
import { useState } from "react";

export default function CustomDashboardPage() {
  const [widgets, setWidgets] = useState([
    { id: 1, type: "revenue", title: "Revenue" },
    { id: 2, type: "profit", title: "Profit" },
    { id: 3, type: "products", title: "Top Products" },
    { id: 4, type: "campaigns", title: "Campaigns" },
  ]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Custom Dashboard</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded">
          Edit Layout
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {widgets.map((w) => (
          <div key={w.id} className="bg-white rounded-lg p-4 shadow">
            <h3 className="font-semibold">{w.title}</h3>
            <p className="text-sm text-gray-500 mt-2">[{w.type} widget]</p>
          </div>
        ))}
      </div>
    </div>
  );
}