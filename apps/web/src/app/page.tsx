export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-primary text-white">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight">JOJUWallet</h1>
        <p className="mt-4 text-lg text-gray-300">
          TRON 네트워크 기반 TRC-20 지갑 플랫폼
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <a
            href="/login"
            className="rounded-lg bg-accent-light px-6 py-3 font-semibold text-white transition hover:opacity-90"
          >
            시작하기
          </a>
          <a
            href="/features"
            className="rounded-lg border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
          >
            기능 소개
          </a>
        </div>
      </div>
    </main>
  );
}
