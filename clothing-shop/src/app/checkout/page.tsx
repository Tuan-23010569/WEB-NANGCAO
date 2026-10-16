
"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

type CartItem = {
    id: number;
    quantity: number;
    variant: {
        id: number;
        size: string;
        color: string;
        sellPrice: number | string;
        stock: number;
        product: {
            id: number;
            name: string;
            imageUrl?: string | null;
        };
    };
};

function formatPrice(price: number) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(price);
}

export default function CheckoutPage() {
    const router = useRouter();

    const [items, setItems] = useState<CartItem[]>([]);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const loadCheckoutData = useCallback(async () => {
        const token = localStorage.getItem("tht_token");

        if (!token) {
            router.replace("/login?next=/checkout");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await fetch("/api/cart", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                cache: "no-store",
            });

            const result = await response.json();

            if (response.status === 401) {
                localStorage.removeItem("tht_token");
                localStorage.removeItem("tht_user");
                router.replace("/login?next=/checkout");
                return;
            }

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Không thể tải thông tin giỏ hàng."
                );
            }

            const cartItems = Array.isArray(result.data?.items)
                ? result.data.items
                : [];

            setItems(cartItems);

            if (cartItems.length === 0) {
                setError("Giỏ hàng đang trống. Hãy chọn sản phẩm trước khi thanh toán.");
            }

            const savedUser = localStorage.getItem("tht_user");

            if (savedUser) {
                try {
                    const user = JSON.parse(savedUser);
                    if (typeof user.name === "string") {
                        setName(user.name);
                    }
                } catch {
                    // Bỏ qua dữ liệu người dùng không hợp lệ.
                }
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Không thể tải thông tin thanh toán."
            );
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        void loadCheckoutData();
    }, [loadCheckoutData]);

    const total = items.reduce(
        (sum, item) =>
            sum + Number(item.variant.sellPrice) * item.quantity,
        0
    );

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");

        if (items.length === 0) {
            setError("Giỏ hàng đang trống.");
            return;
        }

        const normalizedPhone = phone.trim();
        const normalizedAddress = address.trim();

        if (!/^[0-9+\s().-]{9,20}$/.test(normalizedPhone)) {
            setError("Vui lòng nhập số điện thoại hợp lệ.");
            return;
        }

        if (
            !normalizedAddress ||
            normalizedAddress.length > 255
        ) {
            setError("Địa chỉ không được để trống và tối đa 255 ký tự.");
            return;
        }

        const token = localStorage.getItem("tht_token");

        if (!token) {
            router.push("/login?next=/checkout");
            return;
        }

        setSubmitting(true);

        try {
            const response = await fetch("/api/orders", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    address: normalizedAddress,
                    phone: normalizedPhone,
                }),
            });

            const result = await response.json();

            if (response.status === 401) {
                localStorage.removeItem("tht_token");
                localStorage.removeItem("tht_user");
                router.push("/login?next=/checkout");
                return;
            }

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Đặt hàng không thành công."
                );
            }

            const orderId = result.data?.id;

            if (orderId === undefined || orderId === null) {
                throw new Error(
                    "Đơn hàng có thể đã được tạo nhưng không nhận được mã đơn hàng."
                );
            }

            router.push(`/account/orders/${orderId}?success=1`);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Không thể đặt hàng. Vui lòng thử lại."
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <>
            <Header />

            <main className="min-h-[65vh] bg-[#F7F5F0] px-4 py-10 sm:py-14">
                <div className="mx-auto max-w-6xl">
                    <p className="text-sm font-medium tracking-[0.2em] text-[#737B59]">
                        THT CLOTHING
                    </p>

                    <h1 className="mt-2 text-3xl font-bold text-[#252525] sm:text-4xl">
                        Thanh toán
                    </h1>

                    <p className="mt-2 text-gray-500">
                        Vui lòng kiểm tra thông tin trước khi đặt hàng.
                    </p>

                    {loading ? (
                        <div className="mt-8 rounded-xl bg-white p-10 text-center text-gray-500">
                            Đang tải thông tin thanh toán...
                        </div>
                    ) : items.length === 0 ? (
                        <div className="mt-8 rounded-xl bg-white p-8 text-center">
                            <p className="text-gray-600">
                                {error || "Giỏ hàng của bạn đang trống."}
                            </p>

                            <Link
                                href="/products"
                                className="mt-5 inline-block rounded-lg bg-[#252525] px-6 py-3 font-semibold text-white hover:bg-[#737B59]"
                            >
                                Khám phá sản phẩm
                            </Link>
                        </div>
                    ) : (
                        <form
                            onSubmit={handleSubmit}
                            className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_360px]"
                        >
                            <section className="rounded-xl bg-white p-6 sm:p-8">
                                <h2 className="text-xl font-semibold text-[#252525]">
                                    Thông tin nhận hàng
                                </h2>

                                <div className="mt-6 space-y-5">
                                    <div>
                                        <label
                                            htmlFor="name"
                                            className="mb-2 block text-sm font-medium text-[#252525]"
                                        >
                                            Họ và tên
                                        </label>

                                        <input
                                            id="name"
                                            type="text"
                                            value={name}
                                            onChange={(event) =>
                                                setName(event.target.value)
                                            }
                                            maxLength={100}
                                            autoComplete="name"
                                            placeholder="Nhập họ và tên"
                                            required
                                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#737B59] focus:ring-2 focus:ring-[#737B59]/20"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="phone"
                                            className="mb-2 block text-sm font-medium text-[#252525]"
                                        >
                                            Số điện thoại
                                        </label>

                                        <input
                                            id="phone"
                                            type="tel"
                                            value={phone}
                                            onChange={(event) =>
                                                setPhone(event.target.value)
                                            }
                                            autoComplete="tel"
                                            placeholder="Ví dụ: 0912345678"
                                            maxLength={20}
                                            required
                                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#737B59] focus:ring-2 focus:ring-[#737B59]/20"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="address"
                                            className="mb-2 block text-sm font-medium text-[#252525]"
                                        >
                                            Địa chỉ nhận hàng
                                        </label>

                                        <textarea
                                            id="address"
                                            value={address}
                                            onChange={(event) =>
                                                setAddress(event.target.value)
                                            }
                                            autoComplete="street-address"
                                            placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                                            maxLength={255}
                                            rows={4}
                                            required
                                            className="w-full resize-y rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#737B59] focus:ring-2 focus:ring-[#737B59]/20"
                                        />
                                    </div>
                                </div>

                                <div className="mt-8 border-t border-gray-200 pt-6">
                                    <h2 className="text-xl font-semibold text-[#252525]">
                                        Phương thức thanh toán
                                    </h2>

                                    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-[#737B59] bg-[#737B59]/5 p-4">
                                        <input
                                            type="radio"
                                            checked
                                            readOnly
                                            className="mt-1 accent-[#737B59]"
                                        />

                                        <span>
                                            <span className="block font-medium text-[#252525]">
                                                Thanh toán khi nhận hàng (COD)
                                            </span>
                                            <span className="mt-1 block text-sm text-gray-500">
                                                Bạn thanh toán cho đơn vị giao hàng khi nhận sản phẩm.
                                            </span>
                                        </span>
                                    </label>
                                </div>

                                {error && (
                                    <p
                                        role="alert"
                                        className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-600"
                                    >
                                        {error}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitting || items.length === 0}
                                    className="mt-7 w-full rounded-lg bg-[#252525] px-5 py-3.5 font-semibold text-white transition hover:bg-[#737B59] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                >
                                    {submitting
                                        ? "Đang xử lý đơn hàng..."
                                        : "Xác nhận đặt hàng"}
                                </button>

                                <p className="mt-3 text-xs text-gray-500">
                                    Vui lòng kiểm tra kỹ số điện thoại và địa chỉ trước khi xác nhận.
                                </p>
                            </section>

                            <aside className="rounded-xl bg-white p-6">
                                <h2 className="text-xl font-semibold text-[#252525]">
                                    Đơn hàng của bạn
                                </h2>

                                <div className="mt-5 space-y-4">
                                    {items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex gap-3"
                                        >
                                            <div className="h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-[#F7F5F0]">
                                                {item.variant.product.imageUrl ? (
                                                    <img
                                                        src={item.variant.product.imageUrl}
                                                        alt={item.variant.product.name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center text-xs text-gray-400">
                                                        THT
                                                    </div>
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-[#252525]">
                                                    {item.variant.product.name}
                                                </p>

                                                <p className="mt-1 text-xs text-gray-500">
                                                    {item.variant.size} / {item.variant.color} · SL: {item.quantity}
                                                </p>

                                                <p className="mt-1 text-sm font-semibold text-[#737B59]">
                                                    {formatPrice(
                                                        Number(item.variant.sellPrice) *
                                                        item.quantity
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 space-y-3 border-t border-gray-200 pt-5">
                                    <div className="flex justify-between gap-4 text-sm text-gray-600">
                                        <span>Tạm tính</span>
                                        <span>{formatPrice(total)}</span>
                                    </div>

                                    <div className="flex justify-between gap-4 text-sm text-gray-600">
                                        <span>Phí vận chuyển</span>
                                        <span>Chưa tính</span>
                                    </div>

                                    <div className="flex justify-between gap-4 border-t border-gray-200 pt-4 font-semibold text-[#252525]">
                                        <span>Tổng tiền sản phẩm</span>
                                        <span className="text-[#737B59]">
                                            {formatPrice(total)}
                                        </span>
                                    </div>
                                </div>

                                <Link
                                    href="/cart"
                                    className="mt-5 block text-center text-sm font-medium text-[#737B59] hover:underline"
                                >
                                    ← Quay lại giỏ hàng
                                </Link>
                            </aside>
                        </form>
                    )}
                </div>
            </main>

            <Footer />
        </>
    );
}
