
import { NextResponse } from "next/server";
import * as categoryService from "@/services/categoryService";

export async function getCategoriesController() {
    try {
        const categories = await categoryService.getAllCategories();

        return NextResponse.json({
            success: true,
            data: categories,
        });
    } catch (error) {
        console.error("Get categories error:", error);

        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function createCategoryController(request: Request) {
    try {
        const body = await request.json();
        const name = body.name;

        if (typeof name !== "string" || !name.trim()) {
            return NextResponse.json(
                { success: false, message: "Category name is required" },
                { status: 400 }
            );
        }

        const category = await categoryService.createCategory(name);

        return NextResponse.json(
            {
                success: true,
                message: "Category created successfully",
                data: category,
            },
            { status: 201 }
        );
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

        console.error("Create category error:", error);

        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
