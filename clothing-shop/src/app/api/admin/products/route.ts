
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authorizeAdmin } from "@/lib/adminAuth";

export async function GET(request: Request) {
    const authError = await authorizeAdmin(request);
    if (authError) return authError;

    try {
        const products = await prisma.product.findMany({
            include: {
                category: true,
                variants: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json({
            success: true,
            data: products,
        });
    } catch (error) {
        console.error("Get admin products error:", error);

        return NextResponse.json(
            { success: false, message: "Không thể tải danh sách sản phẩm" },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    const authError = await authorizeAdmin(request);
    if (authError) return authError;

    try {
        const body = await request.json();

        const name =
            typeof body.name === "string" ? body.name.trim() : "";
        const description =
            typeof body.description === "string"
                ? body.description.trim()
                : null;
        const imageUrl =
            typeof body.imageUrl === "string" && body.imageUrl.trim()
                ? body.imageUrl.trim()
                : null;
        const categoryId = Number(body.categoryId);
        const isActive = body.isActive !== false;
        const variants = body.variants;

        if (!name || !Number.isSafeInteger(categoryId) || categoryId <= 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Tên sản phẩm và danh mục là bắt buộc",
                },
                { status: 400 }
            );
        }

        if (!Array.isArray(variants) || variants.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Sản phẩm phải có ít nhất một biến thể",
                },
                { status: 400 }
            );
        }

        const category = await prisma.category.findUnique({
            where: { id: categoryId },
        });

        if (!category) {
            return NextResponse.json(
                { success: false, message: "Danh mục không tồn tại" },
                { status: 400 }
            );
        }

        const normalizedVariants = variants.map((variant: {
            size?: unknown;
            color?: unknown;
            sku?: unknown;
            sellPrice?: unknown;
            rentalPrice?: unknown;
            stock?: unknown;
        }) => {
            const size = typeof variant.size === "string" ? variant.size.trim() : "";
            const color =
                typeof variant.color === "string" ? variant.color.trim() : "";
            const sku = typeof variant.sku === "string" ? variant.sku.trim() : "";
            const sellPrice = Number(variant.sellPrice);
            const rentalPrice = Number(variant.rentalPrice);
            const stock = Number(variant.stock);

            if (
                !size ||
                !color ||
                !sku ||
                !Number.isFinite(sellPrice) ||
                sellPrice < 0 ||
                !Number.isFinite(rentalPrice) ||
                rentalPrice < 0 ||
                !Number.isSafeInteger(stock) ||
                stock < 0
            ) {
                throw new Error("INVALID_VARIANT");
            }

            return {
                size,
                color,
                sku,
                sellPrice,
                rentalPrice,
                stock,
            };
        });

        const slugBase = name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

        const slug = `${slugBase || "san-pham"}-${Date.now()}`;

        const product = await prisma.product.create({
            data: {
                name,
                slug,
                description,
                imageUrl,
                categoryId,
                isActive,
                variants: {
                    create: normalizedVariants,
                },
            },
            include: {
                category: true,
                variants: true,
            },
        });

        return NextResponse.json(
            {
                success: true,
                message: "Thêm sản phẩm thành công",
                data: product,
            },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof Error && error.message === "INVALID_VARIANT") {
            return NextResponse.json(
                {
                    success: false,
                    message: "Thông tin biến thể không hợp lệ",
                },
                { status: 400 }
            );
        }

        console.error("Create admin product error:", error);

        return NextResponse.json(
            { success: false, message: "Không thể thêm sản phẩm" },
            { status: 500 }
        );
    }
}
