
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authorizeAdmin } from "@/lib/adminAuth";

export async function GET(request: Request) {
    const authError = await authorizeAdmin(request);
    if (authError) return authError;

    try {
        const categories = await prisma.category.findMany({
            orderBy: { name: "asc" },
            include: {
                _count: {
                    select: {
                        products: true,
                    },
                },
            },
        });

        return NextResponse.json({
            success: true,
            data: categories,
        });
    } catch (error) {
        console.error("Get admin categories error:", error);

        return NextResponse.json(
            { success: false, message: "Không thể tải danh mục" },
            { status: 500 }
        );
    }
}
