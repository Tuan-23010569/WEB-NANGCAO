
import { NextResponse } from "next/server";
import {
    getVariantsController,
    createVariantController,
} from "@/controllers/variantController";

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

    return getVariantsController(productId);
}

export async function POST(
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

    return createVariantController(request, productId);
}
