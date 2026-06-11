import type { Metadata } from "next";

import { DeletedTripsPageClient } from "./deleted-trips-page-client";

export const metadata: Metadata = {
  title: "最近删除 - TraceMe Next",
  description: "查看并恢复 30 天内软删除的行程。",
};

export default function DeletedTripsPage() {
  return <DeletedTripsPageClient />;
}
