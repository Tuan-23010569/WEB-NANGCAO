
"use client";

import { useCallback, useEffect, useState } from "react";
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

export default function CartPage() {
    const router = useRouter();

    const [items, setItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [error, setError] = useState("");

    const loadCart = useCallback(async () => {
        const token = localStorage.getItem("tht_token");

        if (!token) {
            router.replace("/login?next=/cart");
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
                router.replace("/login?next=/cart");
                return;
            }

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Không thể tải giỏ hàng.");
            }

            const cart = result.data;
            setItems(Array.isArray(cart?.items) ? cart.items : []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Đã xảy ra lỗi khi tải giỏ hàng."
            );
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        void loadCart();
    }, [loadCart]);

    async function updateQuantity(item: CartItem, quantity: number) {
        if (quantity < 1 || quantity > item.variant.stock) {
            return;
        }

        const token = localStorage.getItem("tht_token");

        if (!token) {
            router.push("/login?next=/cart");
            return;
        }

        try {
            setUpdatingId(item.id);
            setError("");

            const response = await fetch(`/api/cart/items/${item.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ quantity }),
            });

            const result = await response.json();

            if (response.status === 401) {
                localStorage.removeItem("tht_token");
                localStorage.removeItem("tht_user");
                router.push("/login?next=/cart");
                return;
            }

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Không thể cập nhật số lượng.");
            }

            await loadCart();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Không thể cập nhật số lượng."
            );
        } finally {
            setUpdatingId(null);
        }
    }

    async function removeItem(itemId: number) {
        const token = localStorage.getItem("tht_token");

        if (!token) {
            router.push("/login?next=/cart");
            return;
        }

        try {
            setUpdatingId(itemId);
            setError("");

            const response = await fetch(`/api/cart/items/${itemId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const result = await response.json();

            if (response.status === 401) {
                localStorage.removeItem("tht_token");
                localStorage.removeItem("tht_user");
                router.push("/login?next=/cart");
                return;
            }

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Không thể xóa sản phẩm.");
            }

            await loadCart();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Không thể xóa sản phẩm."
            );
        } finally {
            setUpdatingId(null);
        }
    }

    const total = items.reduce((sum, item) => {
        return sum + Number(item.variant.sellPrice) * item.quantity;
    }, 0);

    return (
        <>
            <Header />

            <main className="min-h-[65vh] bg-[#F7F5F0] px-4 py-10 sm:py-14">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-8">
                        <p className="text-sm font-medium tracking-[0.2em] text-[#737B59]">
                            THT CLOTHING
                        </p>
                        <h1 className="mt-2 text-3xl font-bold text-[#252525] sm:text-4xl">
                            Giỏ hàng của bạn
                        </h1>
                        <p className="mt-2 text-gray-500">
                            Kiểm tra sản phẩm trước khi thanh toán.
                        </p>
                    </div>

                    {loading ? (
                        <div className="rounded-xl bg-white p-10 text-center text-gray-500">
                            Đang tải giỏ hàng...
                        </div>
                    ) : error && items.length === 0 ? (
                        <div className="rounded-xl bg-white p-8 text-center">
                            <p className="text-red-600">{error}</p>
                            <button
                                onClick={() => void loadCart()}
                                className="mt-4 rounded-lg bg-[#252525] px-5 py-3 text-white hover:bg-[#737B59]"
                            >
                                Thử lại
                            </button>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="rounded-xl bg-white px-6 py-16 text-center">
                            <div className="text-5xl">🛍️</div>
                            <h2 className="mt-4 text-xl font-semibold text-[#252525]">
                                Giỏ hàng đang trống
                            </h2>
                            <p className="mt-2 text-gray-500">
                                Hãy chọn những món đồ bạn yêu thích nhé.
                            </p>
                            <Link
                                href="/products"
                                className="mt-6 inline-block rounded-lg bg-[#252525] px-6 py-3 font-medium text-white hover:bg-[#737B59]"
                            >
                                Tiếp tục mua sắm
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_340px]">
                            <section className="space-y-4">
                                {error && (
                                    <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                                        {error}
                                    </p>
                                )}

                                {items.map((item) => {
                                    const product = item.variant.product;
                                    const price = Number(item.variant.sellPrice);

                                    return (
                                        <article
                                            key={item.id}
                                            className="flex flex-col gap-4 rounded-xl bg-white p-4 sm:flex-row sm:items-center"
                                        >
                                            <Link
                                                href={`/products/${product.id}`}
                                                className="block h-32 w-full shrink-0 overflow-hidden rounded-lg bg-[#F7F5F0] sm:w-28"
                                            >
                                                {product.imageUrl ? (
                                                    <img
                                                        src={product.imageUrl}
                                                        alt={product.name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center text-sm text-gray-400">
                                                        THT CLOTHING
                                                    </div>
                                                )}
                                            </Link>

                                            <div className="min-w-0 flex-1">
                                                <Link
                                                    href={`/products/${product.id}`}
                                                    className="font-semibold text-[#252525] hover:text-[#737B59]"
                                                >
                                                    {product.name}
                                                </Link>

                                                <p className="mt-2 text-sm text-gray-500">
                                                    Kích thước: {item.variant.size}
                                                    {" · "}
                                                    Màu sắc: {item.variant.color}
                                                </p>

                                                <p className="mt-2 font-semibold text-[#737B59]">
                                                    {formatPrice(price)}
                                                </p>

                                                <button
                                                    onClick={() => void removeItem(item.id)}
                                                    disabled={updatingId === item.id}
                                                    className="mt-3 text-sm text-red-500 hover:underline disabled:opacity-50"
                                                >
                                                    Xóa sản phẩm
                                                </button>
                                            </div>

                                            <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                                                <div className="flex items-center rounded-lg border border-gray-300">
                                                    <button
                                                        type="button"
                                                        aria-label="Giảm số lượng"
                                                        disabled={
                                                            updatingId === item.id ||
                                                            item.quantity <= 1
                                                        }
                                                        onClick={() =>
                                                            void updateQuantity(
                                                                item,
                                                                item.quantity - 1
                                                            )
                                                        }
                                                        className="px-3 py-2 disabled:opacity-30"
                                                    >
                                                        −
                                                    </button>

                                                    <span className="min-w-9 text-center text-sm">
                                                        {item.quantity}
                                                    </span>

                                                    <button
                                                        type="button"
                                                        aria-label="Tăng số lượng"
                                                        disabled={
                                                            updatingId === item.id ||
                                                            item.quantity >= item.variant.stock
                                                        }
                                                        onClick={() =>
                                                            void updateQuantity(
                                                                item,
                                                                item.quantity + 1
                                                            )
                                                        }
                                                        className="px-3 py-2 disabled:opacity-30"
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                <p className="font-semibold text-[#252525]">
                                                    {formatPrice(price * item.quantity)}
                                                </p>
                                            </div>
                                        </article>
                                    );
                                })}

                                <Link
                                    href="/products"
                                    className="inline-block pt-2 text-sm font-medium text-[#737B59] hover:underline"
                                >
                                    ← Tiếp tục mua sắm
                                </Link>
                            </section>

                            <aside className="rounded-xl bg-white p-6">
                                <h2 className="text-xl font-semibold text-[#252525]">
                                    Tóm tắt đơn hàng
                                </h2>

                                <div className="mt-6 flex justify-between gap-4 text-sm text-gray-600">
                                    <span>
                                        Tạm tính ({items.reduce(
                                            (sum, item) => sum + item.quantity,
                                            0
                                        )} sản phẩm)
                                    </span>
                                    <span className="text-right">
                                        {formatPrice(total)}
                                    </span>
                                </div>

                                <div className="mt-4 flex justify-between border-t border-gray-200 pt-4 font-semibold">
                                    <span>Tổng tiền</span>
                                    <span className="text-[#737B59]">
                                        {formatPrice(total)}
                                    </span>
                                </div>

                                <p className="mt-3 text-xs text-gray-500">
                                    Phí vận chuyển sẽ được xác nhận khi đặt hàng.
                                </p>

                                <Link
                                    href="/checkout"
                                    className="mt-6 block rounded-lg bg-[#252525] px-4 py-3 text-center font-semibold text-white transition hover:bg-[#737B59]"
                                >
                                    Tiến hành thanh toán
                                </Link>
                            </aside>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </>
    );
}
