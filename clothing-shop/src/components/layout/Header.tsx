
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
    name?: string;
    email?: string;
    role?: string;
};

export default function Header() {
    const router = useRouter();

    const [keyword, setKeyword] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        function loadUser() {
            try {
                const storedUser = localStorage.getItem("tht_user");
                setUser(storedUser ? JSON.parse(storedUser) : null);
            } catch {
                setUser(null);
            }
        }

        loadUser();

        window.addEventListener("storage", loadUser);
        window.addEventListener("tht-auth-changed", loadUser);

        return () => {
            window.removeEventListener("storage", loadUser);
            window.removeEventListener("tht-auth-changed", loadUser);
        };
    }, []);

    const isAdmin = user?.role?.toUpperCase() === "ADMIN";

    const navItems = [
        { href: "/", label: "Trang chủ" },
        { href: "/products", label: "Tất cả sản phẩm" },
        { href: "/products?category=nam", label: "Thời trang nam" },
        { href: "/products?category=nu", label: "Thời trang nữ" },
        { href: "/rentals", label: "Thuê đồ" },
    ];

    const accountItems = [
        { href: "/account", label: "Hồ sơ cá nhân" },
        { href: "/account/orders", label: "Đơn mua" },
        { href: "/account/rentals", label: "Đơn thuê" },
    ];

    const adminItems = [
        { href: "/admin/products", label: "Quản lý sản phẩm" },
        { href: "/admin/orders", label: "Quản lý đơn hàng" },
        { href: "/admin/rentals", label: "Quản lý đơn thuê" },
    ];

    function handleSearch(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const value = keyword.trim();

        if (value) {
            setMenuOpen(false);
            router.push(
                `/products?keyword=${encodeURIComponent(value)}`
            );
        }
    }

    function handleLogout() {
        localStorage.removeItem("tht_token");
        localStorage.removeItem("tht_user");

        window.dispatchEvent(new Event("tht-auth-changed"));

        setUser(null);
        setAccountOpen(false);
        setMenuOpen(false);

        router.replace("/login");
        router.refresh();
    }

    return (
        <>
            <div className="bg-[#252525] px-4 py-2 text-center text-[10px] tracking-[0.16em] text-white sm:text-xs">
                THT CLOTHING — PHONG CÁCH CỦA RIÊNG BẠN
            </div>

            <header className="sticky top-0 z-50 border-b border-[#e8e2d8] bg-[#f7f5f0]/95 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-5">
                    {/* Logo */}
                    <Link
                        href="/"
                        onClick={() => setMenuOpen(false)}
                        className="shrink-0 text-xl font-black tracking-[0.1em] text-[#252525] sm:text-2xl"
                    >
                        THT<span className="text-[#737b59]"> CLOTHING</span>
                    </Link>

                    {/* Menu điều hướng máy tính */}
                    <nav className="hidden items-center gap-5 text-sm font-medium lg:flex xl:gap-7">
                        {navItems.map((item) => (
                            <Link
                                key={item.href + item.label}
                                href={item.href}
                                className="whitespace-nowrap transition hover:text-[#737b59]"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center gap-3 sm:gap-4">
                        {/* Tìm kiếm */}
                        <form onSubmit={handleSearch} className="hidden xl:block">
                            <input
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                placeholder="Tìm sản phẩm..."
                                aria-label="Tìm sản phẩm"
                                className="w-40 border-b border-[#b8b4aa] bg-transparent px-2 py-2 text-sm outline-none focus:border-[#737b59]"
                            />
                        </form>

                        {/* Dashboard quản trị: chỉ ADMIN nhìn thấy */}
                        {isAdmin && (
                            <Link
                                href="/admin"
                                className="hidden text-sm font-semibold text-[#737b59] transition hover:text-[#252525] sm:block"
                            >
                                Quản trị
                            </Link>
                        )}

                        {/* Menu tài khoản trên máy tính */}
                        <div
                            className="relative hidden sm:block"
                            onMouseEnter={() => setAccountOpen(true)}
                            onMouseLeave={() => setAccountOpen(false)}
                        >
                            <button
                                type="button"
                                onClick={() => setAccountOpen(!accountOpen)}
                                aria-expanded={accountOpen}
                                className="flex items-center gap-1 py-2 text-sm transition hover:text-[#737b59]"
                            >
                                Tài khoản
                                <span className="text-xs">⌄</span>
                            </button>

                            {accountOpen && (
                                <div className="absolute right-0 top-full z-50 w-56 border border-[#e8e2d8] bg-[#f7f5f0] py-2 shadow-lg">
                                    {user ? (
                                        <>
                                            <div className="border-b border-[#e8e2d8] px-4 py-3">
                                                <p className="truncate text-sm font-semibold text-[#252525]">
                                                    {user.name || "Tài khoản của tôi"}
                                                </p>
                                                <p className="truncate text-xs text-gray-500">
                                                    {user.email || ""}
                                                </p>
                                            </div>

                                            {accountItems.map((item) => (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    onClick={() => setAccountOpen(false)}
                                                    className="block px-4 py-3 text-sm hover:bg-[#eee9df] hover:text-[#737b59]"
                                                >
                                                    {item.label}
                                                </Link>
                                            ))}

                                            <button
                                                type="button"
                                                onClick={handleLogout}
                                                className="w-full border-t border-[#e8e2d8] px-4 py-3 text-left text-sm text-red-700 hover:bg-[#eee9df]"
                                            >
                                                Đăng xuất
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <Link
                                                href="/login"
                                                onClick={() => setAccountOpen(false)}
                                                className="block px-4 py-3 text-sm hover:bg-[#eee9df] hover:text-[#737b59]"
                                            >
                                                Đăng nhập
                                            </Link>

                                            <Link
                                                href="/register"
                                                onClick={() => setAccountOpen(false)}
                                                className="block px-4 py-3 text-sm hover:bg-[#eee9df] hover:text-[#737b59]"
                                            >
                                                Đăng ký
                                            </Link>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Giỏ hàng */}
                        <Link
                            href="/cart"
                            className="text-sm font-semibold transition hover:text-[#737b59]"
                        >
                            Giỏ hàng
                        </Link>

                        {/* Nút menu điện thoại */}
                        <button
                            type="button"
                            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
                            aria-expanded={menuOpen}
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="flex h-10 w-10 items-center justify-center border border-[#ded8cd] text-xl lg:hidden"
                        >
                            {menuOpen ? "×" : "☰"}
                        </button>
                    </div>
                </div>

                {/* Menu điện thoại */}
                {menuOpen && (
                    <div className="border-t border-[#e8e2d8] bg-[#f7f5f0] px-5 py-5 lg:hidden">
                        <form
                            onSubmit={handleSearch}
                            className="mb-4 flex gap-2"
                        >
                            <input
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                placeholder="Tìm sản phẩm..."
                                aria-label="Tìm sản phẩm"
                                className="min-w-0 flex-1 border border-[#ded8cd] bg-white px-3 py-3 text-sm outline-none focus:border-[#737b59]"
                            />

                            <button
                                type="submit"
                                className="bg-[#252525] px-4 text-sm text-white hover:bg-[#737b59]"
                            >
                                Tìm
                            </button>
                        </form>

                        <nav className="flex flex-col">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href + item.label}
                                    href={item.href}
                                    onClick={() => setMenuOpen(false)}
                                    className="border-b border-[#e8e2d8] py-3 text-sm hover:text-[#737b59]"
                                >
                                    {item.label}
                                </Link>
                            ))}

                            {/* Khu vực quản trị trên điện thoại */}
                            {isAdmin && (
                                <>
                                    <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#737b59]">
                                        Quản trị
                                    </p>

                                    <Link
                                        href="/admin"
                                        onClick={() => setMenuOpen(false)}
                                        className="border-b border-[#e8e2d8] py-3 text-sm font-semibold text-[#737b59] hover:text-[#252525]"
                                    >
                                        Dashboard quản trị
                                    </Link>

                                    {adminItems.map((item) => (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setMenuOpen(false)}
                                            className="border-b border-[#e8e2d8] py-3 text-sm hover:text-[#737b59]"
                                        >
                                            {item.label}
                                        </Link>
                                    ))}
                                </>
                            )}

                            {/* Tài khoản trên điện thoại */}
                            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#737b59]">
                                Tài khoản
                            </p>

                            {user ? (
                                <>
                                    <div className="border-b border-[#e8e2d8] py-3">
                                        <p className="text-sm font-semibold">
                                            {user.name || "Tài khoản của tôi"}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {user.email || ""}
                                        </p>
                                    </div>

                                    {accountItems.map((item) => (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setMenuOpen(false)}
                                            className="border-b border-[#e8e2d8] py-3 text-sm hover:text-[#737b59]"
                                        >
                                            {item.label}
                                        </Link>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="border-b border-[#e8e2d8] py-3 text-left text-sm text-red-700"
                                    >
                                        Đăng xuất
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href="/login"
                                        onClick={() => setMenuOpen(false)}
                                        className="border-b border-[#e8e2d8] py-3 text-sm hover:text-[#737b59]"
                                    >
                                        Đăng nhập
                                    </Link>

                                    <Link
                                        href="/register"
                                        onClick={() => setMenuOpen(false)}
                                        className="border-b border-[#e8e2d8] py-3 text-sm hover:text-[#737b59]"
                                    >
                                        Đăng ký
                                    </Link>
                                </>
                            )}
                        </nav>
                    </div>
                )}
            </header>
        </>
    );
}
