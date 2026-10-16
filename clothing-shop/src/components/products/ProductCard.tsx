import Link from "next/link";

type ProductCardProps = {
    id: number | string;
    name: string;
    price: number | string;
    image?: string | null;
};

export default function ProductCard({
    id,
    name,
    price,
    image,
}: ProductCardProps) {
    const imageUrl = image?.trim();

    return (
        <Link href={`/products/${id}`} className="group block">
            <div className="relative aspect-[3/4] overflow-hidden bg-[#e8e2d8]">
                {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={imageUrl}
                        alt={name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-sm tracking-widest text-[#737b59]">
                        THT CLOTHING
                    </div>
                )}

                <span className="absolute bottom-3 left-3 bg-white/90 px-3 py-1 text-xs">
                    Khám phá
                </span>
            </div>

            <h3 className="mt-4 line-clamp-2 text-sm font-medium text-[#252525] transition group-hover:text-[#737b59]">
                {name}
            </h3>

            <p className="mt-2 text-sm font-semibold text-[#252525]">
                {Number(price).toLocaleString("vi-VN")} ₫
            </p>
        </Link>
    );
}