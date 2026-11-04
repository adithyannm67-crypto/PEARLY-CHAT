import { NextResponse } from "next/server";

const SERVER_URL =
  process.env.SERVER_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  "http://localhost:5000";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "userId is required" },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      `${SERVER_URL}/api/conversations?userId=${encodeURIComponent(userId)}`,
      { cache: "no-store" },
    );
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reach chat server" },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const response = await fetch(`${SERVER_URL}/api/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Failed to create conversation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reach chat server" },
      { status: 502 },
    );
  }
}
