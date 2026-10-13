
import prisma from "@/lib/prisma";

export async function getVariantsByProductId(productId: number) {
    return prisma.productVariant.findMany({
        where: { productId },
        orderBy: { id: "asc" },
    });
}

export async function createVariant(
    productId: number,
    data: {
        size: string;
        color: string;
        sku: string;
        sellPrice: number;
        rentalPrice: number;
        stock?: number;
    }
) {
    const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true },
    });

    if (!product) {
        throw new Error("PRODUCT_NOT_FOUND");
    }

    return prisma.productVariant.create({
        data: {
            productId,
            size: data.size.trim(),
            color: data.color.trim(),
            sku: data.sku.trim(),
            sellPrice: data.sellPrice,
            rentalPrice: data.rentalPrice,
            stock: data.stock ?? 0,
        },
    });
}


export async function updateVariant(
    variantId: number,
    data: {
        size?: string;
        color?: string;
        sku?: string;
        sellPrice?: number;
        rentalPrice?: number;
        stock?: number;
    }
) {
    const updateData: {
        size?: string;
        color?: string;
        sku?: string;
        sellPrice?: number;
        rentalPrice?: number;
        stock?: number;
    } = {};

    if (data.size !== undefined) updateData.size = data.size.trim();
    if (data.color !== undefined) updateData.color = data.color.trim();
    if (data.sku !== undefined) updateData.sku = data.sku.trim();
    if (data.sellPrice !== undefined) updateData.sellPrice = data.sellPrice;
    if (data.rentalPrice !== undefined) updateData.rentalPrice = data.rentalPrice;
    if (data.stock !== undefined) updateData.stock = data.stock;

    return prisma.productVariant.update({
        where: { id: variantId },
        data: updateData,
    });
}

export async function deleteVariant(variantId: number) {
    return prisma.$transaction(async (tx) => {
        const variant = await tx.productVariant.findUnique({
            where: { id: variantId },
            include: {
                _count: {
                    select: {
                        cartItems: true,
                        orderItems: true,
                        rentalItems: true,
                    },
                },
            },
        });

        if (!variant) {
            throw new Error("VARIANT_NOT_FOUND");
        }

        if (
            variant._count.cartItems > 0 ||
            variant._count.orderItems > 0 ||
            variant._count.rentalItems > 0
        ) {
            throw new Error("VARIANT_HAS_REFERENCES");
        }

        return tx.productVariant.delete({
            where: { id: variantId },
        });
    });
}
