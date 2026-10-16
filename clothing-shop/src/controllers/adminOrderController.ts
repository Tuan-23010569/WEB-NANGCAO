
import { NextResponse } from "next/server";
import { authorizeAdmin } from "@/lib/adminAuth";
import {
    cancelOrder,
    updateOrderStatus,
} from "@/services/orderService";

type NextOrderStatus = "CONFIRMED" | "SHIPPING" | "COMPLETED";

const validStatuses: NextOrderStatus[] = [
    "CONFIRMED",
    "SHIPPING",
    "COMPLETED",
];

export async function updateAdminOrderStatusController(
    request: Request,
    orderId: number
) {
    const authError = await authorizeAdmin(request);

    if (authError) {
        return authError;
    }

    try {
        const body = await request.json().catch(() => null);

        if (
            !body ||
            typeof body.status !== "string" ||
            ![...validStatuses, "CANCELLED"].includes(body.status)
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid order status",
                },
                { status: 400 }
            );
        }

        const order =
            body.status === "CANCELLED"
                ? await cancelOrder(orderId, 0, true)
                : await updateOrderStatus(
                    orderId,
                    body.status as NextOrderStatus
                );

        return NextResponse.json({
            success: true,
            message: "Order status updated successfully",
            data: order,
        });
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === "ORDER_NOT_FOUND") {
                return NextResponse.json(
                    { success: false, message: "Order not found" },
                    { status: 404 }
                );
            }

            if (error.message === "ORDER_CANNOT_CANCEL") {
                return NextResponse.json(
                    {
                        success: false,
                        message: "Order cannot be cancelled in its current status",
                    },
                    { status: 409 }
                );
            }

            if (error.message === "ORDER_PAYMENT_ALREADY_PAID") {
                return NextResponse.json(
                    {
                        success: false,
                        message: "Paid orders require a refund workflow",
                    },
                    { status: 409 }
                );
            }

            if (error.message === "INVALID_ORDER_TRANSITION") {
                return NextResponse.json(
                    {
                        success: false,
                        message: "Invalid order status transition",
                    },
                    { status: 409 }
                );
            }
        }

        console.error("Admin update order status error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Internal server error",
            },
            { status: 500 }
        );
    }
}
