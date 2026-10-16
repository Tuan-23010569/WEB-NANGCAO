
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";

import {
    createRental,
    getRentals,
    getRentalById,
    cancelRental,
    updateRentalStatus,
} from "@/services/rentalService";




// POST /api/rentals
export async function createRentalController(request: Request) {
    try {
        const auth = await verifyAuthToken(request);

        if (!auth) {
            return NextResponse.json(
                { message: "Vui long dang nhap" },
                { status: 401 }
            );
        }

        const body = await request.json();

        const { startDate, endDate, address, phone, items } = body;

        if (
            typeof startDate !== "string" ||
            typeof endDate !== "string" ||
            typeof address !== "string" ||
            !address.trim() ||
            typeof phone !== "string" ||
            !phone.trim() ||
            !Array.isArray(items)
        ) {
            return NextResponse.json(
                { message: "Du lieu don thue khong hop le" },
                { status: 400 }
            );
        }

        const rental = await createRental(auth.userId, {
            startDate,
            endDate,
            address,
            phone,
            items,
        });

        return NextResponse.json(
            {
                message: "Tao don thue thanh cong",
                data: rental,
            },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof SyntaxError) {
            return NextResponse.json(
                { message: "JSON khong hop le" },
                { status: 400 }
            );
        }

        if (error instanceof Error) {
            const badRequestErrors = [
                "INVALID_DATE",
                "INVALID_DATE_RANGE",
                "RENTAL_ITEMS_EMPTY",
                "INVALID_RENTAL_ITEM",
            ];

            if (badRequestErrors.includes(error.message)) {
                return NextResponse.json(
                    { message: error.message },
                    { status: 400 }
                );
            }

            const conflictErrors = [
                "VARIANT_NOT_FOUND",
                "PRODUCT_UNAVAILABLE",
                "INSUFFICIENT_STOCK",
            ];

            if (conflictErrors.includes(error.message)) {
                return NextResponse.json(
                    { message: error.message },
                    { status: 409 }
                );
            }
        }

        console.error("Create rental error:", error);

        return NextResponse.json(
            { message: "Loi server khi tao don thue" },
            { status: 500 }
        );
    }
}

// GET /api/rentals
export async function getRentalsController(request: Request) {
    try {
        const auth = await verifyAuthToken(request);

        if (!auth) {
            return NextResponse.json(
                { message: "Vui long dang nhap" },
                { status: 401 }
            );
        }

        const rentals = await getRentals(auth.userId);

        return NextResponse.json(
            {
                message: "Lay danh sach don thue thanh cong",
                data: rentals,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Get rentals error:", error);

        return NextResponse.json(
            { message: "Loi server khi lay danh sach don thue" },
            { status: 500 }
        );
    }
}

// GET /api/rentals/[id]
export async function getRentalByIdController(
    request: Request,
    rentalId: number
) {
    try {
        const auth = await verifyAuthToken(request);

        if (!auth) {
            return NextResponse.json(
                { message: "Vui long dang nhap" },
                { status: 401 }
            );
        }

        const rental = await getRentalById(
            rentalId,
            auth.userId,
            auth.role === "ADMIN"
        );

        if (!rental) {
            return NextResponse.json(
                { message: "Khong tim thay don thue" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                message: "Lay chi tiet don thue thanh cong",
                data: rental,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Get rental detail error:", error);

        return NextResponse.json(
            { message: "Loi server khi lay chi tiet don thue" },
            { status: 500 }
        );
    }
}

export async function cancelRentalController(
    request: Request,
    rentalId: number
) {
    try {
        const auth = await verifyAuthToken(request);

        if (!auth) {
            return NextResponse.json(
                { message: "Vui long dang nhap" },
                { status: 401 }
            );
        }

        const rental = await cancelRental(
            rentalId,
            auth.userId,
            auth.role === "ADMIN"
        );

        return NextResponse.json(
            {
                message: "Huy don thue thanh cong",
                data: rental,
            },
            { status: 200 }
        );
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === "RENTAL_NOT_FOUND") {
                return NextResponse.json(
                    { message: "Khong tim thay don thue" },
                    { status: 404 }
                );
            }

            if (error.message === "RENTAL_CANNOT_CANCEL") {
                return NextResponse.json(
                    { message: "Don thue khong the huy" },
                    { status: 409 }
                );
            }

            if (error.message === "RENTAL_PAYMENT_ALREADY_PAID") {
                return NextResponse.json(
                    { message: "Don thue da thanh toan, khong the huy" },
                    { status: 409 }
                );
            }
        }

        console.error("Cancel rental error:", error);

        return NextResponse.json(
            { message: "Loi server khi huy don thue" },
            { status: 500 }
        );
    }
}

export async function updateRentalStatusController(
    request: Request,
    rentalId: number
) {
    try {
        const auth = await verifyAuthToken(request);

        if (!auth) {
            return NextResponse.json(
                { message: "Vui long dang nhap" },
                { status: 401 }
            );
        }

        if (auth.role !== "ADMIN") {
            return NextResponse.json(
                { message: "Ban khong co quyen thuc hien thao tac nay" },
                { status: 403 }
            );
        }

        let body: { status?: unknown };

        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { message: "JSON khong hop le" },
                { status: 400 }
            );
        }

        const allowedStatuses = [
            "CONFIRMED",
            "RENTING",
            "RETURNED",
        ];

        if (
            typeof body.status !== "string" ||
            !allowedStatuses.includes(body.status)
        ) {
            return NextResponse.json(
                { message: "Trang thai don thue khong hop le" },
                { status: 400 }
            );
        }

        const rental = await updateRentalStatus(
            rentalId,
            body.status as "CONFIRMED" | "RENTING" | "RETURNED"
        );

        return NextResponse.json(
            {
                message: "Cap nhat trang thai don thue thanh cong",
                data: rental,
            },
            { status: 200 }
        );
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === "RENTAL_NOT_FOUND") {
                return NextResponse.json(
                    { message: "Khong tim thay don thue" },
                    { status: 404 }
                );
            }

            if (error.message === "INVALID_RENTAL_STATUS_TRANSITION") {
                return NextResponse.json(
                    { message: "Khong the chuyen sang trang thai nay" },
                    { status: 409 }
                );
            }
        }

        console.error("Update rental status error:", error);

        return NextResponse.json(
            { message: "Loi server khi cap nhat trang thai don thue" },
            { status: 500 }
        );
    }
}
