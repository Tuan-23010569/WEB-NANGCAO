
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                setError(result.message || "Đăng nhập thất bại.");
                return;
            }

            const { token, user } = result.data;

            if (!token) {
                setError("Không nhận được token đăng nhập.");
                return;
            }

            localStorage.setItem("tht_token", token);
            localStorage.setItem("tht_user", JSON.stringify(user));

            // Chuyển đến trang trước đó nếu có
            const params = new URLSearchParams(window.location.search);
            const next = params.get("next");

            // Chỉ cho phép chuyển đến đường dẫn nội bộ
            if (next && next.startsWith("/") && !next.startsWith("//")) {
                router.push(next);
            } else {
                router.push("/");
            }

            router.refresh();
        } catch {
            setError("Không thể kết nối đến máy chủ. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <Header />

            <main className="min-h-[70vh] bg-[#F7F5F0] px-4 py-16">
                <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-sm sm:p-10">
                    <div className="mb-8 text-center">
                        <p className="text-sm font-semibold tracking-[0.25em] text-[#737B59]">
                            THT CLOTHING
                        </p>

                        <h1 className="mt-3 text-3xl font-bold text-[#252525]">
                            Đăng nhập
                        </h1>

                        <p className="mt-2 text-sm text-gray-500">
                            Chào mừng bạn quay trở lại!
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label
                                htmlFor="email"
                                className="mb-2 block text-sm font-medium text-[#252525]"
                            >
                                Email
                            </label>

                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                autoComplete="email"
                                required
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-[#737B59] focus:ring-2 focus:ring-[#737B59]/20"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="mb-2 block text-sm font-medium text-[#252525]"
                            >
                                Mật khẩu
                            </label>

                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Nhập mật khẩu"
                                autoComplete="current-password"
                                required
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-[#737B59] focus:ring-2 focus:ring-[#737B59]/20"
                            />
                        </div>

                        {error && (
                            <p
                                role="alert"
                                className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
                            >
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-lg bg-[#252525] px-4 py-3 font-semibold text-white transition hover:bg-[#737B59] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-gray-600">
                        Chưa có tài khoản?{" "}
                        <a
                            href="/register"
                            className="font-semibold text-[#737B59] hover:underline"
                        >
                            Đăng ký ngay
                        </a>
                    </p>
                </div>
            </main>

            <Footer />
        </>
    );
}
