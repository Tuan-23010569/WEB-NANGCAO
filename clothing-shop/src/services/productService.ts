
import prisma from "@/lib/prisma";

function createSlug(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export async function getAllProducts(keyword = "") {
    return prisma.product.findMany({
        where: keyword
            ? {
                name: {
                    contains: keyword,
                },
            }
            : {},
        include: {
            category: true,
            variants: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}

export async function getProductById(id: number) {
    return prisma.product.findUnique({
        where: { id },
        include: {
            category: true,
            variants: true,
        },
    });
}

export async function createProduct(data: {
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    categoryId: number;
    isActive?: boolean;
    variants: {
        size: string;
        color: string;
        sku: string;
        sellPrice: number;
        rentalPrice: number;
        stock?: number;
    }[];
}) {
    const slug = createSlug(data.name);

    return prisma.$transaction(async (tx) => {
        const category = await tx.category.findUnique({
            where: { id: data.categoryId },
        });

        if (!category) {
            throw new Error("CATEGORY_NOT_FOUND");
        }

        const product = await tx.product.create({
            data: {
                name: data.name.trim(),
                slug,
                description: data.description?.trim() || null,
                imageUrl: data.imageUrl?.trim() || null,
                categoryId: data.categoryId,
                isActive: data.isActive ?? true,
            },
        });

        await tx.productVariant.createMany({
            data: data.variants.map((variant) => ({
                productId: product.id,
                size: variant.size.trim(),
                color: variant.color.trim(),
                sku: variant.sku.trim(),
                sellPrice: variant.sellPrice,
                rentalPrice: variant.rentalPrice,
                stock: variant.stock ?? 0,
            })),
        });

        return tx.product.findUniqueOrThrow({
            where: { id: product.id },
            include: {
                category: true,
                variants: true,
            },
        });
    });
}

export async function updateProduct(
    id: number,
    data: {
        name?: string;
        description?: string | null;
        imageUrl?: string | null;
        categoryId?: number;
        isActive?: boolean;
    }
) {
    const updateData: {
        name?: string;
        slug?: string;
        description?: string | null;
        imageUrl?: string | null;
        categoryId?: number;
        isActive?: boolean;
    } = {};

    if (data.name !== undefined) {
        updateData.name = data.name.trim();
        updateData.slug = createSlug(data.name);
    }

    if (data.description !== undefined) {
        updateData.description = data.description?.trim() || null;
    }

    if (data.imageUrl !== undefined) {
        updateData.imageUrl = data.imageUrl?.trim() || null;
    }

    if (data.categoryId !== undefined) {
        const category = await prisma.category.findUnique({
            where: { id: data.categoryId },
        });

        if (!category) {
            throw new Error("CATEGORY_NOT_FOUND");
        }

        updateData.categoryId = data.categoryId;
    }

    if (data.isActive !== undefined) {
        updateData.isActive = data.isActive;
    }

    return prisma.product.update({
        where: { id },
        data: updateData,
        include: {
            category: true,
            variants: true,
        },
    });
}

export async function deleteProduct(id: number) {
    return prisma.$transaction(async (tx) => {
        const product = await tx.product.findUnique({
            where: { id },
            include: {
                variants: {
                    include: {
                        _count: {
                            select: {
                                cartItems: true,
                                orderItems: true,
                                rentalItems: true,
                            },
                        },
                    },
                },
            },
        });

        if (!product) {
            throw new Error("PRODUCT_NOT_FOUND");
        }

        const hasReferences = product.variants.some(
            (variant) =>
                variant._count.cartItems > 0 ||
                variant._count.orderItems > 0 ||
                variant._count.rentalItems > 0
        );

        if (hasReferences) {
            throw new Error("PRODUCT_HAS_REFERENCES");
        }

        await tx.productVariant.deleteMany({
            where: { productId: id },
        });

        return tx.product.delete({
            where: { id },
        });
    });
}
