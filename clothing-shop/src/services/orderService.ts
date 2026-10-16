
import prisma from "@/lib/prisma";

type CheckoutData = {
    address: string;
    phone: string;
};

export async function createOrder(
    userId: number,
    data: CheckoutData
) {
    return prisma.$transaction(async (tx) => {
        const cart = await tx.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    include: {
                        variant: {
                            include: {
                                product: true,
                            },
                        },
                    },
                },
            },
        });

        if (!cart || cart.items.length === 0) {
            throw new Error("CART_EMPTY");
        }

        for (const item of cart.items) {
            if (!item.variant.product.isActive) {
                throw new Error("PRODUCT_UNAVAILABLE");
            }

            if (item.quantity <= 0 || item.variant.stock < item.quantity) {
                throw new Error("INSUFFICIENT_STOCK");
            }
        }

        const totalAmount = Number(
            cart.items
                .reduce(
                    (total, item) =>
                        total + Number(item.variant.sellPrice) * item.quantity,
                    0
                )
                .toFixed(2)
        );

        // Trừ tồn kho có điều kiện để hạn chế bán vượt số lượng còn lại.
        for (const item of cart.items) {
            const result = await tx.productVariant.updateMany({
                where: {
                    id: item.variantId,
                    stock: { gte: item.quantity },
                },
                data: {
                    stock: { decrement: item.quantity },
                },
            });

            if (result.count !== 1) {
                throw new Error("INSUFFICIENT_STOCK");
            }
        }

        const order = await tx.order.create({
            data: {
                userId,
                totalAmount,
                address: data.address,
                phone: data.phone,
                items: {
                    create: cart.items.map((item) => ({
                        variantId: item.variantId,
                        quantity: item.quantity,
                        unitPrice: item.variant.sellPrice,
                    })),
                },
                payments: {
                    create: {
                        amount: totalAmount,
                        method: "COD",
                    },
                },
            },
            include: {
                items: {
                    include: {
                        variant: {
                            include: {
                                product: true,
                            },
                        },
                    },
                },
                payments: true,
            },
        });

        await tx.cartItem.deleteMany({
            where: { cartId: cart.id },
        });

        return order;
    });
}

export async function getOrders(userId: number) {
    return prisma.order.findMany({
        where: { userId },
        include: {
            items: {
                include: {
                    variant: {
                        include: {
                            product: true,
                        },
                    },
                },
            },
            payments: true,
        },
        orderBy: { createdAt: "desc" },
    });
}

export async function getOrderById(
    orderId: number,
    userId: number,
    isAdmin: boolean
) {
    return prisma.order.findFirst({
        where: {
            id: orderId,
            ...(isAdmin ? {} : { userId }),
        },
        include: {
            items: {
                include: {
                    variant: {
                        include: {
                            product: true,
                        },
                    },
                },
            },
            payments: true,
        },
    });
}

export async function cancelOrder(
    orderId: number,
    userId: number,
    isAdmin: boolean
) {
    return prisma.$transaction(async (tx) => {
        const order = await tx.order.findFirst({
            where: {
                id: orderId,
                ...(isAdmin ? {} : { userId }),
            },
            include: {
                items: true,
                payments: true,
            },
        });

        if (!order) {
            throw new Error("ORDER_NOT_FOUND");
        }

        if (order.status !== "PENDING") {
            throw new Error("ORDER_CANNOT_CANCEL");
        }

        // Không tự hủy đơn đã thanh toán vì chưa có quy trình hoàn tiền.
        if (order.payments.some((payment) => payment.status === "PAID")) {
            throw new Error("ORDER_PAYMENT_ALREADY_PAID");
        }

        // Chỉ một request có thể chuyển PENDING sang CANCELLED.
        const updated = await tx.order.updateMany({
            where: {
                id: orderId,
                status: "PENDING",
            },
            data: {
                status: "CANCELLED",
            },
        });

        if (updated.count !== 1) {
            throw new Error("ORDER_CANNOT_CANCEL");
        }

        // Khôi phục tồn kho cho từng biến thể.
        for (const item of order.items) {
            await tx.productVariant.update({
                where: { id: item.variantId },
                data: {
                    stock: { increment: item.quantity },
                },
            });
        }

        return tx.order.findUniqueOrThrow({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        variant: {
                            include: { product: true },
                        },
                    },
                },
                payments: true,
            },
        });
    });
}

export async function getAllOrders() {
    return prisma.order.findMany({
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                },
            },
            items: {
                include: {
                    variant: {
                        include: {
                            product: true,
                        },
                    },
                },
            },
            payments: true,
        },
        orderBy: { createdAt: "desc" },
    });
}

type NextOrderStatus = "CONFIRMED" | "SHIPPING" | "COMPLETED";

export async function updateOrderStatus(
    orderId: number,
    status: NextOrderStatus
) {
    return prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            throw new Error("ORDER_NOT_FOUND");
        }

        const allowedTransitions: Record<string, string[]> = {
            PENDING: ["CONFIRMED"],
            CONFIRMED: ["SHIPPING"],
            SHIPPING: ["COMPLETED"],
            COMPLETED: [],
            CANCELLED: [],
        };

        if (!allowedTransitions[order.status]?.includes(status)) {
            throw new Error("INVALID_ORDER_TRANSITION");
        }

        const updated = await tx.order.updateMany({
            where: {
                id: orderId,
                status: order.status,
            },
            data: { status },
        });

        if (updated.count !== 1) {
            throw new Error("INVALID_ORDER_TRANSITION");
        }

        // Khi hoàn tất đơn, xác nhận các khoản COD đã thu tiền.
        if (status === "COMPLETED") {
            await tx.payment.updateMany({
                where: {
                    orderId,
                    method: "COD",
                    status: "PENDING",
                },
                data: {
                    status: "PAID",
                },
            });
        }

        return tx.order.findUniqueOrThrow({
            where: { id: orderId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
                items: {
                    include: {
                        variant: {
                            include: { product: true },
                        },
                    },
                },
                payments: true,
            },
        });
    });
}
