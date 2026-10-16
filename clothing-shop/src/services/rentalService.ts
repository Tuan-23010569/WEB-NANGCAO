import prisma from "@/lib/prisma";

type RentalItemInput = {
    variantId: number;
    quantity: number;
};

type CreateRentalData = {
    startDate: string;
    endDate: string;
    address: string;
    phone: string;
    items: RentalItemInput[];
};

// Chuyển YYYY-MM-DD thành ngày UTC và kiểm tra định dạng
function parseDate(dateString: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return null;
    }

    const date = new Date(`${dateString}T00:00:00.000Z`);

    if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== dateString
    ) {
        return null;
    }

    return date;
}

// Tính số ngày thuê, bao gồm cả ngày bắt đầu và ngày kết thúc
function calculateRentalDays(
    startDate: Date,
    endDate: Date
): number {
    return (
        (endDate.getTime() - startDate.getTime()) /
        (24 * 60 * 60 * 1000) +
        1
    );
}

// Tạo đơn thuê
export async function createRental(
    userId: number,
    data: CreateRentalData
) {
    const startDate = parseDate(data.startDate);
    const endDate = parseDate(data.endDate);

    if (!startDate || !endDate) {
        throw new Error("INVALID_DATE");
    }

    if (endDate < startDate) {
        throw new Error("INVALID_DATE_RANGE");
    }

    if (!data.items || data.items.length === 0) {
        throw new Error("RENTAL_ITEMS_EMPTY");
    }

    if (!data.address.trim() || !data.phone.trim()) {
        throw new Error("INVALID_RENTAL_CONTACT");
    }

    // Gộp các dòng có cùng variantId
    const itemMap = new Map<number, number>();

    for (const item of data.items) {
        if (
            !Number.isSafeInteger(item.variantId) ||
            item.variantId <= 0 ||
            !Number.isSafeInteger(item.quantity) ||
            item.quantity <= 0
        ) {
            throw new Error("INVALID_RENTAL_ITEM");
        }

        const quantity =
            (itemMap.get(item.variantId) ?? 0) + item.quantity;

        if (!Number.isSafeInteger(quantity)) {
            throw new Error("INVALID_RENTAL_ITEM");
        }

        itemMap.set(item.variantId, quantity);
    }

    const rentalItems = Array.from(
        itemMap,
        ([variantId, quantity]) => ({
            variantId,
            quantity,
        })
    );

    const rentalDays = calculateRentalDays(startDate, endDate);

    return prisma.$transaction(async (tx) => {
        const variants = await tx.productVariant.findMany({
            where: {
                id: {
                    in: rentalItems.map((item) => item.variantId),
                },
            },
            include: {
                product: true,
            },
        });

        if (variants.length !== rentalItems.length) {
            throw new Error("VARIANT_NOT_FOUND");
        }

        let totalAmount = 0;

        for (const item of rentalItems) {
            const variant = variants.find(
                (v) => v.id === item.variantId
            );

            if (!variant) {
                throw new Error("VARIANT_NOT_FOUND");
            }

            if (!variant.product.isActive) {
                throw new Error("PRODUCT_UNAVAILABLE");
            }

            if (variant.stock < item.quantity) {
                throw new Error("INSUFFICIENT_STOCK");
            }

            totalAmount +=
                Number(variant.rentalPrice) *
                item.quantity *
                rentalDays;
        }

        totalAmount = Number(totalAmount.toFixed(2));

        // Trừ tồn kho có điều kiện để tránh vượt số lượng hiện có
        for (const item of rentalItems) {
            const result = await tx.productVariant.updateMany({
                where: {
                    id: item.variantId,
                    stock: {
                        gte: item.quantity,
                    },
                },
                data: {
                    stock: {
                        decrement: item.quantity,
                    },
                },
            });

            if (result.count !== 1) {
                throw new Error("INSUFFICIENT_STOCK");
            }
        }

        // Tạo đơn thuê, chi tiết đơn thuê và khoản thanh toán COD
        const rental = await tx.rental.create({
            data: {
                userId,
                startDate,
                endDate,
                totalAmount,
                address: data.address.trim(),
                phone: data.phone.trim(),
                items: {
                    create: rentalItems.map((item) => {
                        const variant = variants.find(
                            (v) => v.id === item.variantId
                        )!;

                        return {
                            variantId: item.variantId,
                            quantity: item.quantity,
                            unitPrice: variant.rentalPrice,
                        };
                    }),
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

        return rental;
    });
}

// Lấy danh sách đơn thuê của người dùng
export async function getRentals(userId: number) {
    return prisma.rental.findMany({
        where: {
            userId,
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
        orderBy: {
            createdAt: "desc",
        },
    });
}

// Lấy chi tiết đơn thuê
export async function getRentalById(
    rentalId: number,
    userId: number,
    isAdmin: boolean
) {
    return prisma.rental.findFirst({
        where: {
            id: rentalId,
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

// Hủy đơn thuê
export async function cancelRental(
    rentalId: number,
    userId: number,
    isAdmin: boolean
) {
    return prisma.$transaction(async (tx) => {
        const rental = await tx.rental.findFirst({
            where: {
                id: rentalId,
                ...(isAdmin ? {} : { userId }),
            },
            include: {
                items: true,
                payments: true,
            },
        });

        if (!rental) {
            throw new Error("RENTAL_NOT_FOUND");
        }

        if (rental.status !== "PENDING") {
            throw new Error("RENTAL_CANNOT_CANCEL");
        }

        if (
            rental.payments.some(
                (payment) => payment.status === "PAID"
            )
        ) {
            throw new Error("RENTAL_PAYMENT_ALREADY_PAID");
        }

        // Chỉ cập nhật nếu đơn vẫn đang chờ xử lý
        const updated = await tx.rental.updateMany({
            where: {
                id: rentalId,
                status: "PENDING",
            },
            data: {
                status: "CANCELLED",
            },
        });

        if (updated.count !== 1) {
            throw new Error("RENTAL_CANNOT_CANCEL");
        }

        // Hoàn lại tồn kho cho từng biến thể
        for (const item of rental.items) {
            await tx.productVariant.update({
                where: {
                    id: item.variantId,
                },
                data: {
                    stock: {
                        increment: item.quantity,
                    },
                },
            });
        }

        return tx.rental.findUniqueOrThrow({
            where: {
                id: rentalId,
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
    });
}

type RentalStatusValue =
    | "PENDING"
    | "CONFIRMED"
    | "RENTING"
    | "RETURNED"
    | "CANCELLED";

// Cập nhật trạng thái đơn thuê
export async function updateRentalStatus(
    rentalId: number,
    newStatus: RentalStatusValue
) {
    return prisma.$transaction(async (tx) => {
        const rental = await tx.rental.findUnique({
            where: {
                id: rentalId,
            },
            include: {
                items: true,
            },
        });

        if (!rental) {
            throw new Error("RENTAL_NOT_FOUND");
        }

        // Chỉ cho phép chuyển trạng thái theo đúng quy trình
        const allowedTransitions: Record<
            string,
            RentalStatusValue[]
        > = {
            PENDING: ["CONFIRMED"],
            CONFIRMED: ["RENTING"],
            RENTING: ["RETURNED"],
            RETURNED: [],
            CANCELLED: [],
        };

        if (
            !allowedTransitions[rental.status]?.includes(newStatus)
        ) {
            throw new Error("INVALID_RENTAL_STATUS_TRANSITION");
        }

        // Cập nhật có điều kiện để tránh xử lý cùng trạng thái hai lần
        const updated = await tx.rental.updateMany({
            where: {
                id: rentalId,
                status: rental.status,
            },
            data: {
                status: newStatus,
            },
        });

        if (updated.count !== 1) {
            throw new Error("INVALID_RENTAL_STATUS_TRANSITION");
        }

        if (newStatus === "RETURNED") {
            // Đánh dấu khoản COD đã thu là PAID.
            // Chỉ dùng logic này nếu admin xác nhận khách đã thanh toán.
            await tx.payment.updateMany({
                where: {
                    rentalId,
                    method: "COD",
                    status: "PENDING",
                },
                data: {
                    status: "PAID",
                },
            });

            // Hoàn tồn kho khi khách trả đồ
            for (const item of rental.items) {
                await tx.productVariant.update({
                    where: {
                        id: item.variantId,
                    },
                    data: {
                        stock: {
                            increment: item.quantity,
                        },
                    },
                });
            }
        }

        return tx.rental.findUniqueOrThrow({
            where: {
                id: rentalId,
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
    });
}

// Lấy toàn bộ đơn thuê
export async function getAllRentals() {
    return prisma.rental.findMany({
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
        orderBy: {
            createdAt: "desc",
        },
    });
}