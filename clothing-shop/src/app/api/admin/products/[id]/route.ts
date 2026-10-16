
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authorizeAdmin } from "@/lib/adminAuth";

type RouteContext = {
    params: Promise<{ id: string }>;
};

async function getProductId(params: RouteContext["params"]) {
    const { id } = await params;
    const productId = Number(id);

    if (!Number.isSafeInteger(productId) || productId <= 0) {
        return null;
    }

    return productId;
}

export async function GET(request: Request, { params }: RouteContext) {
    const authError = await authorizeAdmin(request);
    if (authError) return authError;

    const productId = await getProductId(params);

    if (!productId) {
        return NextResponse.json(
            { success: false, message: "ID sản phẩm không hợp lệ" },
            { status: 400 }
        );
    }

    try {
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                category: true,
                variants: true,
            },
        });

        if (!product) {
            return NextResponse.json(
                { success: false, message: "Không tìm thấy sản phẩm" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: product });
    } catch (error) {
        console.error("Get product detail error:", error);

        return NextResponse.json(
            { success: false, message: "Không thể tải chi tiết sản phẩm" },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request, { params }: RouteContext) {
    const authError = await authorizeAdmin(request);
    if (authError) return authError;

    const productId = await getProductId(params);

    if (!productId) {
        return NextResponse.json(
            { success: false, message: "ID sản phẩm không hợp lệ" },
            { status: 400 }
        );
    }

    try {
        const body = await request.json();

        const existingProduct = await prisma.product.findUnique({
            where: { id: productId },
        });

        if (!existingProduct) {
            return NextResponse.json(
                { success: false, message: "Không tìm thấy sản phẩm" },
                { status: 404 }
            );
        }

        const data: {
            name?: string;
            description?: string | null;
            imageUrl?: string | null;
            categoryId?: number;
            isActive?: boolean;
        } = {};

        if (body.name !== undefined) {
            if (typeof body.name !== "string" || !body.name.trim()) {
                return NextResponse.json(
                    { success: false, message: "Tên sản phẩm không hợp lệ" },
                    { status: 400 }
                );
            }

            data.name = body.name.trim();
        }

        if (body.description !== undefined) {
            if (
                body.description !== null &&
                typeof body.description !== "string"
            ) {
                return NextResponse.json(
                    { success: false, message: "Mô tả không hợp lệ" },
                    { status: 400 }
                );
            }

            data.description =
                typeof body.description === "string"
                    ? body.description.trim() || null
                    : null;
        }

        if (body.imageUrl !== undefined) {
            if (
                body.imageUrl !== null &&
                typeof body.imageUrl !== "string"
            ) {
                return NextResponse.json(
                    { success: false, message: "Đường dẫn ảnh không hợp lệ" },
                    { status: 400 }
                );
            }

            data.imageUrl =
                typeof body.imageUrl === "string"
                    ? body.imageUrl.trim() || null
                    : null;
        }

        if (body.categoryId !== undefined) {
            const categoryId = Number(body.categoryId);

            if (!Number.isSafeInteger(categoryId) || categoryId <= 0) {
                return NextResponse.json(
                    { success: false, message: "Danh mục không hợp lệ" },
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

            data.categoryId = categoryId;
        }

        if (body.isActive !== undefined) {
            if (typeof body.isActive !== "boolean") {
                return NextResponse.json(
                    { success: false, message: "Trạng thái sản phẩm không hợp lệ" },
                    { status: 400 }
                );
            }

            data.isActive = body.isActive;
        }

        const product = await prisma.product.update({
            where: { id: productId },
            data,
            include: {
                category: true,
                variants: true,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Cập nhật sản phẩm thành công",
            data: product,
        });
    } catch (error) {
        console.error("Update admin product error:", error);

        return NextResponse.json(
            { success: false, message: "Không thể cập nhật sản phẩm" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request, { params }: RouteContext) {
    const authError = await authorizeAdmin(request);
    if (authError) return authError;

    const productId = await getProductId(params);

    if (!productId) {
        return NextResponse.json(
            { success: false, message: "ID sản phẩm không hợp lệ" },
            { status: 400 }
        );
    }

    try {
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                variants: {
                    include: {
                        cartItems: true,
                        orderItems: true,
                        rentalItems: true,
                    },
                },
            },
        });

        if (!product) {
            return NextResponse.json(
                { success: false, message: "Không tìm thấy sản phẩm" },
                { status: 404 }
            );
        }

        const hasReferences = product.variants.some(
            (variant) =>
                variant.cartItems.length > 0 ||
                variant.orderItems.length > 0 ||
                variant.rentalItems.length > 0
        );

        if (hasReferences) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Sản phẩm đã có trong giỏ hàng hoặc đơn hàng/đơn thuê. Hãy ẩn sản phẩm thay vì xóa.",
                },
                { status: 409 }
            );
        }

        await prisma.$transaction(async (tx) => {
            await tx.productVariant.deleteMany({
                where: { productId },
            });

            await tx.product.delete({
                where: { id: productId },
            });
        });

        return NextResponse.json({
            success: true,
            message: "Xóa sản phẩm thành công",
        });
    } catch (error) {
        console.error("Delete admin product error:", error);

        return NextResponse.json(
            { success: false, message: "Không thể xóa sản phẩm" },
            { status: 500 }
        );
    }
}
