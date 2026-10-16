"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

type User = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
    role: "USER" | "ADMIN";
    createdAt: string;
};

export default function AdminUsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [keyword, setKeyword] = useState("");
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const loadUsers = useCallback(async () => {
        const token = localStorage.getItem("tht_token");

        if (!token) {
            router.replace("/login");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await fetch("/api/admin/users", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                cache: "no-store",
            });

            const result = await response.json();

            if (response.status === 401) {
                localStorage.removeItem("tht_token");
                localStorage.removeItem("tht_user");
                router.replace("/login");
                return;
            }

            if (response.status === 403) {
                router.replace("/");
                return;
            }

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Không thể tải người dùng."
                );
            }

            setUsers(result.data);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Đã xảy ra lỗi khi tải dữ liệu."
            );
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    async function changeRole(user: User) {
        const newRole = user.role === "ADMIN" ? "USER" : "ADMIN";
        const confirmed = window.confirm(
            `Bạn có chắc muốn đổi vai trò của ${user.name} thành ${newRole}?`
        );

        if (!confirmed) return;

        const token = localStorage.getItem("tht_token");

        if (!token) {
            router.replace("/login");
            return;
        }

        try {
            setUpdatingId(user.id);
            setError("");
            setMessage("");

            const response = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    id: user.id,
                    role: newRole,
                }),
            });

            const result = await response.json();

            if (response.status === 401) {
                localStorage.removeItem("tht_token");
                localStorage.removeItem("tht_user");
                router.replace("/login");
                return;
            }

            if (response.status === 403) {
                router.replace("/");
                return;
            }

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Không thể cập nhật vai trò."
                );
            }

            setMessage(result.message || "Cập nhật thành công.");
            await loadUsers();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Đã xảy ra lỗi khi cập nhật."
            );
        } finally {
            setUpdatingId(null);
        }
    }

    const filteredUsers = users.filter((user) => {
        const search = keyword.trim().toLowerCase();

        return (
            user.name.toLowerCase().includes(search) ||
            user.email.toLowerCase().includes(search) ||
            (user.phone ?? "").toLowerCase().includes(search)
        );
    });

    return (
        <>
            <Header />

            <main className="min-h-screen bg-[#F7F5F0] px-4 py-8 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <Link
                        href="/admin"
                        className="text-sm font-semibold text-[#737B59] hover:underline"
                    >
                        ← Quay lại trang quản trị
                    </Link>

                    <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#737B59]">
                                System management
                            </p>
                            <h1 className="mt-2 text-3xl font-bold text-[#252525]">
                                Quản lý người dùng
                            </h1>
                            <p className="mt-2 text-sm text-gray-500">
                                Tổng số tài khoản: {users.length}
                            </p>
                        </div>

                        <input
                            type="text"
                            value={keyword}
                            onChange={(event) => setKeyword(event.target.value)}
                            placeholder="Tìm theo tên, email, số điện thoại..."
                            className="w-full rounded-xl border border-[#e8e2d8] bg-white px-4 py-3 text-sm outline-none focus:border-[#737B59] sm:max-w-md"
                        />
                    </div>

                    {error && (
                        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                            {message}
                        </div>
                    )}

                    <div className="mt-6 overflow-hidden rounded-2xl border border-[#e8e2d8] bg-white">
                        {loading ? (
                            <p className="p-8 text-center text-gray-500">
                                Đang tải danh sách người dùng...
                            </p>
                        ) : filteredUsers.length === 0 ? (
                            <p className="p-8 text-center text-gray-500">
                                Không tìm thấy người dùng.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[900px] text-left text-sm">
                                    <thead className="bg-[#f2eee6] text-[#252525]">
                                        <tr>
                                            <th className="px-5 py-4">ID</th>
                                            <th className="px-5 py-4">Người dùng</th>
                                            <th className="px-5 py-4">Liên hệ</th>
                                            <th className="px-5 py-4">Địa chỉ</th>
                                            <th className="px-5 py-4">Vai trò</th>
                                            <th className="px-5 py-4">Ngày tạo</th>
                                            <th className="px-5 py-4">Thao tác</th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-[#eee9e1]">
                                        {filteredUsers.map((user) => (
                                            <tr key={user.id} className="hover:bg-[#faf9f6]">
                                                <td className="px-5 py-4">
                                                    {user.id}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <p className="font-semibold text-[#252525]">
                                                        {user.name}
                                                    </p>
                                                    <p className="mt-1 text-gray-500">
                                                        {user.email}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-4">
                                                    {user.phone || "Chưa cập nhật"}
                                                </td>
                                                <td className="max-w-xs px-5 py-4">
                                                    {user.address || "Chưa cập nhật"}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span
                                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${user.role === "ADMIN"
                                                                ? "bg-purple-100 text-purple-700"
                                                                : "bg-gray-100 text-gray-700"
                                                            }`}
                                                    >
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4">
                                                    {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => changeRole(user)}
                                                        disabled={updatingId === user.id}
                                                        className="whitespace-nowrap rounded-lg bg-[#252525] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#737B59] disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {updatingId === user.id
                                                            ? "Đang cập nhật..."
                                                            : user.role === "ADMIN"
                                                                ? "Đổi thành USER"
                                                                : "Đổi thành ADMIN"}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </>
    );
}