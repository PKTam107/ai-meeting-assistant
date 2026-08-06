"use client";

import { use } from "react";

import { MeetingDetail } from "@/features/meetings/components/meeting-detail";

export default function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <MeetingDetail id={id} />;
}
