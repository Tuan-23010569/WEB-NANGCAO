
"use client";

import { useCallback, useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

type OrderStatus =
    | "PENDING"
    | "CONFIRMED"
    | "PROCESSING"
    | "SHIPPING"
    | "DELIVERED"
    | "COMPLETED"
    | "CANCELLED"
    | "CANCELED";

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
    id: number;
    amount: number | string;
    method: string;
    status: string;
};

type Order = {
    id: number;
    userId: number;
    totalAmount: number | string;
    status: OrderStatus;
    address: string;
    phone: string;
    createdAt: string;
    user?: {
        id: number;
        name: string;
        email: string;
        phone: string | null;
    } | null;
    items: OrderItem[];
    payments: Payment[];
};

const statusLabels: Record<OrderStatus, string> = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    PROCESSING: "Đang xử lý",
    SHIPPING: "Đang giao hàng",
    DELIVERED: "Đã giao hàng",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã hủy",
    CANCELED: "Đã hủy",
};

const statusColors: Record<OrderStatus, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    CONFIRMED: "bg-blue-100 text-blue-800",
    PROCESSING: "bg-indigo-100 text-indigo-800",
    SHIPPING: "bg-purple-100 text-purple-800",
    DELIVERED: "bg-teal-100 text-teal-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    CANCELED: "bg-red-100 text-red-800",
};

const nextStatuses: Partial<Record<OrderStatus, OrderStatus[]>> = {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["PROCESSING", "SHIPPING"],
    PROCESSING: ["SHIPPING"],
    SHIPPING: ["DELIVERED", "COMPLETED"],
    DELIVERED: ["COMPLETED"],
};

const statusFilters = [
    { value: "ALL", label: "Tất cả" },
    { value: "PENDING", label: "Chờ xác nhận" },
    { value: "CONFIRMED", label: "Đã xác nhận" },
    { value: "PROCESSING", label: "Đang xử lý" },
    { value: "SHIPPING", label: "Đang giao" },
    { value: "DELIVERED", label: "Đã giao" },
    { value: "COMPLETED", label: "Hoàn thành" },
    { value: "CANCELLED", label: "Đã hủy" },
];

function normalizeStatus(status: string): OrderStatus {
    if (status === "CANCELED") return "CANCELLED";

    const validStatuses: OrderStatus[] = [
        "PENDING",
        "CONFIRMED",
        "PROCESSING",
        "SHIPPING",
        "DELIVERED",
        "COMPLETED",
        "CANCELLED",
    ];

    return validStatuses.includes(status as OrderStatus)
        ? (status as OrderStatus)
        : "PENDING";
}

function formatMoney(value: number | string) {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        return "0 ₫";
    }

    return amount.toLocaleString("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    });
}

function formatDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Không có thông tin";
    }

    return date.toLocaleString("vi-VN");
}

function getStatusLabel(status: string) {
    const normalized = normalizeStatus(status);
    return statusLabels[normalized];
}

function getStatusColor(status: string) {
    const normalized = normalizeStatus(status);
    return statusColors[normalized];
}

function getActionLabel(status: OrderStatus) {
    const labels: Partial<Record<OrderStatus, string>> = {
        CONFIRMED: "Xác nhận",
        PROCESSING: "Xử lý",
        SHIPPING: "Giao hàng",
        DELIVERED: "Đã giao",
        COMPLETED: "Hoàn thành",
        CANCELLED: "Hủy đơn",
    };

    return labels[status] ?? statusLabels[status];
}

function normalizeOrder(data: Order): Order {
    return {
        ...data,
        status: normalizeStatus(data.status),
        items: Array.isArray(data.items) ? data.items : [],
        payments: Array.isArray(data.payments) ? data.payments : [],
    };
}

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [filter, setFilter] = useState("ALL");
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const loadOrders = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const token = localStorage.getItem("tht_token");

            if (!token) {
                setError(
                    "Bạn chưa đăng nhập. Vui lòng đăng nhập bằng tài khoản Admin."
                );
                return;
            }

            const response = await fetch("/api/admin/orders", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                cache: "no-store",
            });

            if (response.status === 401 || response.status === 403) {
                setError(
                    response.status === 401
                        ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
                        : "Bạn không có quyền truy cập trang quản lý đơn hàng."
                );
                return;
            }

            const result = await response.json();

            if (!response.ok || result.success !== true) {
                throw new Error(
                    result.message || "Không thể tải danh sách đơn hàng."
                );
            }

            const data: Order[] = Array.isArray(result.data)
                ? result.data.map((order: Order) => normalizeOrder(order))
                : [];

            setOrders(data);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Đã xảy ra lỗi khi tải đơn hàng."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadOrders();
    }, [loadOrders]);

    async function updateStatus(
        order: Order,
        newStatus: OrderStatus
    ) {
        if (updatingId !== null) return;

        const allowedStatuses = nextStatuses[order.status] ?? [];

        if (!allowedStatuses.includes(newStatus)) {
            setError("Không thể chuyển đơn hàng sang trạng thái này.");
            return;
        }

        const action =
            newStatus === "CANCELLED"
                ? "hủy"
                : `chuyển sang trạng thái "${statusLabels[newStatus]}"`;

        if (
            !window.confirm(
                `Bạn có chắc chắn muốn ${action} đơn hàng #${order.id}?`
            )
        ) {
            return;
        }

        setUpdatingId(order.id);
        setError("");
        setMessage("");

        try {
            const token = localStorage.getItem("tht_token");

            if (!token) {
                throw new Error("Phiên đăng nhập không tồn tại.");
            }

            const response = await fetch(
                `/api/admin/orders/${order.id}/status`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ status: newStatus }),
                }
            );

            if (response.status === 401 || response.status === 403) {
                throw new Error(
                    response.status === 401
                        ? "Phiên đăng nhập đã hết hạn."
                        : "Bạn không có quyền cập nhật đơn hàng."
                );
            }

            const result = await response.json();

            if (!response.ok || result.success !== true) {
                throw new Error(
                    result.message || "Không thể cập nhật trạng thái đơn hàng."
                );
            }

            const updatedOrder = normalizeOrder({
                ...order,
                ...(result.data ?? {}),
                status: normalizeStatus(
                    result.data?.status ?? newStatus
                ),
            });

            setOrders((current) =>
                current.map((item) =>
                    item.id === order.id ? updatedOrder : item
                )
            );

            setSelectedOrder((current) =>
                current?.id === order.id ? updatedOrder : current
            );

            setMessage(
                `Đã cập nhật trạng thái đơn hàng #${order.id} thành "${statusLabels[updatedOrder.status]}".`
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Đã xảy ra lỗi khi cập nhật đơn hàng."
            );
        } finally {
            setUpdatingId(null);
        }
    }

    const filteredOrders = orders.filter((order) => {
        if (filter === "ALL") return true;

        if (filter === "CANCELLED") {
            return (
                order.status === "CANCELLED" ||
                order.status === "CANCELED"
            );
        }

        return order.status === filter;
    });

    const totalRevenue = orders
        .filter(
            (order) =>
                order.status === "COMPLETED" ||
                order.status === "DELIVERED"
        )
        .reduce((sum, order) => {
            const amount = Number(order.totalAmount);
            return sum + (Number.isFinite(amount) ? amount : 0);
        }, 0);

    const pendingCount = orders.filter(
        (order) => order.status === "PENDING"
    ).length;

    return (
        <>
            <Header />
            <main className="min-h-screen bg-[#F7F5F0] px-4 py-8 text-[#252525] sm:px-6 lg:px-10">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                            <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-[#737B59]">
                                THT CLOTHING / ADMIN
                            </p>

                            <h1 className="text-3xl font-bold sm:text-4xl">
                                Quản lý đơn hàng
                            </h1>

                            <p className="mt-2 text-sm text-gray-600">
                                Theo dõi đơn hàng và cập nhật quá trình xử lý.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => void loadOrders()}
                            disabled={loading}
                            className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? "Đang tải..." : "Làm mới"}
                        </button>
                    </div>

                    <div className="mb-6 grid gap-4 sm:grid-cols-3">
                        <div className="rounded-xl border border-gray-200 bg-white p-5">
                            <p className="text-sm text-gray-500">
                                Tổng đơn hàng
                            </p>
                            <p className="mt-2 text-2xl font-bold">
                                {orders.length}
                            </p>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-5">
                            <p className="text-sm text-gray-500">
                                Chờ xác nhận
                            </p>
                            <p className="mt-2 text-2xl font-bold text-amber-700">
                                {pendingCount}
                            </p>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-5">
                            <p className="text-sm text-gray-500">
                                Doanh thu đơn đã giao/hoàn thành
                            </p>
                            <p className="mt-2 break-words text-xl font-bold text-[#737B59]">
                                {formatMoney(totalRevenue)}
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div
                            role="alert"
                            className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                        >
                            {error}
                        </div>
                    )}

                    {message && (
                        <div
                            role="status"
                            className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
                        >
                            {message}
                        </div>
                    )}

                    <div className="mb-5 flex flex-wrap items-center gap-2">
                        <span className="mr-2 text-sm font-semibold">
                            Lọc trạng thái:
                        </span>

                        {statusFilters.map((item) => (
                            <button
                                type="button"
                                key={item.value}
                                onClick={() => setFilter(item.value)}
                                className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === item.value
                                    ? "bg-[#737B59] text-white"
                                    : "border border-gray-300 bg-white hover:bg-gray-100"
                                    }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                        {loading ? (
                            <div className="p-12 text-center text-gray-500">
                                Đang tải danh sách đơn hàng...
                            </div>
                        ) : filteredOrders.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                Không có đơn hàng nào trong trạng thái này.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1000px] text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-600">
                                        <tr>
                                            <th className="px-5 py-4">Mã đơn</th>
                                            <th className="px-5 py-4">Khách hàng</th>
                                            <th className="px-5 py-4">Ngày đặt</th>
                                            <th className="px-5 py-4">Tổng tiền</th>
                                            <th className="px-5 py-4">Trạng thái</th>
                                            <th className="px-5 py-4">Thao tác</th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-gray-100">
                                        {filteredOrders.map((order) => (
                                            <tr
                                                key={order.id}
                                                className="hover:bg-gray-50"
                                            >
                                                <td className="px-5 py-4 font-semibold">
                                                    #{order.id}
                                                    <p className="mt-1 text-xs font-normal text-gray-500">
                                                        {order.items.length} dòng sản phẩm
                                                    </p>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <p className="font-medium">
                                                        {order.user?.name || "Khách hàng"}
                                                    </p>
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {order.user?.email || "Không có email"}
                                                    </p>
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {order.phone || order.user?.phone || "Không có số điện thoại"}
                                                    </p>
                                                </td>

                                                <td className="px-5 py-4 text-gray-600">
                                                    {formatDate(order.createdAt)}
                                                </td>

                                                <td className="px-5 py-4 font-semibold">
                                                    {formatMoney(order.totalAmount)}
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span
                                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(order.status)}`}
                                                    >
                                                        {getStatusLabel(order.status)}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedOrder(order)}
                                                            className="rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold hover:bg-gray-100"
                                                        >
                                                            Chi tiết
                                                        </button>

                                                        {(nextStatuses[order.status] ?? []).map(
                                                            (status) => (
                                                                <button
                                                                    type="button"
                                                                    key={status}
                                                                    disabled={updatingId !== null}
                                                                    onClick={() =>
                                                                        void updateStatus(order, status)
                                                                    }
                                                                    className={`rounded-md px-3 py-2 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${status === "CANCELLED"
                                                                        ? "bg-red-600 hover:bg-red-700"
                                                                        : "bg-[#737B59] hover:bg-[#5c6348]"
                                                                        }`}
                                                                >
                                                                    {getActionLabel(status)}
                                                                </button>
                                                            )
                                                        )}
                                                    </div>

                                                    {updatingId === order.id && (
                                                        <p className="mt-2 text-xs text-gray-500">
                                                            Đang cập nhật...
                                                        </p>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <p className="mt-4 text-sm text-gray-500">
                        Đang hiển thị {filteredOrders.length} / {orders.length} đơn hàng.
                    </p>
                </div>

                {selectedOrder && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                        onClick={() => setSelectedOrder(null)}
                    >
                        <section
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="order-detail-title"
                            onClick={(event) => event.stopPropagation()}
                            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-8"
                        >
                            <div className="mb-6 flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">
                                        Chi tiết đơn hàng
                                    </p>
                                    <h2
                                        id="order-detail-title"
                                        className="mt-1 text-2xl font-bold"
                                    >
                                        Đơn hàng #{selectedOrder.id}
                                    </h2>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setSelectedOrder(null)}
                                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100"
                                >
                                    Đóng
                                </button>
                            </div>

                            <div className="mb-6 grid gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-2">
                                <div>
                                    <p className="text-xs text-gray-500">
                                        Khách hàng
                                    </p>
                                    <p className="mt-1 font-semibold">
                                        {selectedOrder.user?.name || "Khách hàng"}
                                    </p>
                                    <p className="mt-1 text-sm text-gray-600">
                                        {selectedOrder.user?.email || "Không có email"}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-500">
                                        Số điện thoại nhận hàng
                                    </p>
                                    <p className="mt-1 font-semibold">
                                        {selectedOrder.phone || "Không có thông tin"}
                                    </p>
                                </div>

                                <div className="sm:col-span-2">
                                    <p className="text-xs text-gray-500">
                                        Địa chỉ giao hàng
                                    </p>
                                    <p className="mt-1">
                                        {selectedOrder.address || "Không có thông tin"}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-500">Ngày đặt</p>
                                    <p className="mt-1">
                                        {formatDate(selectedOrder.createdAt)}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-500">Thanh toán</p>
                                    <p className="mt-1">
                                        {selectedOrder.payments
                                            .map(
                                                (payment) =>
                                                    `${payment.method} - ${payment.status}`
                                            )
                                            .join(", ") || "Chưa có thông tin"}
                                    </p>
                                </div>
                            </div>

                            <h3 className="mb-3 font-bold">
                                Sản phẩm trong đơn
                            </h3>

                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="w-full min-w-[500px] text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-600">
                                        <tr>
                                            <th className="px-4 py-3">Sản phẩm</th>
                                            <th className="px-4 py-3">Phân loại</th>
                                            <th className="px-4 py-3">SL</th>
                                            <th className="px-4 py-3">Đơn giá</th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-gray-100">
                                        {selectedOrder.items.map((item) => (
                                            <tr key={item.id}>
                                                <td className="px-4 py-3 font-medium">
                                                    {item.variant?.product?.name || "Sản phẩm"}
                                                </td>

                                                <td className="px-4 py-3 text-gray-600">
                                                    {item.variant?.size || "—"} /{" "}
                                                    {item.variant?.color || "—"}
                                                </td>

                                                <td className="px-4 py-3">
                                                    {item.quantity}
                                                </td>

                                                <td className="px-4 py-3">
                                                    {formatMoney(item.unitPrice)}
                                                </td>
                                            </tr>
                                        ))}

                                        {selectedOrder.items.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={4}
                                                    className="px-4 py-6 text-center text-gray-500"
                                                >
                                                    Không có sản phẩm trong đơn hàng.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-5 flex flex-col gap-4 border-t border-gray-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">
                                        Trạng thái hiện tại
                                    </p>
                                    <span
                                        className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(selectedOrder.status)}`}
                                    >
                                        {getStatusLabel(selectedOrder.status)}
                                    </span>
                                </div>

                                <p className="text-xl font-bold">
                                    Tổng: {formatMoney(selectedOrder.totalAmount)}
                                </p>
                            </div>

                            {(nextStatuses[selectedOrder.status] ?? []).length > 0 && (
                                <div className="mt-6 flex flex-wrap gap-3">
                                    {(nextStatuses[selectedOrder.status] ?? []).map(
                                        (status) => (
                                            <button
                                                type="button"
                                                key={status}
                                                disabled={updatingId !== null}
                                                onClick={() =>
                                                    void updateStatus(selectedOrder, status)
                                                }
                                                className={`rounded-lg px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 ${status === "CANCELLED"
                                                    ? "bg-red-600 hover:bg-red-700"
                                                    : "bg-[#737B59] hover:bg-[#5c6348]"
                                                    }`}
                                            >
                                                {getActionLabel(status)}
                                            </button>
                                        )
                                    )}
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </main>
            <Footer />
        </>
    );
}
