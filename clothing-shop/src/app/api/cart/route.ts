
import { getCartController } from "@/controllers/cartController";

export async function GET(request: Request) {
    return getCartController(request);
}
