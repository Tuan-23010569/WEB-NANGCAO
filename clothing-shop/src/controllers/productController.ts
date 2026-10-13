
import { NextResponse } from "next/server";
import * as productService from "@/services/productService";

function isPrismaError(
    error: unknown,
    code: string
): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === code
    );
}

function handleProductError(error: unknown) {
    if (error instanceof Error && error.message === "CATEGORY_NOT_FOUND") {
        return NextResponse.json(
            { success: false, message: "Category not found" },
            { status: 400 }
        );
    }

    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
        return NextResponse.json(
            { success: false, message: "Product not found" },
            { status: 404 }
        );
    }

    if (error instanceof Error && error.message === "PRODUCT_HAS_REFERENCES") {
        return NextResponse.json(
            {
                success: false,
                message: "Cannot delete a product used in a cart, order or rental",
            },
            { status: 409 }
        );
    }

    if (isPrismaError(error, "P2002")) {
        return NextResponse.json(
            {
                success: false,
                message: "Product slug, SKU or size/color combination already exists",
            },
            { status: 409 }
        );
    }

    if (isPrismaError(error, "P2025")) {
        return NextResponse.json(
            { success: false, message: "Product not found" },
            { status: 404 }
        );
    }

    console.error("Product API error:", error);

    return NextResponse.json(
        { success: false, message: "Internal server error" },
        { status: 500 }
    );
}

export async function getProductsController(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const keyword = searchParams.get("keyword")?.trim() || "";

        const products = await productService.getAllProducts(keyword);

        return NextResponse.json({
            success: true,
            data: products,
        });
    } catch (error) {
        return handleProductError(error);
    }
}

export async function createProductController(request: Request) {
    try {
        const body = await request.json();

        if (
            typeof body.name !== "string" ||
            !body.name.trim() ||
            !Number.isInteger(body.categoryId) ||
            body.categoryId <= 0 ||
            !Array.isArray(body.variants) ||
            body.variants.length === 0
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Name, valid categoryId and at least one variant are required",
                },
                { status: 400 }
            );
        }

        if (
            (body.description != null &&
                typeof body.description !== "string") ||
            (body.imageUrl != null &&
                typeof body.imageUrl !== "string") ||
            (body.isActive !== undefined &&
                typeof body.isActive !== "boolean")
        ) {
            return NextResponse.json(
                { success: false, message: "Invalid product information" },
                { status: 400 }
            );
        }

        for (const variant of body.variants) {
            if (
                !variant ||
                typeof variant.size !== "string" ||
                !variant.size.trim() ||
                typeof variant.color !== "string" ||
                !variant.color.trim() ||
                typeof variant.sku !== "string" ||
                !variant.sku.trim() ||
                typeof variant.sellPrice !== "number" ||
                !Number.isFinite(variant.sellPrice) ||
                variant.sellPrice < 0 ||
                typeof variant.rentalPrice !== "number" ||
                !Number.isFinite(variant.rentalPrice) ||
                variant.rentalPrice < 0 ||
                (variant.stock !== undefined &&
                    (!Number.isInteger(variant.stock) || variant.stock < 0))
            ) {
                return NextResponse.json(
                    {
                        success: false,
                        message: "Invalid variant: check size, color, SKU, prices and stock",
                    },
                    { status: 400 }
                );
            }
        }

        const combinations = body.variants.map(
            (variant: { size: string; color: string }) =>
                `${variant.size.trim().toLowerCase()}|${variant.color.trim().toLowerCase()}`
        );

        if (new Set(combinations).size !== combinations.length) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Duplicate size and color combinations are not allowed",
                },
                { status: 400 }
            );
        }

        const skus = body.variants.map(
            (variant: { sku: string }) => variant.sku.trim().toLowerCase()
        );

        if (new Set(skus).size !== skus.length) {
            return NextResponse.json(
                { success: false, message: "Duplicate SKUs are not allowed" },
                { status: 400 }
            );
        }

        const product = await productService.createProduct(body);

        return NextResponse.json(
            {
                success: true,
                message: "Product created successfully",
                data: product,
            },
            { status: 201 }
        );
    } catch (error) {
        return handleProductError(error);
    }
}

export async function getProductByIdController(id: number) {
    try {
        const product = await productService.getProductById(id);

        if (!product) {
            return NextResponse.json(
                { success: false, message: "Product not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: product,
        });
    } catch (error) {
        return handleProductError(error);
    }
}

export async function updateProductController(
    request: Request,
    id: number
) {
    try {
        const body = await request.json();

        if (
            Object.keys(body).length === 0 ||
            (body.name !== undefined &&
                (typeof body.name !== "string" || !body.name.trim())) ||
            (body.description !== undefined &&
                body.description !== null &&
                typeof body.description !== "string") ||
            (body.imageUrl !== undefined &&
                body.imageUrl !== null &&
                typeof body.imageUrl !== "string") ||
            (body.categoryId !== undefined &&
                (!Number.isInteger(body.categoryId) || body.categoryId <= 0)) ||
            (body.isActive !== undefined &&
                typeof body.isActive !== "boolean")
        ) {
            return NextResponse.json(
                { success: false, message: "Invalid product update data" },
                { status: 400 }
            );
        }

        const allowedFields = [
            "name",
            "description",
            "imageUrl",
            "categoryId",
            "isActive",
        ];

        if (Object.keys(body).some((key) => !allowedFields.includes(key))) {
            return NextResponse.json(
                { success: false, message: "Unsupported update field" },
                { status: 400 }
            );
        }

        const product = await productService.updateProduct(id, body);

        return NextResponse.json({
            success: true,
            message: "Product updated successfully",
            data: product,
        });
    } catch (error) {
        return handleProductError(error);
    }
}

export async function deleteProductController(id: number) {
    try {
        await productService.deleteProduct(id);

        return NextResponse.json({
            success: true,
            message: "Product deleted successfully",
        });
    } catch (error) {
        return handleProductError(error);
    }
}
