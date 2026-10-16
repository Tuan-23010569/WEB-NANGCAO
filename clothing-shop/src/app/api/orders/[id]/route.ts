
import { NextResponse } from "next/server";
import { getOrderByIdController } from "@/controllers/orderController";

type Context = {
    params: Promise<{ id: string }>;
};

function parseId(id: string): number | null {
    const value = Number(id);

    return Number.isSafeInteger(value) && value > 0
        ? value
        : null;
}

export async function GET(
    request: Request,
    { params }: Context
) {
    const { id } = await params;
    const orderId = parseId(id);

    if (orderId === null) {
        return NextResponse.json(
            { success: false, message: "Invalid order ID" },
            { status: 400 }
        );
    }

    return getOrderByIdController(request, orderId);
}
