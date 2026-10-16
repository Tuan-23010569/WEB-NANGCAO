"use client";

import { useCallback, useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

type Category = {
    id: number;
    name: string;
    slug: string;
    createdAt?: string;
    _count?: {
        products: number;
    };
};

export default function AdminCategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [name, setName] = useState("");
    const [editingId, setEditingId] = useState<number | null>(null);

    const getHeaders = useCallback((): HeadersInit => {
        const token = localStorage.getItem("tht_token");

        return {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    }, []);

    const loadCategories = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/admin/categories", {
                headers: getHeaders(),
                cache: "no-store",
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Không thể tải danh sách danh mục"
                );
            }

            setCategories(result.data);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Đã xảy ra lỗi khi tải danh mục"
            );
        } finally {
            setLoading(false);
        }
    }, [getHeaders]);

    useEffect(() => {
        void loadCategories();
    }, [loadCategories]);

    const resetForm = () => {
        setName("");
        setEditingId(null);
        setError("");
    };

    const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");

        const normalizedName = name.trim();

        if (!normalizedName) {
            setError("Vui lòng nhập tên danh mục.");
            return;
        }

        setSaving(true);

        try {
            const isEditing = editingId !== null;

            // POST dùng API tạo danh mục hiện có.
            // PATCH dùng API cập nhật danh mục hiện có.
            const url = isEditing
                ? `/api/categories/${editingId}`
                : "/api/categories";

            const response = await fetch(url, {
                method: isEditing ? "PATCH" : "POST",
                headers: getHeaders(),
                body: JSON.stringify({ name: normalizedName }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    (isEditing
                        ? "Không thể cập nhật danh mục"
                        : "Không thể tạo danh mục")
                );
            }

            resetForm();
            await loadCategories();
            window.alert(
                result.message ||
                (isEditing
                    ? "Cập nhật danh mục thành công"
                    : "Thêm danh mục thành công")
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Đã xảy ra lỗi khi lưu danh mục"
            );
        } finally {
            setSaving(false);
        }
    };

    const startEditing = (category: Category) => {
        setEditingId(category.id);
        setName(category.name);
        setError("");

        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleDelete = async (category: Category) => {
        if (
            !window.confirm(
                `Bạn có chắc muốn xóa danh mục "${category.name}"?`
            )
        ) {
            return;
        }

        setError("");

        try {
            const response = await fetch(
                `/api/categories/${category.id}`,
                {
                    method: "DELETE",
                    headers: getHeaders(),
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Không thể xóa danh mục"
                );
            }

            if (editingId === category.id) {
                resetForm();
            }

            await loadCategories();
            window.alert(result.message || "Xóa danh mục thành công");
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Không thể xóa danh mục";

            setError(message);
        }
    };

    return (
        <>
            <Header />
            <main className="min-h-screen bg-[#F7F5F0] px-4 py-8 text-[#252525] sm:px-6 lg:px-10">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-8">
                        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#737B59]">
                            THT CLOTHING / ADMIN
                        </p>
                        <h1 className="text-3xl font-bold">
                            Quản lý danh mục
                        </h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Thêm, cập nhật và quản lý danh mục sản phẩm.
                        </p>
                    </div>

                    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-gray-200 bg-white p-5">
                            <p className="text-sm text-gray-500">
                                Tổng danh mục
                            </p>
                            <p className="mt-2 text-3xl font-bold">
                                {categories.length}
                            </p>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-5">
                            <p className="text-sm text-gray-500">
                                Tổng sản phẩm thuộc danh mục
                            </p>
                            <p className="mt-2 text-3xl font-bold text-[#737B59]">
                                {categories.reduce(
                                    (sum, category) =>
                                        sum + (category._count?.products ?? 0),
                                    0
                                )}
                            </p>
                        </div>
                    </div>

                    <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
                        <h2 className="mb-4 text-xl font-bold">
                            {editingId !== null
                                ? "Cập nhật danh mục"
                                : "Thêm danh mục mới"}
                        </h2>

                        {error && (
                            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <form
                            onSubmit={handleSave}
                            className="flex flex-col gap-3 sm:flex-row"
                        >
                            <input
                                required
                                maxLength={100}
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder="Nhập tên danh mục, ví dụ: Áo thun"
                                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#737B59]"
                            />

                            <button
                                type="submit"
                                disabled={saving}
                                className="rounded-lg bg-[#737B59] px-5 py-3 font-semibold text-white transition hover:bg-[#5e6549] disabled:opacity-60"
                            >
                                {saving
                                    ? "Đang lưu..."
                                    : editingId !== null
                                        ? "Lưu thay đổi"
                                        : "+ Thêm danh mục"}
                            </button>

                            {editingId !== null && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="rounded-lg border border-gray-300 px-5 py-3 font-semibold hover:bg-gray-50"
                                >
                                    Hủy sửa
                                </button>
                            )}
                        </form>
                    </section>

                    <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                        <div className="border-b border-gray-100 px-5 py-4">
                            <h2 className="font-bold">Danh sách danh mục</h2>
                        </div>

                        {loading ? (
                            <p className="p-10 text-center text-gray-500">
                                Đang tải dữ liệu...
                            </p>
                        ) : categories.length === 0 ? (
                            <p className="p-10 text-center text-gray-500">
                                Chưa có danh mục nào. Hãy thêm danh mục đầu tiên.
                            </p>
                        ) : (
                            <table className="w-full min-w-[650px] text-left text-sm">
                                <thead className="bg-[#EEECE5] text-gray-700">
                                    <tr>
                                        <th className="px-5 py-4">ID</th>
                                        <th className="px-5 py-4">Tên danh mục</th>
                                        <th className="px-5 py-4">Slug</th>
                                        <th className="px-5 py-4">Sản phẩm</th>
                                        <th className="px-5 py-4">Thao tác</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-100">
                                    {categories.map((category) => (
                                        <tr
                                            key={category.id}
                                            className="hover:bg-gray-50"
                                        >
                                            <td className="px-5 py-4">
                                                {category.id}
                                            </td>
                                            <td className="px-5 py-4 font-semibold">
                                                {category.name}
                                            </td>
                                            <td className="px-5 py-4 text-gray-600">
                                                {category.slug}
                                            </td>
                                            <td className="px-5 py-4">
                                                {category._count?.products ?? "—"}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            startEditing(category)
                                                        }
                                                        className="rounded-md border border-gray-300 px-3 py-2 hover:bg-gray-100"
                                                    >
                                                        Sửa
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            void handleDelete(category)
                                                        }
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
                    </section>

                    <p className="mt-4 text-sm text-gray-500">
                        Hiển thị {categories.length} danh mục
                    </p>
                </div>
            </main>
            <Footer />
        </>
    );
}
