
import { NextResponse } from "next/server";
import { authorizeAdmin } from "@/lib/adminAuth";
import { updateRentalStatusController } from "@/controllers/rentalController";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function PATCH(
    request: Request,
    context: RouteContext
) {
    const authError = await authorizeAdmin(request);

    if (authError) {
        return authError;
    }

    const { id } = await context.params;
    const rentalId = Number(id);

    if (!Number.isSafeInteger(rentalId) || rentalId <= 0) {
        return NextResponse.json(
            { message: "ID don thue khong hop le" },
            { status: 400 }
        );
    }

    return updateRentalStatusController(request, rentalId);
}
