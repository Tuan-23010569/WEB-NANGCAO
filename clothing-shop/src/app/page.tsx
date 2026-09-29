
export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">
          Clothing Shop
        </h1>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="text-4xl font-bold">
          Thời trang dành cho bạn
        </h2>

        <p className="mt-4 text-gray-600">
          Mua sắm và thuê quần áo trực tuyến
        </p>

        <div className="mt-8 flex justify-center gap-4">
          <a
            href="/products"
            className="rounded-lg bg-black px-6 py-3 text-white"
          >
            Mua sắm
          </a>

          <a
            href="/rentals"
            className="rounded-lg border border-black px-6 py-3"
          >
            Thuê quần áo
          </a>
        </div>
      </section>
    </main>
  );
}