
import { NextResponse } from "next/server";
import { authorizeAdmin } from "@/lib/adminAuth";
import { getAllRentals } from "@/services/rentalService";

export async function GET(request: Request) {
    const authError = await authorizeAdmin(request);

    if (authError) {
        return authError;
    }

    try {
        const rentals = await getAllRentals();

        return NextResponse.json({
            success: true,
            data: rentals,
        });
    } catch (error) {
        console.error("Admin get rentals error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Không thể tải danh sách đơn thuê",
            },
            { status: 500 }
        );
    }
}
