export default function SecurityNotice() {
    return (
        <section className="rounded-2xl border border-[#e8e2d8] bg-white p-5 sm:p-6">
            <div className="flex items-start gap-4">
                <span className="text-2xl">🛡️</span>

                <div>
                    <h3 className="font-bold text-[#252525]">
                        Bảo mật hệ thống
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-gray-600">
                        API quản trị phải xác thực token và kiểm tra vai trò
                        ADMIN ở phía server. Không chỉ dựa vào việc ẩn hoặc
                        hiện chức năng trên giao diện.
                    </p>
                </div>
            </div>
        </section>
    );
}