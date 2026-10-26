import { useEffect, useState, type ReactNode } from 'react';

export default function SystemReadiness({ children }: { children: ReactNode }) {
  const [everReady, setEverReady] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('Đang kiểm tra kết nối hệ thống…');
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function check() {
      try {
        const response = await fetch('/api/ready', { cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(3000)]) });
        const state = await response.json();
        if (!alive) return;
        const available = response.ok && state.ready === true && state.phase === 'ready';
        setReady(available);
        if (available) setEverReady(true);
        else setMessage(state.phase === 'initialization_failed' ? 'Khởi tạo chưa hoàn tất. Hệ thống đang thử lại…'
          : state.mongodb === 'connected' ? 'Đã kết nối dữ liệu. Đang hoàn tất khởi tạo…' : 'Đang chờ kết nối dữ liệu…');
      } catch {
        if (!alive) return;
        setReady(false);
        setMessage('Chưa kết nối được máy chủ. Đang tự động thử lại…');
      }
      if (alive) timer = setTimeout(check, 3000);
    }
    void check();
    return () => { alive = false; controller.abort(); clearTimeout(timer); };
  }, []);
  return <>
    {everReady && <div inert={!ready}>{children}</div>}
    {!ready && <div role="status" aria-live="polite" className="fixed inset-0 z-[200] flex min-h-screen items-center justify-center bg-background p-6 text-on-surface">
      <div className="max-w-md rounded-xl border border-outline-variant bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-outline-variant border-t-primary" />
        <h1 className="text-lg font-semibold">Hệ thống chưa sẵn sàng</h1>
        <p className="mt-3 text-sm">{message}</p>
        <p className="mt-2 text-sm text-on-surface-variant">Trang sẽ tự mở khi sẵn sàng. Nội dung đang nhập được giữ khi kết nối gián đoạn.</p>
      </div>
    </div>}
  </>;
}
