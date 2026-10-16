"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

type ChartItem = {
    key: string;
    label: string;
    revenue: number;
};

type ProductItem = {
    productId: number;
    name: string;
    quantity: number;
    revenue: number;
};

type RecentOrder = {
    id: number;
    customerName: string;
    customerEmail: string;
    totalAmount: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
};

type ExportOrder = {
    id: number;
    customerName: string;
    customerEmail: string;
    totalAmount: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
};

type ExportRental = {
    id: number;
    customerName: string;
    customerEmail: string;
    createdAt: string;
    startDate: string | null;
    endDate: string | null;
    totalAmount: number;
    status: string;
    paymentStatus: string;
    products: string;
};

type Report = {
    period: string;
    startDate: string;
    endDate: string;
    salesRevenue: number;
    rentalRevenue: number;
    totalRevenue: number;
    paidOrderCount: number;
    paidRentalCount: number;
    averageOrderValue: number;
    orderCount: number;
    rentalCount: number;
    pendingOrders: number;
    confirmedOrders: number;
    shippingOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    pendingRentals: number;
    completionRate: number;
    pendingPaymentAmount: number;
    failedPaymentAmount: number;
    refundedPaymentAmount: number;
    completedPaymentCount: number;
    paymentStats: Record<string, { count: number; amount: number }>;
    chart: ChartItem[];
    topProducts: ProductItem[];
    recentOrders: RecentOrder[];
    exportOrders: ExportOrder[];
    exportRentals: ExportRental[];
};

const periods = [
    { value: "today", label: "Hôm nay" },
    { value: "week", label: "7 ngày gần nhất" },
    { value: "month", label: "Tháng này" },
    { value: "year", label: "Năm nay" },
];

const statusLabels: Record<string, string> = {
    PENDING: "Chờ xử lý",
    CONFIRMED: "Đã xác nhận",
    SHIPPING: "Đang giao",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã hủy",
    PAID: "Đã thanh toán",
    FAILED: "Thất bại",
    REFUNDED: "Đã hoàn tiền",
};

function formatMoney(value: number) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(value);
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date(value));
}

function formatDateForExcel(value: string | null | undefined) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return formatDate(value);
}

function statusClass(status: string) {
    switch (status) {
        case "PAID":
        case "COMPLETED":
            return "bg-green-100 text-green-700";
        case "CANCELLED":
        case "FAILED":
            return "bg-red-100 text-red-700";
        case "SHIPPING":
        case "CONFIRMED":
            return "bg-blue-100 text-blue-700";
        case "REFUNDED":
            return "bg-purple-100 text-purple-700";
        default:
            return "bg-amber-100 text-amber-700";
    }
}

export default function RevenueReportDetails() {
    const router = useRouter();
    const [period, setPeriod] = useState("month");
    const [report, setReport] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [keyword, setKeyword] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function loadReport() {
            setLoading(true);
            setError("");

            const token = localStorage.getItem("tht_token");

            if (!token) {
                router.replace("/login");
                return;
            }

            try {
                const response = await fetch(
                    `/api/admin/reports?period=${period}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token} `,
                        },
                        cache: "no-store",
                    }
                );

                const result = await response.json();

                if (response.status === 401) {
                    localStorage.removeItem("tht_token");
                    localStorage.removeItem("tht_user");
                    router.replace("/login");
                    return;
                }

                if (response.status === 403) {
                    router.replace("/");
                    return;
                }

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message || "Không thể tải báo cáo."
                    );
                }

                if (!cancelled) {
                    setReport(result.data as Report);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Không thể tải dữ liệu báo cáo."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadReport();

        return () => {
            cancelled = true;
        };
    }, [period, router]);

    const filteredOrders = useMemo(() => {
        if (!report) return [];

        const search = keyword.trim().toLowerCase();

        if (!search) return report.recentOrders;

        return report.recentOrders.filter((order) =>
            [
                String(order.id),
                order.customerName,
                order.customerEmail,
                statusLabels[order.status] || order.status,
                statusLabels[order.paymentStatus] || order.paymentStatus,
            ].some((value) => value.toLowerCase().includes(search))
        );
    }, [report, keyword]);

    // Xuất một file Excel gồm hai sheet: đơn bán và đơn thuê.
    function exportExcel() {
        if (!report) return;

        const exportOrders = report.exportOrders ?? [];
        const exportRentals = report.exportRentals ?? [];

        // Sheet 1: Đơn bán hàng
        const salesHeaders = [
            "Mã đơn hàng",
            "Khách hàng",
            "Email",
            "Ngày đặt",
            "Tổng tiền (VND)",
            "Trạng thái đơn",
            "Trạng thái thanh toán",
        ];

        const salesRows = exportOrders.map((order) => [
            order.id,
            order.customerName ?? "",
            order.customerEmail ?? "",
            formatDateForExcel(order.createdAt),
            Number(order.totalAmount ?? 0),
            statusLabels[order.status] || order.status || "",
            statusLabels[order.paymentStatus] ||
            order.paymentStatus ||
            "",
        ]);

        // Sheet 2: Đơn cho thuê
        const rentalHeaders = [
            "Mã đơn thuê",
            "Khách hàng",
            "Email",
            "Ngày đặt",
            "Ngày bắt đầu thuê",
            "Ngày kết thúc thuê",
            "Sản phẩm thuê",
            "Tổng tiền (VND)",
            "Trạng thái đơn",
            "Trạng thái thanh toán",
        ];

        const rentalRows = exportRentals.map((rental) => [
            rental.id,
            rental.customerName ?? "",
            rental.customerEmail ?? "",
            formatDateForExcel(rental.createdAt),
            formatDateForExcel(rental.startDate),
            formatDateForExcel(rental.endDate),
            rental.products ?? "",
            Number(rental.totalAmount ?? 0),
            statusLabels[rental.status] || rental.status || "",
            statusLabels[rental.paymentStatus] ||
            rental.paymentStatus ||
            "",
        ]);

        // Tạo workbook Excel
        const workbook = XLSX.utils.book_new();

        const salesSheet = XLSX.utils.aoa_to_sheet([
            salesHeaders,
            ...salesRows,
        ]);

        const rentalSheet = XLSX.utils.aoa_to_sheet([
            rentalHeaders,
            ...rentalRows,
        ]);

        // Độ rộng cột của sheet đơn bán
        salesSheet["!cols"] = [
            { wch: 14 },
            { wch: 25 },
            { wch: 30 },
            { wch: 22 },
            { wch: 18 },
            { wch: 20 },
            { wch: 25 },
        ];

        // Độ rộng cột của sheet đơn thuê
        rentalSheet["!cols"] = [
            { wch: 14 },
            { wch: 25 },
            { wch: 30 },
            { wch: 22 },
            { wch: 22 },
            { wch: 22 },
            { wch: 40 },
            { wch: 18 },
            { wch: 20 },
            { wch: 25 },
        ];

        // Giữ hàng tiêu đề khi cuộn trong Excel
        salesSheet["!freeze"] = { xSplit: 0, ySplit: 1 };
        rentalSheet["!freeze"] = { xSplit: 0, ySplit: 1 };

        XLSX.utils.book_append_sheet(
            workbook,
            salesSheet,
            "Đơn bán hàng"
        );

        XLSX.utils.book_append_sheet(
            workbook,
            rentalSheet,
            "Đơn cho thuê"
        );

        // Tên file theo khoảng thời gian đang chọn
        XLSX.writeFile(
            workbook,
            `bao - cao - kinh - doanh - ${period}.xlsx`
        );
    }

    const cards = [
        {
            title: "Tổng doanh thu",
            value: report?.totalRevenue ?? 0,
            description: "Các khoản đã thanh toán",
            color: "text-[#737B59]",
        },
        {
            title: "Doanh thu bán hàng",
            value: report?.salesRevenue ?? 0,
            description: `${report?.paidOrderCount ?? 0} đơn có thanh toán`,
            color: "text-blue-700",
        },
        {
            title: "Doanh thu cho thuê",
            value: report?.rentalRevenue ?? 0,
            description: `${report?.paidRentalCount ?? 0} đơn thuê có thanh toán`,
            color: "text-purple-700",
        },
        {
            title: "Giá trị trung bình",
            value: report?.averageOrderValue ?? 0,
            description: "Trên các đơn bán có thanh toán",
            color: "text-orange-700",
        },
    ];

    const maxRevenue = Math.max(
        1,
        ...(report?.chart.map((item) => item.revenue) ?? [])
    );

    return (
        <>
            <Header />

            <main className="min-h-screen bg-[#f7f7f4] px-4 py-8 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#737B59]">
                                Business analytics
                            </p>

                            <h1 className="mt-2 text-3xl font-bold text-[#252525]">
                                Báo cáo kinh doanh
                            </h1>

                            <p className="mt-2 text-sm text-gray-500">
                                Theo dõi doanh thu, đơn hàng, thanh toán và sản phẩm.
                            </p>

                            {report && (
                                <p className="mt-2 text-xs text-gray-400">
                                    Từ {formatDate(report.startDate)} đến{" "}
                                    {formatDate(report.endDate)}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <select
                                value={period}
                                onChange={(event) =>
                                    setPeriod(event.target.value)
                                }
                                className="rounded-xl border border-[#e8e2d8] bg-white px-4 py-3 text-sm outline-none focus:border-[#737B59]"
                            >
                                {periods.map((item) => (
                                    <option
                                        key={item.value}
                                        value={item.value}
                                    >
                                        {item.label}
                                    </option>
                                ))}
                            </select>

                            <button
                                type="button"
                                onClick={exportExcel}
                                disabled={!report || loading}
                                className="rounded-xl bg-[#252525] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#737B59] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Xuất Excel
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {loading && !report && (
                        <div className="rounded-2xl border border-[#e8e2d8] bg-white p-8 text-center text-gray-500">
                            Đang tải dữ liệu báo cáo...
                        </div>
                    )}

                    {report && (
                        <>
                            <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                {cards.map((card) => (
                                    <div
                                        key={card.title}
                                        className="rounded-2xl border border-[#e8e2d8] bg-white p-5 shadow-sm"
                                    >
                                        <p className="text-sm text-gray-500">
                                            {card.title}
                                        </p>

                                        <p
                                            className={`mt - 3 break-words text - 2xl font - bold ${card.color} `}
                                        >
                                            {formatMoney(card.value)}
                                        </p>

                                        <p className="mt-2 text-xs text-gray-500">
                                            {card.description}
                                        </p>
                                    </div>
                                ))}
                            </section>

                            <section className="mb-8 grid gap-6 xl:grid-cols-3">
                                <div className="rounded-2xl border border-[#e8e2d8] bg-white p-5 xl:col-span-2">
                                    <div className="mb-6">
                                        <h2 className="text-lg font-bold text-[#252525]">
                                            Biểu đồ doanh thu
                                        </h2>

                                        <p className="mt-1 text-sm text-gray-500">
                                            Chỉ tính các khoản thanh toán đã ghi nhận là PAID.
                                        </p>
                                    </div>

                                    {report.chart.every(
                                        (item) => item.revenue === 0
                                    ) ? (
                                        <div className="flex min-h-56 items-center justify-center text-sm text-gray-400">
                                            Chưa có doanh thu đã thanh toán trong kỳ.
                                        </div>
                                    ) : (
                                        <div className="flex h-64 items-end gap-1 overflow-x-auto border-b border-gray-200 pb-2 sm:gap-2">
                                            {report.chart.map((item) => (
                                                <div
                                                    key={item.key}
                                                    title={`${item.label}: ${formatMoney(item.revenue)} `}
                                                    className="flex h-full min-w-3 flex-1 flex-col items-center justify-end gap-2"
                                                >
                                                    <div className="flex h-full w-full items-end">
                                                        <div
                                                            className="w-full rounded-t-md bg-[#737B59] transition hover:bg-[#525d3d]"
                                                            style={{
                                                                height: `${Math.max(
                                                                    item.revenue > 0
                                                                        ? 3
                                                                        : 0,
                                                                    (item.revenue /
                                                                        maxRevenue) *
                                                                    100
                                                                )
                                                                    }% `,
                                                            }}
                                                        />
                                                    </div>

                                                    <span className="whitespace-nowrap text-[10px] text-gray-500 sm:text-xs">
                                                        {item.label}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="mt-4 flex justify-between gap-3 text-sm">
                                        <span className="text-gray-500">
                                            Tổng doanh thu bán hàng và cho thuê
                                        </span>

                                        <strong className="text-[#252525]">
                                            {formatMoney(report.totalRevenue)}
                                        </strong>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-[#e8e2d8] bg-white p-5">
                                    <h2 className="text-lg font-bold text-[#252525]">
                                        Tình trạng đơn hàng
                                    </h2>

                                    <p className="mt-1 text-sm text-gray-500">
                                        {report.orderCount} đơn được tạo trong kỳ
                                    </p>

                                    <div className="mt-5">
                                        <div className="mb-2 flex justify-between text-sm">
                                            <span className="text-gray-600">
                                                Tỷ lệ hoàn thành
                                            </span>

                                            <strong>
                                                {report.completionRate}%
                                            </strong>
                                        </div>

                                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                            <div
                                                className="h-full rounded-full bg-[#737B59]"
                                                style={{
                                                    width: `${Math.min(
                                                        100,
                                                        Math.max(
                                                            0,
                                                            report.completionRate
                                                        )
                                                    )
                                                        }% `,
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-6 space-y-4">
                                        {[
                                            ["Chờ xử lý", report.pendingOrders],
                                            ["Đã xác nhận", report.confirmedOrders],
                                            ["Đang giao", report.shippingOrders],
                                            ["Hoàn thành", report.completedOrders],
                                            ["Đã hủy", report.cancelledOrders],
                                        ].map(([label, value]) => (
                                            <div
                                                key={label}
                                                className="flex items-center justify-between gap-3 text-sm"
                                            >
                                                <span className="text-gray-600">
                                                    {label}
                                                </span>

                                                <strong className="text-[#252525]">
                                                    {value}
                                                </strong>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            <section className="mb-8 grid gap-6 lg:grid-cols-2">
                                <div className="rounded-2xl border border-[#e8e2d8] bg-white p-5">
                                    <h2 className="text-lg font-bold text-[#252525]">
                                        Theo dõi thanh toán
                                    </h2>

                                    <p className="mt-1 text-sm text-gray-500">
                                        Phân loại theo trạng thái thanh toán.
                                    </p>

                                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                        <div className="rounded-xl bg-green-50 p-4">
                                            <p className="text-sm text-green-700">
                                                Đã thanh toán
                                            </p>

                                            <p className="mt-2 text-xl font-bold text-green-800">
                                                {report.completedPaymentCount}
                                            </p>

                                            <p className="mt-1 text-xs text-green-700">
                                                Giao dịch
                                            </p>
                                        </div>

                                        <div className="rounded-xl bg-amber-50 p-4">
                                            <p className="text-sm text-amber-700">
                                                Chờ thanh toán
                                            </p>

                                            <p className="mt-2 text-xl font-bold text-amber-800">
                                                {formatMoney(
                                                    report.pendingPaymentAmount
                                                )}
                                            </p>
                                        </div>

                                        <div className="rounded-xl bg-red-50 p-4">
                                            <p className="text-sm text-red-700">
                                                Thanh toán thất bại
                                            </p>

                                            <p className="mt-2 text-xl font-bold text-red-800">
                                                {formatMoney(
                                                    report.failedPaymentAmount
                                                )}
                                            </p>
                                        </div>

                                        <div className="rounded-xl bg-purple-50 p-4">
                                            <p className="text-sm text-purple-700">
                                                Đã hoàn tiền
                                            </p>

                                            <p className="mt-2 text-xl font-bold text-purple-800">
                                                {formatMoney(
                                                    report.refundedPaymentAmount
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-5 space-y-3">
                                        {Object.entries(
                                            report.paymentStats
                                        ).map(([status, stat]) => (
                                            <div
                                                key={status}
                                                className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 text-sm last:border-0"
                                            >
                                                <span
                                                    className={`rounded - full px - 2.5 py - 1 text - xs font - medium ${statusClass(status)} `}
                                                >
                                                    {statusLabels[status] || status}
                                                </span>

                                                <div className="text-right">
                                                    <p className="font-semibold text-[#252525]">
                                                        {formatMoney(stat.amount)}
                                                    </p>

                                                    <p className="text-xs text-gray-500">
                                                        {stat.count} giao dịch
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-[#e8e2d8] bg-white p-5">
                                    <h2 className="text-lg font-bold text-[#252525]">
                                        Sản phẩm bán chạy
                                    </h2>

                                    <p className="mt-1 text-sm text-gray-500">
                                        Xếp theo số lượng sản phẩm trong đơn không bị hủy.
                                    </p>

                                    {report.topProducts.length === 0 ? (
                                        <p className="py-12 text-center text-sm text-gray-400">
                                            Chưa có dữ liệu sản phẩm trong kỳ.
                                        </p>
                                    ) : (
                                        <div className="mt-5 overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead>
                                                    <tr className="border-b border-gray-100 text-xs uppercase text-gray-500">
                                                        <th className="pb-3 pr-3">
                                                            Sản phẩm
                                                        </th>
                                                        <th className="pb-3 pr-3 text-right">
                                                            SL
                                                        </th>
                                                        <th className="pb-3 text-right">
                                                            Giá trị
                                                        </th>
                                                    </tr>
                                                </thead>

                                                <tbody>
                                                    {report.topProducts.map(
                                                        (product, index) => (
                                                            <tr
                                                                key={product.productId}
                                                                className="border-b border-gray-50 last:border-0"
                                                            >
                                                                <td className="py-4 pr-3">
                                                                    <div className="flex items-start gap-3">
                                                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f0f1eb] text-xs font-bold text-[#737B59]">
                                                                            {index + 1}
                                                                        </span>

                                                                        <span className="font-medium text-[#252525]">
                                                                            {product.name}
                                                                        </span>
                                                                    </div>
                                                                </td>

                                                                <td className="py-4 pr-3 text-right">
                                                                    {product.quantity}
                                                                </td>

                                                                <td className="py-4 text-right font-semibold">
                                                                    {formatMoney(
                                                                        product.revenue
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        )
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="rounded-2xl border border-[#e8e2d8] bg-white p-5">
                                <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                                    <div>
                                        <h2 className="text-lg font-bold text-[#252525]">
                                            Đơn hàng gần đây
                                        </h2>

                                        <p className="mt-1 text-sm text-gray-500">
                                            10 đơn mới nhất trong khoảng thời gian đã chọn.
                                        </p>
                                    </div>

                                    <input
                                        value={keyword}
                                        onChange={(event) =>
                                            setKeyword(event.target.value)
                                        }
                                        placeholder="Tìm mã đơn, khách hàng..."
                                        className="w-full rounded-xl border border-[#e8e2d8] px-4 py-3 text-sm outline-none focus:border-[#737B59] sm:max-w-xs"
                                    />
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[850px] text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                                                <th className="px-3 py-3">
                                                    Mã đơn
                                                </th>
                                                <th className="px-3 py-3">
                                                    Khách hàng
                                                </th>
                                                <th className="px-3 py-3">
                                                    Ngày đặt
                                                </th>
                                                <th className="px-3 py-3 text-right">
                                                    Tổng tiền
                                                </th>
                                                <th className="px-3 py-3">
                                                    Trạng thái đơn
                                                </th>
                                                <th className="px-3 py-3">
                                                    Thanh toán
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {filteredOrders.map((order) => (
                                                <tr
                                                    key={order.id}
                                                    className="border-b border-gray-50 hover:bg-gray-50"
                                                >
                                                    <td className="px-3 py-4 font-semibold text-[#252525]">
                                                        #{order.id}
                                                    </td>

                                                    <td className="px-3 py-4">
                                                        <p className="font-medium text-[#252525]">
                                                            {order.customerName}
                                                        </p>

                                                        <p className="mt-1 text-xs text-gray-500">
                                                            {order.customerEmail}
                                                        </p>
                                                    </td>

                                                    <td className="whitespace-nowrap px-3 py-4 text-gray-600">
                                                        {formatDate(order.createdAt)}
                                                    </td>

                                                    <td className="whitespace-nowrap px-3 py-4 text-right font-semibold">
                                                        {formatMoney(order.totalAmount)}
                                                    </td>

                                                    <td className="px-3 py-4">
                                                        <span
                                                            className={`whitespace - nowrap rounded - full px - 2.5 py - 1 text - xs font - medium ${statusClass(order.status)} `}
                                                        >
                                                            {statusLabels[order.status] ||
                                                                order.status}
                                                        </span>
                                                    </td>

                                                    <td className="px-3 py-4">
                                                        <span
                                                            className={`whitespace - nowrap rounded - full px - 2.5 py - 1 text - xs font - medium ${statusClass(order.paymentStatus)} `}
                                                        >
                                                            {statusLabels[
                                                                order.paymentStatus
                                                            ] || order.paymentStatus}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}

                                            {filteredOrders.length === 0 && (
                                                <tr>
                                                    <td
                                                        colSpan={6}
                                                        className="px-3 py-10 text-center text-gray-400"
                                                    >
                                                        Không tìm thấy đơn hàng phù hợp.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <p className="mt-4 text-xs text-gray-400">
                                    File Excel gồm 2 sheet: toàn bộ đơn bán hàng
                                    và toàn bộ đơn cho thuê trong kỳ đã chọn.
                                    Bộ lọc tìm kiếm chỉ ảnh hưởng đến bảng đơn
                                    hàng gần đây.
                                </p>
                            </section>
                        </>
                    )}
                </div>
            </main>

            <Footer />
        </>
    );
}