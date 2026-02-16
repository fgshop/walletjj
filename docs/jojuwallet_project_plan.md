# JOJUWallet - Comprehensive Project Development Plan

> **Project Codename:** JOJUWallet
> **Version:** 1.0.0
> **Last Updated:** 2026-02-16
> **Reference Model:** TRONLink
> **Chain:** TRON Network (Single Chain)
> **Wallet Type:** Centralized (Custodial)

---

## Table of Contents

1. [Project Vision](#1-project-vision)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Technology Stack](#3-technology-stack)
4. [Monorepo Folder Structure](#4-monorepo-folder-structure)
5. [Core Business Logic](#5-core-business-logic)
6. [Website Application (Next.js)](#6-website-application-nextjs)
7. [Mobile Application (Flutter)](#7-mobile-application-flutter)
8. [Admin Dashboard (Next.js)](#8-admin-dashboard-nextjs)
9. [Backend API (NestJS)](#9-backend-api-nestjs)
10. [Security Architecture](#10-security-architecture)
11. [TRON Blockchain Integration](#11-tron-blockchain-integration)
12. [Development Phases & Roadmap](#12-development-phases--roadmap)
13. [Infrastructure & DevOps](#13-infrastructure--devops)
14. [Testing Strategy](#14-testing-strategy)

---

## 1. Project Vision

### 1.1 Mission Statement

TRON 네트워크 기반의 **중앙화(Custodial) TRC-20 지갑 플랫폼**을 구축한다.
관리자가 마스터 주소를 소유하며, 모든 사용자 주소는 관리자 주소 하위에 생성된다.
내부 회원 간 송금은 자유롭게 가능하지만, 외부 지갑으로의 출금은 관리자 승인이 필요하다.
TRONLink를 벤치마킹한 직관적 UX를 제공하며, TRONScan에서 모든 트랜잭션을 확인할 수 있다.

### 1.2 Core Principles

| Principle              | Description                                                   |
| ---------------------- | ------------------------------------------------------------- |
| **Centralized Custody** | 관리자가 마스터 키를 소유하고 모든 사용자 주소를 관리         |
| **Single Chain Focus**  | TRON 네트워크 전용 — TRC-20 토큰 지원                         |
| **Admin Control**       | 외부 출금 승인, 지갑 잠금/해제, 사용자 관리                    |
| **On-Chain Visible**    | 모든 트랜잭션은 TRON 네트워크에서 확인 가능 (TRONScan)         |
| **Beautiful UX**        | TRONLink 수준의 UX, 반응형 웹 + 네이티브 앱                    |
| **Cross-Platform**      | Website, Mobile Web, Flutter (iOS/Android), Admin Dashboard    |

### 1.3 Key Business Rules

```
┌─────────────────────────────────────────────────────────────┐
│                    JOJUWallet 핵심 규칙                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 회원가입 시 TRON 주소 자동 생성                           │
│     └── 관리자 마스터 주소 하위의 자식 주소                    │
│     └── 실제 TRON 네트워크 주소 (TRONScan 확인 가능)          │
│                                                              │
│  2. 내부 송금 (회원 ↔ 회원)                                   │
│     └── 즉시 처리, 승인 불필요                                │
│     └── 온체인 트랜잭션 발생                                  │
│                                                              │
│  3. 외부 출금 (회원 → 외부 지갑)                               │
│     └── 관리자 승인 필요                                      │
│     └── 최초 외부 출금: 24시간 대기 후 처리                    │
│     └── 이후 출금: 관리자 승인 후 즉시 처리                    │
│                                                              │
│  4. 지갑 잠금 (Lock)                                          │
│     └── 관리자가 특정 사용자 지갑 잠금/해제 가능               │
│     └── 잠금 시 모든 송금/출금 불가                            │
│                                                              │
│  5. 관리자 권한                                               │
│     └── 모든 사용자 주소에 대한 트랜잭션 관리                  │
│     └── 출금 승인/거부                                        │
│     └── 지갑 잠금/해제                                        │
│     └── 사용자 관리 (정지, 삭제)                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.4 Supported Platforms

```
┌─────────────────────────────────────────────────────┐
│                    JOJUWallet                         │
├──────────┬──────────┬──────────┬────────────────────┤
│ Website  │ Mobile   │ Flutter  │ Admin Dashboard     │
│ Next.js  │ Web      │ iOS/     │ Next.js             │
│ Desktop  │ (PWA)    │ Android  │ 사용자/출금/         │
│ + Mobile │          │          │ 시스템 관리          │
└──────────┴──────────┴──────────┴────────────────────┘
```

### 1.5 TRON Network Scope

| Feature           | Details                                     |
| ----------------- | ------------------------------------------- |
| Native Token      | TRX                                         |
| Token Standard    | TRC-20                                      |
| Network           | TRON Mainnet / Shasta Testnet               |
| Resources         | Bandwidth, Energy 관리                       |
| Block Explorer    | TRONScan (tronscan.org)                     |
| Smart Contract    | Solidity (TRON VM)                          |
| Key Derivation    | m/44'/195'/0' (BIP-44 TRON)                 |

---

## 2. System Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────┐               │
│  │  Website     │  │  Flutter App │  │  Admin   │               │
│  │  (Next.js)   │  │  (iOS/And)  │  │ (Next.js)│               │
│  │  Desktop +   │  │              │  │          │               │
│  │  Mobile Web  │  │              │  │          │               │
│  └──────┬──────┘  └──────┬──────┘  └────┬─────┘               │
│         │                │               │                      │
│         └────────┬───────┴───────────────┘                      │
│                  │                                               │
└──────────────────┼──────────────────────────────────────────────┘
                   │
┌──────────────────┼──────────────────────────────────────────────┐
│                  ▼  Backend Layer                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  API Gateway (NestJS)                       │  │
│  │  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐   │  │
│  │  │ Auth     │ │ Wallet   │ │ Tx     │ │ Admin        │   │  │
│  │  │ Service  │ │ Service  │ │Service │ │ Service      │   │  │
│  │  └──────────┘ └──────────┘ └────────┘ └──────────────┘   │  │
│  │  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐   │  │
│  │  │ Lock     │ │ Approval │ │ Price  │ │ Notification │   │  │
│  │  │ Service  │ │ Service  │ │Service │ │ Service      │   │  │
│  │  └──────────┘ └──────────┘ └────────┘ └──────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │ MySQL    │  │ Redis    │  │ BullMQ   │  │ TRON Node    │    │
│  │ (Primary)│  │ (Cache)  │  │ (Queue)  │  │ (TronWeb)    │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Centralized Wallet Architecture

```
┌───────────────────────────────────────────────────┐
│              Master Wallet (관리자)                 │
│              TRON Address: T...master              │
│              Private Key: 서버 안전 보관            │
│                                                    │
│    ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│    │ User A  │  │ User B  │  │ User C  │  ...     │
│    │ T...aaa │  │ T...bbb │  │ T...ccc │         │
│    │ (child) │  │ (child) │  │ (child) │         │
│    └─────────┘  └─────────┘  └─────────┘         │
│                                                    │
│    ※ 모든 자식 주소의 Private Key는                │
│       서버에서 암호화 보관                          │
│    ※ 관리자가 모든 주소의 트랜잭션 관리 가능        │
└───────────────────────────────────────────────────┘
```

### 2.3 Transaction Flow

```
[내부 송금] User A → User B (같은 지갑 내)
  1. User A가 송금 요청
  2. 서버에서 잔액 확인
  3. User A 주소에서 User B 주소로 온체인 트랜잭션 생성
  4. 서버가 User A의 Private Key로 서명
  5. TRON 네트워크에 브로드캐스트
  6. TRONScan에서 확인 가능
  ※ 관리자 승인 불필요, 즉시 처리

[외부 출금] User A → 외부 지갑 (최초)
  1. User A가 외부 출금 요청
  2. 24시간 대기 상태로 등록
  3. 관리자에게 알림 발송
  4. 24시간 경과 후 관리자가 승인/거부
  5. 승인 시: 서버가 User A 주소에서 외부 주소로 트랜잭션 생성
  6. 거부 시: 사유와 함께 User A에게 알림

[외부 출금] User A → 외부 지갑 (2회차 이후)
  1. User A가 외부 출금 요청
  2. 관리자에게 알림 발송
  3. 관리자가 승인/거부
  4. 승인 시: 즉시 트랜잭션 처리
```

### 2.4 Key Architecture Decisions

| Decision    | Choice                   | Rationale                           |
| ----------- | ------------------------ | ----------------------------------- |
| Monorepo    | Turborepo + pnpm         | 패키지 간 코드 공유, 일관된 빌드    |
| Website     | Next.js 15 (App Router)  | SSR/SSG, 반응형 웹 (데스크탑+모바일) |
| Mobile      | Flutter                  | 네이티브 성능, 단일 코드베이스      |
| Admin       | Next.js 15 (App Router)  | 빠른 개발, 관리자 전용 기능         |
| Backend     | NestJS + Prisma + MySQL  | 타입 안전성, ORM, 확장성            |
| Cache       | Redis                    | 가격 캐싱, 세션, Rate Limit          |
| Queue       | BullMQ                   | 출금 처리, 알림 발송                 |
| Blockchain  | TronWeb v6               | TRON 공식 SDK, 안정성               |

---

## 3. Technology Stack

### 3.1 Frontend (Shared)

| Category         | Technology               | Version |
| ---------------- | ------------------------ | ------- |
| Language         | TypeScript               | 5.x     |
| UI Framework     | React                    | 19.x    |
| State Management | Zustand                  | 5.x     |
| Styling          | Tailwind CSS + shadcn/ui | 4.x     |
| Data Fetching    | TanStack Query           | 5.x     |
| Charts           | Recharts                 | -       |
| Form             | React Hook Form + Zod    | -       |
| i18n             | next-intl                | -       |
| Animation        | Framer Motion            | -       |

### 3.2 Mobile (Flutter)

| Category         | Technology               |
| ---------------- | ------------------------ |
| Framework        | Flutter 3.x              |
| Language         | Dart 3.x                 |
| State Management | Riverpod 2.x             |
| Local Storage    | flutter_secure_storage   |
| Biometrics       | local_auth               |
| Push             | Firebase Cloud Messaging |
| QR Code          | qr_flutter + mobile_scanner |
| HTTP Client      | Dio                      |

### 3.3 Backend

| Category   | Technology            |
| ---------- | --------------------- |
| Framework  | NestJS 11.x           |
| ORM        | Prisma 6.x            |
| Database   | MySQL 8.x             |
| Cache      | Redis 7.x             |
| Queue      | BullMQ                |
| API Docs   | Swagger (OpenAPI 3.1) |
| Auth       | JWT + Refresh Token   |
| Blockchain | TronWeb v6.x          |
| Monitoring | Prometheus + Grafana  |

### 3.4 TRON Libraries

| Library           | Purpose                           |
| ----------------- | --------------------------------- |
| tronweb           | TRON 메인 SDK (주소 생성, 트랜잭션) |
| @noble/ciphers    | Private Key 암호화 (AES-256-GCM)  |
| @scure/bip32      | HD Wallet Key 파생                 |
| @scure/bip39      | 니모닉 생성 (관리자 마스터 시드)    |

---

## 4. Monorepo Folder Structure

```
jojuwallet/
├── .github/                          # GitHub Actions CI/CD
│   └── workflows/
│       ├── ci.yml
│       ├── mobile-release.yml
│       └── deploy-web.yml
│
├── docs/                             # Project Documentation
│   ├── jojuwallet_project_plan.md   # This file
│   ├── architecture/
│   │   ├── system-overview.md
│   │   ├── security-model.md
│   │   └── tron-integration.md
│   ├── api/
│   │   └── openapi.yaml
│   └── guides/
│       ├── development-setup.md
│       └── contributing.md
│
├── packages/                         # Shared Packages
│   ├── types/                        # @joju/types - Shared TypeScript Types
│   │   ├── src/
│   │   │   ├── user.ts
│   │   │   ├── wallet.ts
│   │   │   ├── transaction.ts
│   │   │   ├── token.ts
│   │   │   ├── admin.ts
│   │   │   ├── approval.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── utils/                        # @joju/utils - Shared Utilities
│       ├── src/
│       │   ├── format.ts             # Number, address formatting
│       │   ├── validate.ts           # Address validation (TRON)
│       │   ├── convert.ts            # Unit conversions (SUN ↔ TRX)
│       │   ├── tron.ts               # TRON-specific utilities
│       │   ├── logger.ts
│       │   └── index.ts
│       └── package.json
│
├── apps/                             # Applications
│   ├── web/                          # Website (Next.js - Desktop + Mobile Web)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx          # Landing page
│   │   │   │   ├── (marketing)/
│   │   │   │   │   ├── features/page.tsx
│   │   │   │   │   ├── security/page.tsx
│   │   │   │   │   ├── download/page.tsx
│   │   │   │   │   └── support/page.tsx
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── login/page.tsx
│   │   │   │   │   ├── register/page.tsx
│   │   │   │   │   ├── forgot-password/page.tsx
│   │   │   │   │   └── verify-email/page.tsx
│   │   │   │   ├── (wallet)/
│   │   │   │   │   ├── layout.tsx
│   │   │   │   │   ├── dashboard/page.tsx
│   │   │   │   │   ├── send/page.tsx
│   │   │   │   │   ├── receive/page.tsx
│   │   │   │   │   ├── transactions/page.tsx
│   │   │   │   │   ├── transactions/[id]/page.tsx
│   │   │   │   │   ├── tokens/page.tsx
│   │   │   │   │   └── settings/page.tsx
│   │   │   │   └── api/
│   │   │   │       └── [...route]/route.ts
│   │   │   ├── components/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── Navbar.tsx
│   │   │   │   │   ├── Footer.tsx
│   │   │   │   │   ├── WalletLayout.tsx
│   │   │   │   │   ├── BottomNav.tsx       # Mobile bottom navigation
│   │   │   │   │   └── Sidebar.tsx
│   │   │   │   ├── landing/
│   │   │   │   │   ├── Hero.tsx
│   │   │   │   │   ├── Features.tsx
│   │   │   │   │   ├── Security.tsx
│   │   │   │   │   └── Download.tsx
│   │   │   │   ├── wallet/
│   │   │   │   │   ├── BalanceCard.tsx
│   │   │   │   │   ├── TokenList.tsx
│   │   │   │   │   ├── TransactionItem.tsx
│   │   │   │   │   ├── SendForm.tsx
│   │   │   │   │   ├── ReceiveQR.tsx
│   │   │   │   │   ├── AddressDisplay.tsx
│   │   │   │   │   └── TxStatusBadge.tsx
│   │   │   │   ├── common/
│   │   │   │   │   ├── Button.tsx
│   │   │   │   │   ├── Card.tsx
│   │   │   │   │   ├── Modal.tsx
│   │   │   │   │   ├── Input.tsx
│   │   │   │   │   ├── Toast.tsx
│   │   │   │   │   └── LoadingSkeleton.tsx
│   │   │   │   └── auth/
│   │   │   │       ├── LoginForm.tsx
│   │   │   │       ├── RegisterForm.tsx
│   │   │   │       └── AuthGuard.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useWallet.ts
│   │   │   │   ├── useBalance.ts
│   │   │   │   ├── useTransactions.ts
│   │   │   │   ├── useAuth.ts
│   │   │   │   └── useTokens.ts
│   │   │   ├── stores/
│   │   │   │   ├── authStore.ts
│   │   │   │   ├── walletStore.ts
│   │   │   │   └── uiStore.ts
│   │   │   ├── lib/
│   │   │   │   ├── api.ts                # API client
│   │   │   │   ├── constants.ts
│   │   │   │   └── utils.ts
│   │   │   └── styles/
│   │   │       └── globals.css
│   │   ├── public/
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── admin/                        # Admin Dashboard (Next.js)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── login/page.tsx
│   │   │   │   │   └── 2fa/page.tsx
│   │   │   │   ├── (dashboard)/
│   │   │   │   │   ├── page.tsx          # Dashboard overview
│   │   │   │   │   ├── users/
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   └── [id]/page.tsx
│   │   │   │   │   ├── wallets/
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   └── [id]/page.tsx
│   │   │   │   │   ├── transactions/
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   └── [id]/page.tsx
│   │   │   │   │   ├── approvals/
│   │   │   │   │   │   ├── page.tsx      # 출금 승인 대기열
│   │   │   │   │   │   └── [id]/page.tsx
│   │   │   │   │   ├── locks/
│   │   │   │   │   │   └── page.tsx      # 지갑 잠금 관리
│   │   │   │   │   ├── tokens/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── analytics/
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   └── revenue/page.tsx
│   │   │   │   │   ├── system/
│   │   │   │   │   │   ├── health/page.tsx
│   │   │   │   │   │   └── logs/page.tsx
│   │   │   │   │   ├── notifications/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── settings/
│   │   │   │   │       ├── page.tsx
│   │   │   │   │       ├── roles/page.tsx
│   │   │   │   │       └── audit/page.tsx
│   │   │   │   └── api/
│   │   │   ├── components/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── Sidebar.tsx
│   │   │   │   │   ├── Header.tsx
│   │   │   │   │   └── Breadcrumb.tsx
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── StatsCard.tsx
│   │   │   │   │   ├── TxVolumeChart.tsx
│   │   │   │   │   ├── PendingApprovalsCard.tsx
│   │   │   │   │   ├── LockedWalletsCard.tsx
│   │   │   │   │   └── RecentActivityFeed.tsx
│   │   │   │   ├── tables/
│   │   │   │   │   ├── DataTable.tsx
│   │   │   │   │   ├── UserTable.tsx
│   │   │   │   │   ├── TransactionTable.tsx
│   │   │   │   │   ├── ApprovalTable.tsx
│   │   │   │   │   └── WalletTable.tsx
│   │   │   │   ├── approval/
│   │   │   │   │   ├── ApprovalDetail.tsx
│   │   │   │   │   ├── ApprovalActions.tsx
│   │   │   │   │   └── ApprovalTimeline.tsx
│   │   │   │   └── forms/
│   │   │   │       ├── LockWalletForm.tsx
│   │   │   │       └── TokenForm.tsx
│   │   │   ├── hooks/
│   │   │   ├── stores/
│   │   │   │   ├── authStore.ts
│   │   │   │   └── sidebarStore.ts
│   │   │   └── lib/
│   │   │       ├── apiClient.ts
│   │   │       ├── auth.ts
│   │   │       ├── permissions.ts
│   │   │       └── constants.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── api/                          # Backend API (NestJS)
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── common/
│   │   │   │   ├── decorators/
│   │   │   │   │   ├── roles.decorator.ts
│   │   │   │   │   └── current-user.decorator.ts
│   │   │   │   ├── filters/
│   │   │   │   │   └── all-exceptions.filter.ts
│   │   │   │   ├── guards/
│   │   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   │   ├── roles.guard.ts
│   │   │   │   │   └── wallet-lock.guard.ts
│   │   │   │   ├── interceptors/
│   │   │   │   │   └── transform.interceptor.ts
│   │   │   │   ├── pipes/
│   │   │   │   └── types/
│   │   │   │       └── jwt-user.interface.ts
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.module.ts
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── dto/
│   │   │   │   │   └── strategies/
│   │   │   │   │       ├── jwt.strategy.ts
│   │   │   │   │       └── jwt-refresh.strategy.ts
│   │   │   │   ├── users/
│   │   │   │   │   ├── users.module.ts
│   │   │   │   │   ├── users.controller.ts
│   │   │   │   │   ├── users.service.ts
│   │   │   │   │   └── dto/
│   │   │   │   ├── wallet/
│   │   │   │   │   ├── wallet.module.ts
│   │   │   │   │   ├── wallet.controller.ts
│   │   │   │   │   ├── wallet.service.ts
│   │   │   │   │   ├── dto/
│   │   │   │   │   └── tron/
│   │   │   │   │       ├── tron.service.ts      # TronWeb 통합
│   │   │   │   │       ├── tron-tx.service.ts   # 트랜잭션 처리
│   │   │   │   │       └── tron-monitor.service.ts  # 블록 모니터링
│   │   │   │   ├── transaction/
│   │   │   │   │   ├── transaction.module.ts
│   │   │   │   │   ├── transaction.controller.ts
│   │   │   │   │   ├── transaction.service.ts
│   │   │   │   │   └── dto/
│   │   │   │   ├── approval/
│   │   │   │   │   ├── approval.module.ts
│   │   │   │   │   ├── approval.controller.ts
│   │   │   │   │   ├── approval.service.ts
│   │   │   │   │   ├── approval.processor.ts    # BullMQ worker
│   │   │   │   │   └── dto/
│   │   │   │   ├── lock/
│   │   │   │   │   ├── lock.module.ts
│   │   │   │   │   ├── lock.controller.ts
│   │   │   │   │   ├── lock.service.ts
│   │   │   │   │   └── dto/
│   │   │   │   ├── token/
│   │   │   │   │   ├── token.module.ts
│   │   │   │   │   ├── token.controller.ts
│   │   │   │   │   └── token.service.ts
│   │   │   │   ├── price/
│   │   │   │   │   ├── price.module.ts
│   │   │   │   │   ├── price.controller.ts
│   │   │   │   │   ├── price.service.ts
│   │   │   │   │   └── price.gateway.ts         # WebSocket
│   │   │   │   ├── notification/
│   │   │   │   │   ├── notification.module.ts
│   │   │   │   │   └── notification.service.ts
│   │   │   │   ├── analytics/
│   │   │   │   │   ├── analytics.module.ts
│   │   │   │   │   ├── analytics.controller.ts
│   │   │   │   │   └── analytics.service.ts
│   │   │   │   └── admin/
│   │   │   │       ├── admin.module.ts
│   │   │   │       ├── admin.controller.ts
│   │   │   │       └── admin.service.ts
│   │   │   └── config/
│   │   │       ├── database.config.ts
│   │   │       ├── redis.config.ts
│   │   │       └── tron.config.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── test/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── mobile/                       # Flutter Mobile App
│       ├── lib/
│       │   ├── main.dart
│       │   ├── app/
│       │   │   ├── app.dart
│       │   │   ├── router.dart
│       │   │   └── theme.dart
│       │   ├── core/
│       │   │   ├── constants/
│       │   │   │   └── app_constants.dart
│       │   │   ├── config/
│       │   │   │   └── env.dart
│       │   │   ├── services/
│       │   │   │   ├── api_service.dart
│       │   │   │   ├── auth_service.dart
│       │   │   │   ├── wallet_service.dart
│       │   │   │   ├── biometric_service.dart
│       │   │   │   ├── notification_service.dart
│       │   │   │   └── secure_storage_service.dart
│       │   │   ├── providers/
│       │   │   │   ├── auth_provider.dart
│       │   │   │   ├── wallet_provider.dart
│       │   │   │   ├── transaction_provider.dart
│       │   │   │   └── token_provider.dart
│       │   │   ├── models/
│       │   │   │   ├── user_model.dart
│       │   │   │   ├── wallet_model.dart
│       │   │   │   ├── transaction_model.dart
│       │   │   │   └── token_model.dart
│       │   │   ├── utils/
│       │   │   │   ├── formatters.dart
│       │   │   │   └── validators.dart
│       │   │   └── widgets/
│       │   │       ├── joju_button.dart
│       │   │       ├── joju_card.dart
│       │   │       ├── joju_input.dart
│       │   │       ├── loading_overlay.dart
│       │   │       └── empty_state.dart
│       │   ├── features/
│       │   │   ├── auth/
│       │   │   │   ├── screens/
│       │   │   │   │   ├── login_screen.dart
│       │   │   │   │   ├── register_screen.dart
│       │   │   │   │   └── verify_email_screen.dart
│       │   │   │   └── widgets/
│       │   │   ├── dashboard/
│       │   │   │   ├── screens/
│       │   │   │   │   └── dashboard_screen.dart
│       │   │   │   └── widgets/
│       │   │   │       ├── balance_card.dart
│       │   │   │       ├── token_list_tile.dart
│       │   │   │       ├── quick_actions.dart
│       │   │   │       └── recent_transactions.dart
│       │   │   ├── send/
│       │   │   │   ├── screens/
│       │   │   │   │   ├── send_screen.dart
│       │   │   │   │   └── send_confirm_screen.dart
│       │   │   │   └── widgets/
│       │   │   ├── receive/
│       │   │   │   ├── screens/
│       │   │   │   │   └── receive_screen.dart
│       │   │   │   └── widgets/
│       │   │   ├── transactions/
│       │   │   │   ├── screens/
│       │   │   │   │   ├── tx_list_screen.dart
│       │   │   │   │   └── tx_detail_screen.dart
│       │   │   │   └── widgets/
│       │   │   ├── tokens/
│       │   │   │   ├── screens/
│       │   │   │   └── widgets/
│       │   │   ├── scanner/
│       │   │   │   └── screens/
│       │   │   │       └── qr_scanner_screen.dart
│       │   │   └── settings/
│       │   │       ├── screens/
│       │   │       │   ├── settings_screen.dart
│       │   │       │   ├── security_screen.dart
│       │   │       │   └── profile_screen.dart
│       │   │       └── widgets/
│       │   └── shared/
│       │       └── widgets/
│       ├── android/
│       ├── ios/
│       ├── test/
│       └── pubspec.yaml
│
├── infrastructure/                   # IaC & DevOps
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   ├── docker-compose.dev.yml
│   │   ├── api.Dockerfile
│   │   └── web.Dockerfile
│   └── k8s/
│
├── turbo.json                        # Turborepo Configuration
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── .eslintrc.js
├── .prettierrc
├── .env.example
└── README.md
```

---

## 5. Core Business Logic

### 5.1 User Registration & Wallet Creation

```
1. 사용자가 이메일/비밀번호로 회원가입
2. 이메일 인증 (OTP or 링크)
3. 인증 완료 시 자동으로 TRON 주소 생성
   ├── HD Wallet 경로: m/44'/195'/0'/0/{user_index}
   ├── 서버에서 Private Key 생성 및 AES-256-GCM 암호화 저장
   └── Public Address는 DB에 평문 저장 (TRONScan 조회용)
4. 관리자 마스터 주소에서 새 주소로 초기 Bandwidth 확보 (선택)
```

### 5.2 Internal Transfer (회원 간 송금)

```typescript
// 내부 송금 프로세스
async function internalTransfer(from: User, to: User, amount: bigint, tokenAddress?: string) {
  // 1. 지갑 잠금 상태 확인
  if (from.wallet.isLocked) throw new WalletLockedException();
  if (to.wallet.isLocked) throw new RecipientLockedException();

  // 2. 잔액 확인
  const balance = await tronService.getBalance(from.wallet.address, tokenAddress);
  if (balance < amount) throw new InsufficientBalanceException();

  // 3. Bandwidth/Energy 확인
  const resources = await tronService.getResources(from.wallet.address);
  if (!hasEnoughResources(resources, tokenAddress)) {
    // 마스터 주소에서 리소스 위임 또는 TRX로 수수료 처리
  }

  // 4. 트랜잭션 생성 및 서명 (서버 측)
  const privateKey = await decryptPrivateKey(from.wallet.encryptedKey);
  const tx = await tronService.transfer(from.wallet.address, to.wallet.address, amount, tokenAddress);
  const signedTx = await tronService.sign(tx, privateKey);

  // 5. 브로드캐스트
  const result = await tronService.broadcast(signedTx);

  // 6. DB 기록
  await transactionService.create({
    type: 'INTERNAL',
    fromUserId: from.id,
    toUserId: to.id,
    txHash: result.txid,
    amount,
    status: 'CONFIRMED',
  });

  // 7. 양측에 알림
  await notificationService.notify(from.id, 'SEND_COMPLETE', { amount, to: to.wallet.address });
  await notificationService.notify(to.id, 'RECEIVE', { amount, from: from.wallet.address });
}
```

### 5.3 External Withdrawal (외부 출금)

```typescript
// 외부 출금 프로세스
async function externalWithdraw(user: User, toAddress: string, amount: bigint, tokenAddress?: string) {
  // 1. 지갑 잠금 상태 확인
  if (user.wallet.isLocked) throw new WalletLockedException();

  // 2. 주소 유효성 검사
  if (!tronWeb.isAddress(toAddress)) throw new InvalidAddressException();

  // 3. 내부 주소인지 확인 → 내부면 internalTransfer로 리다이렉트
  const internalUser = await userService.findByAddress(toAddress);
  if (internalUser) return internalTransfer(user, internalUser, amount, tokenAddress);

  // 4. 잔액 확인
  const balance = await tronService.getBalance(user.wallet.address, tokenAddress);
  if (balance < amount) throw new InsufficientBalanceException();

  // 5. 최초 외부 출금 여부 확인
  const isFirstExternal = await withdrawalService.isFirstExternalWithdrawal(user.id, toAddress);

  // 6. 출금 요청 생성
  const withdrawal = await withdrawalService.create({
    userId: user.id,
    toAddress,
    amount,
    tokenAddress,
    status: isFirstExternal ? 'PENDING_24H' : 'PENDING_APPROVAL',
    availableAt: isFirstExternal ? addHours(new Date(), 24) : new Date(),
  });

  // 7. 관리자에게 알림
  await notificationService.notifyAdmins('NEW_WITHDRAWAL_REQUEST', {
    withdrawalId: withdrawal.id,
    userId: user.id,
    amount,
    toAddress,
    isFirstExternal,
  });

  return withdrawal;
}
```

### 5.4 Wallet Lock/Unlock

```typescript
// 관리자 지갑 잠금
async function lockWallet(adminId: string, userId: string, reason: string) {
  const wallet = await walletService.findByUserId(userId);

  await walletService.update(wallet.id, {
    isLocked: true,
    lockedAt: new Date(),
    lockedBy: adminId,
    lockReason: reason,
  });

  // 감사 로그 기록
  await auditLogService.create({
    adminId,
    action: 'WALLET_LOCK',
    resource: 'wallet',
    resourceId: wallet.id,
    details: { userId, reason },
  });

  // 사용자에게 알림
  await notificationService.notify(userId, 'WALLET_LOCKED', { reason });
}
```

### 5.5 Approval Workflow

```
출금 승인 상태 흐름:

[PENDING_24H] ──(24시간 경과)──→ [PENDING_APPROVAL]
                                        │
                                  ┌─────┴─────┐
                                  ▼            ▼
                             [APPROVED]   [REJECTED]
                                  │
                                  ▼
                            [PROCESSING]
                                  │
                            ┌─────┴─────┐
                            ▼            ▼
                       [COMPLETED]   [FAILED]
                                        │
                                        ▼
                               [RETRY] or [REFUNDED]
```

---

## 6. Website Application (Next.js)

### 6.1 Dual Purpose Architecture

```
Website (Next.js 15 - App Router)
├── (marketing)          # SSG - Static Marketing Pages
│   ├── Landing          # Hero, Features, Download CTA
│   ├── /features        # 지갑 기능 소개
│   ├── /security        # 보안 모델 설명
│   ├── /download        # Flutter 앱 다운로드 링크
│   └── /support         # FAQ, 고객지원
│
├── (auth)               # CSR - Authentication
│   ├── /login           # 로그인
│   ├── /register        # 회원가입
│   ├── /forgot-password # 비밀번호 찾기
│   └── /verify-email    # 이메일 인증
│
└── (wallet)             # CSR - Web Wallet (Auth Required)
    ├── /dashboard       # 잔액, 토큰 리스트, 최근 거래
    ├── /send            # 송금 (내부/외부)
    ├── /receive         # 수신 (QR 코드, 주소 복사)
    ├── /transactions    # 거래 내역
    ├── /tokens          # TRC-20 토큰 관리
    └── /settings        # 프로필, 보안 설정
```

### 6.2 Responsive Design Strategy

| Breakpoint  | Layout                           | Target                |
| ----------- | -------------------------------- | --------------------- |
| Desktop     | Sidebar + Main Content           | 1024px 이상           |
| Tablet      | Sidebar Collapsed + Content      | 768px ~ 1023px        |
| Mobile      | Bottom Navigation + Full Width   | < 768px               |

### 6.3 Key Website Features

| Feature                | Description                                   |
| ---------------------- | --------------------------------------------- |
| **Dashboard**          | TRX/TRC-20 잔액, 가격 차트, 최근 거래         |
| **Send/Receive**       | QR 코드 생성/스캔, 주소 검증, 내부/외부 구분   |
| **Transaction History** | 필터/검색, TRONScan 링크, 상태 추적           |
| **Token Management**   | TRC-20 토큰 추가/숨김, 잔액 표시              |
| **Withdrawal Status**  | 출금 요청 상태 추적, 24시간 카운트다운          |
| **Lock Status**        | 지갑 잠금 상태 표시 및 안내                    |
| **PWA Support**        | 모바일 웹에서 홈화면 추가, 오프라인 기본 페이지 |

### 6.4 Landing Page Sections

| Section      | Content                                                       |
| ------------ | ------------------------------------------------------------- |
| **Hero**     | 메인 비주얼, "TRON 기반의 안전한 지갑", 앱 다운로드 CTA       |
| **Features** | 내부 즉시송금, 보안, TRONScan 투명성, 멀티 플랫폼             |
| **Security** | 관리형 보안 모델, AES-256 암호화, 출금 승인 시스템             |
| **Download** | App Store / Play Store 링크, QR 코드                          |
| **Footer**   | 링크, 고객지원, 법적 정보                                      |

---

## 7. Mobile Application (Flutter)

### 7.1 Architecture (Clean Architecture + Riverpod)

```
┌────────────────────────────────────────────┐
│              Presentation Layer             │
│  Screens ← Widgets ← Controllers           │
├────────────────────────────────────────────┤
│              Application Layer              │
│  Providers (Riverpod) ← Services           │
├────────────────────────────────────────────┤
│                Domain Layer                 │
│  Models ← Validators ← Business Rules     │
├────────────────────────────────────────────┤
│                 Data Layer                  │
│  API Client ← Secure Storage              │
│                    ▼                        │
│           Platform Channels                 │
│  (Biometrics, Push Notifications)          │
└────────────────────────────────────────────┘
```

### 7.2 Key Mobile Features

| Feature                | Description                                   |
| ---------------------- | --------------------------------------------- |
| **Biometric Auth**     | 지문/얼굴 인증으로 빠른 잠금 해제             |
| **Push Notifications** | 입금 알림, 출금 승인/거부 알림, 가격 알림      |
| **QR Scanner**         | 카메라 기반 QR 코드 스캔으로 주소 입력         |
| **Dashboard**          | 잔액, 토큰 목록, 빠른 액션 (보내기/받기)       |
| **Transaction History** | 무한 스크롤, 필터, TRONScan 연결              |
| **Withdrawal Status**  | 출금 요청 상태 실시간 추적                     |
| **Lock Indicator**     | 지갑 잠금 시 전체 UI에 잠금 오버레이           |
| **Deep Links**         | `jojuwallet://` URI 스킴                      |

### 7.3 Navigation Structure (4 Tabs)

```
┌──────────────────────────────────────────┐
│                                           │
│              [Screen Content]             │
│                                           │
├────────┬────────┬────────┬───────────────┤
│  Home  │ Send   │ Trans  │   Settings    │
│  (대시) │ (송금)  │ (내역) │   (설정)      │
└────────┴────────┴────────┴───────────────┘
```

### 7.4 Platform-Specific Configuration

| Platform | Configuration                                     |
| -------- | -------------------------------------------------- |
| iOS      | Face ID / Touch ID, Keychain, min iOS 14.0         |
| Android  | Fingerprint, Keystore, minSdk 23, allowBackup=false |
| Both     | flutter_secure_storage, firebase_messaging          |

---

## 8. Admin Dashboard (Next.js)

### 8.1 Admin Features

```
Admin Dashboard
├── Overview Dashboard
│   ├── Total Users / Active Users
│   ├── Total Wallet Balance (TRX + TRC-20)
│   ├── Pending Approvals Count (출금 승인 대기)
│   ├── Locked Wallets Count
│   ├── Transaction Volume (24h/7d/30d)
│   └── Recent Activity Feed
│
├── User Management (사용자 관리)
│   ├── User List (검색, 필터, 페이지네이션)
│   ├── User Detail (프로필, 지갑, 거래 내역)
│   └── User Actions (정지, 지갑 잠금, 메모)
│
├── Wallet Management (지갑 관리)
│   ├── Wallet List (잔액순, 상태별)
│   ├── Wallet Detail (잔액, 토큰, 리소스)
│   ├── Lock/Unlock Actions
│   └── Master Wallet Status
│
├── Withdrawal Approvals (출금 승인) ★ 핵심
│   ├── Pending Queue (승인 대기 목록)
│   │   ├── 24시간 대기 중 (최초 출금)
│   │   └── 승인 대기 (관리자 검토 필요)
│   ├── Approval Actions (승인/거부 + 사유)
│   ├── Approval History (처리 이력)
│   └── Bulk Approval (일괄 승인)
│
├── Transaction Monitor (거래 모니터링)
│   ├── Real-time Transaction Feed
│   ├── Transaction Detail + TRONScan Link
│   ├── Internal vs External 분류
│   ├── Large Transaction Alerts
│   └── Failed Transaction Analysis
│
├── Lock Management (잠금 관리)
│   ├── Currently Locked Wallets
│   ├── Lock/Unlock History
│   └── Lock Reason Management
│
├── Token Management
│   ├── Supported TRC-20 Token List
│   ├── Add/Remove Tokens
│   └── Token Price Feed Status
│
├── Analytics
│   ├── User Growth Trends
│   ├── Transaction Volume Charts
│   ├── Token Distribution
│   └── Withdrawal Patterns
│
├── System Health
│   ├── TRON Node Status
│   ├── API Latency Metrics
│   ├── Queue Processing Status
│   └── Error Rate Dashboard
│
├── Notifications
│   ├── Push Notification Manager
│   ├── In-App Banner Editor
│   └── Maintenance Announcements
│
└── Settings
    ├── Admin Role Management (RBAC)
    ├── Audit Log Viewer
    ├── Withdrawal Policy Configuration
    │   ├── 24시간 룰 on/off
    │   ├── 최소/최대 출금 한도
    │   └── 자동 승인 임계값
    └── System Configuration
```

### 8.2 Role-Based Access Control (RBAC)

| Role            | Permissions                                       |
| --------------- | ------------------------------------------------- |
| **Super Admin** | Full access, role management, system config        |
| **Admin**       | User management, withdrawal approval, lock/unlock  |
| **Operator**    | Transaction monitoring, basic user lookup           |
| **Viewer**      | Read-only: analytics, dashboards                   |

### 8.3 Withdrawal Approval Workflow UI

```
┌──────────────────────────────────────────────────────┐
│  출금 승인 대기                                [3건]  │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │ #WD-001  김철수 (user@email.com)                │ │
│  │ 1,000 TRX → TExt...abc (외부)                   │ │
│  │ 최초 외부 출금 | 24시간 대기 중                   │ │
│  │ 남은 시간: 18:32:15                              │ │
│  │ [상세보기] [승인] [거부]                          │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │ #WD-002  박영희 (park@email.com)                │ │
│  │ 500 USDT (TRC-20) → TRec...xyz (외부)           │ │
│  │ 승인 대기 | 2회차 출금                            │ │
│  │ [상세보기] [승인] [거부]                          │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

## 9. Backend API (NestJS)

### 9.1 API Module Structure

```
apps/api/src/modules/
├── auth/           # JWT authentication, registration, email verification
├── users/          # User profile, KYC status
├── wallet/         # Wallet management, TRON integration
│   └── tron/       # TronWeb service, transaction builder, monitor
├── transaction/    # Transaction history, status tracking
├── approval/       # Withdrawal approval workflow, BullMQ processor
├── lock/           # Wallet lock/unlock management
├── token/          # TRC-20 token registry, metadata
├── price/          # Real-time price feeds, WebSocket
├── notification/   # FCM push, in-app notifications
├── analytics/      # Usage metrics, transaction analytics
└── admin/          # Admin-only endpoints, RBAC
```

### 9.2 Database Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ─── User & Auth ─────────────────────────────────

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  passwordHash    String
  name            String
  phone           String?
  isEmailVerified Boolean   @default(false)
  isActive        Boolean   @default(true)
  isSuspended     Boolean   @default(false)
  suspendReason   String?
  lastLoginAt     DateTime?
  lastLoginIp     String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?

  wallet          Wallet?
  sessions        Session[]
  sentTransactions     Transaction[] @relation("SentTransactions")
  receivedTransactions Transaction[] @relation("ReceivedTransactions")
  withdrawalRequests   WithdrawalRequest[]
  notifications        Notification[]

  @@index([email])
  @@index([isActive, createdAt])
  @@index([deletedAt])
}

model Session {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  refreshToken  String    @unique
  platform      Platform
  deviceInfo    String?
  ipAddress     String?
  expiresAt     DateTime
  createdAt     DateTime  @default(now())

  @@index([userId])
  @@index([expiresAt])
}

model EmailVerification {
  id        String   @id @default(cuid())
  email     String
  code      String
  expiresAt DateTime
  isUsed    Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([email, code])
  @@index([expiresAt])
}

// ─── Wallet ──────────────────────────────────────

model Wallet {
  id              String    @id @default(cuid())
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  address         String    @unique         // TRON public address
  encryptedKey    String    @db.Text        // AES-256-GCM encrypted private key
  derivationIndex Int                       // HD Wallet derivation index
  isLocked        Boolean   @default(false)
  lockedAt        DateTime?
  lockedBy        String?                   // AdminUser ID
  lockReason      String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([address])
  @@index([isLocked])
}

model MasterWallet {
  id              String    @id @default(cuid())
  address         String    @unique
  encryptedSeed   String    @db.Text        // AES-256-GCM encrypted master seed
  encryptedKey    String    @db.Text        // AES-256-GCM encrypted master private key
  nextIndex       Int       @default(0)     // Next derivation index
  description     String?
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

// ─── Transaction ─────────────────────────────────

model Transaction {
  id              String    @id @default(cuid())
  txHash          String?   @unique         // TRON transaction hash
  type            TxType                    // INTERNAL, EXTERNAL_SEND, EXTERNAL_RECEIVE, DEPOSIT
  fromUserId      String?
  fromUser        User?     @relation("SentTransactions", fields: [fromUserId], references: [id])
  toUserId        String?
  toUser          User?     @relation("ReceivedTransactions", fields: [toUserId], references: [id])
  fromAddress     String
  toAddress       String
  amount          String                    // BigInt as string (SUN units)
  tokenAddress    String?                   // null = TRX, otherwise TRC-20 contract
  tokenSymbol     String    @default("TRX")
  tokenDecimals   Int       @default(6)
  fee             String?                   // Transaction fee in SUN
  status          TxStatus  @default(PENDING)
  blockNumber     BigInt?
  confirmedAt     DateTime?
  memo            String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  withdrawalRequest WithdrawalRequest?

  @@index([fromUserId, createdAt])
  @@index([toUserId, createdAt])
  @@index([fromAddress])
  @@index([toAddress])
  @@index([txHash])
  @@index([type, status])
  @@index([createdAt])
}

// ─── Withdrawal Approval ─────────────────────────

model WithdrawalRequest {
  id              String          @id @default(cuid())
  userId          String
  user            User            @relation(fields: [userId], references: [id])
  transactionId   String?         @unique
  transaction     Transaction?    @relation(fields: [transactionId], references: [id])
  toAddress       String                    // External TRON address
  amount          String                    // BigInt as string
  tokenAddress    String?                   // null = TRX
  tokenSymbol     String          @default("TRX")
  status          WithdrawalStatus @default(PENDING_24H)
  isFirstExternal Boolean         @default(false)
  availableAt     DateTime                  // 24시간 후 또는 즉시
  reviewedBy      String?                   // AdminUser ID
  reviewedAt      DateTime?
  reviewNote      String?                   // 승인/거부 사유
  completedAt     DateTime?
  failReason      String?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([userId, createdAt])
  @@index([status])
  @@index([availableAt])
  @@index([reviewedBy])
}

// ─── Token Registry ──────────────────────────────

model SupportedToken {
  id              String    @id @default(cuid())
  contractAddress String    @unique         // TRC-20 contract address
  symbol          String
  name            String
  decimals        Int
  iconUrl         String?
  isActive        Boolean   @default(true)
  sortOrder       Int       @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([isActive, sortOrder])
}

// ─── Price ───────────────────────────────────────

model PriceHistory {
  id        String   @id @default(cuid())
  symbol    String                           // TRX, USDT, etc.
  priceUsd  Decimal  @db.Decimal(20, 8)
  volume24h Decimal? @db.Decimal(20, 2)
  change24h Decimal? @db.Decimal(10, 4)      // % change
  timestamp DateTime
  createdAt DateTime @default(now())

  @@index([symbol, timestamp])
  @@unique([symbol, timestamp])
}

// ─── Admin ───────────────────────────────────────

model AdminUser {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  name         String
  role         AdminRole
  totpSecret   String?
  isActive     Boolean   @default(true)
  lastLoginAt  DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  auditLogs    AuditLog[]

  @@index([email])
}

model AuditLog {
  id          String   @id @default(cuid())
  adminId     String
  admin       AdminUser @relation(fields: [adminId], references: [id])
  action      String                         // LOCK_WALLET, APPROVE_WITHDRAWAL, etc.
  resource    String                         // wallet, withdrawal, user, etc.
  resourceId  String?
  details     Json?                          // before/after snapshots
  ipAddress   String
  createdAt   DateTime @default(now())

  @@index([adminId])
  @@index([action, createdAt])
  @@index([resource, resourceId])
  @@index([createdAt])
}

// ─── Notifications ───────────────────────────────

model Notification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      NotificationType
  title     String
  body      String
  data      Json?                            // Additional payload
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId, isRead, createdAt])
}

model PushToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  platform  Platform
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
}

// ─── System ──────────────────────────────────────

model SystemConfig {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String   @db.Text
  updatedBy String?
  updatedAt DateTime @updatedAt
  createdAt DateTime @default(now())
}

// ─── Enums ───────────────────────────────────────

enum Platform {
  WEB
  MOBILE_IOS
  MOBILE_ANDROID
  ADMIN
}

enum TxType {
  INTERNAL            // 내부 회원 간 송금
  EXTERNAL_SEND       // 외부 출금
  EXTERNAL_RECEIVE    // 외부 입금
  DEPOSIT             // 입금 감지 (블록 모니터링)
}

enum TxStatus {
  PENDING
  CONFIRMED
  FAILED
}

enum WithdrawalStatus {
  PENDING_24H         // 최초 출금 24시간 대기
  PENDING_APPROVAL    // 관리자 승인 대기
  APPROVED            // 승인됨
  REJECTED            // 거부됨
  PROCESSING          // 트랜잭션 처리 중
  COMPLETED           // 완료
  FAILED              // 실패
  REFUNDED            // 환불 처리
}

enum AdminRole {
  SUPER_ADMIN
  ADMIN
  OPERATOR
  VIEWER
}

enum NotificationType {
  DEPOSIT             // 입금 알림
  SEND_COMPLETE       // 송금 완료
  RECEIVE             // 수신 알림
  WITHDRAWAL_PENDING  // 출금 대기
  WITHDRAWAL_APPROVED // 출금 승인
  WITHDRAWAL_REJECTED // 출금 거부
  WITHDRAWAL_COMPLETE // 출금 완료
  WALLET_LOCKED       // 지갑 잠금
  WALLET_UNLOCKED     // 지갑 해제
  SYSTEM              // 시스템 공지
  PRICE_ALERT         // 가격 알림
}
```

### 9.3 Key API Endpoints

```yaml
# Auth
POST   /api/v1/auth/register           # 회원가입
POST   /api/v1/auth/login              # 로그인
POST   /api/v1/auth/refresh            # 토큰 갱신
POST   /api/v1/auth/verify-email       # 이메일 인증
POST   /api/v1/auth/forgot-password    # 비밀번호 찾기
POST   /api/v1/auth/reset-password     # 비밀번호 재설정
POST   /api/v1/auth/logout             # 로그아웃

# User
GET    /api/v1/users/me                # 내 프로필
PATCH  /api/v1/users/me                # 프로필 수정
PUT    /api/v1/users/me/password       # 비밀번호 변경

# Wallet
GET    /api/v1/wallet                  # 내 지갑 정보 (주소, 잔액, 잠금 상태)
GET    /api/v1/wallet/balance          # 잔액 조회 (TRX + TRC-20)
GET    /api/v1/wallet/resources        # Bandwidth/Energy 리소스 현황
GET    /api/v1/wallet/tokens           # 보유 토큰 목록

# Transaction
POST   /api/v1/transactions/send       # 송금 (내부/외부 자동 판별)
GET    /api/v1/transactions            # 거래 내역 (필터, 페이지네이션)
GET    /api/v1/transactions/:id        # 거래 상세

# Withdrawal
POST   /api/v1/withdrawals             # 외부 출금 요청
GET    /api/v1/withdrawals             # 내 출금 요청 목록
GET    /api/v1/withdrawals/:id         # 출금 상세 (상태 추적)
DELETE /api/v1/withdrawals/:id         # 출금 요청 취소 (PENDING 상태만)

# Token
GET    /api/v1/tokens                  # 지원 토큰 목록
GET    /api/v1/tokens/:address         # 토큰 상세

# Price
GET    /api/v1/prices                  # 현재 가격 (TRX + TRC-20)
GET    /api/v1/prices/:symbol/history  # 가격 히스토리
WS     /ws/prices                      # 실시간 가격 스트림

# Notification
GET    /api/v1/notifications           # 알림 목록
PATCH  /api/v1/notifications/:id/read  # 읽음 처리
POST   /api/v1/notifications/push-token # FCM 토큰 등록

# ─── Admin Endpoints (requires admin JWT) ─────────

# Admin Auth
POST   /api/v1/admin/auth/login        # 관리자 로그인
POST   /api/v1/admin/auth/2fa/verify   # 2FA 인증

# Admin Dashboard
GET    /api/v1/admin/dashboard         # 대시보드 메트릭

# Admin Users
GET    /api/v1/admin/users             # 사용자 목록
GET    /api/v1/admin/users/:id         # 사용자 상세
PATCH  /api/v1/admin/users/:id/suspend # 사용자 정지/해제

# Admin Wallets
GET    /api/v1/admin/wallets           # 지갑 목록
GET    /api/v1/admin/wallets/:id       # 지갑 상세
POST   /api/v1/admin/wallets/:id/lock  # 지갑 잠금
POST   /api/v1/admin/wallets/:id/unlock # 지갑 해제

# Admin Withdrawals (★ 핵심)
GET    /api/v1/admin/withdrawals               # 출금 요청 목록
GET    /api/v1/admin/withdrawals/:id           # 출금 상세
POST   /api/v1/admin/withdrawals/:id/approve   # 출금 승인
POST   /api/v1/admin/withdrawals/:id/reject    # 출금 거부
POST   /api/v1/admin/withdrawals/bulk-approve  # 일괄 승인

# Admin Transactions
GET    /api/v1/admin/transactions      # 전체 거래 목록
GET    /api/v1/admin/transactions/:id  # 거래 상세

# Admin Tokens
GET    /api/v1/admin/tokens            # 토큰 관리
POST   /api/v1/admin/tokens            # 토큰 추가
PATCH  /api/v1/admin/tokens/:id        # 토큰 수정

# Admin System
GET    /api/v1/admin/system/health     # 시스템 헬스
GET    /api/v1/admin/audit-logs        # 감사 로그
GET    /api/v1/admin/analytics         # 분석 데이터
```

---

## 10. Security Architecture

### 10.1 Centralized Wallet Security Model

```
┌─────────────────────────────────────────────┐
│            Security Layers                   │
│                                              │
│  Layer 1: Master Key Protection              │
│  ├── Master Seed: AES-256-GCM 암호화 저장   │
│  ├── HSM 또는 KMS 연동 (프로덕션)           │
│  ├── 키 접근 로깅 (모든 접근 기록)           │
│  └── 키 로테이션 정책                        │
│                                              │
│  Layer 2: User Key Management                │
│  ├── 개별 Private Key: AES-256-GCM 암호화   │
│  ├── 암호화 키: 환경변수 기반 KDF            │
│  ├── DB에는 암호화된 키만 저장               │
│  └── 키 사용 후 메모리 즉시 제거             │
│                                              │
│  Layer 3: Transaction Security               │
│  ├── 서버 사이드 트랜잭션 서명               │
│  ├── 송금 금액 한도 검사                     │
│  ├── 외부 출금: 관리자 승인 필수             │
│  ├── 최초 외부 출금: 24시간 대기             │
│  └── 의심 거래 자동 플래깅                   │
│                                              │
│  Layer 4: Account Security                   │
│  ├── JWT + Refresh Token 인증                │
│  ├── 이메일 인증 (회원가입)                  │
│  ├── 비밀번호 해싱 (bcrypt, 12 rounds)       │
│  ├── Rate Limiting (로그인, 송금)            │
│  ├── IP 기반 이상 접근 탐지                  │
│  └── 2FA (관리자 필수, 사용자 선택)          │
│                                              │
│  Layer 5: Network Security                   │
│  ├── TLS 1.3 for all API calls              │
│  ├── CORS 정책 (허용된 도메인만)             │
│  ├── API Rate Limiting                       │
│  ├── DDoS Protection (CloudFlare)            │
│  └── CSP Headers (XSS 방지)                  │
│                                              │
│  Layer 6: Admin Security                     │
│  ├── RBAC (역할 기반 접근 제어)              │
│  ├── 2FA 필수 (TOTP)                        │
│  ├── 감사 로그 (모든 관리자 행위)            │
│  ├── IP 화이트리스트 (선택)                  │
│  └── 관리자 세션 타임아웃                    │
│                                              │
└─────────────────────────────────────────────┘
```

### 10.2 Key Storage Strategy

| Component       | Storage Method                    | Encryption          |
| --------------- | --------------------------------- | ------------------- |
| Master Seed     | 환경변수 + KMS                     | AES-256-GCM         |
| User Private Key | MySQL (encrypted)                 | AES-256-GCM + KDF   |
| JWT Secret      | 환경변수                           | -                   |
| API Keys        | 환경변수                           | -                   |
| User Passwords  | MySQL (hashed)                    | bcrypt (12 rounds)  |
| Admin TOTP      | MySQL (encrypted)                 | AES-256-GCM         |

### 10.3 Withdrawal Security Flow

```
1. 사용자가 외부 출금 요청
2. 서버: 지갑 잠금 상태 확인
3. 서버: 출금 한도 확인 (일일/건당)
4. 서버: 주소 블랙리스트 확인
5. 서버: 이상 거래 패턴 분석
6. 최초 출금: 24시간 타이머 시작
7. 관리자 알림 발송
8. 관리자 2FA 인증 후 승인/거부
9. 승인 시: 트랜잭션 생성 및 서명
10. 브로드캐스트 및 상태 추적
11. 모든 단계 감사 로그 기록
```

---

## 11. TRON Blockchain Integration

### 11.1 TronWeb Configuration

```typescript
// apps/api/src/modules/wallet/tron/tron.service.ts
import TronWeb from 'tronweb';

class TronService {
  private tronWeb: TronWeb;

  constructor() {
    this.tronWeb = new TronWeb({
      fullHost: process.env.TRON_FULL_HOST,       // https://api.trongrid.io
      headers: { 'TRON-PRO-API-KEY': process.env.TRON_API_KEY },
    });
  }

  // 주소 생성 (HD Wallet에서 파생)
  async createAddress(index: number): Promise<{ address: string; privateKey: string }> {
    // m/44'/195'/0'/0/{index}
    const account = this.tronWeb.utils.accounts.generateAccount();
    return {
      address: account.address.base58,
      privateKey: account.privateKey,
    };
  }

  // TRX 잔액 조회
  async getTrxBalance(address: string): Promise<bigint> {
    const balance = await this.tronWeb.trx.getBalance(address);
    return BigInt(balance);  // in SUN (1 TRX = 1,000,000 SUN)
  }

  // TRC-20 토큰 잔액 조회
  async getTokenBalance(address: string, contractAddress: string): Promise<bigint> {
    const contract = await this.tronWeb.contract().at(contractAddress);
    const balance = await contract.methods.balanceOf(address).call();
    return BigInt(balance.toString());
  }

  // TRX 전송
  async sendTrx(from: string, to: string, amount: bigint, privateKey: string): Promise<string> {
    const tx = await this.tronWeb.transactionBuilder.sendTrx(
      to,
      Number(amount),
      from,
    );
    const signedTx = await this.tronWeb.trx.sign(tx, privateKey);
    const result = await this.tronWeb.trx.sendRawTransaction(signedTx);
    return result.txid;
  }

  // TRC-20 토큰 전송
  async sendToken(
    from: string, to: string, amount: bigint,
    contractAddress: string, privateKey: string,
  ): Promise<string> {
    const parameter = [
      { type: 'address', value: to },
      { type: 'uint256', value: amount.toString() },
    ];
    const tx = await this.tronWeb.transactionBuilder.triggerSmartContract(
      contractAddress,
      'transfer(address,uint256)',
      { feeLimit: 100_000_000 },
      parameter,
      from,
    );
    const signedTx = await this.tronWeb.trx.sign(tx.transaction, privateKey);
    const result = await this.tronWeb.trx.sendRawTransaction(signedTx);
    return result.txid;
  }

  // 리소스 조회 (Bandwidth, Energy)
  async getResources(address: string) {
    return this.tronWeb.trx.getAccountResources(address);
  }

  // 트랜잭션 조회
  async getTransaction(txHash: string) {
    return this.tronWeb.trx.getTransaction(txHash);
  }

  // 트랜잭션 확인 상태
  async getTransactionInfo(txHash: string) {
    return this.tronWeb.trx.getTransactionInfo(txHash);
  }
}
```

### 11.2 Block Monitoring (Deposit Detection)

```typescript
// apps/api/src/modules/wallet/tron/tron-monitor.service.ts
class TronMonitorService {
  private lastProcessedBlock: number;

  // 주기적으로 새 블록 확인 (cron: 매 3초)
  @Cron('*/3 * * * * *')
  async monitorBlocks() {
    const latestBlock = await this.tronWeb.trx.getCurrentBlock();
    const blockNumber = latestBlock.block_header.raw_data.number;

    for (let i = this.lastProcessedBlock + 1; i <= blockNumber; i++) {
      const block = await this.tronWeb.trx.getBlock(i);
      await this.processBlock(block);
    }
    this.lastProcessedBlock = blockNumber;
  }

  private async processBlock(block: any) {
    for (const tx of block.transactions || []) {
      // 우리 주소로의 입금 확인
      const toAddress = this.extractToAddress(tx);
      const wallet = await this.walletService.findByAddress(toAddress);
      if (wallet) {
        await this.processDeposit(wallet, tx);
      }
    }
  }

  private async processDeposit(wallet: Wallet, tx: any) {
    // 중복 처리 방지 (idempotency)
    const exists = await this.transactionService.findByTxHash(tx.txID);
    if (exists) return;

    await this.transactionService.create({
      txHash: tx.txID,
      type: 'DEPOSIT',
      toUserId: wallet.userId,
      toAddress: wallet.address,
      fromAddress: this.extractFromAddress(tx),
      amount: this.extractAmount(tx).toString(),
      status: 'CONFIRMED',
    });

    // 사용자에게 입금 알림
    await this.notificationService.notify(wallet.userId, 'DEPOSIT', {
      amount: this.extractAmount(tx),
      txHash: tx.txID,
    });
  }
}
```

### 11.3 TRON Resource Management

```
TRON 리소스 관리 전략:

1. Bandwidth (대역폭)
   ├── 일반 TRX 전송: ~270 Bandwidth 소비
   ├── 무료 할당: 일 600 Bandwidth (활성화된 계정)
   └── 부족 시: TRX로 수수료 지불

2. Energy (에너지)
   ├── TRC-20 전송: ~15,000-65,000 Energy 소비
   ├── 무료 할당: 없음
   ├── 확보 방법: TRX 스테이킹 (Stake 2.0)
   └── 부족 시: TRX로 수수료 지불 (높은 비용)

3. 관리 전략
   ├── 마스터 주소: 충분한 TRX 스테이킹으로 Energy 확보
   ├── 사용자 주소: 마스터에서 Energy 위임 (delegateResource)
   └── 비용 최적화: 사용량 모니터링 후 동적 위임
```

---

## 12. Development Phases & Roadmap

### Phase 1: Foundation (Week 1-4)

```
Week 1-2: Project Setup
  ├── Monorepo scaffolding (Turborepo + pnpm)
  ├── Shared packages: @joju/types, @joju/utils
  ├── CI/CD pipeline (GitHub Actions)
  ├── ESLint, Prettier, Husky configuration
  ├── Development environment (Docker Compose: MySQL, Redis)
  └── TRON Testnet (Shasta) 개발 환경 구성

Week 3-4: Backend Core (NestJS)
  ├── Prisma schema & MySQL setup
  ├── Auth module (JWT + Refresh Token + Email Verification)
  ├── Wallet module (TRON 주소 생성, 잔액 조회)
  ├── TronWeb integration (주소 생성, 트랜잭션)
  ├── Master Wallet setup
  ├── Transaction module (내부 송금)
  └── Redis caching layer (가격, 잔액)
```

### Phase 2: Core Features (Week 5-8)

```
Week 5-6: Withdrawal & Admin Core
  ├── Withdrawal approval workflow
  ├── 24시간 룰 구현 (BullMQ scheduled job)
  ├── Wallet lock/unlock module
  ├── Admin auth (JWT + 2FA TOTP)
  ├── Admin RBAC system
  ├── Audit logging
  └── Block monitoring (입금 감지)

Week 7-8: Price & Notification
  ├── Price service (CoinGecko/CoinMarketCap)
  ├── WebSocket price streaming
  ├── FCM push notification integration
  ├── In-app notification system
  ├── Token registry module (TRC-20)
  └── Swagger API documentation
```

### Phase 3: Website (Week 9-12)

```
Week 9-10: Website Foundation
  ├── Next.js 15 setup (App Router)
  ├── Landing page (Hero, Features, Security, Download)
  ├── Auth pages (Login, Register, Email Verification)
  ├── Responsive layout (Desktop + Mobile Web)
  ├── Design system tokens (Tailwind CSS 4)
  └── Auth state management (Zustand + JWT)

Week 11-12: Web Wallet
  ├── Dashboard (잔액, 토큰, 최근 거래)
  ├── Send/Receive (QR, 주소 검색, 내부/외부)
  ├── Transaction history (필터, 검색, TRONScan 링크)
  ├── Withdrawal status tracking
  ├── Token management
  └── Settings (프로필, 보안)
```

### Phase 4: Flutter Mobile App (Week 13-18)

```
Week 13-15: Flutter Foundation
  ├── Project scaffolding (Clean Architecture)
  ├── Riverpod state management
  ├── Dio API client with JWT interceptor
  ├── Secure storage integration
  ├── Biometric authentication (local_auth)
  ├── Navigation (GoRouter, 4 tabs)
  └── Push notifications (FCM)

Week 16-18: Core Mobile Features
  ├── Dashboard & balance display
  ├── Send/Receive with QR scanner
  ├── Transaction history
  ├── Withdrawal status tracking
  ├── Lock status indicator
  ├── Deep linking (jojuwallet://)
  └── App Store / Play Store preparation
```

### Phase 5: Admin Dashboard (Week 19-22)

```
Week 19-20: Admin Foundation
  ├── Admin auth (Login + 2FA)
  ├── Dashboard overview (metrics, charts)
  ├── User management (list, detail, suspend)
  ├── Wallet management (list, lock/unlock)
  └── Layout (Sidebar, Header, Breadcrumbs)

Week 21-22: Admin Core Features
  ├── Withdrawal approval queue (★ 핵심)
  ├── Transaction monitoring
  ├── Analytics dashboards
  ├── Token management
  ├── System health monitoring
  ├── Audit log viewer
  └── RBAC & role management
```

### Phase 6: Polish & Launch (Week 23-26)

```
Week 23-24: Integration & Testing
  ├── Cross-platform integration testing
  ├── Security review
  ├── Performance optimization
  ├── Load testing (출금 처리, 동시 접속)
  └── Bug fixes

Week 25-26: Launch Preparation
  ├── TRON Mainnet 전환
  ├── Production deployment
  ├── App Store / Play Store 제출
  ├── Documentation finalization
  └── Monitoring & alerting 설정
```

---

## 13. Infrastructure & DevOps

### 13.1 Development Environment

```yaml
# docker-compose.dev.yml
services:
  mysql:
    image: mysql:8.0
    ports: ["3306:3306"]
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: jojuwallet
    volumes: ["mysql_data:/var/lib/mysql"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  api:
    build: ./apps/api
    ports: ["4000:4000"]
    depends_on: [mysql, redis]
    volumes: ["./apps/api/src:/app/src"]
    environment:
      DATABASE_URL: mysql://root:root@mysql:3306/jojuwallet
      REDIS_URL: redis://redis:6379
      TRON_FULL_HOST: https://api.shasta.trongrid.io  # Testnet
```

### 13.2 Production Infrastructure

```
┌──────────────────────────────────────────────┐
│              CloudFlare CDN                    │
│  (Website, Admin, API Gateway)               │
├──────────────────────────────────────────────┤
│                                                │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │ API      │  │ API      │  │ WebSocket  │ │
│  │ Server 1 │  │ Server 2 │  │ Server     │ │
│  └────┬─────┘  └────┬─────┘  └─────┬──────┘ │
│       └──────┬───────┘              │         │
│              │                      │         │
│  ┌───────────┴──────────┐  ┌───────┴───────┐│
│  │ MySQL Primary        │  │ Redis Cluster  ││
│  │  └── MySQL Replica   │  │               ││
│  └──────────────────────┘  └───────────────┘│
│                                              │
│  ┌──────────────────────┐  ┌──────────────┐ │
│  │ BullMQ Workers       │  │ Prometheus   │ │
│  │ (출금 처리, 블록 모니터)│  │ + Grafana    │ │
│  └──────────────────────┘  └──────────────┘ │
│                                              │
│  ┌──────────────────────┐                    │
│  │ TRON Node / TronGrid │                    │
│  │ (API access)         │                    │
│  └──────────────────────┘                    │
└──────────────────────────────────────────────┘
```

### 13.3 CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
Triggers: push to main, pull requests

Jobs:
  lint: ESLint + Prettier check
  typecheck: TypeScript compilation
  test:unit: Vitest unit tests (all packages)
  test:e2e: Playwright E2E tests (web)
  build: Turborepo build (all apps)
  security: npm audit + Snyk scan

# Release Pipelines
mobile-release: Flutter build → App Store Connect / Google Play Console
web-deploy: Next.js build → Vercel / CloudFlare Pages
admin-deploy: Next.js build → Vercel
api-deploy: Docker build → Container Registry → K8s rolling update
```

---

## 14. Testing Strategy

### 14.1 Test Pyramid

```
            ┌──────────┐
            │   E2E    │  Playwright (Web)
            │  Tests   │  Integration Tests (Flutter)
           ┌┴──────────┴┐
           │ Integration │  API integration tests
           │   Tests     │  TRON testnet tests
          ┌┴────────────┴┐
          │   Unit Tests  │  Business logic, utilities
          │               │  Approval workflow, lock logic
         ┌┴──────────────┴┐
         │  Static Analysis │  TypeScript, ESLint
         │                  │  Security scanning
         └──────────────────┘
```

### 14.2 Test Coverage Targets

| Package     | Target | Focus Areas                              |
| ----------- | ------ | ---------------------------------------- |
| @joju/utils | 95%+   | Address validation, unit conversion       |
| apps/api    | 90%+   | Withdrawal workflow, lock logic, auth     |
| apps/web    | 80%+   | Component rendering, user flows           |
| apps/admin  | 80%+   | Approval workflow UI, permission checks   |
| apps/mobile | 80%+   | Screen rendering, state management        |

### 14.3 Critical Test Scenarios

| Scenario                          | Priority | Description                              |
| --------------------------------- | -------- | ---------------------------------------- |
| 내부 송금 성공                     | P0       | 잔액 확인, 트랜잭션 생성, 양측 알림       |
| 잠긴 지갑 송금 차단               | P0       | 잠금 상태에서 모든 트랜잭션 거부           |
| 외부 출금 24시간 룰               | P0       | 최초 출금 시 24시간 대기 상태 확인         |
| 관리자 승인/거부 플로우           | P0       | 승인→처리→완료, 거부→사유→알림            |
| 잔액 부족 시 송금 거부            | P0       | 정확한 잔액 비교, 에러 메시지              |
| 동시 출금 요청 처리               | P1       | Race condition 방지, 중복 출금 차단        |
| 블록 모니터링 입금 감지           | P1       | 정확한 입금 금액, 중복 처리 방지           |
| 관리자 2FA 인증                   | P1       | TOTP 검증, 만료 처리                      |
| Rate Limiting 동작                | P2       | 로그인, 송금, API 호출 제한               |
| Redis 다운 시 graceful degradation | P2       | 캐시 없이 직접 조회로 폴백                |

### 14.4 Security Testing

| Test Type        | Tool             | Frequency    |
| ---------------- | ---------------- | ------------ |
| Dependency Audit | npm audit + Snyk | Every CI run |
| SAST             | SonarQube        | Weekly       |
| API Fuzzing      | OWASP ZAP        | Monthly      |
| Penetration Test | External firm    | Pre-launch   |

---

## Appendix A: Environment Variables

```bash
# .env.example

# Database
DATABASE_URL="mysql://user:pass@localhost:3306/jojuwallet"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"

# TRON
TRON_FULL_HOST="https://api.trongrid.io"
TRON_API_KEY="your-trongrid-api-key"
TRON_MASTER_ENCRYPTED_SEED="encrypted-master-seed"
TRON_ENCRYPTION_KEY="your-encryption-key"

# Price API
COINGECKO_API_KEY="your-key"

# Push Notifications
FIREBASE_PROJECT_ID="your-project"
FIREBASE_PRIVATE_KEY="your-key"

# Admin
ADMIN_2FA_ISSUER="JOJUWallet Admin"

# Email (for verification)
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="noreply@jojuwallet.com"
SMTP_PASS="your-smtp-pass"

# App
APP_URL="https://jojuwallet.com"
ADMIN_URL="https://admin.jojuwallet.com"
API_URL="https://api.jojuwallet.com"
```

## Appendix B: TRONScan Integration

```
모든 트랜잭션은 TRONScan에서 확인 가능:

Mainnet:  https://tronscan.org/#/transaction/{txHash}
Testnet:  https://shasta.tronscan.org/#/transaction/{txHash}

주소 조회: https://tronscan.org/#/address/{address}
토큰 조회: https://tronscan.org/#/token20/{contractAddress}
```

---

> **Document maintained by:** JOJUWallet Development Team
> **Next Review:** Phase 1 completion milestone
