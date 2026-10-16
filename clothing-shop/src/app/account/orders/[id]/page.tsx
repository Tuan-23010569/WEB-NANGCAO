
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

type OrderItem = {
    id: number;
    quantity: number;
    unitPrice: number | string;
    variant?: {
        size?: string;
        color?: string;
        product?: {
            name?: string;
            imageUrl?: string | null;
        } | null;
    } | null;
};

type Payment = {
    method: string;
    status: string;
    amount: number | string;
};

type Order = {
    id: number;
    status: string;
    totalAmount: number | string;
    address: string;
    phone: string;
    createdAt: string;
    items: OrderItem[];
    payments?: Payment[];
};

function formatMoney(value: number | string) {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        return "0 ₫";
    }

    return amount.toLocaleString("vi-VN") + " ₫";
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

function formatDate(date: string) {
    const value = new Date(date);

    if (Number.isNaN(value.getTime())) {
        return "Chưa có thông tin";
    }

    return value.toLocaleString("vi-VN");
}

function getPaymentMethod(method?: string) {
    if (!method) {
        return "Chưa có thông tin";
    }

    if (method === "COD") {
        return "Thanh toán khi nhận hàng (COD)";
    }

    return method;
}

function OrderDetailContent() {
    const params = useParams<{ id: string }>();
    const searchParams = useSearchParams();
    const router = useRouter();

    const id = params.id;
    const success = searchParams.get("success") === "1";

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [cancelLoading, setCancelLoading] = useState(false);
    const [message, setMessage] = useState("");

    const loadOrder = useCallback(async () => {
        if (!id || !/^[1-9]\d*$/.test(id)) {
            setError("Mã đơn hàng không hợp lệ.");
            setLoading(false);
            return;
        }

        const token = localStorage.getItem("tht_token");

        if (!token) {
            router.replace(
                `/login?next=${encodeURIComponent(`/account/orders/${id}`)}`
            );
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await fetch(`/api/orders/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                cache: "no-store",
            });

            if (response.status === 401) {
                localStorage.removeItem("tht_token");
                localStorage.removeItem("tht_user");

                router.replace(
                    `/login?next=${encodeURIComponent(`/account/orders/${id}`)}`
                );
                return;
            }

            const result = await response.json();

            if (!response.ok || result.success === false) {
                throw new Error(
                    result.message || "Không thể tải thông tin đơn hàng."
                );
            }

            if (!result.data || typeof result.data !== "object") {
                throw new Error("Không tìm thấy thông tin đơn hàng.");
            }

            setOrder({
                ...result.data,
                items: Array.isArray(result.data.items)
                    ? result.data.items
                    : [],
                payments: Array.isArray(result.data.payments)
                    ? result.data.payments
                    : [],
            });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Đã xảy ra lỗi khi tải đơn hàng."
            );
        } finally {
            setLoading(false);
        }
    }, [id, router]);

    useEffect(() => {
        void loadOrder();
    }, [loadOrder]);

    const handleCancelOrder = async () => {
        if (!order || order.status !== "PENDING" || cancelLoading) {
            return;
        }

        const confirmed = window.confirm(
            "Bạn có chắc chắn muốn hủy đơn hàng này không?"
        );

        if (!confirmed) {
            return;
        }

        const token = localStorage.getItem("tht_token");

        if (!token) {
            router.replace(
                `/login?next=${encodeURIComponent(`/account/orders/${order.id}`)}`
            );
            return;
        }

        setCancelLoading(true);
        setMessage("");
        setError("");

        try {
            const response = await fetch(
                `/api/orders/${order.id}/cancel`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.status === 401) {
                localStorage.removeItem("tht_token");
                localStorage.removeItem("tht_user");

                router.replace(
                    `/login?next=${encodeURIComponent(`/account/orders/${order.id}`)}`
                );
                return;
            }

            const result = await response.json();

            if (!response.ok || result.success === false) {
                throw new Error(
                    result.message || "Không thể hủy đơn hàng."
                );
            }

            if (result.data && typeof result.data === "object") {
                setOrder((current) =>
                    current
                        ? {
                            ...current,
                            ...result.data,
                            status:
                                result.data.status || "CANCELLED",
                        }
                        : current
                );
            } else {
                setOrder((current) =>
                    current
                        ? { ...current, status: "CANCELLED" }
                        : current
                );
            }

            setMessage("Hủy đơn hàng thành công.");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Đã xảy ra lỗi khi hủy đơn hàng."
            );
        } finally {
            setCancelLoading(false);
        }
    };

    return (
        <>
            <Header />

            <main className="min-h-[70vh] bg-[#F7F5F0] px-4 py-10 text-[#252525] sm:px-6">
                <div className="mx-auto max-w-4xl">
                    <Link
                        href="/account/orders"
                        className="text-sm text-gray-500 transition hover:text-black"
                    >
                        ← Quay lại đơn hàng
                    </Link>

                    {success && (
                        <div className="mt-6 rounded-xl border border-green-200 bg-white p-5">
                            <h1 className="text-xl font-semibold text-green-700">
                                Đặt hàng thành công!
                            </h1>

                            <p className="mt-2 text-sm leading-6 text-gray-600">
                                Cảm ơn bạn đã mua sắm tại THT CLOTHING.
                                Bạn có thể theo dõi trạng thái đơn hàng
                                tại đây.
                            </p>
                        </div>
                    )}

                    {message && (
                        <div
                            role="status"
                            className="mt-6 rounded-lg border border-green-200 bg-white p-4 text-sm text-green-700"
                        >
                            {message}
                        </div>
                    )}

                    {loading && (
                        <div className="py-16 text-center text-sm text-gray-500">
                            Đang tải thông tin đơn hàng...
                        </div>
                    )}

                    {!loading && error && (
                        <div
                            role="alert"
                            className="mt-8 rounded-xl border border-red-200 bg-white p-5"
                        >
                            <p className="text-sm leading-6 text-red-600">
                                {error}
                            </p>

                            <button
                                type="button"
                                onClick={() => void loadOrder()}
                                className="mt-4 rounded-md bg-[#252525] px-5 py-2.5 text-sm text-white transition hover:bg-[#737B59]"
                            >
                                Thử tải lại
                            </button>
                        </div>
                    )}

                    {!loading && !error && order && (
                        <>
                            <section className="mt-6 rounded-xl border border-[#E8E2D8] bg-white p-6">
                                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                                    <div>
                                        <h1 className="text-2xl font-semibold">
                                            Đơn hàng #{order.id}
                                        </h1>

                                        <p className="mt-2 text-sm text-gray-500">
                                            Ngày đặt:{" "}
                                            {formatDate(order.createdAt)}
                                        </p>
                                    </div>

                                    <span className="w-fit rounded-full bg-[#F0EEE7] px-3 py-1.5 text-sm text-[#737B59]">
                                        {formatStatus(order.status)}
                                    </span>
                                </div>
                            </section>

                            <section className="mt-6 rounded-xl border border-[#E8E2D8] bg-white p-6">
                                <h2 className="text-lg font-semibold">
                                    Sản phẩm đã đặt
                                </h2>

                                {order.items.length === 0 ? (
                                    <p className="py-8 text-sm text-gray-500">
                                        Đơn hàng chưa có thông tin sản phẩm.
                                    </p>
                                ) : (
                                    <div className="mt-4 divide-y divide-gray-100">
                                        {order.items.map((item) => {
                                            const productName =
                                                item.variant?.product?.name ||
                                                "Sản phẩm";

                                            const imageUrl =
                                                item.variant?.product?.imageUrl;

                                            return (
                                                <div
                                                    key={item.id}
                                                    className="flex gap-4 py-4"
                                                >
                                                    <div className="h-20 w-16 shrink-0 overflow-hidden bg-[#F0EEE7]">
                                                        {imageUrl ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img
                                                                src={imageUrl}
                                                                alt={productName}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-full items-center justify-center text-[10px] text-[#737B59]">
                                                                THT
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-medium">
                                                            {productName}
                                                        </p>

                                                        <p className="mt-1 text-sm text-gray-500">
                                                            Màu:{" "}
                                                            {item.variant?.color ||
                                                                "Không có"}{" "}
                                                            · Size:{" "}
                                                            {item.variant?.size ||
                                                                "Không có"}
                                                        </p>

                                                        <p className="mt-1 text-sm text-gray-500">
                                                            Số lượng:{" "}
                                                            {item.quantity}
                                                        </p>

                                                        <p className="mt-2 font-medium sm:hidden">
                                                            {formatMoney(
                                                                Number(item.unitPrice) *
                                                                item.quantity
                                                            )}
                                                        </p>
                                                    </div>

                                                    <p className="hidden shrink-0 font-medium sm:block">
                                                        {formatMoney(
                                                            Number(item.unitPrice) *
                                                            item.quantity
                                                        )}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="mt-4 border-t border-gray-200 pt-4 text-right">
                                    <p className="text-sm text-gray-500">
                                        Tổng thanh toán
                                    </p>

                                    <p className="mt-1 text-xl font-semibold">
                                        {formatMoney(order.totalAmount)}
                                    </p>
                                </div>
                            </section>

                            <section className="mt-6 rounded-xl border border-[#E8E2D8] bg-white p-6">
                                <h2 className="text-lg font-semibold">
                                    Thông tin giao hàng
                                </h2>

                                <div className="mt-4 space-y-3 text-sm leading-6 text-gray-600">
                                    <p>
                                        <span className="font-medium text-[#252525]">
                                            Số điện thoại:
                                        </span>{" "}
                                        {order.phone || "Chưa có thông tin"}
                                    </p>

                                    <p>
                                        <span className="font-medium text-[#252525]">
                                            Địa chỉ:
                                        </span>{" "}
                                        {order.address || "Chưa có thông tin"}
                                    </p>

                                    <p>
                                        <span className="font-medium text-[#252525]">
                                            Thanh toán:
                                        </span>{" "}
                                        {getPaymentMethod(
                                            order.payments?.[0]?.method
                                        )}
                                    </p>

                                    {order.payments?.[0]?.status && (
                                        <p>
                                            <span className="font-medium text-[#252525]">
                                                Trạng thái thanh toán:
                                            </span>{" "}
                                            {order.payments[0].status}
                                        </p>
                                    )}
                                </div>
                            </section>

                            <div className="mt-6 flex flex-wrap gap-3">
                                <Link
                                    href="/account/orders"
                                    className="rounded-md bg-[#252525] px-5 py-3 text-sm text-white transition hover:bg-[#737B59]"
                                >
                                    Xem tất cả đơn hàng
                                </Link>

                                <Link
                                    href="/products"
                                    className="rounded-md border border-[#252525] px-5 py-3 text-sm transition hover:bg-white"
                                >
                                    Tiếp tục mua sắm
                                </Link>

                                {order.status === "PENDING" && (
                                    <button
                                        type="button"
                                        onClick={handleCancelOrder}
                                        disabled={cancelLoading}
                                        className="rounded-md border border-red-500 px-5 py-3 text-sm text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {cancelLoading
                                            ? "Đang hủy..."
                                            : "Hủy đơn hàng"}
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </main>

            <Footer />
        </>
    );
}

export default function OrderDetailPage() {
    return (
        <Suspense
            fallback={
                <>
                    <Header />
                    <main className="min-h-[70vh] bg-[#F7F5F0] px-4 py-16 text-center text-sm text-gray-500">
                        Đang tải thông tin đơn hàng...
                    </main>
                    <Footer />
                </>
            }
        >
            <OrderDetailContent />
        </Suspense>
    );
}
