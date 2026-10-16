
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

type Variant = {
    id: number;
    size: string;
    color: string;
    sellPrice: number;
    rentalPrice: number;
    stock: number;
    sku?: string;
};

type Product = {
    id: number;
    name: string;
    slug: string;
    description?: string | null;
    imageUrl?: string | null;
    isActive: boolean;
    category?: {
        id: number;
        name: string;
    } | null;
    variants: Variant[];
};

function formatPrice(price: number) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(price);
}

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [product, setProduct] = useState<Product | null>(null);
    const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
        null
    );
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        async function loadProduct() {
            try {
                setLoading(true);
                setError("");

                const response = await fetch(`/api/products/${id}`);
                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message || "Không thể tải thông tin sản phẩm."
                    );
                }

                const data: Product = result.data;

                if (!data.isActive) {
                    throw new Error("Sản phẩm hiện không còn kinh doanh.");
                }

                setProduct(data);

                const availableVariant = data.variants?.find(
                    (variant) => variant.stock > 0
                );

                if (availableVariant) {
                    setSelectedVariantId(availableVariant.id);
                }
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Đã xảy ra lỗi khi tải sản phẩm."
                );
            } finally {
                setLoading(false);
            }
        }

        if (id) {
            loadProduct();
        }
    }, [id]);

    const selectedVariant = product?.variants.find(
        (variant) => variant.id === selectedVariantId
    );

    async function handleAddToCart() {
        setMessage("");
        setError("");

        if (!selectedVariant) {
            setError("Vui lòng chọn size và màu sắc.");
            return;
        }

        if (selectedVariant.stock < 1) {
            setError("Biến thể này hiện đã hết hàng.");
            return;
        }

        if (quantity > selectedVariant.stock) {
            setError(`Số lượng tối đa còn lại là ${selectedVariant.stock}.`);
            return;
        }

        const token = localStorage.getItem("tht_token");

        if (!token) {
            router.push(
                `/login?next=${encodeURIComponent(`/products/${id}`)}`
            );
            return;
        }

        try {
            setAdding(true);

            const response = await fetch("/api/cart/items", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    variantId: selectedVariant.id,
                    quantity,
                }),
            });

            const result = await response.json();

            if (response.status === 401) {
                localStorage.removeItem("tht_token");
                router.push(
                    `/login?next=${encodeURIComponent(`/products/${id}`)}`
                );
                return;
            }

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Không thể thêm sản phẩm vào giỏ hàng."
                );
            }

            setMessage("Đã thêm sản phẩm vào giỏ hàng thành công!");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Đã xảy ra lỗi. Vui lòng thử lại."
            );
        } finally {
            setAdding(false);
        }
    }

    if (loading) {
        return (
            <>
                <Header />
                <main className="mx-auto min-h-[60vh] max-w-7xl px-6 py-20 text-center">
                    Đang tải thông tin sản phẩm...
                </main>
                <Footer />
            </>
        );
    }

    if (error && !product) {
        return (
            <>
                <Header />
                <main className="mx-auto min-h-[60vh] max-w-7xl px-6 py-20 text-center">
                    <p className="mb-6 text-red-600">{error}</p>
                    <button
                        onClick={() => router.push("/products")}
                        className="bg-[#252525] px-6 py-3 text-white hover:bg-[#737B59]"
                    >
                        Quay lại danh sách sản phẩm
                    </button>
                </main>
                <Footer />
            </>
        );
    }

    if (!product) {
        return null;
    }

    return (
        <>
            <Header />

            <main className="min-h-screen bg-[#F7F5F0]">
                <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-14">
                    <div className="mb-8 text-sm text-gray-500">
                        <button
                            onClick={() => router.push("/")}
                            className="hover:text-[#737B59]"
                        >
                            Trang chủ
                        </button>
                        {" / "}
                        <button
                            onClick={() => router.push("/products")}
                            className="hover:text-[#737B59]"
                        >
                            Sản phẩm
                        </button>
                        {" / "}
                        <span className="text-[#252525]">{product.name}</span>
                    </div>

                    <div className="grid gap-10 md:grid-cols-2 md:gap-16">
                        <div className="flex min-h-[380px] items-center justify-center bg-[#E8E2D8] md:min-h-[600px]">
                            {product.imageUrl ? (
                                <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="h-full max-h-[650px] w-full object-cover"
                                />
                            ) : (
                                <div className="px-6 text-center">
                                    <p className="text-5xl font-light tracking-widest text-[#737B59]">
                                        THT.
                                    </p>
                                    <p className="mt-4 text-sm text-gray-500">
                                        Chưa có hình ảnh sản phẩm
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="py-2 md:py-8">
                            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-[#737B59]">
                                {product.category?.name || "THT CLOTHING"}
                            </p>

                            <h1 className="text-3xl font-semibold tracking-tight text-[#252525] md:text-4xl">
                                {product.name}
                            </h1>

                            {selectedVariant && (
                                <p className="mt-5 text-2xl font-medium text-[#252525]">
                                    {formatPrice(selectedVariant.sellPrice)}
                                </p>
                            )}

                            <div className="my-7 h-px bg-[#DDD7CC]" />

                            <div className="mb-7">
                                <p className="mb-3 text-sm font-semibold">
                                    Chọn size và màu sắc
                                </p>

                                {product.variants.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        {product.variants.map((variant) => {
                                            const isSelected =
                                                selectedVariantId === variant.id;

                                            return (
                                                <button
                                                    key={variant.id}
                                                    type="button"
                                                    disabled={variant.stock < 1}
                                                    onClick={() => {
                                                        setSelectedVariantId(
                                                            variant.id
                                                        );
                                                        setQuantity(1);
                                                        setMessage("");
                                                        setError("");
                                                    }}
                                                    className={`border p-4 text-left transition ${isSelected
                                                            ? "border-[#737B59] bg-[#737B59]/10"
                                                            : "border-[#DDD7CC] bg-white hover:border-[#737B59]"
                                                        } disabled:cursor-not-allowed disabled:opacity-40`}
                                                >
                                                    <span className="block font-medium">
                                                        Size {variant.size} ·{" "}
                                                        {variant.color}
                                                    </span>
                                                    <span className="mt-1 block text-xs text-gray-500">
                                                        {variant.stock > 0
                                                            ? `Còn ${variant.stock} sản phẩm`
                                                            : "Hết hàng"}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm text-red-600">
                                        Sản phẩm chưa có biến thể để mua.
                                    </p>
                                )}
                            </div>

                            {selectedVariant && (
                                <div className="mb-7">
                                    <p className="mb-3 text-sm font-semibold">
                                        Số lượng
                                    </p>

                                    <div className="flex w-fit items-center border border-[#DDD7CC] bg-white">
                                        <button
                                            type="button"
                                            aria-label="Giảm số lượng"
                                            disabled={quantity <= 1}
                                            onClick={() =>
                                                setQuantity((value) =>
                                                    Math.max(1, value - 1)
                                                )
                                            }
                                            className="px-4 py-2 disabled:opacity-40"
                                        >
                                            −
                                        </button>

                                        <span className="min-w-10 text-center">
                                            {quantity}
                                        </span>

                                        <button
                                            type="button"
                                            aria-label="Tăng số lượng"
                                            disabled={
                                                quantity >= selectedVariant.stock
                                            }
                                            onClick={() =>
                                                setQuantity((value) =>
                                                    Math.min(
                                                        selectedVariant.stock,
                                                        value + 1
                                                    )
                                                )
                                            }
                                            className="px-4 py-2 disabled:opacity-40"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <p className="mb-4 text-sm text-red-600">
                                    {error}
                                </p>
                            )}

                            {message && (
                                <p className="mb-4 text-sm text-green-700">
                                    {message}
                                </p>
                            )}

                            <button
                                type="button"
                                onClick={handleAddToCart}
                                disabled={
                                    adding ||
                                    !selectedVariant ||
                                    selectedVariant.stock < 1
                                }
                                className="w-full bg-[#252525] px-6 py-4 text-sm font-medium uppercase tracking-widest text-white transition hover:bg-[#737B59] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {adding
                                    ? "Đang thêm..."
                                    : "Thêm vào giỏ hàng"}
                            </button>

                            <button
                                type="button"
                                onClick={() => router.push("/cart")}
                                className="mt-3 w-full border border-[#252525] px-6 py-4 text-sm font-medium uppercase tracking-widest text-[#252525] transition hover:bg-[#E8E2D8]"
                            >
                                Xem giỏ hàng
                            </button>

                            <div className="my-8 h-px bg-[#DDD7CC]" />

                            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider">
                                Mô tả sản phẩm
                            </h2>

                            <p className="whitespace-pre-line text-sm leading-7 text-gray-600">
                                {product.description ||
                                    "Sản phẩm thời trang từ THT CLOTHING. Hãy lựa chọn size và màu sắc phù hợp với bạn."}
                            </p>

                            {selectedVariant && (
                                <p className="mt-5 text-xs text-gray-500">
                                    Mã sản phẩm: {selectedVariant.sku || selectedVariant.id}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </>
    );
}
