import { NextResponse } from "next/server";
import { authorizeAdmin } from "@/lib/adminAuth";
import {
    getCategoryById,
    updateCategory,
    deleteCategory,
} from "@/services/categoryService";

type Context = {
    params: Promise<{ id: string }>;
};

// GET: Lấy thông tin chi tiết danh mục
// Giữ công khai để trang sản phẩm có thể xem danh mục
export async function GET(
    _request: Request,
    { params }: Context
) {
    const { id } = await params;
    const categoryId = Number(id);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
        return NextResponse.json(
            {
                success: false,
                message: "Invalid category ID",
            },
            { status: 400 }
        );
    }

    try {
        const category = await getCategoryById(categoryId);

        if (!category) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Category not found",
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: category,
        });
    } catch (error) {
        console.error("Get category error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Internal server error",
            },
            { status: 500 }
        );
    }
}

// PATCH: Cập nhật danh mục
// Chỉ ADMIN mới được phép thực hiện
export async function PATCH(
    request: Request,
    { params }: Context
) {
    // Kiểm tra quyền quản trị trước khi xử lý
    const authError = await authorizeAdmin(request);

    if (authError) {
        return authError;
    }

    const { id } = await params;
    const categoryId = Number(id);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
        return NextResponse.json(
            {
                success: false,
                message: "Invalid category ID",
            },
            { status: 400 }
        );
    }

    try {
        const body = await request.json();

        if (
            typeof body.name !== "string" ||
            !body.name.trim()
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Category name is required",
                },
                { status: 400 }
            );
        }

        const existing = await getCategoryById(categoryId);

        if (!existing) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Category not found",
                },
                { status: 404 }
            );
        }

        const category = await updateCategory(
            categoryId,
            body.name.trim()
        );

        return NextResponse.json({
            success: true,
            message: "Category updated successfully",
            data: category,
        });
    } catch (error) {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "P2002"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Category name or slug already exists",
                },
                { status: 409 }
            );
        }

        console.error("Update category error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Internal server error",
            },
            { status: 500 }
        );
    }
}

// DELETE: Xóa danh mục
// Chỉ ADMIN mới được phép thực hiện
export async function DELETE(
    request: Request,
    { params }: Context
) {
    // Kiểm tra quyền quản trị trước khi xử lý
    const authError = await authorizeAdmin(request);

    if (authError) {
        return authError;
    }

    const { id } = await params;
    const categoryId = Number(id);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
        return NextResponse.json(
            {
                success: false,
                message: "Invalid category ID",
            },
            { status: 400 }
        );
    }

    try {
        const existing = await getCategoryById(categoryId);

        if (!existing) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Category not found",
                },
                { status: 404 }
            );
        }

        await deleteCategory(categoryId);

        return NextResponse.json({
            success: true,
            message: "Category deleted successfully",
        });
    } catch (error) {
        console.error("Delete category error:", error);

        return NextResponse.json(
            {
                success: false,
                message:
                    "Cannot delete category. Check whether it contains products.",
            },
            { status: 409 }
        );
    }
}