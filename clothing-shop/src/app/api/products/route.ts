
import {
    getProductsController,
    createProductController,
} from "@/controllers/productController";

export async function GET(request: Request) {
    return getProductsController(request);
}

export async function POST(request: Request) {
    return createProductController(request);
}
