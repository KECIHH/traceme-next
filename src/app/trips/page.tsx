import type { Metadata } from "next";

import { TripsPageClient } from "./trips-page-client";

export const metadata: Metadata = {
  title: "我的行程 - TraceMe Next",
  description: "查看已保存的只读旅行计划列表。",
};

export default function TripsPage() {
  return <TripsPageClient />;
}
