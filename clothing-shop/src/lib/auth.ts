
import { jwtVerify } from "jose";

export type AuthPayload = {
    userId: number;
    role: "USER" | "ADMIN";
};

export async function verifyAuthToken(
    request: Request
): Promise<AuthPayload | null> {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
        return null;
    }

    const token = authorization.slice(7);
    const secret = process.env.JWT_SECRET;

    if (!token || !secret) {
        return null;
    }

    try {
        const { payload } = await jwtVerify(
            token,
            new TextEncoder().encode(secret),
            {
                algorithms: ["HS256"],
            }
        );

        const userId = Number(payload.sub);
        const role = payload.role;

        if (
            !Number.isSafeInteger(userId) ||
            userId <= 0 ||
            (role !== "USER" && role !== "ADMIN")
        ) {
            return null;
        }

        return { userId, role };
    } catch {
        // Token sai, hết hạn hoặc không hợp lệ.
        return null;
    }
}
