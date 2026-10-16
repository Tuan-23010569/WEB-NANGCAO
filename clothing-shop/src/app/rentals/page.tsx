
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

type Variant = {
    id: number;
    size: string;
    color: string;
    sellPrice: number | string;
    rentalPrice: number | string;
    stock: number;
};

type Category = {
    id: number;
    name: string;
};

type Product = {
    id: number;
    name: string;
    slug: string;
    description?: string | null;
    imageUrl?: string | null;
    isActive: boolean;
    category?: Category;
    variants: Variant[];
};

type RentalItem = {
    variantId: number;
    quantity: number;
};

function getLocalDate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatPrice(price: number | string) {
    return `${Number(price).toLocaleString("vi-VN")} ₫`;
}

export default function RentalsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedVariants, setSelectedVariants] = useState<
        Record<number, number>
    >({});
    const [quantities, setQuantities] = useState<Record<number, number>>({});
    const [rentalItems, setRentalItems] = useState<RentalItem[]>([]);

    const [startDate, setStartDate] = useState(() => getLocalDate(new Date()));
    const [endDate, setEndDate] = useState(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return getLocalDate(tomorrow);
    });

    const [address, setAddress] = useState("");
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        async function loadProducts() {
            try {
                const response = await fetch("/api/products");
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.message || "Không thể tải danh sách sản phẩm."
                    );
                }

                const data = Array.isArray(result)
                    ? result
                    : result.data ?? result.products ?? [];

                const availableProducts: Product[] = data.filter(
                    (product: Product) =>
                        product.isActive !== false &&
                        Array.isArray(product.variants)
                );

                setProducts(availableProducts);

                const initialVariants: Record<number, number> = {};

                for (const product of availableProducts) {
                    const variant = product.variants.find(
                        (item) => item.stock > 0
                    );

                    if (variant) {
                        initialVariants[product.id] = variant.id;
                    }
                }

                setSelectedVariants(initialVariants);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Có lỗi khi tải sản phẩm."
                );
            } finally {
                setLoading(false);
            }
        }

        loadProducts();
    }, []);

    const rentalDays = useMemo(() => {
        if (!startDate || !endDate || endDate < startDate) {
            return 0;
        }

        const start = new Date(`${startDate}T00:00:00`);
        const end = new Date(`${endDate}T00:00:00`);

        return Math.round(
            (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
        ) + 1;
    }, [startDate, endDate]);

    const selectedRentalDetails = useMemo(() => {
        return rentalItems.map((item) => {
            let product: Product | undefined;
            let variant: Variant | undefined;

            for (const currentProduct of products) {
                const found = currentProduct.variants.find(
                    (currentVariant) =>
                        currentVariant.id === item.variantId
                );

                if (found) {
                    product = currentProduct;
                    variant = found;
                    break;
                }
            }

            return {
                ...item,
                product,
                variant,
                subtotal:
                    Number(variant?.rentalPrice ?? 0) *
                    item.quantity *
                    rentalDays,
            };
        });
    }, [rentalItems, products, rentalDays]);

    const totalAmount = selectedRentalDetails.reduce(
        (total, item) => total + item.subtotal,
        0
    );

    function addRentalItem(product: Product) {
        setError("");
        setSuccess("");

        const variantId = selectedVariants[product.id];
        const quantity = quantities[product.id] ?? 1;

        const variant = product.variants.find(
            (item) => item.id === variantId
        );

        if (!variant || variant.stock <= 0) {
            setError("Vui lòng chọn size và màu sắc còn hàng.");
            return;
        }

        if (
            !Number.isInteger(quantity) ||
            quantity < 1 ||
            quantity > variant.stock
        ) {
            setError(
                `Số lượng thuê phải từ 1 đến ${variant.stock}.`
            );
            return;
        }

        setRentalItems((currentItems) => {
            const existing = currentItems.find(
                (item) => item.variantId === variantId
            );

            if (existing) {
                const newQuantity = existing.quantity + quantity;

                if (newQuantity > variant.stock) {
                    setError(
                        `Số lượng thuê vượt quá tồn kho của ${product.name}.`
                    );
                    return currentItems;
                }

                return currentItems.map((item) =>
                    item.variantId === variantId
                        ? { ...item, quantity: newQuantity }
                        : item
                );
            }

            return [...currentItems, { variantId, quantity }];
        });
    }

    function removeRentalItem(variantId: number) {
        setRentalItems((items) =>
            items.filter((item) => item.variantId !== variantId)
        );
        setError("");
        setSuccess("");
    }

    function updateRentalQuantity(
        variantId: number,
        quantity: number
    ) {
        const detail = selectedRentalDetails.find(
            (item) => item.variantId === variantId
        );

        if (!detail?.variant) return;

        if (
            !Number.isInteger(quantity) ||
            quantity < 1 ||
            quantity > detail.variant.stock
        ) {
            setError(
                `Số lượng phải từ 1 đến ${detail.variant.stock}.`
            );
            return;
        }

        setRentalItems((items) =>
            items.map((item) =>
                item.variantId === variantId
                    ? { ...item, quantity }
                    : item
            )
        );

        setError("");
    }

    async function submitRental(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setSuccess("");

        const token = localStorage.getItem("tht_token");

        if (!token) {
            window.location.href = `/login?next=${encodeURIComponent("/rentals")}`;
            return;
        }

        if (rentalItems.length === 0) {
            setError("Vui lòng chọn ít nhất một sản phẩm muốn thuê.");
            return;
        }

        if (!startDate || !endDate || endDate < startDate) {
            setError("Ngày kết thúc phải từ ngày bắt đầu trở đi.");
            return;
        }

        if (!address.trim() || !phone.trim()) {
            setError("Vui lòng nhập địa chỉ và số điện thoại nhận hàng.");
            return;
        }

        setSubmitting(true);

        try {
            const response = await fetch("/api/rentals", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    startDate,
                    endDate,
                    address: address.trim(),
                    phone: phone.trim(),
                    items: rentalItems,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                const messages: Record<string, string> = {
                    INVALID_DATE: "Ngày thuê không hợp lệ.",
                    INVALID_DATE_RANGE: "Khoảng ngày thuê không hợp lệ.",
                    RENTAL_ITEMS_EMPTY: "Bạn chưa chọn sản phẩm thuê.",
                    INVALID_RENTAL_ITEM: "Thông tin sản phẩm thuê không hợp lệ.",
                    VARIANT_NOT_FOUND: "Một biến thể sản phẩm không còn tồn tại.",
                    PRODUCT_UNAVAILABLE: "Một sản phẩm hiện không còn khả dụng.",
                    INSUFFICIENT_STOCK: "Số lượng tồn kho không đủ. Vui lòng kiểm tra lại.",
                };

                throw new Error(
                    messages[result.message] ||
                    result.message ||
                    "Không thể tạo đơn thuê."
                );
            }

            const rentalId = result.data?.id;

            setSuccess(
                rentalId
                    ? `Đặt thuê thành công! Mã đơn thuê: #${rentalId}.`
                    : "Đặt thuê thành công!"
            );

            setRentalItems([]);
            setQuantities({});
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Đã xảy ra lỗi khi tạo đơn thuê."
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#f7f5f0] text-[#252525]">
            <Header />

            <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                <div className="mb-10 border-b border-[#ded9cf] pb-8">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#737b59]">
                        THT CLOTHING
                    </p>

                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                        Thuê đồ theo phong cách của bạn
                    </h1>

                    <p className="mt-4 max-w-2xl text-sm leading-7 text-[#69665e]">
                        Chọn trang phục, lựa chọn thời gian thuê và gửi yêu
                        cầu. Giá thuê được tính theo số ngày, bao gồm cả ngày
                        bắt đầu và ngày kết thúc.
                    </p>
                </div>

                {error && (
                    <div
                        role="alert"
                        className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                        {error}
                    </div>
                )}

                {success && (
                    <div
                        role="status"
                        className="mb-6 border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
                    >
                        {success}
                        <div className="mt-2">
                            <Link
                                href="/account/rentals"
                                className="font-semibold underline"
                            >
                                Xem đơn thuê của tôi
                            </Link>
                        </div>
                    </div>
                )}

                <section>
                    <div className="mb-5 flex items-end justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-semibold">
                                Sản phẩm cho thuê
                            </h2>
                            <p className="mt-1 text-sm text-[#77736b]">
                                Chọn size, màu sắc và số lượng mong muốn.
                            </p>
                        </div>

                        <span className="text-sm text-[#77736b]">
                            {products.length} sản phẩm
                        </span>
                    </div>

                    {loading ? (
                        <div className="py-16 text-center text-sm text-[#77736b]">
                            Đang tải sản phẩm...
                        </div>
                    ) : products.length === 0 ? (
                        <div className="border border-[#ded9cf] bg-white p-10 text-center">
                            <p className="font-medium">
                                Chưa có sản phẩm cho thuê.
                            </p>
                            <Link
                                href="/products"
                                className="mt-4 inline-block text-sm text-[#737b59] underline"
                            >
                                Xem tất cả sản phẩm
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {products.map((product) => {
                                const availableVariants =
                                    product.variants.filter(
                                        (variant) => variant.stock > 0
                                    );

                                const selectedVariant =
                                    product.variants.find(
                                        (variant) =>
                                            variant.id ===
                                            selectedVariants[product.id]
                                    );

                                return (
                                    <article
                                        key={product.id}
                                        className="flex flex-col border border-[#e5e0d6] bg-white"
                                    >
                                        <Link
                                            href={`/products/${product.id}`}
                                            className="group block overflow-hidden bg-[#e8e2d8]"
                                        >
                                            <div className="aspect-[3/4] overflow-hidden">
                                                {product.imageUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={product.imageUrl}
                                                        alt={product.name}
                                                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center text-sm tracking-widest text-[#737b59]">
                                                        THT CLOTHING
                                                    </div>
                                                )}
                                            </div>
                                        </Link>

                                        <div className="flex flex-1 flex-col p-4">
                                            <p className="text-xs text-[#858176]">
                                                {product.category?.name ?? "Thời trang"}
                                            </p>

                                            <Link
                                                href={`/products/${product.id}`}
                                                className="mt-1 font-medium hover:text-[#737b59]"
                                            >
                                                {product.name}
                                            </Link>

                                            {selectedVariant ? (
                                                <p className="mt-2 text-sm font-semibold">
                                                    {formatPrice(selectedVariant.rentalPrice)}
                                                    <span className="ml-1 font-normal text-[#858176]">
                                                        / ngày
                                                    </span>
                                                </p>
                                            ) : (
                                                <p className="mt-2 text-sm text-red-600">
                                                    Tạm hết hàng
                                                </p>
                                            )}

                                            <div className="mt-4 space-y-3">
                                                <div>
                                                    <label
                                                        htmlFor={`variant-${product.id}`}
                                                        className="mb-1 block text-xs font-medium"
                                                    >
                                                        Size / màu sắc
                                                    </label>

                                                    <select
                                                        id={`variant-${product.id}`}
                                                        value={
                                                            selectedVariants[product.id] ?? ""
                                                        }
                                                        disabled={availableVariants.length === 0}
                                                        onChange={(e) =>
                                                            setSelectedVariants((current) => ({
                                                                ...current,
                                                                [product.id]: Number(e.target.value),
                                                            }))
                                                        }
                                                        className="w-full border border-[#ded9cf] bg-white px-3 py-2 text-sm outline-none focus:border-[#737b59]"
                                                    >
                                                        {availableVariants.length === 0 ? (
                                                            <option value="">
                                                                Hết hàng
                                                            </option>
                                                        ) : (
                                                            availableVariants.map((variant) => (
                                                                <option
                                                                    key={variant.id}
                                                                    value={variant.id}
                                                                >
                                                                    {variant.size} / {variant.color}
                                                                    {" — Còn "}
                                                                    {variant.stock}
                                                                </option>
                                                            ))
                                                        )}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label
                                                        htmlFor={`quantity-${product.id}`}
                                                        className="mb-1 block text-xs font-medium"
                                                    >
                                                        Số lượng
                                                    </label>

                                                    <input
                                                        id={`quantity-${product.id}`}
                                                        type="number"
                                                        min={1}
                                                        max={selectedVariant?.stock ?? 1}
                                                        value={quantities[product.id] ?? 1}
                                                        disabled={!selectedVariant}
                                                        onChange={(e) =>
                                                            setQuantities((current) => ({
                                                                ...current,
                                                                [product.id]: Number(e.target.value),
                                                            }))
                                                        }
                                                        className="w-full border border-[#ded9cf] px-3 py-2 text-sm outline-none focus:border-[#737b59]"
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                disabled={!selectedVariant}
                                                onClick={() => addRentalItem(product)}
                                                className="mt-4 w-full bg-[#252525] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#737b59] disabled:cursor-not-allowed disabled:bg-gray-300"
                                            >
                                                Thêm vào danh sách thuê
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className="mt-14 grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
                    <div className="border border-[#e5e0d6] bg-white p-5 sm:p-7">
                        <h2 className="text-xl font-semibold">
                            Danh sách thuê của bạn
                        </h2>

                        <p className="mt-2 text-sm text-[#77736b]">
                            Kiểm tra sản phẩm trước khi gửi đơn thuê.
                        </p>

                        {rentalItems.length === 0 ? (
                            <div className="mt-6 border border-dashed border-[#ded9cf] px-4 py-10 text-center text-sm text-[#77736b]">
                                Bạn chưa chọn sản phẩm nào.
                            </div>
                        ) : (
                            <div className="mt-5 divide-y divide-[#eee9e0]">
                                {selectedRentalDetails.map((item) => (
                                    <div
                                        key={item.variantId}
                                        className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="min-w-0">
                                            <p className="font-medium">
                                                {item.product?.name ?? "Sản phẩm"}
                                            </p>

                                            <p className="mt-1 text-xs text-[#77736b]">
                                                {item.variant?.size} / {item.variant?.color}
                                            </p>

                                            <p className="mt-2 text-sm">
                                                {formatPrice(item.variant?.rentalPrice ?? 0)}
                                                {" / ngày"}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <input
                                                aria-label={`Số lượng ${item.product?.name ?? "sản phẩm"}`}
                                                type="number"
                                                min={1}
                                                max={item.variant?.stock ?? 1}
                                                value={item.quantity}
                                                onChange={(e) =>
                                                    updateRentalQuantity(
                                                        item.variantId,
                                                        Number(e.target.value)
                                                    )
                                                }
                                                className="w-20 border border-[#ded9cf] px-2 py-2 text-sm"
                                            />

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeRentalItem(item.variantId)
                                                }
                                                className="text-sm text-red-600 hover:underline"
                                            >
                                                Xóa
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <form
                        onSubmit={submitRental}
                        className="h-fit border border-[#e5e0d6] bg-white p-5 sm:p-7"
                    >
                        <h2 className="text-xl font-semibold">
                            Thông tin thuê đồ
                        </h2>

                        <div className="mt-6 space-y-5">
                            <div>
                                <label
                                    htmlFor="startDate"
                                    className="mb-2 block text-sm font-medium"
                                >
                                    Ngày bắt đầu thuê
                                </label>
                                <input
                                    id="startDate"
                                    type="date"
                                    required
                                    min={getLocalDate(new Date())}
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full border border-[#ded9cf] px-3 py-3 text-sm outline-none focus:border-[#737b59]"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="endDate"
                                    className="mb-2 block text-sm font-medium"
                                >
                                    Ngày kết thúc thuê
                                </label>
                                <input
                                    id="endDate"
                                    type="date"
                                    required
                                    min={startDate || getLocalDate(new Date())}
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full border border-[#ded9cf] px-3 py-3 text-sm outline-none focus:border-[#737b59]"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="phone"
                                    className="mb-2 block text-sm font-medium"
                                >
                                    Số điện thoại
                                </label>
                                <input
                                    id="phone"
                                    type="tel"
                                    required
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="Nhập số điện thoại nhận hàng"
                                    className="w-full border border-[#ded9cf] px-3 py-3 text-sm outline-none focus:border-[#737b59]"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="address"
                                    className="mb-2 block text-sm font-medium"
                                >
                                    Địa chỉ nhận hàng
                                </label>
                                <textarea
                                    id="address"
                                    required
                                    rows={3}
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố"
                                    className="w-full resize-y border border-[#ded9cf] px-3 py-3 text-sm outline-none focus:border-[#737b59]"
                                />
                            </div>
                        </div>

                        <div className="mt-6 border-t border-[#eee9e0] pt-5">
                            <div className="flex justify-between text-sm">
                                <span>Số ngày thuê</span>
                                <span className="font-medium">
                                    {rentalDays > 0 ? rentalDays : 0} ngày
                                </span>
                            </div>

                            <div className="mt-3 flex items-start justify-between gap-4">
                                <span className="text-sm">Tổng tiền dự kiến</span>
                                <span className="text-right text-xl font-semibold">
                                    {formatPrice(
                                        rentalDays > 0 ? totalAmount : 0
                                    )}
                                </span>
                            </div>

                            <p className="mt-3 text-xs leading-5 text-[#77736b]">
                                Giá cuối cùng được máy chủ tính lại khi tạo đơn.
                                Hình thức thanh toán hiện tại là COD.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || loading || rentalItems.length === 0}
                            className="mt-6 w-full bg-[#737b59] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#5d6447] disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                            {submitting ? "Đang gửi đơn..." : "Xác nhận thuê đồ"}
                        </button>

                        <p className="mt-4 text-center text-xs text-[#77736b]">
                            Chưa có tài khoản?{" "}
                            <Link href="/register" className="underline">
                                Đăng ký ngay
                            </Link>
                        </p>
                    </form>
                </section>
            </main>

            <Footer />
        </div>
    );
}
