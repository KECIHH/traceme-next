import type { Metadata } from "next";

import { SharedTripPageClient } from "./shared-trip-page-client";

export const metadata: Metadata = {
  title: "共享行程 - TraceMe Next",
  description: "查看公开只读的旅行计划快照。",
  robots: {
    index: false,
    follow: false,
  },
};

type SharedTripPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function SharedTripPage({ params }: SharedTripPageProps) {
  const { token } = await params;

  return <SharedTripPageClient token={token} />;
}
