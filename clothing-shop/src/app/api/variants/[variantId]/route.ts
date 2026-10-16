
import { NextResponse } from "next/server";
import {
    updateVariantController,
    deleteVariantController,
} from "@/controllers/variantController";

type Context = {
    params: Promise<{ variantId: string }>;
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
    const { variantId } = await params;
    const id = parseId(variantId);

    if (id === null) {
        return NextResponse.json(
            { success: false, message: "Invalid variant ID" },
            { status: 400 }
        );
    }

    return updateVariantController(request, id);
}

export async function DELETE(
    _request: Request,
    { params }: Context
) {
    const { variantId } = await params;
    const id = parseId(variantId);

    if (id === null) {
        return NextResponse.json(
            { success: false, message: "Invalid variant ID" },
            { status: 400 }
        );
    }

    return deleteVariantController(_request, id);
}
