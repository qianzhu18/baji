import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    status: "ok",
    previewWearUrls: [
      "/mock/wear-shirt.svg",
      "/mock/wear-backpack.svg",
      "/mock/wear-cap.svg",
    ],
  });
}
