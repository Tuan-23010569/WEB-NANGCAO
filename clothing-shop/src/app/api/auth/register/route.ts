
import { registerController } from "@/controllers/authController";

export async function POST(request: Request) {
    return registerController(request);
}
