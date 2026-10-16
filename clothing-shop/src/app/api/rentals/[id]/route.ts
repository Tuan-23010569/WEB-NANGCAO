
import { NextResponse } from "next/server";
import { getRentalByIdController } from "@/controllers/rentalController";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function GET(
    request: Request,
    context: RouteContext
) {
    const { id } = await context.params;
    const rentalId = Number(id);

    if (!Number.isSafeInteger(rentalId) || rentalId <= 0) {
        return NextResponse.json(
            { message: "ID don thue khong hop le" },
            { status: 400 }
        );
    }

    return getRentalByIdController(request, rentalId);
}
