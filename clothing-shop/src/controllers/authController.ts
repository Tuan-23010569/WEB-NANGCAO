
import { NextResponse } from "next/server";
import {
    registerUser,
    loginUser,
} from "@/services/authService";

//Đăng ký người dùng mới//
export async function registerController(request: Request) {
    try {
        const body = await request.json();

        const name =
            typeof body.name === "string" ? body.name.trim() : "";
        const email =
            typeof body.email === "string" ? body.email.trim() : "";
        const password =
            typeof body.password === "string" ? body.password : "";

        if (!name || !email || !password) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Name, email and password are required",
                },
                { status: 400 }
            );
        }

        if (name.length > 100) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Name must not exceed 100 characters",
                },
                { status: 400 }
            );
        }

        if (email.length > 191 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid email address",
                },
                { status: 400 }
            );
        }

        if (password.length < 8 || password.length > 72) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Password must be between 8 and 72 characters",
                },
                { status: 400 }
            );
        }

        const user = await registerUser({ name, email, password });

        return NextResponse.json(
            {
                success: true,
                message: "Registration successful",
                data: user,
            },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof SyntaxError) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid JSON body",
                },
                { status: 400 }
            );
        }

        if (
            error instanceof Error &&
            error.message === "EMAIL_ALREADY_EXISTS"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Email is already registered",
                },
                { status: 409 }
            );
        }

        console.error("Register error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Internal server error",
            },
            { status: 500 }
        );
    }
}

//Đăng nhập người dùng//
export async function loginController(request: Request) {
    try {
        const body = await request.json();

        const email =
            typeof body.email === "string" ? body.email.trim() : "";
        const password =
            typeof body.password === "string" ? body.password : "";

        if (!email || !password) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Email and password are required",
                },
                { status: 400 }
            );
        }

        if (
            email.length > 191 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid email address",
                },
                { status: 400 }
            );
        }

        const result = await loginUser({ email, password });

        return NextResponse.json({
            success: true,
            message: "Login successful",
            data: result,
        });
    } catch (error) {
        if (error instanceof SyntaxError) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid JSON body",
                },
                { status: 400 }
            );
        }

        if (
            error instanceof Error &&
            error.message === "INVALID_CREDENTIALS"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Email or password is incorrect",
                },
                { status: 401 }
            );
        }

        console.error("Login error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Internal server error",
            },
            { status: 500 }
        );
    }
}
