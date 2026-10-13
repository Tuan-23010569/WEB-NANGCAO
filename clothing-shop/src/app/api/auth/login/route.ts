
import { loginController } from "@/controllers/authController";

export async function POST(request: Request) {
    return loginController(request);
}
