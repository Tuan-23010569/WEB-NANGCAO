
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

type Order = {
    id: number;
    status: string;
    totalAmount: number | string;
    createdAt: string;
    address: string;
    phone: string;
    items?: { quantity: number }[];
};

function formatMoney(value: number | string) {
    return Number(value).toLocaleString("vi-VN") + " ₫";
}

function formatStatus(status: string) {
    const statuses: Record<string, string> = {
        PENDING: "Chờ xác nhận",
        CONFIRMED: "Đã xác nhận",
        PROCESSING: "Đang xử lý",
        SHIPPING: "Đang giao hàng",
        DELIVERED: "Đã giao hàng",
        COMPLETED: "Hoàn thành",
        CANCELLED: "Đã hủy",
        CANCELED: "Đã hủy",
    };

    return statuses[status] || status;
}

export default function OrderHistoryPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("tht_token");

        if (!token) {
            router.replace("/login?next=/account/orders");
            return;
        }

        async function fetchOrders() {
            try {
                const response = await fetch("/api/orders", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    cache: "no-store",
                });

                const result = await response.json();

                if (response.status === 401) {
                    localStorage.removeItem("tht_token");
                    localStorage.removeItem("tht_user");
                    router.replace("/login?next=/account/orders");
                    return;
                }

                if (!response.ok || result.success === false) {
                    throw new Error(result.message || "Không thể tải đơn hàng.");
                }

                setOrders(Array.isArray(result.data) ? result.data : []);
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : "Đã xảy ra lỗi."
                );
            } finally {
                setLoading(false);
            }
        }

        fetchOrders();
    }, [router]);

    return (
        <>
            <Header />

            <main className="min-h-[70vh] bg-[#F7F5F0] px-4 py-10 sm:px-6">
                <div className="mx-auto max-w-5xl">
                    <Link
                        href="/"
                        className="text-sm text-gray-500 hover:text-black"
                    >
                        Trang chủ
                    </Link>

                    <h1 className="mt-4 text-3xl font-semibold text-[#252525]">
                        Đơn hàng của tôi
                    </h1>

                    <p className="mt-2 text-gray-600">
                        Theo dõi các đơn hàng bạn đã đặt tại THT CLOTHING.
                    </p>

                    {loading && (
                        <p className="py-12 text-center text-gray-500">
                            Đang tải đơn hàng...
                        </p>
                    )}

                    {!loading && error && (
                        <div className="mt-8 rounded-lg border border-red-200 bg-white p-5 text-red-600">
                            {error}
                            <button
                                onClick={() => window.location.reload()}
                                className="ml-3 underline"
                            >
                                Thử lại
                            </button>
                        </div>
                    )}

                    {!loading && !error && orders.length === 0 && (
                        <div className="mt-8 rounded-xl bg-white px-6 py-12 text-center">
                            <h2 className="text-xl font-medium">
                                Bạn chưa có đơn hàng nào
                            </h2>
                            <p className="mt-2 text-gray-500">
                                Hãy khám phá bộ sưu tập của chúng tôi nhé.
                            </p>
                            <Link
                                href="/products"
                                className="mt-6 inline-block rounded-md bg-[#252525] px-6 py-3 text-white hover:bg-[#737B59]"
                            >
                                Mua sắm ngay
                            </Link>
                        </div>
                    )}

                    {!loading && !error && orders.length > 0 && (
                        <div className="mt-8 space-y-5">
                            {orders.map((order) => (
                                <div
                                    key={order.id}
                                    className="rounded-xl border border-[#E8E2D8] bg-white p-5 sm:p-6"
                                >
                                    <div className="flex flex-col justify-between gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center">
                                        <div>
                                            <p className="font-semibold text-[#252525]">
                                                Đơn hàng #{order.id}
                                            </p>
                                            <p className="mt-1 text-sm text-gray-500">
                                                Ngày đặt:{" "}
                                                {new Date(order.createdAt).toLocaleDateString(
                                                    "vi-VN"
                                                )}
                                            </p>
                                        </div>

                                        <span className="w-fit rounded-full bg-[#F0EEE7] px-3 py-1 text-sm text-[#737B59]">
                                            {formatStatus(order.status)}
                                        </span>
                                    </div>

                                    <div className="py-4 text-sm text-gray-600">
                                        <p>
                                            Số sản phẩm:{" "}
                                            {order.items?.reduce(
                                                (total, item) => total + item.quantity,
                                                0
                                            ) ?? 0}
                                        </p>
                                        <p className="mt-2">
                                            Địa chỉ nhận hàng: {order.address}
                                        </p>
                                        <p className="mt-1">Số điện thoại: {order.phone}</p>
                                    </div>

                                    <div className="flex flex-col justify-between gap-4 border-t border-gray-100 pt-4 sm:flex-row sm:items-center">
                                        <div>
                                            <p className="text-sm text-gray-500">
                                                Tổng thanh toán
                                            </p>
                                            <p className="mt-1 text-lg font-semibold text-[#252525]">
                                                {formatMoney(order.totalAmount)}
                                            </p>
                                        </div>

                                        <Link
                                            href={`/account/orders/${order.id}`}
                                            className="rounded-md border border-[#252525] px-5 py-2.5 text-center text-sm hover:bg-[#252525] hover:text-white"
                                        >
                                            Xem chi tiết
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </>
    );
}
