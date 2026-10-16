
import {
    createOrderController,
    getOrdersController,
} from "@/controllers/orderController";

export async function POST(request: Request) {
    return createOrderController(request);
}

export async function GET(request: Request) {
    return getOrdersController(request);
}
