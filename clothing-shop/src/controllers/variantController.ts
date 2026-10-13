
import { NextResponse } from "next/server";
import {
    createVariant,
    getVariantsByProductId,
} from "@/services/variantService";

export async function getVariantsController(productId: number) {
    try {
        const variants = await getVariantsByProductId(productId);

        return NextResponse.json({
            success: true,
            data: variants,
        });
    } catch (error) {
        console.error("Get variants error:", error);

        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function createVariantController(
    request: Request,
    productId: number
) {
    try {
        const body = await request.json();

        const size = body.size;
        const color = body.color;
        const sku = body.sku;
        const sellPrice = body.sellPrice;
        const rentalPrice = body.rentalPrice;
        const stock = body.stock ?? 0;

        if (
            typeof size !== "string" ||
            !size.trim() ||
            typeof color !== "string" ||
            !color.trim() ||
            typeof sku !== "string" ||
            !sku.trim() ||
            typeof sellPrice !== "number" ||
            !Number.isFinite(sellPrice) ||
            sellPrice < 0 ||
            typeof rentalPrice !== "number" ||
            !Number.isFinite(rentalPrice) ||
            rentalPrice < 0 ||
            !Number.isSafeInteger(stock) ||
            stock < 0
        ) {
            return NextResponse.json(
                { success: false, message: "Invalid variant data" },
                { status: 400 }
            );
        }

        const variant = await createVariant(productId, {
            size,
            color,
            sku,
            sellPrice,
            rentalPrice,
            stock,
        });

        return NextResponse.json(
            {
                success: true,
                message: "Variant created successfully",
                data: variant,
            },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
            return NextResponse.json(
                { success: false, message: "Product not found" },
                { status: 404 }
            );
        }

        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "P2002"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "SKU already exists or this size/color combination exists",
                },
                { status: 409 }
            );
        }

        console.error("Create variant error:", error);

        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}

import {
    updateVariant,
    deleteVariant,
} from "@/services/variantService";

export async function updateVariantController(
    request: Request,
    variantId: number
) {
    try {
        const body = await request.json();

        const allowedFields = [
            "size",
            "color",
            "sku",
            "sellPrice",
            "rentalPrice",
            "stock",
        ];

        const keys = Object.keys(body);

        if (
            !body ||
            typeof body !== "object" ||
            Array.isArray(body) ||
            keys.length === 0 ||
            keys.some((key) => !allowedFields.includes(key))
        ) {
            return NextResponse.json(
                { success: false, message: "Invalid variant data" },
                { status: 400 }
            );
        }

        for (const key of ["size", "color", "sku"]) {
            if (
                body[key] !== undefined &&
                (typeof body[key] !== "string" || !body[key].trim())
            ) {
                return NextResponse.json(
                    { success: false, message: `${key} must be a non-empty string` },
                    { status: 400 }
                );
            }
        }

        for (const key of ["sellPrice", "rentalPrice"]) {
            if (
                body[key] !== undefined &&
                (typeof body[key] !== "number" ||
                    !Number.isFinite(body[key]) ||
                    body[key] < 0)
            ) {
                return NextResponse.json(
                    { success: false, message: `${key} must be a non-negative number` },
                    { status: 400 }
                );
            }
        }

        if (
            body.stock !== undefined &&
            (!Number.isSafeInteger(body.stock) || body.stock < 0)
        ) {
            return NextResponse.json(
                { success: false, message: "stock must be a non-negative integer" },
                { status: 400 }
            );
        }

        const variant = await updateVariant(variantId, body);

        return NextResponse.json({
            success: true,
            message: "Variant updated successfully",
            data: variant,
        });
    } catch (error) {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "P2025"
        ) {
            return NextResponse.json(
                { success: false, message: "Variant not found" },
                { status: 404 }
            );
        }

        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "P2002"
        ) {
            return NextResponse.json(
                { success: false, message: "SKU or size/color combination already exists" },
                { status: 409 }
            );
        }

        console.error("Update variant error:", error);

        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function deleteVariantController(variantId: number) {
    try {
        await deleteVariant(variantId);

        return NextResponse.json({
            success: true,
            message: "Variant deleted successfully",
        });
    } catch (error) {
        if (
            error instanceof Error &&
            error.message === "VARIANT_NOT_FOUND"
        ) {
            return NextResponse.json(
                { success: false, message: "Variant not found" },
                { status: 404 }
            );
        }

        if (
            error instanceof Error &&
            error.message === "VARIANT_HAS_REFERENCES"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Cannot delete a variant referenced by cart, order, or rental items",
                },
                { status: 409 }
            );
        }

        console.error("Delete variant error:", error);

        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
