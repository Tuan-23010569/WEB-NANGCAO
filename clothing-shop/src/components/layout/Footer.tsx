import Link from "next/link";

export default function Footer() {
    return (
        <footer className="bg-[#252525] text-[#f7f5f0]">
            <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                    <Link
                        href="/"
                        className="text-2xl font-black tracking-widest"
                    >
                        THT<span className="text-[#a7af83]"> CLOTHING</span>
                    </Link>

                    <p className="mt-4 max-w-xs text-sm leading-6 text-white/65">
                        Mặc đẹp theo cách của bạn. Khám phá phong cách riêng
                        cùng THT Clothing.
                    </p>
                </div>

                <div>
                    <h3 className="font-semibold">Khám phá</h3>

                    <div className="mt-4 flex flex-col gap-3 text-sm text-white/65">
                        <Link href="/products" className="hover:text-white">
                            Tất cả sản phẩm
                        </Link>
                        <Link
                            href="/products?category=nam"
                            className="hover:text-white"
                        >
                            Thời trang nam
                        </Link>
                        <Link
                            href="/products?category=nu"
                            className="hover:text-white"
                        >
                            Thời trang nữ
                        </Link>
                        <Link href="/rentals" className="hover:text-white">
                            Dịch vụ thuê đồ
                        </Link>
                        <Link href="/cart" className="hover:text-white">
                            Giỏ hàng
                        </Link>
                        <Link href="/checkout" className="hover:text-white">
                            Thanh toán
                        </Link>
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold">Tài khoản</h3>

                    <div className="mt-4 flex flex-col gap-3 text-sm text-white/65">
                        <Link href="/login" className="hover:text-white">
                            Đăng nhập
                        </Link>
                        <Link href="/register" className="hover:text-white">
                            Đăng ký
                        </Link>
                        <Link
                            href="/account/orders"
                            className="hover:text-white"
                        >
                            Đơn mua
                        </Link>
                        <Link
                            href="/account/rentals"
                            className="hover:text-white"
                        >
                            Đơn thuê
                        </Link>
                    </div>
                </div>
            </div>

            <div className="border-t border-white/10 px-6 py-5 text-center text-xs text-white/50">
                © {new Date().getFullYear()} THT Clothing. All rights reserved.
            </div>
        </footer>
    );
}