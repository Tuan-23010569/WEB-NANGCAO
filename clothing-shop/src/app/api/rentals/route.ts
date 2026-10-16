
import {
    createRentalController,
    getRentalsController,
} from "@/controllers/rentalController";

export async function GET(request: Request) {
    return getRentalsController(request);
}

export async function POST(request: Request) {
    return createRentalController(request);
}
