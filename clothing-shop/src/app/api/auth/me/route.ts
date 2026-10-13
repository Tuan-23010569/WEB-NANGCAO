
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/auth";

export async function GET(request: Request) {
    const auth = await verifyAuthToken(request);

    if (!auth) {
        return NextResponse.json(
            {
                success: false,
                message: "Unauthorized: invalid or missing token",
            },
            { status: 401 }
        );
    }

    try {
        // Lấy role hiện tại từ database để không phụ thuộc
        // hoàn toàn vào role được ghi trong token.
        const user = await prisma.user.findUnique({
            where: { id: auth.userId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                address: true,
                role: true,
                createdAt: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    message: "User not found",
                },
                { status: 401 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "User information retrieved successfully",
            data: user,
        });
    } catch (error) {
        console.error("Get current user error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Internal server error",
            },
            { status: 500 }
        );
    }
}
