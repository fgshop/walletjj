export default function AdminHome() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary">JOJUWallet Admin</h1>
        <p className="mt-2 text-text-secondary">관리자 대시보드</p>
        <div className="mt-6">
          <a
            href="/login"
            className="rounded-lg bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-light"
          >
            로그인
          </a>
        </div>
      </div>
    </main>
  );
}
