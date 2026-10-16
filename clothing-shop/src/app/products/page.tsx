"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
    slug?: string;
};

type Product = {
    id: number;
    name: string;
    slug: string;
    description?: string | null;
    imageUrl?: string | null;
    isActive: boolean;
    category: Category;
    variants: Variant[];
};

function formatPrice(price: number | string) {
    return Number(price).toLocaleString("vi-VN") + " ₫";
}

function getLowestPrice(product: Product) {
    const prices = product.variants
        .filter((variant) => variant.stock > 0)
        .map((variant) => Number(variant.sellPrice))
        .filter((price) => Number.isFinite(price) && price >= 0);

    if (prices.length === 0) return Number.POSITIVE_INFINITY;

    return Math.min(...prices);
}

function getPriceRange(product: Product) {
    const prices = product.variants
        .map((variant) => Number(variant.sellPrice))
        .filter((price) => Number.isFinite(price) && price >= 0);

    if (prices.length === 0) return "Liên hệ";

    const min = Math.min(...prices);
    const max = Math.max(...prices);

    if (min === max) return formatPrice(min);

    return `${formatPrice(min)} – ${formatPrice(max)} `;
}

function getTotalStock(product: Product) {
    return product.variants.reduce(
        (total, variant) => total + variant.stock,
        0
    );
}

function ProductsContent() {
    const searchParams = useSearchParams();

    const keywordFromUrl = searchParams.get("keyword") ?? "";
    const categoryFromUrl = searchParams.get("category") ?? "";

    const [products, setProducts] = useState<Product[]>([]);
    const [keyword, setKeyword] = useState(keywordFromUrl);
    const [categoryFilter, setCategoryFilter] = useState(categoryFromUrl);
    const [sort, setSort] = useState("newest");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        setKeyword(keywordFromUrl);
        setCategoryFilter(categoryFromUrl);
    }, [keywordFromUrl, categoryFromUrl]);

    useEffect(() => {
        let cancelled = false;

        async function loadProducts() {
            setLoading(true);
            setError("");

            try {
                const response = await fetch(
                    `/api/products?keyword=${encodeURIComponent(keywordFromUrl)}`,
                    { cache: "no-store" }
                );

                const result = await response.json();

                if (!response.ok || result.success !== true) {
                    throw new Error(
                        result.message || "Không thể tải sản phẩm."
                    );
                }

                if (!cancelled) {
                    const data = Array.isArray(result.data)
                        ? (result.data as Product[])
                        : [];

                    setProducts(
                        data.filter(
                            (product) => product.isActive === true
                        )
                    );
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Đã xảy ra lỗi khi tải sản phẩm."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadProducts();

        return () => {
            cancelled = true;
        };
    }, [keywordFromUrl]);

    const categories = useMemo(() => {
        const uniqueCategories = new Map<number, Category>();

        products.forEach((product) => {
            if (product.category) {
                uniqueCategories.set(
                    product.category.id,
                    product.category
                );
            }
        });

        return Array.from(uniqueCategories.values());
    }, [products]);

    const filteredProducts = useMemo(() => {
        let result = [...products];

        if (categoryFilter) {
            const normalizedFilter = categoryFilter.toLowerCase();

            const selectedCategory = categories.find(
                (category) =>
                    String(category.id) === categoryFilter ||
                    category.slug?.toLowerCase() === normalizedFilter ||
                    category.name.toLowerCase().includes(normalizedFilter)
            );

            if (selectedCategory) {
                result = result.filter(
                    (product) =>
                        product.category?.id === selectedCategory.id
                );
            } else {
                result = result.filter((product) => {
                    const name =
                        product.category?.name?.toLowerCase() ?? "";
                    const slug =
                        product.category?.slug?.toLowerCase() ?? "";

                    if (normalizedFilter === "nam") {
                        return (
                            name.includes("nam") ||
                            slug.includes("nam")
                        );
                    }

                    if (normalizedFilter === "nu") {
                        return (
                            name.includes("nữ") ||
                            name.includes("nu") ||
                            slug.includes("nu")
                        );
                    }

                    return false;
                });
            }
        }

        if (sort === "price-asc") {
            result.sort(
                (a, b) => getLowestPrice(a) - getLowestPrice(b)
            );
        } else if (sort === "price-desc") {
            result.sort(
                (a, b) => getLowestPrice(b) - getLowestPrice(a)
            );
        }

        return result;
    }, [products, categoryFilter, categories, sort]);

    function handleSearch(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const params = new URLSearchParams();

        if (keyword.trim()) {
            params.set("keyword", keyword.trim());
        }

        if (categoryFilter) {
            params.set("category", categoryFilter);
        }

        const query = params.toString();

        window.location.href = query
            ? `/products?${query}`
            : "/products";
    }

    return (
        <main className="min-h-screen bg-[#f7f5f0] text-[#252525]">
            <Header />

            <section className="border-b border-[#e8e2d8] bg-[#eee9e1]">
                <div className="mx-auto max-w-7xl px-5 py-12 sm:py-16">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#737b59]">
                        THT Clothing Collection
                    </p>

                    <h1 className="mt-4 text-3xl font-semibold sm:text-5xl">
                        Khám phá sản phẩm
                    </h1>

                    <p className="mt-4 max-w-xl text-sm leading-6 text-[#6d6a62]">
                        Tìm kiếm phong cách phù hợp với bạn qua những
                        thiết kế thời trang tối giản, hiện đại và dễ phối đồ.
                    </p>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-5 py-10 sm:py-14">
                <form
                    onSubmit={handleSearch}
                    className="grid gap-3 sm:grid-cols-[1fr_220px_auto]"
                >
                    <input
                        value={keyword}
                        onChange={(event) =>
                            setKeyword(event.target.value)
                        }
                        placeholder="Tìm tên sản phẩm..."
                        aria-label="Tìm tên sản phẩm"
                        className="min-w-0 border border-[#ded8cd] bg-white px-4 py-3 text-sm outline-none focus:border-[#737b59]"
                    />

                    <select
                        value={categoryFilter}
                        onChange={(event) =>
                            setCategoryFilter(event.target.value)
                        }
                        aria-label="Lọc danh mục"
                        className="border border-[#ded8cd] bg-white px-4 py-3 text-sm outline-none focus:border-[#737b59]"
                    >
                        <option value="">Tất cả danh mục</option>

                        {categories.map((category) => (
                            <option
                                key={category.id}
                                value={String(category.id)}
                            >
                                {category.name}
                            </option>
                        ))}

                        {!categories.some(
                            (category) =>
                                categoryFilter === category.slug
                        ) &&
                            (categoryFilter === "nam" ||
                                categoryFilter === "nu") && (
                                <option value={categoryFilter}>
                                    {categoryFilter === "nam"
                                        ? "Thời trang nam"
                                        : "Thời trang nữ"}
                                </option>
                            )}
                    </select>

                    <button
                        type="submit"
                        className="bg-[#252525] px-7 py-3 text-sm font-medium text-white transition hover:bg-[#737b59]"
                    >
                        Tìm kiếm
                    </button>
                </form>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#ded8cd] pb-5">
                    <p className="text-sm text-[#6d6a62]">
                        {loading
                            ? "Đang tải sản phẩm..."
                            : `${filteredProducts.length} sản phẩm`}
                    </p>

                    <div className="flex items-center gap-3">
                        <label
                            htmlFor="sort"
                            className="text-sm text-[#6d6a62]"
                        >
                            Sắp xếp:
                        </label>

                        <select
                            id="sort"
                            value={sort}
                            onChange={(event) =>
                                setSort(event.target.value)
                            }
                            className="bg-transparent py-2 text-sm outline-none"
                        >
                            <option value="newest">Mới nhất</option>
                            <option value="price-asc">Giá tăng dần</option>
                            <option value="price-desc">Giá giảm dần</option>
                        </select>
                    </div>
                </div>

                {loading && (
                    <div className="py-20 text-center text-sm text-[#6d6a62]">
                        Đang tải danh sách sản phẩm...
                    </div>
                )}

                {!loading && error && (
                    <div className="my-10 border border-red-200 bg-red-50 p-6 text-center">
                        <p className="font-medium text-red-700">
                            Không thể tải sản phẩm
                        </p>

                        <p className="mt-2 text-sm text-red-600">
                            {error}
                        </p>

                        <button
                            onClick={() => window.location.reload()}
                            className="mt-5 bg-[#252525] px-5 py-3 text-sm text-white hover:bg-[#737b59]"
                        >
                            Thử lại
                        </button>
                    </div>
                )}

                {!loading &&
                    !error &&
                    filteredProducts.length === 0 && (
                        <div className="py-20 text-center">
                            <p className="text-xl font-medium">
                                Không tìm thấy sản phẩm phù hợp
                            </p>

                            <p className="mt-3 text-sm text-[#6d6a62]">
                                Hãy thử từ khóa khác hoặc chọn danh mục khác.
                            </p>

                            <button
                                onClick={() => {
                                    setKeyword("");
                                    setCategoryFilter("");
                                    window.location.href = "/products";
                                }}
                                className="mt-6 bg-[#252525] px-6 py-3 text-sm text-white hover:bg-[#737b59]"
                            >
                                Xem tất cả sản phẩm
                            </button>
                        </div>
                    )}

                {!loading &&
                    !error &&
                    filteredProducts.length > 0 && (
                        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
                            {filteredProducts.map((product) => {
                                const totalStock =
                                    getTotalStock(product);
                                const imageUrl =
                                    product.imageUrl?.trim();

                                return (
                                    <article
                                        key={product.id}
                                        className="group min-w-0"
                                    >
                                        <Link
                                            href={`/products/${product.id}`}
                                            className="block"
                                        >
                                            <div className="relative aspect-[3/4] overflow-hidden bg-[#e8e2d8]">
                                                {imageUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={imageUrl}
                                                        alt={product.name}
                                                        loading="lazy"
                                                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center px-3 text-center text-sm tracking-widest text-[#737b59]">
                                                        THT CLOTHING
                                                    </div>
                                                )}

                                                <span className="absolute left-3 top-3 bg-white/90 px-3 py-1.5 text-[10px] uppercase tracking-wider">
                                                    {product.category?.name ??
                                                        "Thời trang"}
                                                </span>

                                                {totalStock <= 0 && (
                                                    <span className="absolute bottom-3 left-3 bg-[#252525]/90 px-3 py-1.5 text-xs text-white">
                                                        Hết hàng
                                                    </span>
                                                )}
                                            </div>

                                            <h2 className="mt-4 line-clamp-2 text-sm font-medium transition group-hover:text-[#737b59]">
                                                {product.name}
                                            </h2>

                                            <p className="mt-2 text-sm font-semibold">
                                                {getPriceRange(product)}
                                            </p>

                                            <p className="mt-1 text-xs text-[#77736a]">
                                                {product.variants.length} phân loại
                                            </p>
                                        </Link>

                                        <Link
                                            href={`/products/${product.id}`}
                                            className="mt-4 block border border-[#252525] px-3 py-2.5 text-center text-xs font-medium transition hover:bg-[#252525] hover:text-white"
                                        >
                                            Xem chi tiết
                                        </Link>
                                    </article>
                                );
                            })}
                        </div>
                    )}
            </section>

            <Footer />
        </main>
    );
}

export default function ProductsPage() {
    return (
        <Suspense
            fallback={
                <main className="min-h-screen bg-[#f7f5f0] text-[#252525]">
                    <Header />

                    <div className="mx-auto max-w-7xl px-5 py-20 text-center text-sm text-[#6d6a62]">
                        Đang tải danh sách sản phẩm...
                    </div>

                    <Footer />
                </main>
            }
        >
            <ProductsContent />
        </Suspense>
    );
}
