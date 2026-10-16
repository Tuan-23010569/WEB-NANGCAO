
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { createOrder } from "@/services/orderService";
import { cancelOrder } from "@/services/orderService";

import {
    getOrders,
    getOrderById,
} from "@/services/orderService";


export async function createOrderController(request: Request) {
    const auth = await verifyAuthToken(request);

    if (!auth) {
        return NextResponse.json(
            { success: false, message: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const body = await request.json();

        if (
            !body ||
            typeof body !== "object" ||
            Array.isArray(body) ||
            typeof body.address !== "string" ||
            typeof body.phone !== "string"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "address and phone are required",
                },
                { status: 400 }
            );
        }

        const address = body.address.trim();
        const phone = body.phone.trim();

        if (
            !address ||
            address.length > 255 ||
            !phone ||
            phone.length > 20
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Address or phone is invalid",
                },
                { status: 400 }
            );
        }

        const order = await createOrder(auth.userId, {
            address,
            phone,
        });

        return NextResponse.json(
            {
                success: true,
                message: "Order created successfully",
                data: order,
            },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === "CART_EMPTY") {
                return NextResponse.json(
                    { success: false, message: "Your cart is empty" },
                    { status: 400 }
                );
            }

            if (error.message === "PRODUCT_UNAVAILABLE") {
                return NextResponse.json(
                    {
                        success: false,
                        message: "A product in your cart is unavailable",
                    },
                    { status: 409 }
                );
            }

            if (error.message === "INSUFFICIENT_STOCK") {
                return NextResponse.json(
                    {
                        success: false,
                        message: "Insufficient stock for one or more items",
                    },
                    { status: 409 }
                );
            }
        }

        console.error("Create order error:", error);

        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function getOrdersController(request: Request) {
    const auth = await verifyAuthToken(request);

    if (!auth) {
        return NextResponse.json(
            { success: false, message: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const orders = await getOrders(auth.userId);

        return NextResponse.json({
            success: true,
            data: orders,
        });
    } catch (error) {
        console.error("Get orders error:", error);

        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function getOrderByIdController(
    request: Request,
    orderId: number
) {
    const auth = await verifyAuthToken(request);

    if (!auth) {
        return NextResponse.json(
            { success: false, message: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const order = await getOrderById(
            orderId,
            auth.userId,
            auth.role === "ADMIN"
        );

        // Không tiết lộ đơn hàng có tồn tại hay không nếu người dùng
        // không có quyền truy cập.
        if (!order) {
            return NextResponse.json(
                { success: false, message: "Order not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: order,
        });
    } catch (error) {
        console.error("Get order detail error:", error);

        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function cancelOrderController(
    request: Request,
    orderId: number
) {
    const auth = await verifyAuthToken(request);

    if (!auth) {
        return NextResponse.json(
            { success: false, message: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const order = await cancelOrder(
            orderId,
            auth.userId,
            auth.role === "ADMIN"
        );

        return NextResponse.json({
            success: true,
            message: "Order cancelled successfully",
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
                        message: "This order has been paid and requires a refund workflow",
                    },
                    { status: 409 }
                );
            }
        }

        console.error("Cancel order error:", error);

        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
