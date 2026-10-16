
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

type RentalItem = {
    id?: number;
    quantity: number;
    unitPrice?: number | string;
    variant?: {
        size?: string;
        color?: string;
        product?: {
            id: number;
            name: string;
            imageUrl?: string | null;
        };
    };
};

type Rental = {
    id: number;
    status: string;
    totalAmount: number | string;
    startDate: string;
    endDate: string;
    createdAt: string;
    address: string;
    phone: string;
    items?: RentalItem[];
    payments?: {
        status: string;
        method: string;
    }[];
};

function formatMoney(value: number | string) {
    return Number(value).toLocaleString("vi-VN") + " ₫";
}

function formatDate(value: string) {
    return new Date(value).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
    });
}

function getStatus(status: string) {
    const statuses: Record<string, { label: string; style: string }> = {
        PENDING: {
            label: "Chờ xác nhận",
            style: "bg-amber-50 text-amber-700",
        },
        CONFIRMED: {
            label: "Đã xác nhận",
            style: "bg-blue-50 text-blue-700",
        },
        RENTING: {
            label: "Đang thuê",
            style: "bg-purple-50 text-purple-700",
        },
        RETURNED: {
            label: "Đã trả đồ",
            style: "bg-green-50 text-green-700",
        },
        CANCELLED: {
            label: "Đã hủy",
            style: "bg-gray-100 text-gray-600",
        },
    };

    return statuses[status] ?? {
        label: status,
        style: "bg-gray-100 text-gray-600",
    };
}

export default function RentalHistoryPage() {
    const router = useRouter();

    const [rentals, setRentals] = useState<Rental[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [cancellingId, setCancellingId] = useState<number | null>(null);

    const loadRentals = useCallback(async () => {
        const token = localStorage.getItem("tht_token");

        if (!token) {
            router.replace(
                `/login?next=${encodeURIComponent("/account/rentals")}`
            );
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/rentals", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                cache: "no-store",
            });

            const result = await response.json();

            if (response.status === 401) {
                localStorage.removeItem("tht_token");
                localStorage.removeItem("tht_user");
                router.replace(
                    `/login?next=${encodeURIComponent("/account/rentals")}`
                );
                return;
            }

            if (!response.ok) {
                throw new Error(
                    result.message || "Không thể tải danh sách đơn thuê."
                );
            }

            setRentals(Array.isArray(result.data) ? result.data : []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Đã xảy ra lỗi khi tải đơn thuê."
            );
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        loadRentals();
    }, [loadRentals]);

    async function cancelRental(rentalId: number) {
        const confirmed = window.confirm(
            `Bạn có chắc muốn hủy đơn thuê #${rentalId}?`
        );

        if (!confirmed) return;

        const token = localStorage.getItem("tht_token");

        if (!token) {
            router.replace(
                `/login?next=${encodeURIComponent("/account/rentals")}`
            );
            return;
        }

        setCancellingId(rentalId);
        setError("");
        setNotice("");

        try {
            const response = await fetch(
                `/api/rentals/${rentalId}/cancel`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const result = await response.json();

            if (response.status === 401) {
                localStorage.removeItem("tht_token");
                localStorage.removeItem("tht_user");
                router.replace(
                    `/login?next=${encodeURIComponent("/account/rentals")}`
                );
                return;
            }

            if (!response.ok) {
                const messages: Record<string, string> = {
                    RENTAL_NOT_FOUND: "Không tìm thấy đơn thuê.",
                    RENTAL_CANNOT_CANCEL:
                        "Đơn thuê không thể hủy ở trạng thái hiện tại.",
                    RENTAL_PAYMENT_ALREADY_PAID:
                        "Đơn thuê đã thanh toán nên không thể hủy.",
                };

                throw new Error(
                    messages[result.message] ||
                    result.message ||
                    "Không thể hủy đơn thuê."
                );
            }

            setNotice(`Đã hủy đơn thuê #${rentalId} thành công.`);
            await loadRentals();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Có lỗi khi hủy đơn thuê."
            );
        } finally {
            setCancellingId(null);
        }
    }

    return (
        <div className="min-h-screen bg-[#F7F5F0] text-[#252525]">
            <Header />

            <main className="min-h-[70vh] px-4 py-10 sm:px-6">
                <div className="mx-auto max-w-5xl">
                    <Link
                        href="/"
                        className="text-sm text-gray-500 hover:text-[#737B59]"
                    >
                        Trang chủ
                    </Link>

                    <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#737B59]">
                                THT CLOTHING
                            </p>

                            <h1 className="mt-2 text-3xl font-semibold">
                                Đơn thuê của tôi
                            </h1>

                            <p className="mt-2 text-sm text-gray-600">
                                Theo dõi lịch thuê và tình trạng trang phục.
                            </p>
                        </div>

                        <Link
                            href="/rentals"
                            className="inline-flex w-fit items-center justify-center bg-[#252525] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#737B59]"
                        >
                            + Thuê thêm đồ
                        </Link>
                    </div>

                    {notice && (
                        <div
                            role="status"
                            className="mt-6 border border-green-200 bg-green-50 p-4 text-sm text-green-800"
                        >
                            {notice}
                        </div>
                    )}

                    {error && (
                        <div
                            role="alert"
                            className="mt-6 border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                        >
                            {error}

                            <button
                                type="button"
                                onClick={loadRentals}
                                className="ml-3 font-semibold underline"
                            >
                                Thử lại
                            </button>
                        </div>
                    )}

                    {loading ? (
                        <div className="py-16 text-center text-sm text-gray-500">
                            Đang tải danh sách đơn thuê...
                        </div>
                    ) : rentals.length === 0 && !error ? (
                        <div className="mt-8 border border-[#E8E2D8] bg-white px-6 py-14 text-center">
                            <div className="text-4xl">🛍️</div>

                            <h2 className="mt-4 text-xl font-semibold">
                                Bạn chưa có đơn thuê nào
                            </h2>

                            <p className="mt-2 text-sm text-gray-500">
                                Hãy chọn trang phục yêu thích để bắt đầu.
                            </p>

                            <Link
                                href="/rentals"
                                className="mt-6 inline-block bg-[#252525] px-6 py-3 text-sm text-white hover:bg-[#737B59]"
                            >
                                Khám phá đồ thuê
                            </Link>
                        </div>
                    ) : (
                        <div className="mt-8 space-y-6">
                            {rentals.map((rental) => {
                                const status = getStatus(rental.status);

                                const totalQuantity =
                                    rental.items?.reduce(
                                        (total, item) =>
                                            total + item.quantity,
                                        0
                                    ) ?? 0;

                                const canCancel =
                                    rental.status === "PENDING" &&
                                    !rental.payments?.some(
                                        (payment) =>
                                            payment.status === "PAID"
                                    );

                                return (
                                    <article
                                        key={rental.id}
                                        className="border border-[#E8E2D8] bg-white p-5 sm:p-6"
                                    >
                                        <div className="flex flex-col justify-between gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-start">
                                            <div>
                                                <h2 className="text-lg font-semibold">
                                                    Đơn thuê #{rental.id}
                                                </h2>

                                                <p className="mt-1 text-sm text-gray-500">
                                                    Ngày đặt:{" "}
                                                    {formatDate(rental.createdAt)}
                                                </p>
                                            </div>

                                            <span
                                                className={`w-fit rounded-full px-3 py-1.5 text-sm font-medium ${status.style}`}
                                            >
                                                {status.label}
                                            </span>
                                        </div>

                                        <div className="grid gap-3 border-b border-gray-100 py-5 text-sm sm:grid-cols-2">
                                            <div>
                                                <p className="text-gray-500">
                                                    Thời gian thuê
                                                </p>

                                                <p className="mt-1 font-medium">
                                                    {formatDate(rental.startDate)}
                                                    {" – "}
                                                    {formatDate(rental.endDate)}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-gray-500">
                                                    Số lượng sản phẩm
                                                </p>

                                                <p className="mt-1 font-medium">
                                                    {totalQuantity} sản phẩm
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-gray-500">
                                                    Số điện thoại
                                                </p>

                                                <p className="mt-1">
                                                    {rental.phone}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-gray-500">
                                                    Địa chỉ nhận hàng
                                                </p>

                                                <p className="mt-1">
                                                    {rental.address}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-4 py-5">
                                            <h3 className="text-sm font-semibold">
                                                Sản phẩm trong đơn
                                            </h3>

                                            {rental.items?.map((item, index) => (
                                                <div
                                                    key={item.id ?? `${rental.id}-${index}`}
                                                    className="flex items-start justify-between gap-4"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium">
                                                            {item.variant?.product?.name ??
                                                                "Sản phẩm"}
                                                        </p>

                                                        <p className="mt-1 text-xs text-gray-500">
                                                            Size: {item.variant?.size ?? "—"}
                                                            {" · "}
                                                            Màu: {item.variant?.color ?? "—"}
                                                            {" · "}
                                                            SL: {item.quantity}
                                                        </p>
                                                    </div>

                                                    <p className="shrink-0 text-sm font-medium">
                                                        {formatMoney(
                                                            Number(item.unitPrice ?? 0) *
                                                            item.quantity
                                                        )}
                                                        <span className="block text-right text-xs font-normal text-gray-500">
                                                            / ngày
                                                        </span>
                                                    </p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex flex-col justify-between gap-4 border-t border-gray-100 pt-5 sm:flex-row sm:items-center">
                                            <div>
                                                <p className="text-sm text-gray-500">
                                                    Tổng tiền thuê
                                                </p>

                                                <p className="mt-1 text-xl font-semibold">
                                                    {formatMoney(rental.totalAmount)}
                                                </p>

                                                <p className="mt-1 text-xs text-gray-500">
                                                    Thanh toán COD
                                                </p>
                                            </div>

                                            {canCancel && (
                                                <button
                                                    type="button"
                                                    disabled={cancellingId === rental.id}
                                                    onClick={() =>
                                                        cancelRental(rental.id)
                                                    }
                                                    className="border border-red-300 px-5 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {cancellingId === rental.id
                                                        ? "Đang hủy..."
                                                        : "Hủy đơn thuê"}
                                                </button>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
