import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authorizeAdmin } from "@/lib/adminAuth";
import { verifyAuthToken } from "@/lib/auth";

export async function GET(request: Request) {
    const authError = await authorizeAdmin(request);

    if (authError) {
        return authError;
    }

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                address: true,
                role: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json({
            success: true,
            data: users,
        });
    } catch (error) {
        console.error("Admin get users error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Không thể tải danh sách người dùng.",
            },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    const authError = await authorizeAdmin(request);

    if (authError) {
        return authError;
    }

    try {
        const auth = await verifyAuthToken(request);

        if (!auth) {
            return NextResponse.json(
                { success: false, message: "Vui lòng đăng nhập." },
                { status: 401 }
            );
        }

        const body = await request.json();
        const id = Number(body.id);
        const role = body.role;

        if (!Number.isInteger(id) || id <= 0) {
            return NextResponse.json(
                { success: false, message: "ID người dùng không hợp lệ." },
                { status: 400 }
            );
        }

        if (role !== "USER" && role !== "ADMIN") {
            return NextResponse.json(
                { success: false, message: "Vai trò không hợp lệ." },
                { status: 400 }
            );
        }

        if (id === auth.userId) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Bạn không thể tự thay đổi vai trò của mình.",
                },
                { status: 400 }
            );
        }

        const existingUser = await prisma.user.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!existingUser) {
            return NextResponse.json(
                { success: false, message: "Không tìm thấy người dùng." },
                { status: 404 }
            );
        }

        const user = await prisma.user.update({
            where: { id },
            data: { role },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Cập nhật vai trò thành công.",
            data: user,
        });
    } catch (error) {
        console.error("Admin update user role error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Không thể cập nhật vai trò người dùng.",
            },
            { status: 500 }
        );
    }
}