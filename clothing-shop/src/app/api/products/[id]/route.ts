
import { NextResponse } from "next/server";
import {
    getProductByIdController,
    updateProductController,
    deleteProductController,
} from "@/controllers/productController";

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
    _request: Request,
    { params }: Context
) {
    const { id } = await params;
    const productId = parseId(id);

    if (productId === null) {
        return NextResponse.json(
            { success: false, message: "Invalid product ID" },
            { status: 400 }
        );
    }

    return getProductByIdController(productId);
}

export async function PATCH(
    request: Request,
    { params }: Context
) {
    const { id } = await params;
    const productId = parseId(id);

    if (productId === null) {
        return NextResponse.json(
            { success: false, message: "Invalid product ID" },
            { status: 400 }
        );
    }

    return updateProductController(request, productId);
}

export async function DELETE(
    _request: Request,
    { params }: Context
) {
    const { id } = await params;
    const productId = parseId(id);

    if (productId === null) {
        return NextResponse.json(
            { success: false, message: "Invalid product ID" },
            { status: 400 }
        );
    }

    return deleteProductController(productId);
}
