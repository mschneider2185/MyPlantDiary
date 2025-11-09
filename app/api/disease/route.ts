import { NextRequest, NextResponse } from "next/server";
import { diagnosePlant } from "@/lib/ai/diagnosePlant";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: "Missing image" }, { status: 400 });

    const result = await diagnosePlant(imageBase64);
    return NextResponse.json({ result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Unknown error" }, { status: 500 });
  }
}
