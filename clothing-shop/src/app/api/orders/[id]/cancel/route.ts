
import { NextResponse } from "next/server";
import { cancelOrderController } from "@/controllers/orderController";

type Context = {
    params: Promise<{ id: string }>;
};

export async function PATCH(
    request: Request,
    { params }: Context
) {
    const { id } = await params;
    const orderId = Number(id);

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
        return NextResponse.json(
            { success: false, message: "Invalid order ID" },
            { status: 400 }
        );
    }

    return cancelOrderController(request, orderId);
}
