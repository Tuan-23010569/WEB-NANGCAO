
import { NextResponse } from "next/server";
import {
    updateCartItemController,
    removeCartItemController,
} from "@/controllers/cartController";

type Context = {
    params: Promise<{ id: string }>;
};

function parseId(id: string): number | null {
    const value = Number(id);

    return Number.isSafeInteger(value) && value > 0
        ? value
        : null;
}

export async function PATCH(
    request: Request,
    { params }: Context
) {
    const { id } = await params;
    const itemId = parseId(id);

    if (itemId === null) {
        return NextResponse.json(
            { success: false, message: "Invalid cart item ID" },
            { status: 400 }
        );
    }

    return updateCartItemController(request, itemId);
}

export async function DELETE(
    request: Request,
    { params }: Context
) {
    const { id } = await params;
    const itemId = parseId(id);

    if (itemId === null) {
        return NextResponse.json(
            { success: false, message: "Invalid cart item ID" },
            { status: 400 }
        );
    }

    return removeCartItemController(request, itemId);
}
