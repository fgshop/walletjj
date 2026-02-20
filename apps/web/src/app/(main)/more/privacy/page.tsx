'use client';

export default function PrivacyPage() {
  return (
    <div className="pb-20 sm:pb-0">
      <a href="/more" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        더보기
      </a>
      <h1 className="text-xl font-bold text-white">개인정보처리방침</h1>
      <p className="mb-6 text-sm text-gray-400">JOJU Wallet 개인정보 수집 및 이용</p>

      <div className="space-y-6 text-sm leading-relaxed text-gray-300">
        <section>
          <h2 className="mb-2 text-base font-semibold text-white">1. 수집하는 개인정보 항목</h2>
          <ul className="list-disc space-y-1 pl-5 text-gray-400">
            <li><strong className="text-gray-300">필수항목:</strong> 이메일, 이름, 비밀번호</li>
            <li><strong className="text-gray-300">선택항목:</strong> 전화번호</li>
            <li><strong className="text-gray-300">자동수집:</strong> IP 주소, 기기정보, 접속 로그</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-white">2. 개인정보의 수집 및 이용목적</h2>
          <ul className="list-disc space-y-1 pl-5 text-gray-400">
            <li>회원 가입 및 본인 확인</li>
            <li>전자지갑 서비스 제공</li>
            <li>거래 내역 관리 및 고객 지원</li>
            <li>부정이용 방지 및 보안</li>
            <li>서비스 개선 및 통계 분석</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-white">3. 개인정보의 보유 및 이용기간</h2>
          <p>회원 탈퇴 시까지 보유하며, 관련 법령에 따라 일정 기간 보존이 필요한 경우 해당 기간 동안 보존합니다.</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-gray-400">
            <li>거래 기록: 5년 (전자금융거래법)</li>
            <li>접속 로그: 3개월 (통신비밀보호법)</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-white">4. 개인정보의 제3자 제공</h2>
          <p>서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 법령에 의한 요청이 있는 경우에는 예외로 합니다.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-white">5. 개인정보 보호 조치</h2>
          <ul className="list-disc space-y-1 pl-5 text-gray-400">
            <li>비밀번호 암호화 저장 (bcrypt)</li>
            <li>지갑 개인키 AES-256-GCM 암호화</li>
            <li>HTTPS 통신 암호화</li>
            <li>접근 권한 최소화 및 감사 로그</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-white">6. 이용자의 권리</h2>
          <p>이용자는 언제든지 본인의 개인정보를 조회, 수정, 삭제할 수 있으며, 회원 탈퇴를 통해 개인정보 처리 정지를 요청할 수 있습니다.</p>
        </section>

        <p className="pt-4 text-xs text-gray-600">시행일: 2026년 1월 1일</p>
      </div>
    </div>
  );
}
