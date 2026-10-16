import Link from "next/link";

const menus = [
    {
        title: "Quản lý sản phẩm",
        description: "Thêm, sửa, xóa sản phẩm và cập nhật giá, tồn kho.",
        href: "/admin/products",
        icon: "👕",
        color: "bg-[#f2eee6]",
    },
    {
        title: "Quản lý danh mục",
        description: "Tạo và quản lý danh mục sản phẩm.",
        href: "/admin/categories",
        icon: "🗂️",
        color: "bg-[#e9eee2]",
    },
    {
        title: "Quản lý đơn hàng",
        description: "Theo dõi đơn mua hàng và trạng thái giao hàng.",
        href: "/admin/orders",
        icon: "📦",
        color: "bg-[#f5e9df]",
    },
    {
        title: "Quản lý đơn thuê",
        description: "Theo dõi lịch thuê và tình trạng đơn thuê.",
        href: "/admin/rentals",
        icon: "🧥",
        color: "bg-[#e7edf0]",
    },
    {
        title: "Quản lý người dùng",
        description: "Xem tài khoản và quản lý vai trò.",
        href: "/admin/users",
        icon: "👥",
        color: "bg-[#eee8f5]",
    },
    {
        title: "Báo cáo doanh thu",
        description: "Xem báo cáo kinh doanh chi tiết.",
        href: "/admin/reports",
        icon: "📈",
        color: "bg-[#e5eee8]",
    },
];

export default function AdminMenu() {
    return (
        <section className="mb-10">
            <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#737B59]">
                    System management
                </p>

                <h2 className="mt-2 text-2xl font-bold text-[#252525]">
                    Quản lý hệ thống
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                    Chọn chức năng bạn muốn quản lý.
                </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {menus.map((menu) => (
                    <Link
                        key={menu.href}
                        href={menu.href}
                        className="group rounded-2xl border border-[#e8e2d8] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#737B59] hover:shadow-md"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div
                                className={`flex h-14 w-14 items-center justify-center rounded-xl ${menu.color} text-3xl`}
                            >
                                {menu.icon}
                            </div>

                            <span className="text-xl text-[#737B59] transition group-hover:translate-x-1">
                                →
                            </span>
                        </div>

                        <h3 className="mt-5 text-lg font-bold text-[#252525] group-hover:text-[#737B59]">
                            {menu.title}
                        </h3>

                        <p className="mt-3 min-h-12 text-sm leading-6 text-gray-500">
                            {menu.description}
                        </p>

                        <div className="mt-5 border-t border-[#eee9e1] pt-4 text-sm font-semibold text-[#737B59]">
                            Truy cập chức năng
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}