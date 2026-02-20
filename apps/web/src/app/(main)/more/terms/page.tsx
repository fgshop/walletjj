'use client';

export default function TermsPage() {
  return (
    <div className="pb-20 sm:pb-0">
      <a href="/more" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        더보기
      </a>
      <h1 className="text-xl font-bold text-white">이용약관</h1>
      <p className="mb-6 text-sm text-gray-400">JOJU Wallet 서비스 이용약관</p>

      <div className="space-y-6 text-sm leading-relaxed text-gray-300">
        <section>
          <h2 className="mb-2 text-base font-semibold text-white">제1조 (목적)</h2>
          <p>이 약관은 JOJU Wallet(이하 &quot;서비스&quot;)이 제공하는 전자지갑 서비스의 이용조건 및 절차, 이용자와 서비스 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-white">제2조 (정의)</h2>
          <ol className="list-decimal space-y-1 pl-5 text-gray-400">
            <li>&quot;전자지갑&quot;이란 디지털 자산을 보관, 전송, 수신할 수 있는 전자적 수단을 말합니다.</li>
            <li>&quot;회원&quot;이란 이 약관에 동의하고 서비스 이용 자격을 부여받은 자를 말합니다.</li>
            <li>&quot;디지털 자산&quot;이란 블록체인 네트워크에서 전자적으로 거래되는 가치의 전자적 표현을 말합니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-white">제3조 (약관의 효력)</h2>
          <p>이 약관은 서비스를 이용하고자 하는 모든 회원에게 적용됩니다. 서비스 가입 시 본 약관에 동의한 것으로 간주합니다.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-white">제4조 (서비스의 제공)</h2>
          <p>서비스는 다음의 기능을 제공합니다:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-gray-400">
            <li>디지털 자산의 보관 및 관리</li>
            <li>디지털 자산의 입출금</li>
            <li>회원 간 내부 전송</li>
            <li>거래 내역 조회</li>
            <li>시세 정보 제공</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-white">제5조 (이용자의 의무)</h2>
          <ol className="list-decimal space-y-1 pl-5 text-gray-400">
            <li>회원은 본인의 계정 정보를 안전하게 관리할 책임이 있습니다.</li>
            <li>회원은 타인의 정보를 도용하거나 부정한 방법으로 서비스를 이용해서는 안 됩니다.</li>
            <li>회원은 관련 법령 및 이 약관을 준수하여야 합니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-white">제6조 (면책조항)</h2>
          <p>서비스는 블록체인 네트워크의 장애, 해킹, 천재지변 등 불가항력적인 사유로 인한 손해에 대해 책임을 지지 않습니다. 디지털 자산의 가격 변동에 따른 손실에 대해서도 서비스는 책임을 지지 않습니다.</p>
        </section>

        <p className="pt-4 text-xs text-gray-600">시행일: 2026년 1월 1일</p>
      </div>
    </div>
  );
}
