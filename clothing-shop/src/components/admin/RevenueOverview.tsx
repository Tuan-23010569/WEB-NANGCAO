"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Report = {
    salesRevenue: number;
    rentalRevenue: number;
    totalRevenue: number;
    paidOrderCount: number;
    paidRentalCount: number;
    averageOrderValue: number;
};

const periods = [
    { value: "today", label: "Hôm nay" },
    { value: "week", label: "7 ngày gần nhất" },
    { value: "month", label: "Tháng này" },
    { value: "year", label: "Năm nay" },
];

function formatMoney(value: number) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(value);
}

export default function RevenueOverview() {
    const router = useRouter();
    const [period, setPeriod] = useState("month");
    const [report, setReport] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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
                            Authorization: `Bearer ${token}`,
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
                    setReport(result.data);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Không thể tải dữ liệu."
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

    const cards = [
        {
            title: "Tổng doanh thu",
            value: report?.totalRevenue ?? 0,
            description: "Bán hàng và cho thuê",
        },
        {
            title: "Doanh thu bán hàng",
            value: report?.salesRevenue ?? 0,
            description: `${report?.paidOrderCount ?? 0} đơn đã thanh toán`,
        },
        {
            title: "Doanh thu cho thuê",
            value: report?.rentalRevenue ?? 0,
            description: `${report?.paidRentalCount ?? 0} đơn thuê đã thanh toán`,
        },
        {
            title: "Giá trị trung bình đơn bán",
            value: report?.averageOrderValue ?? 0,
            description: "Trên các đơn bán đã thanh toán",
        },
    ];

    return (
        <section className="mb-10">
            <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#737B59]">
                        Business overview
                    </p>

                    <h2 className="mt-2 text-2xl font-bold text-[#252525]">
                        Báo cáo doanh thu
                    </h2>

                    <p className="mt-2 text-sm text-gray-500">
                        Thống kê các khoản thanh toán đã ghi nhận.
                    </p>
                </div>

                <select
                    value={period}
                    onChange={(event) => setPeriod(event.target.value)}
                    className="rounded-xl border border-[#e8e2d8] bg-white px-4 py-3 text-sm outline-none"
                >
                    {periods.map((item) => (
                        <option key={item.value} value={item.value}>
                            {item.label}
                        </option>
                    ))}
                </select>
            </div>

            {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                    <div
                        key={card.title}
                        className="rounded-2xl border border-[#e8e2d8] bg-white p-5"
                    >
                        <p className="text-sm text-gray-500">{card.title}</p>

                        <p className="mt-3 text-2xl font-bold text-[#252525]">
                            {loading ? "Đang tải..." : formatMoney(card.value)}
                        </p>

                        <p className="mt-2 text-xs text-gray-500">
                            {card.description}
                        </p>
                    </div>
                ))}
            </div>

            <Link
                href="/admin/reports"
                className="mt-5 flex w-full items-center justify-center rounded-xl bg-[#252525] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#737B59]"
            >
                Xem báo cáo chi tiết →
            </Link>
        </section>
    );
}