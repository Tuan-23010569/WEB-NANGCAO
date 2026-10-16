export default function AdminWelcome() {
    return (
        <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
                <p className="text-xs font-semibold tracking-[0.25em] text-[#737B59]">
                    THT CLOTHING / ADMIN
                </p>

                <h1 className="mt-3 text-3xl font-bold text-[#252525] sm:text-4xl">
                    Dashboard quản trị
                </h1>

                <p className="mt-3 text-sm leading-6 text-gray-600">
                    Theo dõi tình hình kinh doanh và quản lý cửa hàng tại một nơi.
                </p>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-[#e8e2d8] bg-white px-4 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e9eee2] text-xl">
                    👤
                </span>

                <div>
                    <p className="text-sm font-semibold text-[#252525]">
                        Khu vực quản trị
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                        THT Clothing
                    </p>
                </div>
            </div>
        </section>
    );
}