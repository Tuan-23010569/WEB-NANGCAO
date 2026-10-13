
import {
    getCategoriesController,
    createCategoryController,
} from "@/controllers/categoryController";

export async function GET() {
    return getCategoriesController();
}

export async function POST(request: Request) {
    return createCategoryController(request);
}
