"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

type User = {
    id: string | number;
    name: string;
    email: string;
    role: string;
};

export default function AccountPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        try {
            const token = localStorage.getItem("tht_token");
            const storedUser = localStorage.getItem("tht_user");

            if (!token || !storedUser) {
                router.replace("/login?next=/account");
                return;
            }

            const parsedUser = JSON.parse(storedUser) as User;
            setUser(parsedUser);
        } catch {
            localStorage.removeItem("tht_user");
            localStorage.removeItem("tht_token");
            router.replace("/login?next=/account");
            return;
        }

        setChecked(true);
    }, [router]);

    function handleLogout() {
        localStorage.removeItem("tht_token");
        localStorage.removeItem("tht_user");

        window.dispatchEvent(new Event("tht-auth-changed"));

        router.replace("/");
        router.refresh();
    }

    if (!checked || !user) {
        return (
            <>
                <Header />
                <main className="flex min-h-[50vh] items-center justify-center bg-[#F7F5F0]">
                    <p className="text-sm text-gray-500">
                        Đang tải thông tin tài khoản...
                    </p>
                </main>
                <Footer />
            </>
        );
    }

    const isAdmin = user.role?.toUpperCase() === "ADMIN";

    return (
        <>
            <Header />

            <main className="min-h-[70vh] bg-[#F7F5F0] px-4 py-12 sm:px-6">
                <div className="mx-auto max-w-4xl">
                    <div className="mb-8">
                        <p className="text-sm font-semibold tracking-[0.2em] text-[#737B59]">
                            THT CLOTHING
                        </p>

                        <h1 className="mt-2 text-3xl font-bold text-[#252525]">
                            Tài khoản của tôi
                        </h1>

                        <p className="mt-2 text-gray-600">
                            Xin chào, {user.name}!
                        </p>
                    </div>

                    <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
                        <h2 className="text-lg font-semibold text-[#252525]">
                            Thông tin cá nhân
                        </h2>

                        <div className="mt-5 space-y-4 text-sm">
                            <div>
                                <p className="text-gray-500">Họ và tên</p>
                                <p className="mt-1 font-medium text-[#252525]">
                                    {user.name}
                                </p>
                            </div>

                            <div>
                                <p className="text-gray-500">Email</p>
                                <p className="mt-1 font-medium text-[#252525]">
                                    {user.email}
                                </p>
                            </div>

                            <div>
                                <p className="text-gray-500">Loại tài khoản</p>
                                <p className="mt-1 font-medium text-[#252525]">
                                    {isAdmin ? "Quản trị viên" : "Khách hàng"}
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm sm:p-8">
                        <h2 className="text-lg font-semibold text-[#252525]">
                            Hoạt động của tôi
                        </h2>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <Link
                                href="/account/orders"
                                className="border border-[#e8e2d8] p-4 transition hover:border-[#737B59]"
                            >
                                <p className="font-semibold text-[#252525]">
                                    Đơn mua
                                </p>
                                <p className="mt-1 text-sm text-gray-500">
                                    Theo dõi đơn hàng đã mua
                                </p>
                            </Link>

                            <Link
                                href="/account/rentals"
                                className="border border-[#e8e2d8] p-4 transition hover:border-[#737B59]"
                            >
                                <p className="font-semibold text-[#252525]">
                                    Đơn thuê
                                </p>
                                <p className="mt-1 text-sm text-gray-500">
                                    Theo dõi các đơn thuê trang phục
                                </p>
                            </Link>
                        </div>
                    </section>

                    {isAdmin && (
                        <section className="mt-6 rounded-2xl border border-[#737B59]/30 bg-white p-6 shadow-sm sm:p-8">
                            <h2 className="text-lg font-semibold text-[#252525]">
                                Quản trị
                            </h2>

                            <div className="mt-5 flex flex-col gap-3">
                                <Link
                                    href="/admin/products"
                                    className="border border-[#e8e2d8] p-4 transition hover:border-[#737B59]"
                                >
                                    Quản lý sản phẩm
                                </Link>

                                <Link
                                    href="/admin/orders"
                                    className="border border-[#e8e2d8] p-4 transition hover:border-[#737B59]"
                                >
                                    Quản lý đơn hàng
                                </Link>

                                <Link
                                    href="/admin/rentals"
                                    className="border border-[#e8e2d8] p-4 transition hover:border-[#737B59]"
                                >
                                    Quản lý đơn thuê
                                </Link>
                            </div>
                        </section>
                    )}

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="mt-6 border border-[#252525] px-6 py-3 text-sm font-semibold text-[#252525] transition hover:bg-[#252525] hover:text-white"
                    >
                        Đăng xuất
                    </button>
                </div>
            </main>

            <Footer />
        </>
    );
}
