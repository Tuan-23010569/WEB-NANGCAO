import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authorizeAdmin } from "@/lib/adminAuth";

function getVietnamDateParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        hourCycle: "h23",
    }).formatToParts(date);

    const values: Record<string, string> = {};

    for (const part of parts) {
        if (part.type !== "literal") {
            values[part.type] = part.value;
        }
    }

    return {
        year: Number(values.year),
        month: Number(values.month),
        day: Number(values.day),
        hour: Number(values.hour),
    };
}

function getVietnamMidnight(year: number, month: number, day: number) {
    return new Date(
        Date.UTC(year, month - 1, day) - 7 * 60 * 60 * 1000
    );
}

function getPeriodRange(period: string) {
    const { year, month, day } = getVietnamDateParts();

    const today = getVietnamMidnight(year, month, day);

    let start: Date;
    let end: Date;

    switch (period) {
        case "today":
            start = today;
            end = new Date(today.getTime() + 24 * 60 * 60 * 1000);
            break;

        case "week":
            start = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
            end = new Date(today.getTime() + 24 * 60 * 60 * 1000);
            break;

        case "year":
            start = getVietnamMidnight(year, 1, 1);
            end = getVietnamMidnight(year + 1, 1, 1);
            break;

        case "month":
        default:
            start = getVietnamMidnight(year, month, 1);

            end =
                month === 12
                    ? getVietnamMidnight(year + 1, 1, 1)
                    : getVietnamMidnight(year, month + 1, 1);
            break;
    }

    return { start, end };
}

function dateKey(date: Date, period: string) {
    const parts = getVietnamDateParts(date);
    const month = String(parts.month).padStart(2, "0");
    const day = String(parts.day).padStart(2, "0");

    if (period === "year") {
        return `${parts.year}-${month}`;
    }

    if (period === "today") {
        return `${parts.year}-${month}-${day} ${String(parts.hour).padStart(2, "0")}`;
    }

    return `${parts.year}-${month}-${day}`;
}

function createChartBuckets(
    period: string,
    start: Date,
    end: Date
) {
    const buckets: {
        key: string;
        label: string;
        revenue: number;
    }[] = [];

    if (period === "year") {
        const year = getVietnamDateParts(start).year;

        for (let month = 1; month <= 12; month++) {
            buckets.push({
                key: `${year}-${String(month).padStart(2, "0")}`,
                label: `Tháng ${month}`,
                revenue: 0,
            });
        }

        return buckets;
    }

    if (period === "today") {
        const date = getVietnamDateParts(start);

        for (let hour = 0; hour < 24; hour++) {
            buckets.push({
                key: `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")} ${String(hour).padStart(2, "0")}`,
                label: `${String(hour).padStart(2, "0")}:00`,
                revenue: 0,
            });
        }

        return buckets;
    }

    for (
        let time = start.getTime();
        time < end.getTime();
        time += 24 * 60 * 60 * 1000
    ) {
        const date = new Date(time);
        const parts = getVietnamDateParts(date);
        const key = dateKey(date, period);

        buckets.push({
            key,
            label: `${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")}`,
            revenue: 0,
        });
    }

    return buckets;
}

export async function GET(request: Request) {
    const authError = await authorizeAdmin(request);

    if (authError) {
        return authError;
    }

    try {
        const url = new URL(request.url);
        const period = url.searchParams.get("period") || "month";

        const allowedPeriods = ["today", "week", "month", "year"];

        if (!allowedPeriods.includes(period)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Khoảng thời gian không hợp lệ",
                },
                { status: 400 }
            );
        }

        const { start, end } = getPeriodRange(period);

        const [payments, orders, rentals] = await Promise.all([
            // Lấy dữ liệu thanh toán
            prisma.payment.findMany({
                where: {
                    createdAt: { gte: start, lt: end },
                },
                select: {
                    id: true,
                    amount: true,
                    method: true,
                    status: true,
                    orderId: true,
                    rentalId: true,
                    createdAt: true,
                },
                orderBy: { createdAt: "desc" },
            }),

            // Lấy đơn hàng bán
            prisma.order.findMany({
                where: {
                    createdAt: { gte: start, lt: end },
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    payments: true,
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
                orderBy: { createdAt: "desc" },
            }),

            // Lấy đầy đủ đơn thuê
            prisma.rental.findMany({
                where: {
                    createdAt: { gte: start, lt: end },
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    payments: true,
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
                orderBy: { createdAt: "desc" },
            }),
        ]);

        const rentalCount = rentals.length;

        const pendingRentals = rentals.filter(
            (rental) => rental.status === "PENDING"
        ).length;

        let salesRevenue = 0;
        let rentalRevenue = 0;
        let pendingPaymentAmount = 0;
        let failedPaymentAmount = 0;
        let refundedPaymentAmount = 0;

        const paidOrderIds = new Set<number>();
        const paidRentalIds = new Set<number>();

        const paymentStats: Record<
            string,
            { count: number; amount: number }
        > = {};

        const chart = createChartBuckets(period, start, end);

        for (const payment of payments) {
            const amount = Number(payment.amount);

            if (!paymentStats[payment.status]) {
                paymentStats[payment.status] = {
                    count: 0,
                    amount: 0,
                };
            }

            paymentStats[payment.status].count += 1;
            paymentStats[payment.status].amount += amount;

            if (payment.status === "PENDING") {
                pendingPaymentAmount += amount;
            }

            if (payment.status === "FAILED") {
                failedPaymentAmount += amount;
            }

            if (payment.status === "REFUNDED") {
                refundedPaymentAmount += amount;
            }

            if (payment.status !== "PAID") {
                continue;
            }

            if (payment.orderId !== null) {
                salesRevenue += amount;
                paidOrderIds.add(payment.orderId);
            }

            if (payment.rentalId !== null) {
                rentalRevenue += amount;
                paidRentalIds.add(payment.rentalId);
            }

            const key = dateKey(payment.createdAt, period);
            const bucket = chart.find((item) => item.key === key);

            if (bucket) {
                bucket.revenue += amount;
            }
        }

        const orderStatusStats = {
            pending: orders.filter(
                (item) => item.status === "PENDING"
            ).length,
            confirmed: orders.filter(
                (item) => item.status === "CONFIRMED"
            ).length,
            shipping: orders.filter(
                (item) => item.status === "SHIPPING"
            ).length,
            completed: orders.filter(
                (item) => item.status === "COMPLETED"
            ).length,
            cancelled: orders.filter(
                (item) => item.status === "CANCELLED"
            ).length,
        };

        const totalRevenue = salesRevenue + rentalRevenue;

        // Thống kê sản phẩm bán chạy
        const productMap = new Map<
            number,
            {
                productId: number;
                name: string;
                quantity: number;
                revenue: number;
            }
        >();

        for (const order of orders) {
            if (order.status === "CANCELLED") {
                continue;
            }

            for (const item of order.items) {
                const product = item.variant.product;
                const productId = product.id;
                const name = product.name;
                const quantity = item.quantity;
                const revenue = Number(item.unitPrice) * quantity;

                const existing = productMap.get(productId);

                if (existing) {
                    existing.quantity += quantity;
                    existing.revenue += revenue;
                } else {
                    productMap.set(productId, {
                        productId,
                        name,
                        quantity,
                        revenue,
                    });
                }
            }
        }

        const topProducts = Array.from(productMap.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5)
            .map((item) => ({
                ...item,
                revenue: Number(item.revenue.toFixed(2)),
            }));

        // 10 đơn hàng bán gần nhất dùng để hiển thị trên giao diện
        const recentOrders = orders.slice(0, 10).map((order) => ({
            id: order.id,
            customerName: order.user.name,
            customerEmail: order.user.email,
            totalAmount: Number(order.totalAmount),
            status: order.status,
            createdAt: order.createdAt.toISOString(),
            paymentStatus: order.payments.some(
                (payment) => payment.status === "PAID"
            )
                ? "PAID"
                : order.payments.some(
                    (payment) => payment.status === "PENDING"
                )
                    ? "PENDING"
                    : order.payments[0]?.status ?? "PENDING",
        }));

        // Danh sách đầy đủ đơn hàng bán để xuất Excel
        const exportOrders = orders.map((order) => ({
            id: order.id,
            customerName: order.user.name,
            customerEmail: order.user.email,
            createdAt: order.createdAt.toISOString(),
            totalAmount: Number(order.totalAmount),
            status: order.status,
            paymentStatus: order.payments.some(
                (payment) => payment.status === "PAID"
            )
                ? "PAID"
                : order.payments.some(
                    (payment) => payment.status === "PENDING"
                )
                    ? "PENDING"
                    : order.payments[0]?.status ?? "PENDING",
        }));

        // Danh sách đầy đủ đơn thuê để xuất Excel
        const exportRentals = rentals.map((rental) => ({
            id: rental.id,
            customerName: rental.user.name,
            customerEmail: rental.user.email,
            createdAt: rental.createdAt.toISOString(),
            startDate: rental.startDate.toISOString(),
            endDate: rental.endDate.toISOString(),
            totalAmount: Number(rental.totalAmount),
            status: rental.status,
            paymentStatus: rental.payments.some(
                (payment) => payment.status === "PAID"
            )
                ? "PAID"
                : rental.payments.some(
                    (payment) => payment.status === "PENDING"
                )
                    ? "PENDING"
                    : rental.payments[0]?.status ?? "PENDING",
            products: rental.items
                .map(
                    (item) =>
                        `${item.variant.product.name} (SL: ${item.quantity})`
                )
                .join(", "),
        }));

        salesRevenue = Number(salesRevenue.toFixed(2));
        rentalRevenue = Number(rentalRevenue.toFixed(2));
        pendingPaymentAmount = Number(pendingPaymentAmount.toFixed(2));
        failedPaymentAmount = Number(failedPaymentAmount.toFixed(2));
        refundedPaymentAmount = Number(refundedPaymentAmount.toFixed(2));

        const completedPaymentCount = payments.filter(
            (payment) => payment.status === "PAID"
        ).length;

        const completedOrderCount = orderStatusStats.completed;

        return NextResponse.json({
            success: true,
            data: {
                period,
                startDate: start.toISOString(),
                endDate: end.toISOString(),

                salesRevenue,
                rentalRevenue,
                totalRevenue: Number(totalRevenue.toFixed(2)),

                paidOrderCount: paidOrderIds.size,
                paidRentalCount: paidRentalIds.size,

                orderCount: orders.length,
                rentalCount,
                pendingOrders: orderStatusStats.pending,
                confirmedOrders: orderStatusStats.confirmed,
                shippingOrders: orderStatusStats.shipping,
                completedOrders: orderStatusStats.completed,
                cancelledOrders: orderStatusStats.cancelled,
                pendingRentals,

                averageOrderValue:
                    paidOrderIds.size > 0
                        ? Number(
                            (salesRevenue / paidOrderIds.size).toFixed(2)
                        )
                        : 0,

                completionRate:
                    orders.length > 0
                        ? Number(
                            (
                                (completedOrderCount / orders.length) *
                                100
                            ).toFixed(1)
                        )
                        : 0,

                paymentStats,
                pendingPaymentAmount,
                failedPaymentAmount,
                refundedPaymentAmount,
                completedPaymentCount,

                chart,
                topProducts,
                recentOrders,

                // Hai danh sách dùng để xuất Excel
                exportOrders,
                exportRentals,
            },
        });
    } catch (error) {
        console.error("Admin report error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Không thể tải báo cáo doanh thu",
            },
            { status: 500 }
        );
    }
}
