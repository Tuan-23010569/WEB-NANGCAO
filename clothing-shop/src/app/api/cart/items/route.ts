
import { addCartItemController } from "@/controllers/cartController";

export async function POST(request: Request) {
    return addCartItemController(request);
}
