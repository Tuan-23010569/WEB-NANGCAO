"use client";

type Props = {
    orderCount: number;
    pendingOrders: number;
    cancelledOrders: number;
    rentalCount: number;
    pendingRentals: number;
    loading: boolean;
};

export default function OrderStatistics({
    orderCount,
    pendingOrders,
    cancelledOrders,
    rentalCount,
    pendingRentals,
    loading,
}: Props) {
    const rows = [
        { label: "Tổng đơn mua", value: orderCount },
        { label: "Đơn mua đang chờ xử lý", value: pendingOrders },
        { label: "Đơn mua đã hủy", value: cancelledOrders },
        { label: "Tổng đơn thuê", value: rentalCount },
        { label: "Đơn thuê đang chờ xử lý", value: pendingRentals },
    ];

    return (
        <section className="mb-10 rounded-2xl border border-[#e8e2d8] bg-white p-5 sm:p-6">
            <h2 className="text-xl font-bold text-[#252525]">
                Tình trạng đơn hàng
            </h2>

            <div className="mt-3 divide-y divide-[#eee9e1]">
                {rows.map((row) => (
                    <div
                        key={row.label}
                        className="flex items-center justify-between gap-3 py-4"
                    >
                        <span className="text-sm text-gray-600">
                            {row.label}
                        </span>

                        <span className="font-semibold">
                            {loading ? "..." : row.value}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}