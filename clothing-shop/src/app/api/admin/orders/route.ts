
import { NextResponse } from "next/server";
import { authorizeAdmin } from "@/lib/adminAuth";
import { getAllOrders } from "@/services/orderService";

export async function GET(request: Request) {
    const authError = await authorizeAdmin(request);

    if (authError) {
        return authError;
    }

    try {
        const orders = await getAllOrders();

        return NextResponse.json({
            success: true,
            data: orders,
        });
    } catch (error) {
        console.error("Admin get orders error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Internal server error",
            },
            { status: 500 }
        );
    }
}
