import { NextResponse } from "next/server";

const SERVER_URL =
  process.env.SERVER_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  "http://localhost:5000";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const excludeUserId = searchParams.get("excludeUserId");

  try {
    const query = excludeUserId
      ? `?excludeUserId=${encodeURIComponent(excludeUserId)}`
      : "";
    const response = await fetch(`${SERVER_URL}/api/users${query}`, {
      cache: "no-store",
    });
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reach chat server" },
      { status: 502 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.text();
    const response = await fetch(`${SERVER_URL}/api/users`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reach chat server" },
      { status: 502 },
    );
  }
}
