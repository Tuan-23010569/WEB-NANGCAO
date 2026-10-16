
import prisma from "@/lib/prisma";

async function getOrCreateCart(userId: number) {
    return prisma.cart.upsert({
        where: { userId },
        create: { userId },
        update: {},
    });
}

export async function getCart(userId: number) {
    const cart = await getOrCreateCart(userId);

    const items = await prisma.cartItem.findMany({
        where: { cartId: cart.id },
        include: {
            variant: {
                include: {
                    product: {
                        include: {
                            category: true,
                        },
                    },
                },
            },
        },
        orderBy: { id: "desc" },
    });

    return {
        id: cart.id,
        items,
        totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    };
}

export async function addCartItem(
    userId: number,
    variantId: number,
    quantity: number
) {
    return prisma.$transaction(async (tx) => {
        const variant = await tx.productVariant.findUnique({
            where: { id: variantId },
            include: {
                product: {
                    select: {
                        isActive: true,
                    },
                },
            },
        });

        if (!variant || !variant.product.isActive) {
            throw new Error("VARIANT_NOT_AVAILABLE");
        }

        if (variant.stock < quantity) {
            throw new Error("INSUFFICIENT_STOCK");
        }

        const cart = await tx.cart.upsert({
            where: { userId },
            create: { userId },
            update: {},
        });

        const existingItem = await tx.cartItem.findUnique({
            where: {
                cartId_variantId: {
                    cartId: cart.id,
                    variantId,
                },
            },
        });

        const newQuantity = (existingItem?.quantity ?? 0) + quantity;

        if (newQuantity > variant.stock) {
            throw new Error("INSUFFICIENT_STOCK");
        }

        return tx.cartItem.upsert({
            where: {
                cartId_variantId: {
                    cartId: cart.id,
                    variantId,
                },
            },
            create: {
                cartId: cart.id,
                variantId,
                quantity,
            },
            update: {
                quantity: newQuantity,
            },
            include: {
                variant: {
                    include: {
                        product: true,
                    },
                },
            },
        });
    });
}

export async function updateCartItem(
    userId: number,
    itemId: number,
    quantity: number
) {
    return prisma.$transaction(async (tx) => {
        const item = await tx.cartItem.findFirst({
            where: {
                id: itemId,
                cart: { userId },
            },
            include: {
                variant: true,
            },
        });

        if (!item) {
            throw new Error("CART_ITEM_NOT_FOUND");
        }

        if (item.variant.stock < quantity) {
            throw new Error("INSUFFICIENT_STOCK");
        }

        return tx.cartItem.update({
            where: { id: itemId },
            data: { quantity },
            include: {
                variant: {
                    include: {
                        product: true,
                    },
                },
            },
        });
    });
}

export async function removeCartItem(
    userId: number,
    itemId: number
) {
    const result = await prisma.cartItem.deleteMany({
        where: {
            id: itemId,
            cart: { userId },
        },
    });

    if (result.count === 0) {
        throw new Error("CART_ITEM_NOT_FOUND");
    }

    return { id: itemId };
}
