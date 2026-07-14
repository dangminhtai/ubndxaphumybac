import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import {
  BookOpenCheck,
  Check,
  Copy,
  FileSearch,
  Filter,
  Loader2,
  Search,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import {
  getDocumentCatalogMeta,
  searchDocumentCatalog,
} from '../api/documentCatalogApi';
import type {
  DocumentCatalogMeta,
  DocumentCatalogSearchResponse,
  DocumentCatalogSearchResult,
} from '../types/documentCatalog';

const MATCHED_FIELD_LABELS: Record<string, string> = {
  code: 'Mã',
  taskName: 'Tên nhiệm vụ',
  outputProduct: 'Sản phẩm đầu ra',
  description: 'Diễn giải',
  groupName: 'Nhóm',
};

function formatNumber(value: number | null) {
  if (value === null) return 'Không quy định';
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value);
}

function CatalogResultCard({ item }: { item: DocumentCatalogSearchResult }) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(item.code);
      setCopied(true);
      toast.success(`Đã sao chép ${item.code}`);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Không thể sao chép mã');
    }
  };

  return (
    <article className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4 shadow-level-1 md:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-primary px-2.5 py-1 text-sm font-bold text-on-primary">
              {item.code}
            </span>
            <span className="rounded-md bg-surface-container-high px-2.5 py-1 text-xs font-semibold text-on-surface">
              {item.outputProduct}
            </span>
            <span className="text-xs text-on-surface-variant">{item.groupName}</span>
          </div>
          <h2 className="text-base font-semibold leading-6 text-on-surface md:text-lg">
            {item.taskName}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => void copyCode()}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-primary px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
          title="Sao chép mã"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Đã sao chép' : 'Sao chép mã'}
        </button>
      </div>

      {item.description && (
        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-on-surface-variant">
          {item.description}
        </p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-outline-variant pt-4 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-on-surface-variant">Phân nhóm</dt>
          <dd className="mt-1 text-sm font-semibold text-on-surface">{formatNumber(item.classification)}</dd>
        </div>
        <div>
          <dt className="text-xs text-on-surface-variant">Khung điểm</dt>
          <dd className="mt-1 text-sm font-semibold text-on-surface">{formatNumber(item.maxScoreFrame)}</dd>
        </div>
        <div>
          <dt className="text-xs text-on-surface-variant">Chấm điểm</dt>
          <dd className="mt-1 text-sm font-semibold text-on-surface">{formatNumber(item.score)}</dd>
        </div>
        <div>
          <dt className="text-xs text-on-surface-variant">Hệ số quy đổi</dt>
          <dd className="mt-1 text-sm font-semibold text-on-surface">{formatNumber(item.conversionFactor)}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-on-surface-variant">Khớp theo:</span>
        {item.matchedFields.map((field) => (
          <span
            key={field}
            className="rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700"
          >
            {MATCHED_FIELD_LABELS[field] ?? field}
          </span>
        ))}
      </div>
    </article>
  );
}

export default function DocumentCatalog() {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('');
  const [outputProduct, setOutputProduct] = useState('');
  const [meta, setMeta] = useState<DocumentCatalogMeta | null>(null);
  const [data, setData] = useState<DocumentCatalogSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDocumentCatalogMeta()
      .then(setMeta)
      .catch(() => setError('Không tải được thông tin danh mục'))
      .finally(() => setMetaLoading(false));
  }, []);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setError('Nhập ít nhất 2 ký tự để tra cứu');
      setData(null);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await searchDocumentCatalog({
        query: trimmedQuery,
        group,
        outputProduct,
        limit: 20,
      });
      setData(response);
    } catch (requestError: any) {
      setData(null);
      setError(requestError.response?.data?.error || 'Không thể tra cứu danh mục');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout
      title="Tra cứu danh mục"
      subtitle="Tìm mã sản phẩm, công việc theo danh mục chung"
    >
      <div className="space-y-5">
        <form
          onSubmit={(event) => void handleSearch(event)}
          className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4 shadow-level-1 md:p-5"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
            <Filter className="h-4 w-4 text-primary" />
            Điều kiện tra cứu
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(280px,1fr)_220px_220px_auto]">
            <label className="relative block min-w-0">
              <span className="sr-only">Tên, mã hoặc mô tả công việc</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="search"
                value={query}
                maxLength={200}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tên, mã hoặc mô tả công việc..."
                className="h-11 w-full rounded-lg border border-outline-variant bg-surface pl-10 pr-3 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </label>

            <label>
              <span className="sr-only">Nhóm công việc</span>
              <select
                value={group}
                disabled={metaLoading}
                onChange={(event) => setGroup(event.target.value)}
                className="h-11 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface outline-none focus:border-primary"
              >
                <option value="">Tất cả nhóm</option>
                {meta?.groups.map((item) => (
                  <option key={item.value} value={item.value}>{item.value} - {item.label}</option>
                ))}
              </select>
            </label>

            <label>
              <span className="sr-only">Sản phẩm đầu ra</span>
              <select
                value={outputProduct}
                disabled={metaLoading}
                onChange={(event) => setOutputProduct(event.target.value)}
                className="h-11 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface outline-none focus:border-primary"
              >
                <option value="">Tất cả sản phẩm</option>
                {meta?.outputProducts.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={loading || metaLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Tra cứu
            </button>
          </div>

          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-error">{error}</p>
          )}
        </form>

        {data && (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-on-surface">
              {data.total === 0
                ? 'Không tìm thấy mã phù hợp'
                : `${data.total} kết quả, hiển thị ${data.results.length}`}
            </p>
            <p className="text-xs text-on-surface-variant">
              Phiên bản danh mục: {data.catalogVersion}
            </p>
          </div>
        )}

        {loading && (
          <div className="flex min-h-48 items-center justify-center" aria-live="polite">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <span className="ml-3 text-sm text-on-surface-variant">Đang tra cứu...</span>
          </div>
        )}

        {!loading && data && data.results.length > 0 && (
          <div className="space-y-3">
            {data.results.map((item) => <CatalogResultCard key={item.code} item={item} />)}
          </div>
        )}

        {!loading && data && data.results.length === 0 && (
          <div className="flex min-h-52 flex-col items-center justify-center border-y border-outline-variant text-center">
            <FileSearch className="h-9 w-9 text-on-surface-variant" />
            <p className="mt-3 font-semibold text-on-surface">Không có kết quả phù hợp</p>
            <p className="mt-1 text-sm text-on-surface-variant">Thử tên nhiệm vụ khác hoặc bỏ bớt bộ lọc.</p>
          </div>
        )}

        {!loading && !data && !error && (
          <div className="flex min-h-52 flex-col items-center justify-center border-y border-outline-variant text-center">
            <BookOpenCheck className="h-9 w-9 text-primary" />
            <p className="mt-3 font-semibold text-on-surface">Danh mục có {meta?.total ?? 80} mã công việc</p>
            <p className="mt-1 text-sm text-on-surface-variant">Nhập tên, mã hoặc mô tả để bắt đầu tra cứu.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
