import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";

/* ===========================================================================
 * =  AICC ROI Simulator                                                      =
 * =  Linear-style premium B2B dark theme                                     =
 * =                                                                          =
 * =  실제 폴더 구조로 매핑:                                                   =
 * =    src/                                                                  =
 * =      types/index.ts              → [TYPES] 섹션                          =
 * =      data/mock/companies.ts      → [DATA: COMPANIES] 섹션                =
 * =      lib/presets/industryPresets.ts → [DATA: PRESETS] 섹션              =
 * =      lib/presets/scenarios.ts    → [DATA: SCENARIOS] 섹션                =
 * =      lib/format/currency.ts      → [LIB: FORMAT] 섹션                    =
 * =      lib/calculations/roi.ts     → [LIB: CALCULATIONS] 섹션              =
 * =      lib/services/companyLookup.ts → [SERVICES: COMPANY LOOKUP] 섹션    =
 * =      components/forms/*          → [COMPONENTS: FORMS] 섹션              =
 * =      components/charts/*         → [COMPONENTS: CHARTS] 섹션             =
 * =      components/ui/*             → [COMPONENTS: UI PRIMITIVES] 섹션      =
 * =      features/roi/RoiPage.tsx    → [FEATURE: ROI PAGE] 섹션              =
 * =      App.tsx                     → export default 컴포넌트               =
 * ========================================================================= */

/* ========================================================================= */
/*  [TYPES]                                                                   */
/* ========================================================================= */

// type Industry
const INDUSTRIES = ["금융", "보험", "유통/이커머스", "통신", "제조/서비스", "공공"];

// type ScenarioType = 'conservative' | 'base' | 'aggressive'
const SCENARIOS = ["conservative", "base", "aggressive"];

const SCENARIO_LABEL = {
  conservative: "보수적",
  base: "기준",
  aggressive: "공격적",
};

/* ========================================================================= */
/*  [DATA: COMPANIES]                                                         */
/*  - 실제 외부 API(오픈다트, Crunchbase, 내부 마스터) 대체 가능하도록         */
/*    순수 데이터 + 서비스 레이어로 분리.                                     */
/*  - 실제 수치가 아닌 시뮬레이션용 mock 추정치임을 source 필드로 명시.       */
/* ========================================================================= */

const MOCK_COMPANIES = [
  {
    id: "ssg",
    name: "SSG닷컴",
    aliases: ["ssg", "ssg.com", "쓱닷컴"],
    industry: "유통/이커머스",
    annualRevenue: 1_600_000_000_000,
    annualOperatingProfit: -50_000_000_000,
    source: "Mock 추정치",
    updatedAt: "2024-03",
  },
  {
    id: "solity",
    name: "솔리티",
    aliases: ["solity"],
    industry: "제조/서비스",
    annualRevenue: 30_000_000_000,
    annualOperatingProfit: 2_000_000_000,
    source: "Mock 추정치",
    updatedAt: "2024-01",
  },
  {
    id: "petdoc",
    name: "펫닥",
    aliases: ["petdoc", "pet-doc"],
    industry: "유통/이커머스",
    annualRevenue: 15_000_000_000,
    annualOperatingProfit: -1_000_000_000,
    source: "Mock 추정치",
    updatedAt: "2024-01",
  },
  {
    id: "jbbank",
    name: "전북은행",
    aliases: ["jb", "jbbank", "jeonbuk bank"],
    industry: "금융",
    annualRevenue: 1_500_000_000_000,
    annualOperatingProfit: 200_000_000_000,
    source: "Mock 추정치",
    updatedAt: "2023-12",
  },
  {
    id: "aig",
    name: "AIG손해보험",
    aliases: ["aig", "aig korea"],
    industry: "보험",
    annualRevenue: 500_000_000_000,
    annualOperatingProfit: 50_000_000_000,
    source: "Mock 추정치",
    updatedAt: "2023-12",
  },
  {
    id: "kakaobank",
    name: "카카오뱅크",
    aliases: ["kakao bank", "kakaobank"],
    industry: "금융",
    annualRevenue: 1_900_000_000_000,
    annualOperatingProfit: 340_000_000_000,
    source: "Mock 추정치",
    updatedAt: "2023-12",
  },
  {
    id: "skt",
    name: "SK텔레콤",
    aliases: ["skt", "sk telecom"],
    industry: "통신",
    annualRevenue: 17_000_000_000_000,
    annualOperatingProfit: 1_700_000_000_000,
    source: "Mock 추정치",
    updatedAt: "2023-12",
  },
  {
    id: "coupang",
    name: "쿠팡",
    aliases: ["coupang"],
    industry: "유통/이커머스",
    annualRevenue: 31_000_000_000_000,
    annualOperatingProfit: 600_000_000_000,
    source: "Mock 추정치",
    updatedAt: "2023-12",
  },
  {
    id: "samsung_life",
    name: "삼성생명",
    aliases: ["samsung life", "삼성생명"],
    industry: "보험",
    annualRevenue: 36_000_000_000_000,
    annualOperatingProfit: 2_100_000_000_000,
    source: "Mock 추정치",
    updatedAt: "2023-12",
  },
  {
    id: "kt",
    name: "KT",
    aliases: ["kt", "korea telecom"],
    industry: "통신",
    annualRevenue: 26_000_000_000_000,
    annualOperatingProfit: 1_700_000_000_000,
    source: "Mock 추정치",
    updatedAt: "2023-12",
  },
];

/* ========================================================================= */
/*  [DATA: PRESETS] — 업종별 기본 운영/가정치                                 */
/* ========================================================================= */

const INDUSTRY_PRESETS = {
  금융: {
    monthlyInboundVolume: 300_000,
    monthlyOutboundVolume: 50_000,
    agentCount: 300,
    averageAHTMinutes: 4.5,
    averageACWMinutes: 2.5,
    averageAgentAnnualCost: 42_000_000,
    operationHoursPerDay: 9,
    currentAutomationRate: 0.2,
    expectedSelfServiceRate: 0.25,
    expectedSttSummaryReductionRate: 0.35,
    expectedKmsProductivityRate: 0.1,
    expectedQaAutomationRate: 0.5,
    expectedForecastOptimizationRate: 0.06,
    expectedRepeatContactReductionRate: 0.1,
    initialImplementationCost: 800_000_000,
    annualMaintenanceCost: 200_000_000,
    riskAdjustmentFactor: 0.85,
  },
  보험: {
    monthlyInboundVolume: 200_000,
    monthlyOutboundVolume: 80_000,
    agentCount: 250,
    averageAHTMinutes: 6,
    averageACWMinutes: 3,
    averageAgentAnnualCost: 40_000_000,
    operationHoursPerDay: 10,
    currentAutomationRate: 0.15,
    expectedSelfServiceRate: 0.22,
    expectedSttSummaryReductionRate: 0.4,
    expectedKmsProductivityRate: 0.12,
    expectedQaAutomationRate: 0.55,
    expectedForecastOptimizationRate: 0.07,
    expectedRepeatContactReductionRate: 0.12,
    initialImplementationCost: 700_000_000,
    annualMaintenanceCost: 180_000_000,
    riskAdjustmentFactor: 0.85,
  },
  "유통/이커머스": {
    monthlyInboundVolume: 450_000,
    monthlyOutboundVolume: 30_000,
    agentCount: 200,
    averageAHTMinutes: 3.5,
    averageACWMinutes: 1.8,
    averageAgentAnnualCost: 36_000_000,
    operationHoursPerDay: 11,
    currentAutomationRate: 0.25,
    expectedSelfServiceRate: 0.35,
    expectedSttSummaryReductionRate: 0.3,
    expectedKmsProductivityRate: 0.09,
    expectedQaAutomationRate: 0.45,
    expectedForecastOptimizationRate: 0.08,
    expectedRepeatContactReductionRate: 0.15,
    initialImplementationCost: 600_000_000,
    annualMaintenanceCost: 150_000_000,
    riskAdjustmentFactor: 0.85,
  },
  통신: {
    monthlyInboundVolume: 600_000,
    monthlyOutboundVolume: 120_000,
    agentCount: 400,
    averageAHTMinutes: 4,
    averageACWMinutes: 2,
    averageAgentAnnualCost: 40_000_000,
    operationHoursPerDay: 12,
    currentAutomationRate: 0.3,
    expectedSelfServiceRate: 0.28,
    expectedSttSummaryReductionRate: 0.35,
    expectedKmsProductivityRate: 0.11,
    expectedQaAutomationRate: 0.55,
    expectedForecastOptimizationRate: 0.09,
    expectedRepeatContactReductionRate: 0.12,
    initialImplementationCost: 1_000_000_000,
    annualMaintenanceCost: 250_000_000,
    riskAdjustmentFactor: 0.85,
  },
  "제조/서비스": {
    monthlyInboundVolume: 80_000,
    monthlyOutboundVolume: 20_000,
    agentCount: 80,
    averageAHTMinutes: 5,
    averageACWMinutes: 2.5,
    averageAgentAnnualCost: 38_000_000,
    operationHoursPerDay: 9,
    currentAutomationRate: 0.1,
    expectedSelfServiceRate: 0.2,
    expectedSttSummaryReductionRate: 0.3,
    expectedKmsProductivityRate: 0.1,
    expectedQaAutomationRate: 0.4,
    expectedForecastOptimizationRate: 0.06,
    expectedRepeatContactReductionRate: 0.08,
    initialImplementationCost: 400_000_000,
    annualMaintenanceCost: 120_000_000,
    riskAdjustmentFactor: 0.85,
  },
  공공: {
    monthlyInboundVolume: 150_000,
    monthlyOutboundVolume: 10_000,
    agentCount: 120,
    averageAHTMinutes: 5.5,
    averageACWMinutes: 3,
    averageAgentAnnualCost: 34_000_000,
    operationHoursPerDay: 9,
    currentAutomationRate: 0.12,
    expectedSelfServiceRate: 0.2,
    expectedSttSummaryReductionRate: 0.3,
    expectedKmsProductivityRate: 0.09,
    expectedQaAutomationRate: 0.4,
    expectedForecastOptimizationRate: 0.05,
    expectedRepeatContactReductionRate: 0.08,
    initialImplementationCost: 500_000_000,
    annualMaintenanceCost: 150_000_000,
    riskAdjustmentFactor: 0.8,
  },
};

/* ========================================================================= */
/*  [DATA: SCENARIOS] — 시나리오별 배수                                       */
/*  base 대비 conservative는 70%, aggressive는 130% 적용                     */
/*  (단, 0~95% 범위로 클램프)                                                */
/* ========================================================================= */

const SCENARIO_MULTIPLIERS = {
  conservative: 0.7,
  base: 1.0,
  aggressive: 1.3,
};

const SCENARIO_DESCRIPTION = {
  conservative: "가정치의 70% 수준만 실현된다고 가정한 보수적 전망.",
  base: "제안 기준 가정치가 그대로 실현되는 표준 시나리오.",
  aggressive: "가정치의 130% 수준까지 실현되는 공격적 전망.",
};

/* ========================================================================= */
/*  [LIB: FORMAT] — 한국 실무 기준 원화/숫자 포맷                             */
/* ========================================================================= */

// 숫자 → 한국식 자동 단위 ("억원", "만원", "원")
function formatKRWAuto(value, opts = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 100_000_000) {
    const v = value / 100_000_000;
    return `${v.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억원`;
  }
  if (abs >= 10_000) {
    const v = value / 10_000;
    return `${v.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}만원`;
  }
  return `${sign}${abs.toLocaleString("ko-KR")}원`;
}

// 고정 단위 포맷
function formatKRWAs(value, unit = "auto") {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  if (unit === "auto") return formatKRWAuto(value);
  if (unit === "won") return `${Math.round(value).toLocaleString("ko-KR")}원`;
  if (unit === "manwon") {
    return `${(value / 10_000).toLocaleString("ko-KR", { maximumFractionDigits: 0 })}만원`;
  }
  if (unit === "eokwon") {
    return `${(value / 100_000_000).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억원`;
  }
  return formatKRWAuto(value);
}

// 큰 숫자 축약 (차트 축용)
function formatKRWCompact(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const abs = Math.abs(value);
  if (abs >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억`;
  if (abs >= 10_000) return `${(value / 10_000).toFixed(0)}만`;
  return `${value.toLocaleString("ko-KR")}`;
}

function formatPercent(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${(value * 100).toFixed(digits)}%`;
}

function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toLocaleString("ko-KR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/* ========================================================================= */
/*  [SERVICES: COMPANY LOOKUP]                                                */
/*  - 현재는 MOCK_COMPANIES 기반. 동일한 인터페이스로 추후 외부 API/Excel    */
/*    업로드/사내 마스터 데이터로 교체 가능.                                  */
/* ========================================================================= */

// interface CompanyLookupService {
//   search(query: string): Promise<CompanyProfile[]>;
//   getById(id: string): Promise<CompanyProfile | null>;
// }
const createMockCompanyLookup = (companies) => ({
  name: "mock",
  search: async (query) => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return [];
    return companies
      .filter((c) => {
        if (c.name.toLowerCase().includes(q)) return true;
        return (c.aliases || []).some((a) => a.toLowerCase().includes(q));
      })
      .slice(0, 8);
  },
  getById: async (id) => companies.find((c) => c.id === id) || null,
});

const companyLookupService = createMockCompanyLookup(MOCK_COMPANIES);

/* ========================================================================= */
/*  [LIB: CALCULATIONS] — ROI 계산 엔진                                       */
/*                                                                            */
/*  설계 원칙                                                                 */
/*  1) 총 인건비 = agentCount * averageAgentAnnualCost                       */
/*  2) 각 AICC 모듈을 "인건비에 대한 절감 비율"로 환산                       */
/*  3) 모듈 간 중복 방지를 위해 순차 차감 모델 적용                          */
/*     → 챗봇이 인입량을 줄이면, 남은 인건비에 STT/KMS/Forecast가 작동       */
/*  4) 리스크 보정계수는 모든 모듈 절감액에 곱해 적용                        */
/*                                                                            */
/*  공식                                                                      */
/*    ROI(3Y) = (3년 절감 - 초기투자 - 3년 운영비) / (초기투자 + 3년 운영비) */
/*    Payback = 초기투자비 / 월 순편익                                       */
/* ========================================================================= */

const QA_SHARE_OF_LABOR = 0.05; // 업계 통상치: QA 관련 활동 ~5%
const REPEAT_SHARE_OF_CONTACTS = 0.3; // 재문의 비중 가정 30%

function applyScenarioMultiplier(input, scenario) {
  const m = SCENARIO_MULTIPLIERS[scenario];
  const clamp = (v) => Math.max(0, Math.min(0.95, v * m));
  return {
    ...input,
    expectedSelfServiceRate: clamp(input.expectedSelfServiceRate),
    expectedSttSummaryReductionRate: clamp(input.expectedSttSummaryReductionRate),
    expectedKmsProductivityRate: clamp(input.expectedKmsProductivityRate),
    expectedQaAutomationRate: clamp(input.expectedQaAutomationRate),
    expectedForecastOptimizationRate: clamp(input.expectedForecastOptimizationRate),
    expectedRepeatContactReductionRate: clamp(input.expectedRepeatContactReductionRate),
  };
}

function computeScenario(rawInput, scenario) {
  const input = applyScenarioMultiplier(rawInput, scenario);
  const risk = Math.max(0.3, Math.min(1, input.riskAdjustmentFactor));

  const laborCost = input.agentCount * input.averageAgentAnnualCost;
  const aht = Math.max(0.1, input.averageAHTMinutes);
  const acw = Math.max(0, input.averageACWMinutes);
  const total = aht + acw;
  const ahtShare = total > 0 ? aht / total : 0.7;
  const acwShare = total > 0 ? acw / total : 0.3;

  // ----- 모듈 1: 챗봇/보이스봇 — 인입량 자체를 줄임
  const incSelf = Math.max(0, input.expectedSelfServiceRate - input.currentAutomationRate);
  const chatbotSavings = laborCost * incSelf * risk;

  // 챗봇 이후 남은 인건비 (STT/KMS/Forecast의 기반)
  const remainingAfterChatbot = Math.max(0, laborCost - chatbotSavings);

  // ----- 모듈 2: STT/자동요약 — ACW 영역 절감
  const sttSavings =
    remainingAfterChatbot * acwShare * input.expectedSttSummaryReductionRate * risk;

  // ----- 모듈 3: AI KMS — AHT 영역 절감
  const kmsSavings =
    remainingAfterChatbot * ahtShare * input.expectedKmsProductivityRate * risk;

  // ----- 모듈 4: AI QA — 라벨 비중 ~5% 에 적용
  const qaSavings = laborCost * QA_SHARE_OF_LABOR * input.expectedQaAutomationRate * risk;

  const remainingAfterOps = Math.max(
    0,
    remainingAfterChatbot - sttSavings - kmsSavings
  );

  // ----- 모듈 5: Forecast — 남은 인건비에 직접 효율화
  const forecastSavings = remainingAfterOps * input.expectedForecastOptimizationRate * risk;

  // ----- 모듈 6: 재문의 감소 — 남은 인건비 * 재문의 비중 * 감소율
  const repeatSavings =
    remainingAfterOps *
    REPEAT_SHARE_OF_CONTACTS *
    input.expectedRepeatContactReductionRate *
    risk;

  const savingsByModule = {
    chatbotVoicebot: chatbotSavings,
    sttSummary: sttSavings,
    aiKms: kmsSavings,
    aiQa: qaSavings,
    forecast: forecastSavings,
    repeatContactReduction: repeatSavings,
  };

  const annualSavings = Object.values(savingsByModule).reduce((s, v) => s + v, 0);

  const currentAnnualCost = laborCost;
  const futureAnnualCost = Math.max(0, currentAnnualCost - annualSavings) + input.annualMaintenanceCost;

  // 연간 순편익 = 절감액 - 연간운영비 (초기투자는 3년 분할하지 않고 별도 처리)
  const annualNetBenefit = annualSavings - input.annualMaintenanceCost;

  // 3년 ROI
  const threeYearBenefit = annualSavings * 3;
  const threeYearCost = input.initialImplementationCost + input.annualMaintenanceCost * 3;
  const threeYearNet = threeYearBenefit - threeYearCost;
  const roiPercent = threeYearCost > 0 ? (threeYearNet / threeYearCost) * 100 : 0;

  // Payback (개월)
  const monthlyNet = annualNetBenefit / 12;
  const paybackMonths =
    monthlyNet > 0 ? input.initialImplementationCost / monthlyNet : Infinity;

  return {
    scenario,
    currentAnnualCost,
    futureAnnualCost,
    annualSavings,
    annualNetBenefit,
    roiPercent,
    paybackMonths,
    threeYearCumulativeNetBenefit: threeYearNet,
    savingsByModule,
    appliedInput: input, // 디버그/설명 용
  };
}

function computeAllScenarios(input) {
  return {
    conservative: computeScenario(input, "conservative"),
    base: computeScenario(input, "base"),
    aggressive: computeScenario(input, "aggressive"),
  };
}

// 솔루션별 기여도 정렬
function rankModuleContributions(result) {
  const rows = [
    { key: "chatbotVoicebot", label: "챗봇/보이스봇", value: result.savingsByModule.chatbotVoicebot },
    { key: "sttSummary", label: "STT·자동요약", value: result.savingsByModule.sttSummary },
    { key: "aiKms", label: "AI KMS", value: result.savingsByModule.aiKms },
    { key: "aiQa", label: "AI QA", value: result.savingsByModule.aiQa },
    { key: "forecast", label: "Forecast·인력최적화", value: result.savingsByModule.forecast },
    {
      key: "repeatContactReduction",
      label: "재문의 감소",
      value: result.savingsByModule.repeatContactReduction,
    },
  ];
  return rows.sort((a, b) => b.value - a.value);
}

/* ========================================================================= */
/*  [DEFAULTS]                                                                */
/* ========================================================================= */

const DEFAULT_COMPANY = MOCK_COMPANIES.find((c) => c.id === "jbbank");

const DEFAULT_INPUT = {
  companyName: DEFAULT_COMPANY.name,
  companyId: DEFAULT_COMPANY.id,
  industry: DEFAULT_COMPANY.industry,
  annualRevenue: DEFAULT_COMPANY.annualRevenue,
  annualOperatingProfit: DEFAULT_COMPANY.annualOperatingProfit,
  ...INDUSTRY_PRESETS[DEFAULT_COMPANY.industry],
};

/* ========================================================================= */
/*  [THEME] — 공통 색상/스타일 상수                                          */
/* ========================================================================= */

const THEME = {
  bg: "#0a0a0b",
  panel: "#101012",
  panelElev: "#141417",
  border: "#1f1f23",
  borderSoft: "rgba(255,255,255,0.06)",
  text: "#e6e6e8",
  textMuted: "#8a8a94",
  textDim: "#5a5a63",
  accent: "#7c86ff", // indigo/violet — Linear-ish
  accentSoft: "rgba(124,134,255,0.12)",
  positive: "#34d399",
  positiveSoft: "rgba(52,211,153,0.14)",
  negative: "#f87171",
  warn: "#fbbf24",
  chart: {
    before: "#6b7280",
    after: "#7c86ff",
    stroke: "rgba(255,255,255,0.08)",
    module: ["#7c86ff", "#34d399", "#22d3ee", "#fbbf24", "#f472b6", "#a78bfa"],
  },
};

/* ========================================================================= */
/*  [COMPONENTS: UI PRIMITIVES]                                               */
/* ========================================================================= */

function Card({ children, className = "", style = {}, hover = false }) {
  return (
    <div
      className={`rounded-xl border transition-colors ${hover ? "hover:border-white/10" : ""} ${className}`}
      style={{
        background: THEME.panel,
        borderColor: THEME.border,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children, right }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 rounded-sm" style={{ background: THEME.accent }} />
        <h3 className="text-sm font-semibold tracking-tight" style={{ color: THEME.text }}>
          {children}
        </h3>
      </div>
      {right}
    </div>
  );
}

function Label({ children, hint, badge }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <label className="text-xs" style={{ color: THEME.textMuted }}>
        {children}
        {hint && (
          <span className="ml-1.5 text-[10px]" style={{ color: THEME.textDim }}>
            {hint}
          </span>
        )}
      </label>
      {badge}
    </div>
  );
}

function Badge({ children, tone = "default" }) {
  const tones = {
    default: { bg: "rgba(255,255,255,0.05)", color: THEME.textMuted, border: THEME.border },
    accent: { bg: THEME.accentSoft, color: THEME.accent, border: "rgba(124,134,255,0.22)" },
    positive: {
      bg: THEME.positiveSoft,
      color: THEME.positive,
      border: "rgba(52,211,153,0.22)",
    },
    warn: {
      bg: "rgba(251,191,36,0.1)",
      color: THEME.warn,
      border: "rgba(251,191,36,0.2)",
    },
  };
  const t = tones[tone] || tones.default;
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-md border"
      style={{ background: t.bg, color: t.color, borderColor: t.border }}
    >
      {children}
    </span>
  );
}

function NumberInput({ value, onChange, suffix, step = 1, min = 0, max }) {
  return (
    <div
      className="flex items-center rounded-md border focus-within:border-white/20 transition-colors"
      style={{ borderColor: THEME.border, background: THEME.panelElev }}
    >
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const v = e.target.value === "" ? 0 : Number(e.target.value);
          onChange(v);
        }}
        step={step}
        min={min}
        max={max}
        className="w-full bg-transparent px-2.5 py-1.5 text-sm outline-none tabular-nums"
        style={{ color: THEME.text }}
      />
      {suffix && (
        <span className="pr-2.5 text-xs tabular-nums" style={{ color: THEME.textDim }}>
          {suffix}
        </span>
      )}
    </div>
  );
}

function SliderWithValue({ value, onChange, min = 0, max = 1, step = 0.01, formatter }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs tabular-nums" style={{ color: THEME.text }}>
          {formatter ? formatter(value) : value}
        </span>
        <span className="text-[10px] tabular-nums" style={{ color: THEME.textDim }}>
          {formatter ? formatter(min) : min} – {formatter ? formatter(max) : max}
        </span>
      </div>
      <div className="relative h-5 flex items-center">
        <div
          className="absolute inset-x-0 h-1 rounded-full"
          style={{ background: "rgba(255,255,255,0.06)" }}
        />
        <div
          className="absolute h-1 rounded-full"
          style={{ width: `${pct}%`, background: THEME.accent, left: 0 }}
        />
        <input
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute w-3 h-3 rounded-full shadow pointer-events-none"
          style={{
            left: `calc(${pct}% - 6px)`,
            background: "#fff",
            boxShadow: "0 0 0 3px rgba(124,134,255,0.25)",
          }}
        />
      </div>
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <div
      className="rounded-md border focus-within:border-white/20 transition-colors"
      style={{ borderColor: THEME.border, background: THEME.panelElev }}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent px-2.5 py-1.5 text-sm outline-none appearance-none cursor-pointer"
        style={{ color: THEME.text }}
      >
        {options.map((o) => (
          <option
            key={o.value}
            value={o.value}
            style={{ background: THEME.panelElev, color: THEME.text }}
          >
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ========================================================================= */
/*  [COMPONENTS: FORMS] — CompanyAutocomplete                                 */
/* ========================================================================= */

function CompanyAutocomplete({ value, onSelect, onChangeRaw, lookup }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => setQuery(value || ""), [value]);

  // outside click
  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!query || query.length < 1) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const r = await lookup.search(query);
        if (active) setResults(r);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [query, lookup]);

  return (
    <div ref={wrapRef} className="relative">
      <div
        className="flex items-center rounded-md border focus-within:border-white/20 transition-colors"
        style={{ borderColor: THEME.border, background: THEME.panelElev }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          className="ml-2.5"
          style={{ color: THEME.textDim }}
        >
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path d="M20 20L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          value={query}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            setOpen(true);
            onChangeRaw?.(v);
          }}
          onFocus={() => setOpen(true)}
          placeholder="회사명 검색 (예: SSG닷컴, 전북은행...)"
          className="w-full bg-transparent px-2 py-1.5 text-sm outline-none"
          style={{ color: THEME.text }}
        />
      </div>
      {open && (query.length >= 1) && (
        <div
          className="absolute z-30 mt-1 w-full rounded-md border shadow-xl overflow-hidden"
          style={{
            background: THEME.panelElev,
            borderColor: THEME.border,
            boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
          }}
        >
          {loading && (
            <div className="px-3 py-2 text-xs" style={{ color: THEME.textDim }}>
              검색 중...
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-xs" style={{ color: THEME.textDim }}>
              일치하는 회사가 없습니다. 수동 입력으로 진행하세요.
            </div>
          )}
          {!loading &&
            results.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onSelect(c);
                  setQuery(c.name);
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/5 transition-colors"
              >
                <div>
                  <div className="text-sm" style={{ color: THEME.text }}>
                    {c.name}
                  </div>
                  <div className="text-[10px]" style={{ color: THEME.textDim }}>
                    {c.industry} · {formatKRWAuto(c.annualRevenue)} 매출
                  </div>
                </div>
                <Badge tone="accent">자동 불러오기</Badge>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

/* ========================================================================= */
/*  [COMPONENTS: CHARTS]                                                      */
/* ========================================================================= */

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      className="rounded-lg border px-3 py-2 shadow-xl"
      style={{
        background: THEME.panelElev,
        borderColor: THEME.border,
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      }}
    >
      {label && (
        <div className="text-[11px] mb-1" style={{ color: THEME.textMuted }}>
          {label}
        </div>
      )}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs tabular-nums">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: p.color || p.fill }}
          />
          <span style={{ color: THEME.textMuted }}>{p.name}</span>
          <span style={{ color: THEME.text }}>{formatKRWAuto(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function CostComparisonChart({ current, future }) {
  const data = [
    { name: "도입 전", value: current, fill: THEME.chart.before },
    { name: "도입 후", value: future, fill: THEME.chart.after },
  ];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={THEME.chart.stroke} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: THEME.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fill: THEME.textMuted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatKRWCompact(v)}
          width={60}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={90}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function SavingsBreakdownDonut({ result }) {
  const rows = rankModuleContributions(result).filter((r) => r.value > 0);
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <div className="flex items-center gap-4">
      <div className="relative" style={{ width: 180, height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="value"
              nameKey="label"
              innerRadius={55}
              outerRadius={82}
              paddingAngle={2}
              stroke="none"
            >
              {rows.map((r, i) => (
                <Cell key={r.key} fill={THEME.chart.module[i % THEME.chart.module.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-[10px]" style={{ color: THEME.textDim }}>
            연간 절감액
          </div>
          <div className="text-sm font-semibold tabular-nums" style={{ color: THEME.text }}>
            {formatKRWAuto(total)}
          </div>
        </div>
      </div>
      <div className="flex-1 grid grid-cols-1 gap-1.5">
        {rows.map((r, i) => {
          const pct = total > 0 ? (r.value / total) * 100 : 0;
          return (
            <div key={r.key} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: THEME.chart.module[i % THEME.chart.module.length] }}
                />
                <span className="truncate" style={{ color: THEME.textMuted }}>
                  {r.label}
                </span>
              </div>
              <div className="flex items-center gap-2 tabular-nums flex-shrink-0">
                <span style={{ color: THEME.textDim }}>{pct.toFixed(0)}%</span>
                <span style={{ color: THEME.text, minWidth: 70, textAlign: "right" }}>
                  {formatKRWAuto(r.value)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CumulativeBenefitChart({ result }) {
  const data = [];
  const init = result.appliedInput.initialImplementationCost;
  const maint = result.appliedInput.annualMaintenanceCost;
  let cumulative = -init;
  data.push({ year: "Year 0", value: cumulative, benefit: 0, cost: init });
  for (let y = 1; y <= 3; y++) {
    cumulative += result.annualSavings - maint;
    data.push({
      year: `Year ${y}`,
      value: cumulative,
      benefit: result.annualSavings,
      cost: maint,
    });
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="benefitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={THEME.accent} stopOpacity={0.45} />
            <stop offset="100%" stopColor={THEME.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={THEME.chart.stroke} vertical={false} />
        <XAxis
          dataKey="year"
          tick={{ fill: THEME.textMuted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: THEME.textMuted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatKRWCompact(v)}
          width={60}
        />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="value"
          name="누적 순편익"
          stroke={THEME.accent}
          strokeWidth={2}
          fill="url(#benefitGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ScenarioComparisonChart({ results }) {
  const data = SCENARIOS.map((s) => ({
    name: SCENARIO_LABEL[s],
    절감액: results[s].annualSavings,
    순편익: results[s].annualNetBenefit,
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 16, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={THEME.chart.stroke} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: THEME.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fill: THEME.textMuted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatKRWCompact(v)}
          width={60}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Legend
          wrapperStyle={{ fontSize: 11, color: THEME.textMuted }}
          iconType="circle"
          iconSize={8}
        />
        <Bar dataKey="절감액" fill={THEME.accent} radius={[4, 4, 0, 0]} maxBarSize={30} />
        <Bar dataKey="순편익" fill={THEME.positive} radius={[4, 4, 0, 0]} maxBarSize={30} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function PaybackTimeline({ result }) {
  const payback = result.paybackMonths;
  const finite = Number.isFinite(payback) && payback > 0;
  const cap = 36;
  const pct = finite ? Math.min(payback, cap) / cap : 1;
  const monthsLabels = [0, 6, 12, 18, 24, 30, 36];

  return (
    <div className="pt-2">
      <div className="relative h-10">
        {/* track */}
        <div
          className="absolute top-1/2 left-0 right-0 h-[3px] -translate-y-1/2 rounded-full"
          style={{ background: "rgba(255,255,255,0.07)" }}
        />
        {/* filled portion = payback */}
        {finite && (
          <div
            className="absolute top-1/2 left-0 h-[3px] -translate-y-1/2 rounded-full"
            style={{ width: `${pct * 100}%`, background: THEME.accent }}
          />
        )}
        {/* today marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
          style={{ left: 0, background: THEME.textMuted }}
        />
        {/* payback marker */}
        {finite && (
          <div
            className="absolute top-1/2 -translate-y-1/2"
            style={{ left: `calc(${pct * 100}% - 8px)` }}
          >
            <div
              className="w-4 h-4 rounded-full"
              style={{
                background: "#fff",
                boxShadow: `0 0 0 4px ${THEME.accentSoft}`,
              }}
            />
          </div>
        )}
        {/* month tick labels */}
        <div className="absolute inset-x-0 top-full mt-1.5 flex justify-between text-[10px] tabular-nums" style={{ color: THEME.textDim }}>
          {monthsLabels.map((m) => (
            <span key={m}>{m}M</span>
          ))}
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between text-xs">
        <div style={{ color: THEME.textMuted }}>현재 (투자 시점)</div>
        <div style={{ color: THEME.text }}>
          {finite ? (
            <>
              <span className="tabular-nums font-semibold">{payback.toFixed(1)}개월</span>
              <span style={{ color: THEME.textMuted }} className="ml-1">
                후 원금 회수
              </span>
            </>
          ) : (
            <span style={{ color: THEME.warn }}>현재 가정으로는 회수 어려움</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/*  [COMPONENTS: KPI CARDS]                                                   */
/* ========================================================================= */

function KpiCard({ label, value, sub, tone = "default", large }) {
  const toneColor =
    tone === "positive" ? THEME.positive : tone === "accent" ? THEME.accent : THEME.text;
  return (
    <Card className="p-4" hover>
      <div className="text-[11px] tracking-wide uppercase" style={{ color: THEME.textDim, letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div
        className={`mt-1.5 font-semibold tabular-nums ${large ? "text-2xl" : "text-xl"}`}
        style={{ color: toneColor, letterSpacing: "-0.02em" }}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-[11px]" style={{ color: THEME.textMuted }}>
          {sub}
        </div>
      )}
    </Card>
  );
}

/* ========================================================================= */
/*  [FEATURE: ROI PAGE]                                                       */
/* ========================================================================= */

function RoiPage() {
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [scenario, setScenario] = useState("base");
  const [unit, setUnit] = useState("auto");
  const [autoFilledFields, setAutoFilledFields] = useState({
    industry: true,
    annualRevenue: true,
    annualOperatingProfit: true,
  });
  const [companySource, setCompanySource] = useState({
    source: DEFAULT_COMPANY.source,
    updatedAt: DEFAULT_COMPANY.updatedAt,
  });
  const [showAssumptions, setShowAssumptions] = useState(false);

  // Load Pretendard for refined Korean typography (graceful no-op if blocked)
  useEffect(() => {
    if (document.getElementById("pretendard-font")) return;
    const link = document.createElement("link");
    link.id = "pretendard-font";
    link.rel = "stylesheet";
    link.href =
      "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css";
    document.head.appendChild(link);
  }, []);

  const results = useMemo(() => computeAllScenarios(input), [input]);
  const result = results[scenario];
  const moduleRanking = useMemo(() => rankModuleContributions(result), [result]);

  function setField(key, value, opts = {}) {
    setInput((prev) => ({ ...prev, [key]: value }));
    if (opts.userEdit && autoFilledFields[key]) {
      setAutoFilledFields((prev) => ({ ...prev, [key]: false }));
    }
  }

  function handleCompanySelect(company) {
    setInput((prev) => ({
      ...prev,
      companyName: company.name,
      companyId: company.id,
      industry: company.industry,
      annualRevenue: company.annualRevenue ?? prev.annualRevenue,
      annualOperatingProfit: company.annualOperatingProfit ?? prev.annualOperatingProfit,
      // 업종 preset 동시 반영 여부는 의도적으로 분리 (사용자가 원할 때 적용)
    }));
    setAutoFilledFields({
      industry: true,
      annualRevenue: true,
      annualOperatingProfit: true,
    });
    setCompanySource({ source: company.source, updatedAt: company.updatedAt });
  }

  function handleCompanyRawChange(name) {
    setInput((prev) => ({ ...prev, companyName: name, companyId: null }));
  }

  function applyIndustryPreset() {
    const preset = INDUSTRY_PRESETS[input.industry];
    if (!preset) return;
    setInput((prev) => ({ ...prev, ...preset }));
  }

  function resetToDefault() {
    setInput(DEFAULT_INPUT);
    setScenario("base");
    setAutoFilledFields({
      industry: true,
      annualRevenue: true,
      annualOperatingProfit: true,
    });
    setCompanySource({ source: DEFAULT_COMPANY.source, updatedAt: DEFAULT_COMPANY.updatedAt });
  }

  const currentCost = result.currentAnnualCost;
  const futureCost = result.futureAnnualCost;
  const savingsRate = currentCost > 0 ? result.annualSavings / currentCost : 0;
  const topDriver = moduleRanking[0];

  return (
    <div
      className="min-h-screen"
      style={{
        background: THEME.bg,
        color: THEME.text,
        fontFamily:
          "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
        fontFeatureSettings: "'ss01', 'ss02', 'cv11'",
      }}
    >
      {/* ========== HEADER ========== */}
      <header
        className="sticky top-0 z-20 border-b backdrop-blur"
        style={{
          borderColor: THEME.border,
          background: "rgba(10,10,11,0.75)",
        }}
      >
        <div className="max-w-[1480px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center"
              style={{ background: THEME.accentSoft }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 4L20 12L4 20V4Z"
                  stroke={THEME.accent}
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight" style={{ color: THEME.text }}>
                AICC ROI Simulator
              </div>
              <div className="text-[11px]" style={{ color: THEME.textDim }}>
                AI Contact Center 도입 효과 정량 분석 · 제안/컨설팅용
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className="flex items-center rounded-md border p-0.5"
              style={{ borderColor: THEME.border, background: THEME.panelElev }}
            >
              {[
                { v: "auto", l: "자동" },
                { v: "eokwon", l: "억원" },
                { v: "manwon", l: "만원" },
                { v: "won", l: "원" },
              ].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setUnit(opt.v)}
                  className="px-2 py-1 text-[11px] rounded-sm transition-colors"
                  style={{
                    background: unit === opt.v ? "rgba(255,255,255,0.06)" : "transparent",
                    color: unit === opt.v ? THEME.text : THEME.textMuted,
                  }}
                >
                  {opt.l}
                </button>
              ))}
            </div>
            <button
              onClick={resetToDefault}
              className="px-3 py-1.5 text-xs rounded-md border hover:bg-white/5 transition-colors"
              style={{ borderColor: THEME.border, color: THEME.textMuted }}
            >
              기본값 복원
            </button>
          </div>
        </div>
      </header>

      {/* ========== MAIN ========== */}
      <main className="max-w-[1480px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
          {/* =============== LEFT: INPUT PANEL =============== */}
          <div className="space-y-5">
            <InputSection
              title="고객 기본정보"
              right={
                <button
                  onClick={applyIndustryPreset}
                  className="text-[10px] px-2 py-1 rounded-md border hover:bg-white/5 transition-colors"
                  style={{ borderColor: THEME.border, color: THEME.textMuted }}
                >
                  업종 preset 적용
                </button>
              }
            >
              <div className="space-y-3">
                <div>
                  <Label>회사명</Label>
                  <CompanyAutocomplete
                    value={input.companyName}
                    onSelect={handleCompanySelect}
                    onChangeRaw={handleCompanyRawChange}
                    lookup={companyLookupService}
                  />
                  {input.companyId && companySource.source && (
                    <div
                      className="mt-1.5 flex items-center gap-1.5 text-[10px]"
                      style={{ color: THEME.textDim }}
                    >
                      <Badge tone="accent">자동 불러옴</Badge>
                      <span>
                        {companySource.source} · 기준 {companySource.updatedAt}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <Label
                    badge={
                      autoFilledFields.industry && input.companyId ? (
                        <Badge tone="accent">자동 불러옴</Badge>
                      ) : input.companyId ? (
                        <Badge>수정됨</Badge>
                      ) : null
                    }
                  >
                    업종
                  </Label>
                  <Select
                    value={input.industry}
                    onChange={(v) => setField("industry", v, { userEdit: true })}
                    options={INDUSTRIES.map((i) => ({ value: i, label: i }))}
                  />
                </div>

                <div>
                  <Label
                    badge={
                      autoFilledFields.annualRevenue && input.companyId ? (
                        <Badge tone="accent">자동 불러옴</Badge>
                      ) : input.companyId ? (
                        <Badge>수정됨</Badge>
                      ) : null
                    }
                  >
                    연매출
                  </Label>
                  <NumberInput
                    value={input.annualRevenue}
                    onChange={(v) => setField("annualRevenue", v, { userEdit: true })}
                    suffix="원"
                    step={100_000_000}
                  />
                  <div className="mt-1 text-[10px] tabular-nums" style={{ color: THEME.textDim }}>
                    = {formatKRWAuto(input.annualRevenue)}
                  </div>
                </div>

                <div>
                  <Label
                    badge={
                      autoFilledFields.annualOperatingProfit && input.companyId ? (
                        <Badge tone="accent">자동 불러옴</Badge>
                      ) : input.companyId ? (
                        <Badge>수정됨</Badge>
                      ) : null
                    }
                  >
                    영업이익
                  </Label>
                  <NumberInput
                    value={input.annualOperatingProfit}
                    onChange={(v) => setField("annualOperatingProfit", v, { userEdit: true })}
                    suffix="원"
                    step={100_000_000}
                  />
                  <div className="mt-1 text-[10px] tabular-nums" style={{ color: THEME.textDim }}>
                    = {formatKRWAuto(input.annualOperatingProfit)}
                  </div>
                </div>
              </div>
            </InputSection>

            <InputSection title="컨택센터 운영정보">
              <div className="space-y-3">
                <TwoCol>
                  <Field label="월 인입량">
                    <NumberInput
                      value={input.monthlyInboundVolume}
                      onChange={(v) => setField("monthlyInboundVolume", v)}
                      suffix="건"
                      step={1000}
                    />
                  </Field>
                  <Field label="월 아웃바운드">
                    <NumberInput
                      value={input.monthlyOutboundVolume}
                      onChange={(v) => setField("monthlyOutboundVolume", v)}
                      suffix="건"
                      step={1000}
                    />
                  </Field>
                </TwoCol>
                <TwoCol>
                  <Field label="상담사 수">
                    <NumberInput
                      value={input.agentCount}
                      onChange={(v) => setField("agentCount", v)}
                      suffix="명"
                    />
                  </Field>
                  <Field label="운영시간/일">
                    <NumberInput
                      value={input.operationHoursPerDay}
                      onChange={(v) => setField("operationHoursPerDay", v)}
                      suffix="h"
                    />
                  </Field>
                </TwoCol>
                <TwoCol>
                  <Field label="평균 AHT">
                    <NumberInput
                      value={input.averageAHTMinutes}
                      onChange={(v) => setField("averageAHTMinutes", v)}
                      suffix="분"
                      step={0.1}
                    />
                  </Field>
                  <Field label="평균 ACW">
                    <NumberInput
                      value={input.averageACWMinutes}
                      onChange={(v) => setField("averageACWMinutes", v)}
                      suffix="분"
                      step={0.1}
                    />
                  </Field>
                </TwoCol>
                <Field label="상담사 평균 인건비 (연)">
                  <NumberInput
                    value={input.averageAgentAnnualCost}
                    onChange={(v) => setField("averageAgentAnnualCost", v)}
                    suffix="원"
                    step={1_000_000}
                  />
                  <div className="mt-1 text-[10px] tabular-nums" style={{ color: THEME.textDim }}>
                    = {formatKRWAuto(input.averageAgentAnnualCost)} / 총 인건비{" "}
                    {formatKRWAuto(input.agentCount * input.averageAgentAnnualCost)}
                  </div>
                </Field>
              </div>
            </InputSection>

            <InputSection title="AICC 도입 가정">
              <div className="space-y-3.5">
                <Field label="현재 자동화율">
                  <SliderWithValue
                    value={input.currentAutomationRate}
                    onChange={(v) => setField("currentAutomationRate", v)}
                    max={0.9}
                    formatter={formatPercent}
                  />
                </Field>
                <Field label="챗봇·보이스봇 셀프처리율 (목표)">
                  <SliderWithValue
                    value={input.expectedSelfServiceRate}
                    onChange={(v) => setField("expectedSelfServiceRate", v)}
                    max={0.8}
                    formatter={formatPercent}
                  />
                </Field>
                <Field label="STT·자동요약 ACW 절감률">
                  <SliderWithValue
                    value={input.expectedSttSummaryReductionRate}
                    onChange={(v) => setField("expectedSttSummaryReductionRate", v)}
                    max={0.8}
                    formatter={formatPercent}
                  />
                </Field>
                <Field label="AI KMS 생산성 향상률">
                  <SliderWithValue
                    value={input.expectedKmsProductivityRate}
                    onChange={(v) => setField("expectedKmsProductivityRate", v)}
                    max={0.4}
                    formatter={formatPercent}
                  />
                </Field>
                <Field label="AI QA 자동화율">
                  <SliderWithValue
                    value={input.expectedQaAutomationRate}
                    onChange={(v) => setField("expectedQaAutomationRate", v)}
                    max={0.95}
                    formatter={formatPercent}
                  />
                </Field>
                <Field label="Forecast·인력최적화 효과">
                  <SliderWithValue
                    value={input.expectedForecastOptimizationRate}
                    onChange={(v) => setField("expectedForecastOptimizationRate", v)}
                    max={0.2}
                    formatter={formatPercent}
                  />
                </Field>
                <Field label="재문의 감소율">
                  <SliderWithValue
                    value={input.expectedRepeatContactReductionRate}
                    onChange={(v) => setField("expectedRepeatContactReductionRate", v)}
                    max={0.4}
                    formatter={formatPercent}
                  />
                </Field>
              </div>
            </InputSection>

            <InputSection title="투자비용">
              <div className="space-y-3">
                <Field label="초기 구축비">
                  <NumberInput
                    value={input.initialImplementationCost}
                    onChange={(v) => setField("initialImplementationCost", v)}
                    suffix="원"
                    step={50_000_000}
                  />
                  <div className="mt-1 text-[10px] tabular-nums" style={{ color: THEME.textDim }}>
                    = {formatKRWAuto(input.initialImplementationCost)}
                  </div>
                </Field>
                <Field label="연간 유지보수/구독비">
                  <NumberInput
                    value={input.annualMaintenanceCost}
                    onChange={(v) => setField("annualMaintenanceCost", v)}
                    suffix="원"
                    step={10_000_000}
                  />
                  <div className="mt-1 text-[10px] tabular-nums" style={{ color: THEME.textDim }}>
                    = {formatKRWAuto(input.annualMaintenanceCost)}
                  </div>
                </Field>
                <Field label="리스크 보정계수">
                  <SliderWithValue
                    value={input.riskAdjustmentFactor}
                    onChange={(v) => setField("riskAdjustmentFactor", v)}
                    min={0.5}
                    max={1.0}
                    formatter={(v) => `×${v.toFixed(2)}`}
                  />
                  <div className="mt-1 text-[10px]" style={{ color: THEME.textDim }}>
                    모든 모듈 절감액에 공통 적용. 1.0 = 가정치 그대로, 0.85 = 실무 권장치.
                  </div>
                </Field>
              </div>
            </InputSection>
          </div>

          {/* =============== RIGHT: RESULTS =============== */}
          <div className="space-y-5 min-w-0">
            {/* SCENARIO TABS */}
            <div
              className="flex items-center gap-1 p-1 rounded-lg border w-fit"
              style={{ borderColor: THEME.border, background: THEME.panel }}
            >
              {SCENARIOS.map((s) => {
                const active = s === scenario;
                return (
                  <button
                    key={s}
                    onClick={() => setScenario(s)}
                    className="px-3 py-1.5 text-xs rounded-md transition-colors"
                    style={{
                      background: active ? THEME.accentSoft : "transparent",
                      color: active ? THEME.accent : THEME.textMuted,
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {SCENARIO_LABEL[s]} 시나리오
                  </button>
                );
              })}
            </div>

            {/* ========== KPI ROW ========== */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <KpiCard
                label="연간 절감액"
                value={formatKRWAs(result.annualSavings, unit)}
                sub={`현재 인건비의 ${formatPercent(savingsRate)} 절감`}
                tone="positive"
                large
              />
              <KpiCard
                label="연간 순편익"
                value={formatKRWAs(result.annualNetBenefit, unit)}
                sub={`절감액 − 연 운영비 ${formatKRWAuto(input.annualMaintenanceCost)}`}
                tone="accent"
                large
              />
              <KpiCard
                label="ROI (3Y)"
                value={`${result.roiPercent.toFixed(0)}%`}
                sub="3년 투자 대비 수익률"
                tone="accent"
                large
              />
              <KpiCard
                label="투자회수기간"
                value={
                  Number.isFinite(result.paybackMonths)
                    ? `${result.paybackMonths.toFixed(1)}개월`
                    : "—"
                }
                sub="초기 구축비 / 월 순편익"
              />
              <KpiCard
                label="3개년 누적 순편익"
                value={formatKRWAs(result.threeYearCumulativeNetBenefit, unit)}
                sub="Year 3 시점 누적 (초기투자·운영비 차감)"
              />
              <KpiCard
                label="가장 큰 영향 요인"
                value={topDriver?.label || "—"}
                sub={`기여 절감액 ${formatKRWAuto(topDriver?.value || 0)}`}
                tone="accent"
              />
            </div>

            {/* ========== EXECUTIVE SUMMARY ========== */}
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: THEME.accentSoft }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2L14.5 8.5L21 9.5L16.5 14L17.5 20.5L12 17.5L6.5 20.5L7.5 14L3 9.5L9.5 8.5L12 2Z"
                      stroke={THEME.accent}
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-[11px] tracking-wide uppercase mb-1" style={{ color: THEME.textDim, letterSpacing: "0.04em" }}>
                    Executive Summary · {SCENARIO_LABEL[scenario]} 시나리오
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: THEME.text }}>
                    <span style={{ color: THEME.textMuted }}>
                      {input.companyName || "고객사"}의 현재 컨택센터 인건비는 연{" "}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatKRWAs(currentCost, unit)}
                    </span>
                    <span style={{ color: THEME.textMuted }}> 규모이며, AICC 도입 시 연간 운영비를 </span>
                    <span className="font-semibold tabular-nums" style={{ color: THEME.positive }}>
                      {formatPercent(savingsRate)}
                    </span>
                    <span style={{ color: THEME.textMuted }}> 절감할 수 있을 것으로 추정됩니다. </span>
                    <span style={{ color: THEME.textMuted }}>초기 구축비 </span>
                    <span className="font-semibold tabular-nums">
                      {formatKRWAs(input.initialImplementationCost, unit)}
                    </span>
                    <span style={{ color: THEME.textMuted }}>는 약 </span>
                    <span className="font-semibold tabular-nums" style={{ color: THEME.accent }}>
                      {Number.isFinite(result.paybackMonths)
                        ? `${result.paybackMonths.toFixed(1)}개월`
                        : "회수 어려움"}
                    </span>
                    <span style={{ color: THEME.textMuted }}> 후 회수되며, 3개년 누적 순편익은 </span>
                    <span className="font-semibold tabular-nums" style={{ color: THEME.positive }}>
                      {formatKRWAs(result.threeYearCumulativeNetBenefit, unit)}
                    </span>
                    <span style={{ color: THEME.textMuted }}>로 전망됩니다.</span>
                  </p>
                  <div
                    className="mt-3 pt-3 border-t text-xs"
                    style={{ borderColor: THEME.borderSoft, color: THEME.textMuted }}
                  >
                    핵심 절감 동인:{" "}
                    {moduleRanking.slice(0, 3).map((m, i) => (
                      <span key={m.key} className="tabular-nums">
                        {i > 0 && " · "}
                        <span style={{ color: THEME.text }}>{m.label}</span>{" "}
                        <span style={{ color: THEME.textDim }}>
                          ({formatKRWAuto(m.value)})
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* ========== COST COMPARISON + BREAKDOWN ========== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card className="p-5">
                <SectionTitle>도입 전 vs 도입 후 연간 운영비</SectionTitle>
                <CostComparisonChart current={currentCost} future={futureCost} />
                <div
                  className="mt-3 pt-3 border-t grid grid-cols-2 gap-3 text-xs"
                  style={{ borderColor: THEME.borderSoft }}
                >
                  <div>
                    <div style={{ color: THEME.textDim }}>도입 전 (인건비)</div>
                    <div className="tabular-nums font-semibold mt-0.5" style={{ color: THEME.text }}>
                      {formatKRWAs(currentCost, unit)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: THEME.textDim }}>도입 후 (인건비 + 운영비)</div>
                    <div className="tabular-nums font-semibold mt-0.5" style={{ color: THEME.accent }}>
                      {formatKRWAs(futureCost, unit)}
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <SectionTitle>절감 기여도 분해</SectionTitle>
                <SavingsBreakdownDonut result={result} />
              </Card>
            </div>

            {/* ========== 3-YEAR CUMULATIVE ========== */}
            <Card className="p-5">
              <SectionTitle
                right={
                  <Badge>
                    초기투자 {formatKRWAuto(input.initialImplementationCost)} 반영
                  </Badge>
                }
              >
                3개년 누적 순편익 추이
              </SectionTitle>
              <CumulativeBenefitChart result={result} />
              <div
                className="mt-3 pt-3 border-t grid grid-cols-4 gap-3 text-xs"
                style={{ borderColor: THEME.borderSoft }}
              >
                {[0, 1, 2, 3].map((y) => {
                  const val =
                    -input.initialImplementationCost +
                    y * (result.annualSavings - input.annualMaintenanceCost);
                  return (
                    <div key={y}>
                      <div style={{ color: THEME.textDim }}>Year {y}</div>
                      <div
                        className="tabular-nums font-semibold mt-0.5"
                        style={{
                          color: val >= 0 ? THEME.positive : THEME.negative,
                        }}
                      >
                        {formatKRWAs(val, unit)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* ========== SCENARIO COMPARISON ========== */}
            <Card className="p-5">
              <SectionTitle>시나리오 비교</SectionTitle>
              <ScenarioComparisonChart results={results} />
              <div
                className="mt-4 overflow-x-auto rounded-md border"
                style={{ borderColor: THEME.borderSoft }}
              >
                <table className="w-full text-xs tabular-nums">
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.025)" }}>
                      <th className="text-left font-medium py-2 px-3" style={{ color: THEME.textDim }}>
                        지표
                      </th>
                      {SCENARIOS.map((s) => (
                        <th
                          key={s}
                          className="text-right font-medium py-2 px-3"
                          style={{ color: s === scenario ? THEME.accent : THEME.textDim }}
                        >
                          {SCENARIO_LABEL[s]}
                          {s === scenario && " ●"}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "연간 절감액", key: "annualSavings" },
                      { label: "연간 순편익", key: "annualNetBenefit" },
                      { label: "ROI (3Y)", key: "roiPercent", kind: "pct" },
                      { label: "투자회수기간", key: "paybackMonths", kind: "months" },
                      {
                        label: "3개년 누적 순편익",
                        key: "threeYearCumulativeNetBenefit",
                      },
                    ].map((row) => (
                      <tr
                        key={row.key}
                        className="border-t"
                        style={{ borderColor: THEME.borderSoft }}
                      >
                        <td className="py-2 px-3" style={{ color: THEME.textMuted }}>
                          {row.label}
                        </td>
                        {SCENARIOS.map((s) => {
                          const v = results[s][row.key];
                          let display;
                          if (row.kind === "pct") display = `${v.toFixed(0)}%`;
                          else if (row.kind === "months")
                            display = Number.isFinite(v) ? `${v.toFixed(1)}개월` : "—";
                          else display = formatKRWAs(v, unit);
                          return (
                            <td
                              key={s}
                              className="py-2 px-3 text-right"
                              style={{
                                color: s === scenario ? THEME.text : THEME.textMuted,
                                fontWeight: s === scenario ? 600 : 400,
                              }}
                            >
                              {display}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* ========== PAYBACK TIMELINE ========== */}
            <Card className="p-5">
              <SectionTitle>투자회수 타임라인</SectionTitle>
              <PaybackTimeline result={result} />
            </Card>

            {/* ========== TOP ROI DRIVERS ========== */}
            <Card className="p-5">
              <SectionTitle>주요 ROI Driver</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {moduleRanking.slice(0, 3).map((m, i) => (
                  <div
                    key={m.key}
                    className="p-4 rounded-lg border"
                    style={{
                      borderColor: THEME.borderSoft,
                      background: "rgba(255,255,255,0.015)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-semibold"
                        style={{
                          background: THEME.accentSoft,
                          color: THEME.accent,
                        }}
                      >
                        {i + 1}
                      </div>
                      <div className="text-sm font-medium" style={{ color: THEME.text }}>
                        {m.label}
                      </div>
                    </div>
                    <div
                      className="text-lg font-semibold tabular-nums"
                      style={{ color: THEME.text, letterSpacing: "-0.02em" }}
                    >
                      {formatKRWAs(m.value, unit)}
                    </div>
                    <div className="text-[11px] mt-1" style={{ color: THEME.textMuted }}>
                      전체 절감의{" "}
                      {formatPercent(result.annualSavings > 0 ? m.value / result.annualSavings : 0)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* ========== ASSUMPTIONS / FORMULA (expandable) ========== */}
            <Card>
              <button
                onClick={() => setShowAssumptions(!showAssumptions)}
                className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 rounded-sm" style={{ background: THEME.accent }} />
                  <h3 className="text-sm font-semibold tracking-tight" style={{ color: THEME.text }}>
                    가정값 · 계산식 보기
                  </h3>
                </div>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{
                    color: THEME.textMuted,
                    transform: showAssumptions ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s",
                  }}
                >
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              {showAssumptions && (
                <div
                  className="px-5 pb-5 space-y-4 border-t"
                  style={{ borderColor: THEME.borderSoft }}
                >
                  <div className="pt-4">
                    <div
                      className="text-[11px] uppercase mb-2 tracking-wide"
                      style={{ color: THEME.textDim, letterSpacing: "0.04em" }}
                    >
                      핵심 공식
                    </div>
                    <div
                      className="rounded-md p-3 font-mono text-[11px] leading-relaxed"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        color: THEME.textMuted,
                        border: `1px solid ${THEME.borderSoft}`,
                      }}
                    >
                      <div>총 인건비 = 상담사 수 × 평균 연 인건비</div>
                      <div>챗봇 절감 = 총 인건비 × (셀프처리율 − 현재 자동화율) × 리스크계수</div>
                      <div>STT 절감 = 남은 인건비 × ACW비중 × STT감소율 × 리스크계수</div>
                      <div>KMS 절감 = 남은 인건비 × AHT비중 × KMS향상률 × 리스크계수</div>
                      <div>QA 절감 = 총 인건비 × 5% × QA자동화율 × 리스크계수</div>
                      <div>Forecast 절감 = 남은 인건비 × Forecast효과 × 리스크계수</div>
                      <div>재문의 절감 = 남은 인건비 × 30% × 재문의감소율 × 리스크계수</div>
                      <div className="mt-2" style={{ color: THEME.text }}>
                        ROI(3Y) = (3년절감 − 초기투자 − 3년운영비) / (초기투자 + 3년운영비)
                      </div>
                      <div style={{ color: THEME.text }}>
                        투자회수기간 = 초기투자비 / 월 순편익
                      </div>
                    </div>
                  </div>

                  <div>
                    <div
                      className="text-[11px] uppercase mb-2 tracking-wide"
                      style={{ color: THEME.textDim, letterSpacing: "0.04em" }}
                    >
                      시나리오 가정
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {SCENARIOS.map((s) => (
                        <div key={s} className="flex items-start gap-2">
                          <Badge tone={s === "aggressive" ? "positive" : s === "conservative" ? "warn" : "accent"}>
                            {SCENARIO_LABEL[s]} ×{SCENARIO_MULTIPLIERS[s]}
                          </Badge>
                          <span style={{ color: THEME.textMuted }}>{SCENARIO_DESCRIPTION[s]}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div
                      className="text-[11px] uppercase mb-2 tracking-wide"
                      style={{ color: THEME.textDim, letterSpacing: "0.04em" }}
                    >
                      적용된 가정값 (시나리오 반영 후)
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      {[
                        ["셀프처리율", result.appliedInput.expectedSelfServiceRate],
                        ["STT 감소율", result.appliedInput.expectedSttSummaryReductionRate],
                        ["KMS 향상률", result.appliedInput.expectedKmsProductivityRate],
                        ["QA 자동화율", result.appliedInput.expectedQaAutomationRate],
                        ["Forecast 효과", result.appliedInput.expectedForecastOptimizationRate],
                        ["재문의 감소율", result.appliedInput.expectedRepeatContactReductionRate],
                      ].map(([label, val]) => (
                        <div
                          key={label}
                          className="flex items-center justify-between px-3 py-2 rounded-md"
                          style={{ background: "rgba(255,255,255,0.02)" }}
                        >
                          <span style={{ color: THEME.textMuted }}>{label}</span>
                          <span className="tabular-nums font-medium" style={{ color: THEME.text }}>
                            {formatPercent(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-[11px]" style={{ color: THEME.textDim }}>
                      · QA 비중 = {formatPercent(QA_SHARE_OF_LABOR)} (업계 통상치)  · 재문의 비중 ={" "}
                      {formatPercent(REPEAT_SHARE_OF_CONTACTS)} (고정 가정)
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <div
              className="text-center text-[11px] pt-4 pb-8"
              style={{ color: THEME.textDim }}
            >
              본 시뮬레이터의 수치는 mock 데이터와 고객사 입력 기반 추정치입니다. 실 계약/PoC
              데이터로 보정하여 최종 제안에 사용하세요.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ========================================================================= */
/*  [COMPONENTS: LAYOUT HELPERS]                                              */
/* ========================================================================= */

function InputSection({ title, children, right }) {
  return (
    <Card className="p-4">
      <SectionTitle right={right}>{title}</SectionTitle>
      {children}
    </Card>
  );
}

function Field({ label, children, badge }) {
  return (
    <div>
      <Label badge={badge}>{label}</Label>
      {children}
    </div>
  );
}

function TwoCol({ children }) {
  return <div className="grid grid-cols-2 gap-2.5">{children}</div>;
}

/* ========================================================================= */
/*  APP                                                                       */
/* ========================================================================= */

export default function App() {
  return <RoiPage />;
}