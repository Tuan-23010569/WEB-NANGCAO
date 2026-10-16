
"use client";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { useCallback, useEffect, useMemo, useState } from "react";

type RentalStatus =
    | "PENDING"
    | "CONFIRMED"
    | "RENTING"
    | "RETURNED"
    | "CANCELLED";

type RentalItem = {
    id: number;
    quantity: number;
    unitPrice: number | string;
    variant: {
        size: string;
        color: string;
        product: {
            name: string;
        };
    };
};

type Rental = {
    id: number;
    totalAmount: number | string;
    status: RentalStatus;
    startDate: string;
    endDate: string;
    createdAt: string;
    address: string;
    phone: string;
    user: {
        id: number;
        name: string;
        email: string;
        phone: string | null;
    };
    items: RentalItem[];
    payments: {
        method: string;
        status: string;
    }[];
};

const statusLabels: Record<RentalStatus, string> = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    RENTING: "Đang cho thuê",
    RETURNED: "Đã trả đồ",
    CANCELLED: "Đã hủy",
};

const statusColors: Record<RentalStatus, string> = {
    PENDING: "bg-amber-100 text-amber-800 ring-amber-200",
    CONFIRMED: "bg-blue-100 text-blue-800 ring-blue-200",
    RENTING: "bg-violet-100 text-violet-800 ring-violet-200",
    RETURNED: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    CANCELLED: "bg-red-100 text-red-800 ring-red-200",
};

const nextStatuses: Partial<Record<RentalStatus, RentalStatus>> = {
    PENDING: "CONFIRMED",
    CONFIRMED: "RENTING",
    RENTING: "RETURNED",
};

const actionLabels: Partial<Record<RentalStatus, string>> = {
    CONFIRMED: "Xác nhận lịch",
    RENTING: "Bàn giao đồ",
    RETURNED: "Xác nhận trả",
};

const filters: { value: string; label: string }[] = [
    { value: "ALL", label: "Tất cả" },
    { value: "PENDING", label: "Chờ xác nhận" },
    { value: "CONFIRMED", label: "Đã xác nhận" },
    { value: "RENTING", label: "Đang cho thuê" },
    { value: "RETURNED", label: "Đã trả đồ" },
    { value: "CANCELLED", label: "Đã hủy" },
];

function formatMoney(value: number | string) {
    return Number(value).toLocaleString("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    });
}

function dateKey(value: string | Date) {
    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function parseDate(value: string) {
    if (!value) return null;

    const datePart = value.slice(0, 10);
    const date = new Date(`${datePart}T00:00:00Z`);

    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string) {
    const date = parseDate(value);

    if (!date) return "Chưa có thông tin";

    return date.toLocaleDateString("vi-VN", {
        timeZone: "UTC",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function daysBetween(start: string, end: string) {
    const startDate = parseDate(start);
    const endDate = parseDate(end);

    if (!startDate || !endDate) return 0;

    return Math.max(
        0,
        Math.floor(
            (endDate.getTime() - startDate.getTime()) / 86400000
        ) + 1
    );
}

function daysFromToday(value: string) {
    const target = parseDate(value);
    const today = parseDate(dateKey(new Date()));

    if (!target || !today) return null;

    return Math.round(
        (target.getTime() - today.getTime()) / 86400000
    );
}

function isOverdue(rental: Rental) {
    const remaining = daysFromToday(rental.endDate);

    return rental.status === "RENTING"
        && remaining !== null
        && remaining < 0;
}

function getRentalTimeLabel(rental: Rental) {
    if (isOverdue(rental)) {
        const overdueDays = Math.abs(daysFromToday(rental.endDate) ?? 0);

        return {
            text: `Quá hạn ${overdueDays} ngày`,
            className: "bg-red-100 text-red-700",
        };
    }

    if (rental.status === "RENTING") {
        const remaining = daysFromToday(rental.endDate);

        if (remaining === 0) {
            return {
                text: "Hạn trả hôm nay",
                className: "bg-amber-100 text-amber-800",
            };
        }

        if (remaining !== null && remaining > 0 && remaining <= 3) {
            return {
                text: `Còn ${remaining} ngày`,
                className: "bg-amber-100 text-amber-800",
            };
        }

        if (remaining !== null && remaining > 3) {
            return {
                text: `Còn ${remaining} ngày`,
                className: "bg-emerald-100 text-emerald-800",
            };
        }
    }

    if (rental.status === "RETURNED") {
        return {
            text: "Đã hoàn tất",
            className: "bg-emerald-100 text-emerald-800",
        };
    }

    if (rental.status === "CANCELLED") {
        return {
            text: "Lịch đã hủy",
            className: "bg-gray-100 text-gray-600",
        };
    }

    return {
        text: `${daysBetween(rental.startDate, rental.endDate)} ngày thuê`,
        className: "bg-blue-50 text-blue-700",
    };
}

export default function AdminRentalsPage() {
    const [rentals, setRentals] = useState<Rental[]>([]);
    const [filter, setFilter] = useState("ALL");
    const [keyword, setKeyword] = useState("");
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [selected, setSelected] = useState<Rental | null>(null);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const loadRentals = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const token = localStorage.getItem("tht_token");

            if (!token) {
                throw new Error(
                    "Vui lòng đăng nhập bằng tài khoản quản trị."
                );
            }

            const response = await fetch("/api/admin/rentals", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                cache: "no-store",
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Không thể tải danh sách lịch thuê."
                );
            }

            setRentals(Array.isArray(result.data) ? result.data : []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Có lỗi khi tải danh sách lịch thuê."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadRentals();
    }, [loadRentals]);

    async function changeStatus(
        rental: Rental,
        status: RentalStatus
    ) {
        const action = status === "RETURNED"
            ? "xác nhận khách đã trả đồ"
            : status === "RENTING"
                ? "xác nhận bàn giao quần áo"
                : "xác nhận lịch thuê";

        if (!window.confirm(`Bạn có muốn ${action} #${rental.id}?`)) {
            return;
        }

        setUpdatingId(rental.id);
        setError("");
        setMessage("");

        try {
            const token = localStorage.getItem("tht_token");

            if (!token) {
                throw new Error("Phiên đăng nhập không tồn tại.");
            }

            const response = await fetch(
                `/api/admin/rentals/${rental.id}/status`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ status }),
                }
            );

            const result = await response.json();

            if (!response.ok || result.success === false) {
                throw new Error(
                    result.message || "Không thể cập nhật trạng thái lịch thuê."
                );
            }

            const updatedRental = result.data as Rental;

            if (!updatedRental || updatedRental.id == null) {
                throw new Error(
                    "Máy chủ không trả về thông tin lịch thuê đã cập nhật."
                );
            }

            setRentals((current) =>
                current.map((item) =>
                    item.id === rental.id
                        ? { ...item, ...updatedRental }
                        : item
                )
            );

            setSelected((current) =>
                current?.id === rental.id
                    ? { ...current, ...updatedRental }
                    : current
            );

            setMessage(`Đã cập nhật lịch thuê #${rental.id}.`);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Có lỗi khi cập nhật lịch thuê."
            );
        } finally {
            setUpdatingId(null);
        }
    }

    const overdueRentals = useMemo(
        () => rentals.filter(isOverdue),
        [rentals]
    );

    const dueSoonRentals = useMemo(
        () =>
            rentals.filter((rental) => {
                if (rental.status !== "RENTING" || isOverdue(rental)) {
                    return false;
                }

                const remaining = daysFromToday(rental.endDate);

                return remaining !== null && remaining >= 0 && remaining <= 3;
            }),
        [rentals]
    );

    const filteredRentals = useMemo(() => {
        const search = keyword.trim().toLocaleLowerCase("vi");

        return rentals
            .filter((rental) =>
                filter === "ALL" ? true : rental.status === filter
            )
            .filter((rental) => {
                if (!search) return true;

                const searchable = [
                    String(rental.id),
                    rental.user?.name ?? "",
                    rental.user?.email ?? "",
                    rental.phone ?? "",
                    ...rental.items.map(
                        (item) => item.variant?.product?.name ?? ""
                    ),
                ]
                    .join(" ")
                    .toLocaleLowerCase("vi");

                return searchable.includes(search);
            })
            .sort((a, b) => {
                // Ưu tiên hiển thị lịch quá hạn trước.
                const overdueDifference =
                    Number(isOverdue(b)) - Number(isOverdue(a));

                if (overdueDifference !== 0) {
                    return overdueDifference;
                }

                // Sau đó sắp xếp theo ngày kết thúc gần nhất.
                return (
                    (parseDate(a.endDate)?.getTime() ?? Infinity)
                    - (parseDate(b.endDate)?.getTime() ?? Infinity)
                );
            });
    }, [rentals, filter, keyword]);

    const pendingCount = rentals.filter(
        (rental) => rental.status === "PENDING"
    ).length;

    const activeCount = rentals.filter(
        (rental) => rental.status === "RENTING"
    ).length;

    const returnedCount = rentals.filter(
        (rental) => rental.status === "RETURNED"
    ).length;

    return (
        <>
            <Header />
            <main className="min-h-screen bg-[#F7F5F0] px-4 py-7 text-[#252525] sm:px-6 lg:px-10">
                <div className="mx-auto max-w-7xl">
                    {/* Tiêu đề */}
                    <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#737B59]">
                                THT CLOTHING / RENTAL SCHEDULE
                            </p>
                            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                                Lịch thuê quần áo
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                                Theo dõi lịch nhận đồ, thời hạn thuê và tình trạng
                                hoàn trả của từng khách hàng.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => void loadRentals()}
                            disabled={loading}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <span aria-hidden="true">↻</span>
                            {loading ? "Đang tải..." : "Làm mới lịch"}
                        </button>
                    </header>

                    {/* Thông báo */}
                    {error && (
                        <div
                            role="alert"
                            className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                        >
                            <p>{error}</p>
                            <button
                                type="button"
                                onClick={() => setError("")}
                                aria-label="Đóng thông báo lỗi"
                                className="font-bold"
                            >
                                ×
                            </button>
                        </div>
                    )}

                    {message && (
                        <div
                            role="status"
                            className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
                        >
                            <p>{message}</p>
                            <button
                                type="button"
                                onClick={() => setMessage("")}
                                aria-label="Đóng thông báo"
                                className="font-bold"
                            >
                                ×
                            </button>
                        </div>
                    )}

                    {/* Cảnh báo quá hạn */}
                    {!loading && overdueRentals.length > 0 && (
                        <section
                            aria-label="Cảnh báo lịch thuê quá hạn"
                            className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 sm:p-6"
                        >
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100 text-2xl">
                                    !
                                </div>

                                <div className="min-w-0 flex-1">
                                    <h2 className="font-bold text-red-900">
                                        Có {overdueRentals.length} lịch thuê quá hạn
                                    </h2>
                                    <p className="mt-1 text-sm leading-6 text-red-800">
                                        Các lịch dưới đây vẫn ở trạng thái đang cho
                                        thuê nhưng đã vượt ngày trả dự kiến. Hãy
                                        liên hệ khách hàng và xác nhận việc hoàn trả.
                                    </p>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {overdueRentals.slice(0, 5).map((rental) => (
                                            <button
                                                type="button"
                                                key={rental.id}
                                                onClick={() => setSelected(rental)}
                                                className="rounded-lg border border-red-200 bg-white px-3 py-2 text-left text-xs font-semibold text-red-800 transition hover:bg-red-100"
                                            >
                                                #{rental.id} · {rental.user?.name || "Khách hàng"}
                                                <span className="ml-2 font-normal">
                                                    Quá {Math.abs(daysFromToday(rental.endDate) ?? 0)} ngày
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Thẻ thống kê */}
                    <section
                        aria-label="Thống kê lịch thuê"
                        className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
                    >
                        <div className="rounded-2xl border border-gray-200 bg-white p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm text-gray-500">
                                        Tổng lịch thuê
                                    </p>
                                    <p className="mt-2 text-3xl font-bold">
                                        {rentals.length}
                                    </p>
                                </div>
                                <span className="rounded-xl bg-[#EDF0E7] p-3 text-xl">
                                    ▦
                                </span>
                            </div>
                            <p className="mt-3 text-xs text-gray-500">
                                Tất cả lịch thuê trong hệ thống
                            </p>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm text-gray-500">
                                        Chờ xác nhận
                                    </p>
                                    <p className="mt-2 text-3xl font-bold text-amber-700">
                                        {pendingCount}
                                    </p>
                                </div>
                                <span className="rounded-xl bg-amber-50 p-3 text-xl">
                                    ◷
                                </span>
                            </div>
                            <p className="mt-3 text-xs text-gray-500">
                                Lịch cần được kiểm tra
                            </p>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm text-gray-500">
                                        Đang cho thuê
                                    </p>
                                    <p className="mt-2 text-3xl font-bold text-violet-700">
                                        {activeCount}
                                    </p>
                                </div>
                                <span className="rounded-xl bg-violet-50 p-3 text-xl">
                                    ♧
                                </span>
                            </div>
                            <p className="mt-3 text-xs text-gray-500">
                                Bao gồm lịch sắp đến hạn
                            </p>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm text-gray-500">
                                        Quá hạn trả đồ
                                    </p>
                                    <p className={`mt-2 text-3xl font-bold ${overdueRentals.length > 0 ? "text-red-700" : "text-emerald-700"}`}>
                                        {overdueRentals.length}
                                    </p>
                                </div>
                                <span className={`rounded-xl p-3 text-xl ${overdueRentals.length > 0 ? "bg-red-50" : "bg-emerald-50"}`}>
                                    !
                                </span>
                            </div>
                            <p className="mt-3 text-xs text-gray-500">
                                Đã trả: {returnedCount} lịch
                            </p>
                        </div>
                    </section>

                    {/* Lịch sắp đến hạn */}
                    {!loading && dueSoonRentals.length > 0 && (
                        <section className="mb-7 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                            <h2 className="font-bold text-amber-900">
                                Lịch sắp đến hạn trả
                            </h2>
                            <p className="mt-1 text-sm text-amber-800">
                                Có {dueSoonRentals.length} lịch thuê cần theo dõi
                                trong 3 ngày tới.
                            </p>

                            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {dueSoonRentals.slice(0, 6).map((rental) => (
                                    <button
                                        type="button"
                                        key={rental.id}
                                        onClick={() => setSelected(rental)}
                                        className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white p-4 text-left transition hover:border-amber-400"
                                    >
                                        <div className="min-w-0">
                                            <p className="font-semibold">
                                                #{rental.id} · {rental.user?.name || "Khách hàng"}
                                            </p>
                                            <p className="mt-1 text-xs text-gray-500">
                                                Hạn trả: {formatDate(rental.endDate)}
                                            </p>
                                        </div>
                                        <span className="shrink-0 text-xs font-bold text-amber-800">
                                            {daysFromToday(rental.endDate) === 0
                                                ? "Hôm nay"
                                                : `Còn ${daysFromToday(rental.endDate)} ngày`}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Bộ lọc và tìm kiếm */}
                    <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div>
                                <h2 className="font-bold">Danh sách lịch thuê</h2>
                                <p className="mt-1 text-xs text-gray-500">
                                    Ưu tiên hiển thị lịch quá hạn và lịch gần đến hạn.
                                </p>
                            </div>

                            <div className="relative w-full xl:max-w-md">
                                <label
                                    htmlFor="rental-search"
                                    className="sr-only"
                                >
                                    Tìm lịch thuê
                                </label>
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    ⌕
                                </span>
                                <input
                                    id="rental-search"
                                    type="search"
                                    value={keyword}
                                    onChange={(event) => setKeyword(event.target.value)}
                                    placeholder="Tìm mã thuê, khách hàng, sản phẩm..."
                                    className="w-full rounded-xl border border-gray-300 py-3 pl-9 pr-4 text-sm outline-none transition focus:border-[#737B59] focus:ring-2 focus:ring-[#737B59]/15"
                                />
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            {filters.map((item) => {
                                const count = item.value === "ALL"
                                    ? rentals.length
                                    : rentals.filter(
                                        (rental) => rental.status === item.value
                                    ).length;

                                return (
                                    <button
                                        type="button"
                                        key={item.value}
                                        onClick={() => setFilter(item.value)}
                                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${filter === item.value
                                            ? "bg-[#737B59] text-white"
                                            : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                                            }`}
                                    >
                                        {item.label}
                                        <span className={`rounded-full px-2 py-0.5 text-xs ${filter === item.value
                                            ? "bg-white/20 text-white"
                                            : "bg-gray-100 text-gray-600"
                                            }`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* Bảng lịch thuê */}
                    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                        <div className="flex flex-col gap-2 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="font-bold">Lịch thuê chi tiết</h2>
                                <p className="mt-1 text-xs text-gray-500">
                                    Ngày nhận, ngày trả và tình trạng từng lịch.
                                </p>
                            </div>
                            <span className="text-sm text-gray-500">
                                {filteredRentals.length} kết quả
                            </span>
                        </div>

                        {loading ? (
                            <div className="p-14 text-center">
                                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#737B59]" />
                                <p className="text-sm text-gray-500">
                                    Đang tải lịch thuê...
                                </p>
                            </div>
                        ) : filteredRentals.length === 0 ? (
                            <div className="p-14 text-center">
                                <div className="mb-3 text-4xl text-gray-300">
                                    ▦
                                </div>
                                <p className="font-semibold text-gray-700">
                                    Không tìm thấy lịch thuê
                                </p>
                                <p className="mt-1 text-sm text-gray-500">
                                    Thử thay đổi từ khóa hoặc bộ lọc trạng thái.
                                </p>
                                {(keyword || filter !== "ALL") && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setKeyword("");
                                            setFilter("ALL");
                                        }}
                                        className="mt-4 rounded-lg bg-[#737B59] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5c6348]"
                                    >
                                        Xóa bộ lọc
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[950px] text-left text-sm">
                                        <thead className="bg-[#F8F8F5] text-xs uppercase tracking-wide text-gray-500">
                                            <tr>
                                                <th className="px-5 py-4">Mã thuê / Khách hàng</th>
                                                <th className="px-5 py-4">Thời gian thuê</th>
                                                <th className="px-5 py-4">Thời hạn</th>
                                                <th className="px-5 py-4">Tổng tiền</th>
                                                <th className="px-5 py-4">Trạng thái</th>
                                                <th className="px-5 py-4">Thao tác</th>
                                            </tr>
                                        </thead>

                                        <tbody className="divide-y divide-gray-100">
                                            {filteredRentals.map((rental) => {
                                                const timeInfo = getRentalTimeLabel(rental);
                                                const overdue = isOverdue(rental);
                                                const nextStatus = nextStatuses[rental.status];

                                                return (
                                                    <tr
                                                        key={rental.id}
                                                        className={`transition hover:bg-gray-50 ${overdue ? "bg-red-50/50" : ""}`}
                                                    >
                                                        <td className="px-5 py-4">
                                                            <p className="font-bold">
                                                                #{rental.id}
                                                            </p>
                                                            <p className="mt-1 font-medium">
                                                                {rental.user?.name || "Khách hàng"}
                                                            </p>
                                                            <p className="mt-1 text-xs text-gray-500">
                                                                {rental.user?.email || "Không có email"}
                                                            </p>
                                                            <p className="mt-1 text-xs text-gray-500">
                                                                {rental.items.length} dòng sản phẩm
                                                            </p>
                                                        </td>

                                                        <td className="px-5 py-4">
                                                            <div className="flex items-start gap-3">
                                                                <div className={`mt-1 rounded-lg p-2 text-lg ${overdue ? "bg-red-100" : "bg-[#EDF0E7]"}`}>
                                                                    ▦
                                                                </div>
                                                                <div>
                                                                    <p className="font-semibold">
                                                                        {formatDate(rental.startDate)}
                                                                    </p>
                                                                    <p className="my-1 text-xs text-gray-400">
                                                                        đến
                                                                    </p>
                                                                    <p className={`font-medium ${overdue ? "text-red-700" : "text-gray-600"}`}>
                                                                        {formatDate(rental.endDate)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td className="px-5 py-4">
                                                            <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${timeInfo.className}`}>
                                                                {timeInfo.text}
                                                            </span>
                                                            {overdue && (
                                                                <p className="mt-2 max-w-[170px] text-xs leading-5 text-red-700">
                                                                    Cần liên hệ khách để nhận lại đồ.
                                                                </p>
                                                            )}
                                                        </td>

                                                        <td className="px-5 py-4 font-semibold tabular-nums">
                                                            {formatMoney(rental.totalAmount)}
                                                        </td>

                                                        <td className="px-5 py-4">
                                                            <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${statusColors[rental.status]}`}>
                                                                {statusLabels[rental.status]}
                                                            </span>
                                                        </td>

                                                        <td className="px-5 py-4">
                                                            <div className="flex flex-col items-start gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSelected(rental)}
                                                                    className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold transition hover:bg-gray-100"
                                                                >
                                                                    Xem lịch
                                                                </button>

                                                                {nextStatus && (
                                                                    <button
                                                                        type="button"
                                                                        disabled={updatingId === rental.id}
                                                                        onClick={() => void changeStatus(rental, nextStatus)}
                                                                        className="whitespace-nowrap rounded-lg bg-[#737B59] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#5c6348] disabled:cursor-not-allowed disabled:opacity-50"
                                                                    >
                                                                        {updatingId === rental.id
                                                                            ? "Đang cập nhật..."
                                                                            : actionLabels[nextStatus]}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="border-t border-gray-100 px-5 py-4 text-xs text-gray-500">
                                    Hiển thị {filteredRentals.length} / {rentals.length} lịch thuê.
                                    {overdueRentals.length > 0 && (
                                        <span className="ml-1 font-semibold text-red-700">
                                            {overdueRentals.length} lịch đang quá hạn.
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </section>
                </div>

                {/* Chi tiết lịch thuê */}
                {selected && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                        onClick={() => setSelected(null)}
                    >
                        <section
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="rental-detail-title"
                            onClick={(event) => event.stopPropagation()}
                            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
                        >
                            <div className="mb-6 flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#737B59]">
                                        THT CLOTHING / RENTAL DETAIL
                                    </p>
                                    <h2
                                        id="rental-detail-title"
                                        className="mt-2 text-2xl font-bold"
                                    >
                                        Lịch thuê #{selected.id}
                                    </h2>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Tạo ngày {formatDate(selected.createdAt)}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setSelected(null)}
                                    aria-label="Đóng chi tiết"
                                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm transition hover:bg-gray-100"
                                >
                                    Đóng
                                </button>
                            </div>

                            {/* Trạng thái và thời gian */}
                            <div className={`mb-5 rounded-xl border p-4 ${isOverdue(selected)
                                ? "border-red-200 bg-red-50"
                                : "border-gray-200 bg-[#F8F8F5]"
                                }`}>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${statusColors[selected.status]}`}>
                                        {statusLabels[selected.status]}
                                    </span>
                                    <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${getRentalTimeLabel(selected).className}`}>
                                        {getRentalTimeLabel(selected).text}
                                    </span>
                                </div>

                                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <p className="text-xs text-gray-500">
                                            Ngày nhận đồ
                                        </p>
                                        <p className="mt-1 font-bold">
                                            {formatDate(selected.startDate)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">
                                            Hạn trả đồ
                                        </p>
                                        <p className={`mt-1 font-bold ${isOverdue(selected) ? "text-red-700" : ""}`}>
                                            {formatDate(selected.endDate)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">
                                            Thời gian thuê
                                        </p>
                                        <p className="mt-1 font-semibold">
                                            {daysBetween(selected.startDate, selected.endDate)} ngày
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">
                                            Tổng tiền thuê
                                        </p>
                                        <p className="mt-1 text-lg font-bold text-[#737B59]">
                                            {formatMoney(selected.totalAmount)}
                                        </p>
                                    </div>
                                </div>

                                {isOverdue(selected) && (
                                    <div className="mt-4 rounded-lg border border-red-200 bg-white p-3 text-sm leading-6 text-red-800">
                                        <strong>Cảnh báo quá hạn:</strong> Lịch thuê
                                        này đã quá hạn {Math.abs(daysFromToday(selected.endDate) ?? 0)} ngày.
                                        Hãy liên hệ khách hàng để xác nhận hoàn trả.
                                    </div>
                                )}
                            </div>

                            {/* Thông tin khách hàng */}
                            <h3 className="mb-3 font-bold">
                                Thông tin khách hàng
                            </h3>

                            <div className="mb-6 grid gap-4 rounded-xl border border-gray-200 p-4 sm:grid-cols-2">
                                <div>
                                    <p className="text-xs text-gray-500">
                                        Họ và tên
                                    </p>
                                    <p className="mt-1 font-semibold">
                                        {selected.user?.name || "Khách hàng"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">
                                        Email
                                    </p>
                                    <p className="mt-1 break-all font-medium">
                                        {selected.user?.email || "Không có email"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">
                                        Số điện thoại
                                    </p>
                                    <p className="mt-1 font-medium">
                                        {selected.phone || selected.user?.phone || "Chưa cung cấp"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">
                                        Địa chỉ
                                    </p>
                                    <p className="mt-1 font-medium">
                                        {selected.address || "Chưa cung cấp"}
                                    </p>
                                </div>
                            </div>

                            {/* Thông tin thanh toán */}
                            <h3 className="mb-3 font-bold">
                                Thanh toán
                            </h3>
                            <div className="mb-6 rounded-xl border border-gray-200 p-4">
                                {selected.payments.length > 0 ? (
                                    <div className="space-y-3">
                                        {selected.payments.map((payment, index) => (
                                            <div
                                                key={`${payment.method}-${index}`}
                                                className="flex flex-wrap justify-between gap-2 text-sm"
                                            >
                                                <span className="text-gray-600">
                                                    {payment.method}
                                                </span>
                                                <span className="font-semibold">
                                                    {payment.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">
                                        Chưa có thông tin thanh toán.
                                    </p>
                                )}
                            </div>

                            {/* Sản phẩm thuê */}
                            <h3 className="mb-3 font-bold">
                                Danh sách quần áo thuê
                            </h3>

                            <div className="overflow-x-auto rounded-xl border border-gray-200">
                                <table className="w-full min-w-[500px] text-left text-sm">
                                    <thead className="bg-[#F8F8F5] text-gray-600">
                                        <tr>
                                            <th className="px-4 py-3">Sản phẩm</th>
                                            <th className="px-4 py-3">Phân loại</th>
                                            <th className="px-4 py-3">Số lượng</th>
                                            <th className="px-4 py-3">Giá/ngày</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {selected.items.map((item) => (
                                            <tr key={item.id}>
                                                <td className="px-4 py-3 font-medium">
                                                    {item.variant?.product?.name || "Sản phẩm"}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {item.variant?.size || "-"} / {item.variant?.color || "-"}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {item.quantity}
                                                </td>
                                                <td className="px-4 py-3 font-medium">
                                                    {formatMoney(item.unitPrice)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Thao tác trạng thái */}
                            {nextStatuses[selected.status] && (
                                <div className="mt-6 flex flex-col justify-between gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:items-center">
                                    <p className="text-xs leading-5 text-gray-500">
                                        Chỉ cập nhật trạng thái sau khi đã kiểm tra
                                        lịch thuê và tình trạng bàn giao thực tế.
                                    </p>
                                    <button
                                        type="button"
                                        disabled={updatingId === selected.id}
                                        onClick={() =>
                                            void changeStatus(
                                                selected,
                                                nextStatuses[selected.status]!
                                            )
                                        }
                                        className="shrink-0 rounded-xl bg-[#737B59] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#5c6348] disabled:opacity-50"
                                    >
                                        {updatingId === selected.id
                                            ? "Đang cập nhật..."
                                            : actionLabels[nextStatuses[selected.status]!]}
                                    </button>
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
