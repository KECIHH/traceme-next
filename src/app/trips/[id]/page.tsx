import type { Metadata } from "next";

import { TripDetailPageClient } from "./trip-detail-page-client";

export const metadata: Metadata = {
  title: "行程详情 - TraceMe Next",
  description: "查看已保存旅行计划的只读详情。",
};

type TripDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TripDetailPage({ params }: TripDetailPageProps) {
  const { id } = await params;

  return <TripDetailPageClient id={id} />;
}
