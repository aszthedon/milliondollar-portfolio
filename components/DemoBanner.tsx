"use client";

import { DEMO_MODE } from "@/lib/demo";

export default function DemoBanner() {
  if (!DEMO_MODE) return null;

  return (
    <div className="bg-yellow-500 px-4 py-3 text-center text-sm font-medium text-black">
      Demo Mode • Changes may be reset periodically
    </div>
  );
}