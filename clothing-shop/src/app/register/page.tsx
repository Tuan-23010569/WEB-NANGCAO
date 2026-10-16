
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function RegisterPage() {
    const router = useRouter();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");

        if (password.length < 8 || password.length > 72) {
            setError("Mật khẩu phải có từ 8 đến 72 ký tự.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                setError(result.message || "Đăng ký thất bại.");
                return;
            }

            // Đăng ký thành công, chuyển sang trang đăng nhập
            router.push("/login");
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
                            Tạo tài khoản
                        </h1>

                        <p className="mt-2 text-sm text-gray-500">
                            Đăng ký để mua sắm cùng THT Clothing.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label
                                htmlFor="name"
                                className="mb-2 block text-sm font-medium"
                            >
                                Họ và tên
                            </label>

                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                maxLength={100}
                                autoComplete="name"
                                placeholder="Nhập họ và tên"
                                required
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#737B59] focus:ring-2 focus:ring-[#737B59]/20"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="email"
                                className="mb-2 block text-sm font-medium"
                            >
                                Email
                            </label>

                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                                placeholder="name@example.com"
                                required
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#737B59] focus:ring-2 focus:ring-[#737B59]/20"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="mb-2 block text-sm font-medium"
                            >
                                Mật khẩu
                            </label>

                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="new-password"
                                placeholder="Ít nhất 8 ký tự"
                                minLength={8}
                                maxLength={72}
                                required
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#737B59] focus:ring-2 focus:ring-[#737B59]/20"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="confirmPassword"
                                className="mb-2 block text-sm font-medium"
                            >
                                Xác nhận mật khẩu
                            </label>

                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) =>
                                    setConfirmPassword(e.target.value)
                                }
                                autoComplete="new-password"
                                placeholder="Nhập lại mật khẩu"
                                required
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#737B59] focus:ring-2 focus:ring-[#737B59]/20"
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
                            {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-gray-600">
                        Đã có tài khoản?{" "}
                        <a
                            href="/login"
                            className="font-semibold text-[#737B59] hover:underline"
                        >
                            Đăng nhập
                        </a>
                    </p>
                </div>
            </main>

            <Footer />
        </>
    );
}
