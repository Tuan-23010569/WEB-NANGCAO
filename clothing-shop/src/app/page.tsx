
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/products/ProductCard";

type Category = {
  id: number;
  name: string;
  slug: string;
};

type Variant = {
  id: number;
  sellPrice: number | string;
  stock: number;
};

type Product = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  categoryId: number;
  isActive: boolean;
  category: Category | null;
  variants: Variant[];
};

type DisplayProduct = {
  id: number;
  name: string;
  price: number;
  image: string | null;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

export default function Home() {
  const [products, setProducts] = useState<DisplayProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch("/api/products", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Không thể tải sản phẩm: ${response.status}`);
        }

        const result: ApiResponse<Product[]> = await response.json();

        if (!result.success || !Array.isArray(result.data)) {
          throw new Error("Dữ liệu sản phẩm không hợp lệ");
        }

        // Chỉ lấy sản phẩm đang được hiển thị.
        const activeProducts = result.data.filter(
          (product) => product.isActive === true
        );

        // Lấy danh mục từ dữ liệu sản phẩm.
        const categoryMap = new Map<number, Category>();

        activeProducts.forEach((product) => {
          if (product.category) {
            categoryMap.set(product.category.id, product.category);
          }
        });

        setCategories(
          Array.from(categoryMap.values()).sort((a, b) =>
            a.name.localeCompare(b.name, "vi")
          )
        );

        // Chuyển dữ liệu API về định dạng ProductCard đang sử dụng.
        const displayProducts: DisplayProduct[] = activeProducts
          .map((product) => {
            const prices = (product.variants ?? [])
              .map((variant) => Number(variant.sellPrice))
              .filter(
                (price) => Number.isFinite(price) && price >= 0
              );

            return {
              id: product.id,
              name: product.name,
              price: prices.length > 0 ? Math.min(...prices) : 0,
              image: product.imageUrl,
            };
          })
          .slice(0, 8);

        setProducts(displayProducts);
      } catch (error) {
        console.error("Không thể tải dữ liệu trang chủ:", error);
      } finally {
        setLoading(false);
      }
    }

    void loadProducts();
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f5f0] text-[#252525]">
      <Header />

      {/* Banner chính */}
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 md:grid-cols-2 md:py-20">
        <div className="order-2 md:order-1">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#737b59]">
            Bộ sưu tập mới
          </p>

          <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Mặc đẹp theo cách của bạn.
          </h1>

          <p className="mt-6 max-w-lg text-base leading-7 text-[#6d6a62]">
            Khám phá những thiết kế tối giản, dễ phối đồ và phù hợp với
            phong cách riêng của bạn. Mua sắm hoặc thuê trang phục ngay
            tại THT Clothing.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/products"
              className="bg-[#252525] px-7 py-3.5 text-sm font-medium text-white transition hover:bg-[#737b59]"
            >
              Mua sắm ngay
            </Link>

            <Link
              href="/rentals"
              className="border border-[#252525] px-7 py-3.5 text-sm font-medium transition hover:bg-[#252525] hover:text-white"
            >
              Khám phá thuê đồ
            </Link>
          </div>

          <div className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-[#ded8cd] pt-6">
            <div>
              <p className="text-sm font-semibold">Tối giản</p>
              <p className="mt-1 text-xs text-[#77736a]">Dễ phối đồ</p>
            </div>
            <div>
              <p className="text-sm font-semibold">Linh hoạt</p>
              <p className="mt-1 text-xs text-[#77736a]">Mua hoặc thuê</p>
            </div>
            <div>
              <p className="text-sm font-semibold">Hiện đại</p>
              <p className="mt-1 text-xs text-[#77736a]">Phong cách riêng</p>
            </div>
          </div>
        </div>

        <div className="order-1 min-h-[320px] overflow-hidden bg-[#e8e2d8] md:order-2 md:min-h-[540px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85"
            alt="Bộ sưu tập thời trang THT Clothing"
            className="h-full min-h-[320px] w-full object-cover md:min-h-[540px]"
          />
        </div>
      </section>

      {/* Ưu điểm */}
      <section className="border-y border-[#e8e2d8] bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-5 py-7 text-center sm:grid-cols-3">
          <div>
            <p className="text-sm font-semibold">Phong cách tối giản</p>
            <p className="mt-1 text-xs text-[#77736a]">
              Dễ dàng kết hợp trang phục
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold">Mua sắm thuận tiện</p>
            <p className="mt-1 text-xs text-[#77736a]">
              Chọn đồ và đặt hàng trực tuyến
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold">Thuê đồ linh hoạt</p>
            <p className="mt-1 text-xs text-[#77736a]">
              Lựa chọn trang phục theo dịp
            </p>
          </div>
        </div>
      </section>

      {/* Danh mục nổi bật */}
      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#737b59]">
              Khám phá phong cách
            </p>
            <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
              Danh mục nổi bật
            </h2>
          </div>

          <Link
            href="/products"
            className="text-sm underline underline-offset-4 hover:text-[#737b59]"
          >
            Xem tất cả
          </Link>
        </div>

        {loading ? (
          <p className="py-12 text-center text-sm text-[#77736a]">
            Đang tải danh mục...
          </p>
        ) : categories.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                href={`/products?category=${encodeURIComponent(category.slug)}`}
                className={`group flex min-h-48 items-end justify-between p-7 transition hover:bg-[#ded8cd] ${index % 2 === 0 ? "bg-[#e8e2d8]" : "bg-[#eee9e1]"
                  }`}
              >
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#737b59]">
                    Collection {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold">
                    {category.name}
                  </h3>
                </div>

                <span className="text-2xl transition group-hover:translate-x-1">
                  →
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-8 bg-white px-6 py-12 text-center">
            <p className="font-medium">Chưa có danh mục để hiển thị.</p>
            <p className="mt-2 text-sm text-[#77736a]">
              Hãy kiểm tra danh mục và dữ liệu sản phẩm trong database.
            </p>
          </div>
        )}
      </section>

      {/* Sản phẩm nổi bật */}
      <section className="mx-auto max-w-7xl px-5 pb-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#737b59]">
              Lựa chọn dành cho bạn
            </p>
            <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
              Sản phẩm nổi bật
            </h2>
          </div>

          <Link
            href="/products"
            className="text-sm underline underline-offset-4 hover:text-[#737b59]"
          >
            Tất cả sản phẩm
          </Link>
        </div>

        {loading ? (
          <p className="py-12 text-sm text-[#77736a]">
            Đang tải sản phẩm...
          </p>
        ) : products.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                image={product.image}
              />
            ))}
          </div>
        ) : (
          <div className="mt-8 bg-white px-6 py-12 text-center">
            <p className="font-medium">
              Chưa có sản phẩm để hiển thị.
            </p>
            <p className="mt-2 text-sm text-[#77736a]">
              Hãy thêm sản phẩm trong database hoặc kiểm tra API
              /api/products.
            </p>
            <Link
              href="/products"
              className="mt-5 inline-block bg-[#252525] px-6 py-3 text-sm text-white hover:bg-[#737b59]"
            >
              Xem danh sách sản phẩm
            </Link>
          </div>
        )}
      </section>

      {/* Banner thuê đồ */}
      <section className="mx-5 mb-16 bg-[#e8e2d8] px-6 py-12 text-center sm:mx-auto sm:max-w-7xl sm:px-12 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#737b59]">
          THT Clothing Rental
        </p>
        <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-semibold">
          Một bộ trang phục đẹp cho mỗi dịp đặc biệt.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#6d6a62]">
          Khám phá dịch vụ thuê trang phục khi bạn cần một lựa chọn linh
          hoạt cho sự kiện hoặc dịp đặc biệt.
        </p>
        <Link
          href="/rentals"
          className="mt-7 inline-block bg-[#252525] px-7 py-3.5 text-sm text-white transition hover:bg-[#737b59]"
        >
          Khám phá dịch vụ thuê
        </Link>
      </section>

      <Footer />
    </main>
  );
}
