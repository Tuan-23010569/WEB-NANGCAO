
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

type Category = {
    id: number;
    name: string;
};

type Variant = {
    id: number;
    size: string;
    color: string;
    sku: string;
    sellPrice: number | string;
    rentalPrice: number | string;
    stock: number;
};

type Product = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    categoryId: number;
    isActive: boolean;
    createdAt: string;
    category: Category;
    variants: Variant[];
};

type VariantForm = {
    size: string;
    color: string;
    sku: string;
    sellPrice: string;
    rentalPrice: string;
    stock: string;
};

type ProductForm = {
    name: string;
    description: string;
    imageUrl: string;
    categoryId: string;
    isActive: boolean;
    variants: VariantForm[];
};

const emptyVariant: VariantForm = {
    size: "M",
    color: "Đen",
    sku: "",
    sellPrice: "",
    rentalPrice: "",
    stock: "0",
};

const emptyForm: ProductForm = {
    name: "",
    description: "",
    imageUrl: "",
    categoryId: "",
    isActive: true,
    variants: [{ ...emptyVariant }],
};

const formatMoney = (value: number | string) =>
    Number(value).toLocaleString("vi-VN", {
        style: "currency",
        currency: "VND",
    });

export default function AdminProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [keyword, setKeyword] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [form, setForm] = useState<ProductForm>(emptyForm);

    const getHeaders = useCallback((): HeadersInit => {
        const token = localStorage.getItem("tht_token");

        return {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const [productsResponse, categoriesResponse] = await Promise.all([
                fetch("/api/admin/products", {
                    headers: getHeaders(),
                    cache: "no-store",
                }),
                fetch("/api/admin/categories", {
                    headers: getHeaders(),
                    cache: "no-store",
                }),
            ]);

            const productsResult = await productsResponse.json();
            const categoriesResult = await categoriesResponse.json();

            if (!productsResponse.ok || !productsResult.success) {
                throw new Error(
                    productsResult.message || "Không thể tải danh sách sản phẩm"
                );
            }

            if (!categoriesResponse.ok || !categoriesResult.success) {
                throw new Error(
                    categoriesResult.message || "Không thể tải danh mục"
                );
            }

            setProducts(productsResult.data);
            setCategories(categoriesResult.data);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Đã xảy ra lỗi khi tải dữ liệu"
            );
        } finally {
            setLoading(false);
        }
    }, [getHeaders]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            const matchesKeyword =
                product.name.toLowerCase().includes(keyword.toLowerCase()) ||
                product.slug.toLowerCase().includes(keyword.toLowerCase()) ||
                product.variants.some((variant) =>
                    variant.sku.toLowerCase().includes(keyword.toLowerCase())
                );

            const matchesCategory =
                categoryFilter === "ALL" ||
                product.categoryId === Number(categoryFilter);

            const matchesStatus =
                statusFilter === "ALL" ||
                (statusFilter === "ACTIVE" && product.isActive) ||
                (statusFilter === "INACTIVE" && !product.isActive);

            return matchesKeyword && matchesCategory && matchesStatus;
        });
    }, [products, keyword, categoryFilter, statusFilter]);

    const openCreateForm = () => {
        setEditingProduct(null);
        setForm({
            ...emptyForm,
            categoryId: categories[0] ? String(categories[0].id) : "",
            variants: [{ ...emptyVariant }],
        });
        setError("");
        setShowForm(true);
    };

    const openEditForm = (product: Product) => {
        setEditingProduct(product);
        setForm({
            name: product.name,
            description: product.description || "",
            imageUrl: product.imageUrl || "",
            categoryId: String(product.categoryId),
            isActive: product.isActive,
            variants: [],
        });
        setError("");
        setShowForm(true);
    };

    const updateVariant = (
        index: number,
        field: keyof VariantForm,
        value: string
    ) => {
        setForm((current) => ({
            ...current,
            variants: current.variants.map((variant, i) =>
                i === index ? { ...variant, [field]: value } : variant
            ),
        }));
    };

    const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");

        if (!form.name.trim() || !form.categoryId) {
            setError("Vui lòng nhập tên sản phẩm và chọn danh mục.");
            return;
        }

        if (!editingProduct && form.variants.length === 0) {
            setError("Sản phẩm cần có ít nhất một biến thể.");
            return;
        }

        setSaving(true);

        try {
            const url = editingProduct
                ? `/api/admin/products/${editingProduct.id}`
                : "/api/admin/products";

            const method = editingProduct ? "PUT" : "POST";

            const body = {
                name: form.name.trim(),
                description: form.description.trim() || null,
                imageUrl: form.imageUrl.trim() || null,
                categoryId: Number(form.categoryId),
                isActive: form.isActive,
                ...(!editingProduct && {
                    variants: form.variants.map((variant) => ({
                        size: variant.size.trim(),
                        color: variant.color.trim(),
                        sku: variant.sku.trim(),
                        sellPrice: Number(variant.sellPrice),
                        rentalPrice: Number(variant.rentalPrice),
                        stock: Number(variant.stock),
                    })),
                }),
            };

            const response = await fetch(url, {
                method,
                headers: getHeaders(),
                body: JSON.stringify(body),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Không thể lưu sản phẩm");
            }

            setShowForm(false);
            setEditingProduct(null);
            await loadData();
            window.alert(result.message || "Lưu sản phẩm thành công");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Đã xảy ra lỗi khi lưu sản phẩm"
            );
        } finally {
            setSaving(false);
        }
    };

    const toggleProductStatus = async (product: Product) => {
        const action = product.isActive ? "ẩn" : "hiển thị";

        if (!window.confirm(`Bạn có chắc muốn ${action} sản phẩm "${product.name}"?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/products/${product.id}`, {
                method: "PUT",
                headers: getHeaders(),
                body: JSON.stringify({ isActive: !product.isActive }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Không thể cập nhật trạng thái");
            }

            await loadData();
        } catch (err) {
            window.alert(
                err instanceof Error ? err.message : "Không thể cập nhật trạng thái"
            );
        }
    };

    const deleteProduct = async (product: Product) => {
        if (
            !window.confirm(
                `Bạn có chắc muốn xóa "${product.name}"? Thao tác này không thể hoàn tác.`
            )
        ) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/products/${product.id}`, {
                method: "DELETE",
                headers: getHeaders(),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Không thể xóa sản phẩm");
            }

            await loadData();
            window.alert("Xóa sản phẩm thành công");
        } catch (err) {
            window.alert(
                err instanceof Error ? err.message : "Không thể xóa sản phẩm"
            );
        }
    };

    const totalStock = (product: Product) =>
        product.variants.reduce((sum, variant) => sum + variant.stock, 0);

    const lowestSellPrice = (product: Product) =>
        product.variants.length
            ? Math.min(...product.variants.map((variant) => Number(variant.sellPrice)))
            : 0;

    return (
        <>
            <Header />
            <main className="min-h-screen bg-[#F7F5F0] px-4 py-8 text-[#252525] sm:px-6 lg:px-10">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#737B59]">
                                THT CLOTHING / ADMIN
                            </p>
                            <h1 className="text-3xl font-bold">Quản lý sản phẩm</h1>
                            <p className="mt-2 text-sm text-gray-600">
                                Quản lý sản phẩm bán, giá thuê và số lượng tồn kho.
                            </p>
                        </div>

                        <button
                            onClick={openCreateForm}
                            className="rounded-lg bg-[#737B59] px-5 py-3 font-semibold text-white transition hover:bg-[#5e6549]"
                        >
                            + Thêm sản phẩm
                        </button>
                    </div>

                    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="rounded-xl border border-gray-200 bg-white p-5">
                            <p className="text-sm text-gray-500">Tổng sản phẩm</p>
                            <p className="mt-2 text-3xl font-bold">{products.length}</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-5">
                            <p className="text-sm text-gray-500">Đang hiển thị</p>
                            <p className="mt-2 text-3xl font-bold text-[#737B59]">
                                {products.filter((product) => product.isActive).length}
                            </p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-5">
                            <p className="text-sm text-gray-500">Tổng tồn kho</p>
                            <p className="mt-2 text-3xl font-bold">
                                {products.reduce((sum, product) => sum + totalStock(product), 0)}
                            </p>
                        </div>
                    </div>

                    <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-3">
                        <input
                            value={keyword}
                            onChange={(event) => setKeyword(event.target.value)}
                            placeholder="Tìm theo tên, slug hoặc SKU..."
                            className="rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#737B59]"
                        />

                        <select
                            value={categoryFilter}
                            onChange={(event) => setCategoryFilter(event.target.value)}
                            className="rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#737B59]"
                        >
                            <option value="ALL">Tất cả danh mục</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value)}
                            className="rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#737B59]"
                        >
                            <option value="ALL">Tất cả trạng thái</option>
                            <option value="ACTIVE">Đang hiển thị</option>
                            <option value="INACTIVE">Đang ẩn</option>
                        </select>
                    </div>

                    {error && !showForm && (
                        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                        {loading ? (
                            <p className="p-10 text-center text-gray-500">Đang tải dữ liệu...</p>
                        ) : filteredProducts.length === 0 ? (
                            <p className="p-10 text-center text-gray-500">
                                Không tìm thấy sản phẩm phù hợp.
                            </p>
                        ) : (
                            <table className="w-full min-w-[1050px] text-left text-sm">
                                <thead className="bg-[#EEECE5] text-gray-700">
                                    <tr>
                                        <th className="px-5 py-4">Sản phẩm</th>
                                        <th className="px-5 py-4">Danh mục</th>
                                        <th className="px-5 py-4">Giá bán từ</th>
                                        <th className="px-5 py-4">Biến thể</th>
                                        <th className="px-5 py-4">Tồn kho</th>
                                        <th className="px-5 py-4">Trạng thái</th>
                                        <th className="px-5 py-4">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredProducts.map((product) => (
                                        <tr key={product.id} className="hover:bg-gray-50">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    {product.imageUrl ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                            src={product.imageUrl}
                                                            alt={product.name}
                                                            className="h-14 w-12 rounded-md border object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-14 w-12 items-center justify-center rounded-md bg-[#F0EEE7] text-xs text-gray-500">
                                                            No image
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-semibold">{product.name}</p>
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            SKU: {product.variants[0]?.sku || "—"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">{product.category?.name || "—"}</td>
                                            <td className="px-5 py-4 font-medium">
                                                {formatMoney(lowestSellPrice(product))}
                                            </td>
                                            <td className="px-5 py-4">{product.variants.length}</td>
                                            <td className="px-5 py-4">{totalStock(product)}</td>
                                            <td className="px-5 py-4">
                                                <span
                                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${product.isActive
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-gray-100 text-gray-600"
                                                        }`}
                                                >
                                                    {product.isActive ? "Đang hiển thị" : "Đang ẩn"}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => openEditForm(product)}
                                                        className="rounded-md border border-gray-300 px-3 py-2 hover:bg-gray-100"
                                                    >
                                                        Sửa
                                                    </button>
                                                    <button
                                                        onClick={() => void toggleProductStatus(product)}
                                                        className="rounded-md border border-[#737B59] px-3 py-2 text-[#737B59] hover:bg-[#f1f2ec]"
                                                    >
                                                        {product.isActive ? "Ẩn" : "Hiện"}
                                                    </button>
                                                    <button
                                                        onClick={() => void deleteProduct(product)}
                                                        className="rounded-md border border-red-200 px-3 py-2 text-red-600 hover:bg-red-50"
                                                    >
                                                        Xóa
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <p className="mt-4 text-sm text-gray-500">
                        Hiển thị {filteredProducts.length} / {products.length} sản phẩm
                    </p>
                </div>

                {showForm && (
                    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
                        <div className="mx-auto my-6 max-w-3xl rounded-2xl bg-white p-6 shadow-xl sm:p-8">
                            <div className="mb-6 flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold">
                                        {editingProduct ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"}
                                    </h2>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Điền thông tin sản phẩm bên dưới.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
                                >
                                    Đóng
                                </button>
                            </div>

                            {error && (
                                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSave} className="space-y-5">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold">
                                        Tên sản phẩm *
                                    </label>
                                    <input
                                        required
                                        value={form.name}
                                        onChange={(event) =>
                                            setForm({ ...form, name: event.target.value })
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#737B59]"
                                        placeholder="Ví dụ: Áo thun basic"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold">
                                        Danh mục *
                                    </label>
                                    <select
                                        required
                                        value={form.categoryId}
                                        onChange={(event) =>
                                            setForm({ ...form, categoryId: event.target.value })
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#737B59]"
                                    >
                                        <option value="">-- Chọn danh mục --</option>
                                        {categories.map((category) => (
                                            <option key={category.id} value={category.id}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                    {categories.length === 0 && (
                                        <p className="mt-2 text-sm text-red-600">
                                            Chưa có danh mục. Hãy tạo danh mục trước khi thêm sản phẩm.
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold">
                                        Đường dẫn ảnh
                                    </label>
                                    <input
                                        value={form.imageUrl}
                                        onChange={(event) =>
                                            setForm({ ...form, imageUrl: event.target.value })
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#737B59]"
                                        placeholder="https://example.com/ao-thun.jpg"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold">
                                        Mô tả
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={form.description}
                                        onChange={(event) =>
                                            setForm({ ...form, description: event.target.value })
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#737B59]"
                                        placeholder="Mô tả chất liệu, kiểu dáng..."
                                    />
                                </div>

                                {editingProduct ? (
                                    <div className="rounded-lg bg-[#F7F5F0] p-4">
                                        <p className="font-semibold">Biến thể hiện có</p>
                                        <div className="mt-3 space-y-2">
                                            {editingProduct.variants.map((variant) => (
                                                <div
                                                    key={variant.id}
                                                    className="flex flex-wrap justify-between gap-2 text-sm"
                                                >
                                                    <span>
                                                        {variant.size} / {variant.color} — {variant.sku}
                                                    </span>
                                                    <span className="text-gray-600">
                                                        Bán: {formatMoney(variant.sellPrice)} · Thuê:{" "}
                                                        {formatMoney(variant.rentalPrice)} · Tồn:{" "}
                                                        {variant.stock}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="mt-3 text-xs text-gray-500">
                                            Phần này hiện chỉ hiển thị thông tin biến thể. Chỉnh sửa
                                            biến thể sẽ được làm bằng chức năng riêng.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <h3 className="font-semibold">Biến thể sản phẩm *</h3>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        variants: [
                                                            ...current.variants,
                                                            { ...emptyVariant, sku: "" },
                                                        ],
                                                    }))
                                                }
                                                className="rounded-lg border border-[#737B59] px-3 py-2 text-sm font-semibold text-[#737B59] hover:bg-[#f1f2ec]"
                                            >
                                                + Thêm biến thể
                                            </button>
                                        </div>

                                        {form.variants.map((variant, index) => (
                                            <div
                                                key={index}
                                                className="rounded-xl border border-gray-200 p-4"
                                            >
                                                <div className="mb-4 flex items-center justify-between">
                                                    <p className="font-medium">Biến thể {index + 1}</p>
                                                    {form.variants.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    variants: current.variants.filter(
                                                                        (_, i) => i !== index
                                                                    ),
                                                                }))
                                                            }
                                                            className="text-sm text-red-600"
                                                        >
                                                            Xóa biến thể
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                    <label className="text-sm">
                                                        Size *
                                                        <input
                                                            required
                                                            value={variant.size}
                                                            onChange={(event) =>
                                                                updateVariant(index, "size", event.target.value)
                                                            }
                                                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                                                            placeholder="M, L, XL..."
                                                        />
                                                    </label>

                                                    <label className="text-sm">
                                                        Màu sắc *
                                                        <input
                                                            required
                                                            value={variant.color}
                                                            onChange={(event) =>
                                                                updateVariant(index, "color", event.target.value)
                                                            }
                                                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                                                            placeholder="Đen, Trắng..."
                                                        />
                                                    </label>

                                                    <label className="text-sm sm:col-span-2">
                                                        SKU *
                                                        <input
                                                            required
                                                            value={variant.sku}
                                                            onChange={(event) =>
                                                                updateVariant(index, "sku", event.target.value)
                                                            }
                                                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                                                            placeholder="ATB-M-DEN"
                                                        />
                                                    </label>

                                                    <label className="text-sm">
                                                        Giá bán (VNĐ) *
                                                        <input
                                                            required
                                                            type="number"
                                                            min="0"
                                                            step="1000"
                                                            value={variant.sellPrice}
                                                            onChange={(event) =>
                                                                updateVariant(index, "sellPrice", event.target.value)
                                                            }
                                                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                                                        />
                                                    </label>

                                                    <label className="text-sm">
                                                        Giá thuê/ngày (VNĐ) *
                                                        <input
                                                            required
                                                            type="number"
                                                            min="0"
                                                            step="1000"
                                                            value={variant.rentalPrice}
                                                            onChange={(event) =>
                                                                updateVariant(index, "rentalPrice", event.target.value)
                                                            }
                                                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                                                        />
                                                    </label>

                                                    <label className="text-sm sm:col-span-2">
                                                        Số lượng tồn kho *
                                                        <input
                                                            required
                                                            type="number"
                                                            min="0"
                                                            step="1"
                                                            value={variant.stock}
                                                            onChange={(event) =>
                                                                updateVariant(index, "stock", event.target.value)
                                                            }
                                                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <label className="flex items-center gap-3 rounded-lg bg-[#F7F5F0] p-4">
                                    <input
                                        type="checkbox"
                                        checked={form.isActive}
                                        onChange={(event) =>
                                            setForm({ ...form, isActive: event.target.checked })
                                        }
                                        className="h-4 w-4 accent-[#737B59]"
                                    />
                                    <span className="text-sm font-medium">
                                        Hiển thị sản phẩm trên website
                                    </span>
                                </label>

                                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="rounded-lg border border-gray-300 px-5 py-3 font-semibold hover:bg-gray-50"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving || (!editingProduct && categories.length === 0)}
                                        className="rounded-lg bg-[#737B59] px-5 py-3 font-semibold text-white hover:bg-[#5e6549] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {saving
                                            ? "Đang lưu..."
                                            : editingProduct
                                                ? "Lưu thay đổi"
                                                : "Tạo sản phẩm"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
            <Footer />
        </>
    );
}
