
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";

export async function authorizeAdmin(
    request: Request
): Promise<NextResponse | null> {
    const auth = await verifyAuthToken(request);

    if (!auth) {
        return NextResponse.json(
            { message: "Vui long dang nhap" },
            { status: 401 }
        );
    }

    if (auth.role !== "ADMIN") {
        return NextResponse.json(
            { message: "Ban khong co quyen ADMIN" },
            { status: 403 }
        );
    }

    return null;
}
