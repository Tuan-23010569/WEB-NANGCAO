
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

export async function getAllCategories() {
    return prisma.category.findMany({
        orderBy: { name: "asc" },
        include: {
            _count: {
                select: { products: true },
            },
        },
    });
}

export async function getCategoryById(id: number) {
    return prisma.category.findUnique({
        where: { id },
        include: {
            _count: {
                select: { products: true },
            },
        },
    });
}

export async function createCategory(name: string) {
    const normalizedName = name.trim();

    return prisma.category.create({
        data: {
            name: normalizedName,
            slug: createSlug(normalizedName),
        },
    });
}

export async function updateCategory(id: number, name: string) {
    const normalizedName = name.trim();

    return prisma.category.update({
        where: { id },
        data: {
            name: normalizedName,
            slug: createSlug(normalizedName),
        },
    });
}

export async function deleteCategory(id: number) {
    return prisma.category.delete({
        where: { id },
    });
}
