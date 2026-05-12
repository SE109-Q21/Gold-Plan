import { PriceTable } from '@/components/PriceTable';
import { PriceHistoryChart } from '@/components/PriceHistoryChart';
import { ComparisonTable } from '@/components/ComparisonTable';
import { InternationalPriceCard } from '@/components/InternationalPriceCard';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-yellow-700">GPLS — Giá Vàng Việt Nam</h1>
        <p className="mt-1 text-sm text-gray-500">Tra cứu giá vàng SJC, DOJI theo thời gian thực</p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-700">Giá vàng quốc tế</h2>
        <InternationalPriceCard />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-700">Giá vàng trong nước</h2>
        <PriceTable />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-700">So sánh thương hiệu</h2>
        <ComparisonTable />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-700">Lịch sử giá</h2>
        <PriceHistoryChart />
      </section>
    </main>
  );
}
