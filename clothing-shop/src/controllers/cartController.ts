
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import {
    getCart,
    addCartItem,
    updateCartItem,
    removeCartItem,
} from "@/services/cartService";

function handleCartError(error: unknown) {
    if (error instanceof Error) {
        if (error.message === "VARIANT_NOT_AVAILABLE") {
            return NextResponse.json(
                { success: false, message: "Product variant is unavailable" },
                { status: 404 }
            );
        }

        if (error.message === "CART_ITEM_NOT_FOUND") {
            return NextResponse.json(
                { success: false, message: "Cart item not found" },
                { status: 404 }
            );
        }

        if (error.message === "INSUFFICIENT_STOCK") {
            return NextResponse.json(
                { success: false, message: "Insufficient stock" },
                { status: 409 }
            );
        }
    }

    console.error("Cart API error:", error);

    return NextResponse.json(
        { success: false, message: "Internal server error" },
        { status: 500 }
    );
}

export async function getCartController(request: Request) {
    const auth = await verifyAuthToken(request);

    if (!auth) {
        return NextResponse.json(
            { success: false, message: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const cart = await getCart(auth.userId);

        return NextResponse.json({
            success: true,
            data: cart,
        });
    } catch (error) {
        return handleCartError(error);
    }
}

export async function addCartItemController(request: Request) {
    const auth = await verifyAuthToken(request);

    if (!auth) {
        return NextResponse.json(
            { success: false, message: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const body = await request.json();

        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return NextResponse.json(
                { success: false, message: "Invalid request body" },
                { status: 400 }
            );
        }

        const { variantId, quantity = 1 } = body;

        if (
            !Number.isSafeInteger(variantId) ||
            variantId <= 0 ||
            !Number.isSafeInteger(quantity) ||
            quantity <= 0
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "variantId and quantity must be positive integers",
                },
                { status: 400 }
            );
        }

        const item = await addCartItem(
            auth.userId,
            variantId,
            quantity
        );

        return NextResponse.json(
            {
                success: true,
                message: "Item added to cart successfully",
                data: item,
            },
            { status: 201 }
        );
    } catch (error) {
        return handleCartError(error);
    }
}

export async function updateCartItemController(
    request: Request,
    itemId: number
) {
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
            !Number.isSafeInteger(body.quantity) ||
            body.quantity <= 0
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "quantity must be a positive integer",
                },
                { status: 400 }
            );
        }

        const item = await updateCartItem(
            auth.userId,
            itemId,
            body.quantity
        );

        return NextResponse.json({
            success: true,
            message: "Cart item updated successfully",
            data: item,
        });
    } catch (error) {
        return handleCartError(error);
    }
}

export async function removeCartItemController(
    request: Request,
    itemId: number
) {
    const auth = await verifyAuthToken(request);

    if (!auth) {
        return NextResponse.json(
            { success: false, message: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const item = await removeCartItem(auth.userId, itemId);

        return NextResponse.json({
            success: true,
            message: "Cart item removed successfully",
            data: item,
        });
    } catch (error) {
        return handleCartError(error);
    }
}
