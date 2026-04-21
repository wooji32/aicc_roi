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
  ComposedChart,
  Line,
  Legend,
} from "recharts";

/* ===========================================================================
 * =  AICC ROI Simulator v3                                                   =
 * =                                                                          =
 * =  v3 업데이트:                                                            =
 * =   - 11개 솔루션 체크박스 선택식 (Forecast / Chatbot / Voicebot / STT /   =
 * =     자동요약 / AI KMS / AI QA / AI Tutor / TA Dashboard / Routing Bot /  =
 * =     DB Clustering)                                                       =
 * =   - 솔루션 시너지 매트릭스 (STT+요약, STT+QA, STT+KMS, Bot+Routing 등)   =
 * =   - 비용 구조 9종 분리 (구축/연동/커스터마이징/구독/유지보수/LLM/교육/   =
 * =     튜닝/인프라) + 일회성/반복 분리                                     =
 * =   - 문의유형 10종 비중+특성 입력 (AHT/자동화적합도/복잡도/재문의위험)    =
 * =   - 문의유형 → 솔루션 효과 가중치 연동                                   =
 * =   - 1년 ROI / 3년 누적 ROI 분리 계산                                     =
 * =   - 차트 10개 (솔루션 기여도, 비용 breakdown, 문의유형 비중, 히트맵 등)  =
 * ========================================================================= */

/* ========================================================================= */
/*  [TYPES & CONSTANTS]                                                       */
/* ========================================================================= */

const INDUSTRIES = ["금융", "보험", "유통/이커머스", "통신", "제조/서비스", "공공"];
const SCENARIOS = ["conservative", "base", "aggressive"];
const SCENARIO_LABEL = { conservative: "보수적", base: "기준", aggressive: "공격적" };
const SCENARIO_MULTIPLIERS = { conservative: 0.7, base: 1.0, aggressive: 1.3 };
const SCENARIO_DESCRIPTION = {
  conservative: "가정치의 70% 수준만 실현된다고 가정한 보수적 전망.",
  base: "제안 기준 가정치가 그대로 실현되는 표준 시나리오.",
  aggressive: "가정치의 130% 수준까지 실현되는 공격적 전망.",
};

/* ========================================================================= */
/*  [SOLUTIONS CATALOG] — 11개 솔루션                                        */
/*                                                                            */
/*  각 솔루션의:                                                              */
/*    - 기본 편익 계수 (인건비 대비 절감 비율)                                */
/*    - 기본 비용 (초기/연간)                                                 */
/*    - 어떤 문의유형에 효과가 큰지                                           */
/* ========================================================================= */

const SOLUTIONS_CATALOG = [
  {
    key: "chatbot",
    label: "Chatbot",
    category: "셀프서비스",
    description: "반복/단순 문의 자동 응대",
    baseBenefitRate: 0.18, // 총 인건비 대비 절감 잠재력
    benefitType: "selfService", // 셀프처리 확장 → 인입량 감소
    defaultImplementationCost: 150_000_000,
    defaultAnnualCost: 36_000_000,
  },
  {
    key: "voicebot",
    label: "Voicebot",
    category: "셀프서비스",
    description: "음성 기반 셀프서비스 확대",
    baseBenefitRate: 0.12,
    benefitType: "selfService",
    defaultImplementationCost: 200_000_000,
    defaultAnnualCost: 60_000_000,
  },
  {
    key: "stt",
    label: "STT",
    category: "상담지원",
    description: "실시간/후처리 음성 텍스트화",
    baseBenefitRate: 0.08,
    benefitType: "acwReduction", // ACW 영역 절감
    defaultImplementationCost: 100_000_000,
    defaultAnnualCost: 48_000_000,
  },
  {
    key: "autoSummary",
    label: "자동상담요약",
    category: "상담지원",
    description: "상담 종료 후 기록/후처리 자동화",
    baseBenefitRate: 0.1,
    benefitType: "acwReduction",
    defaultImplementationCost: 80_000_000,
    defaultAnnualCost: 36_000_000,
  },
  {
    key: "aiKms",
    label: "AI KMS",
    category: "상담지원",
    description: "상담 중 지식탐색 및 답변 추천",
    baseBenefitRate: 0.09,
    benefitType: "ahtReduction", // AHT 영역 절감
    defaultImplementationCost: 180_000_000,
    defaultAnnualCost: 60_000_000,
  },
  {
    key: "aiQa",
    label: "AI QA",
    category: "품질관리",
    description: "상담 품질평가 자동화",
    baseBenefitRate: 0.05,
    benefitType: "qaAutomation",
    defaultImplementationCost: 120_000_000,
    defaultAnnualCost: 48_000_000,
  },
  {
    key: "forecast",
    label: "Forecast",
    category: "운영최적화",
    description: "인입량 예측 및 인력운영 최적화",
    baseBenefitRate: 0.07,
    benefitType: "forecast",
    defaultImplementationCost: 100_000_000,
    defaultAnnualCost: 24_000_000,
  },
  {
    key: "aiTutor",
    label: "AI Tutor",
    category: "운영최적화",
    description: "신입/숙련도 편차 완화 및 상담 코칭",
    baseBenefitRate: 0.04,
    benefitType: "ahtReduction",
    defaultImplementationCost: 80_000_000,
    defaultAnnualCost: 24_000_000,
  },
  {
    key: "taDashboard",
    label: "TA/STI Dashboard",
    category: "운영최적화",
    description: "상담 분석 대시보드 및 운영 인사이트",
    baseBenefitRate: 0.03,
    benefitType: "forecast",
    defaultImplementationCost: 60_000_000,
    defaultAnnualCost: 18_000_000,
  },
  {
    key: "routingBot",
    label: "Routing Bot",
    category: "셀프서비스",
    description: "지능형 라우팅으로 상담 배분 최적화",
    baseBenefitRate: 0.05,
    benefitType: "selfService",
    defaultImplementationCost: 80_000_000,
    defaultAnnualCost: 24_000_000,
  },
  {
    key: "dbClustering",
    label: "DB Clustering",
    category: "운영최적화",
    description: "고객군 분류 및 맞춤 응대 기반 데이터 처리",
    baseBenefitRate: 0.03,
    benefitType: "repeatReduction",
    defaultImplementationCost: 80_000_000,
    defaultAnnualCost: 18_000_000,
  },
];

const SOLUTION_BY_KEY = Object.fromEntries(SOLUTIONS_CATALOG.map((s) => [s.key, s]));

/* ========================================================================= */
/*  [SYNERGY MATRIX] — 조합 시 보너스 배수                                   */
/*  두 솔루션 모두 선택 시 관련 편익이 (1 + bonus) 배                        */
/* ========================================================================= */

const SYNERGY_RULES = [
  { a: "stt", b: "autoSummary", bonus: 0.25, label: "STT+자동요약", affects: "acwReduction" },
  { a: "stt", b: "aiQa", bonus: 0.3, label: "STT+AI QA", affects: "qaAutomation" },
  { a: "stt", b: "aiKms", bonus: 0.15, label: "STT+AI KMS", affects: "ahtReduction" },
  { a: "chatbot", b: "routingBot", bonus: 0.2, label: "Chatbot+Routing", affects: "selfService" },
  { a: "voicebot", b: "routingBot", bonus: 0.15, label: "Voicebot+Routing", affects: "selfService" },
  { a: "aiKms", b: "aiTutor", bonus: 0.1, label: "AI KMS+Tutor", affects: "ahtReduction" },
  { a: "forecast", b: "taDashboard", bonus: 0.15, label: "Forecast+Dashboard", affects: "forecast" },
];

/* ========================================================================= */
/*  [INQUIRY TYPES] — 10종 문의유형                                          */
/* ========================================================================= */

const DEFAULT_INQUIRY_TYPES_BASE = [
  { id: "simple", name: "단순 문의", ratio: 0.2, automationFit: 0.9, complexity: "low", repeatRisk: 0.1 },
  { id: "order", name: "주문/예약/접수", ratio: 0.15, automationFit: 0.7, complexity: "medium", repeatRisk: 0.15 },
  { id: "delivery", name: "배송/일정 확인", ratio: 0.12, automationFit: 0.85, complexity: "low", repeatRisk: 0.1 },
  { id: "change", name: "변경/취소/환불", ratio: 0.12, automationFit: 0.5, complexity: "medium", repeatRisk: 0.25 },
  { id: "trouble", name: "장애/불만/VOC", ratio: 0.1, automationFit: 0.2, complexity: "high", repeatRisk: 0.35 },
  { id: "as", name: "A/S 접수", ratio: 0.08, automationFit: 0.5, complexity: "medium", repeatRisk: 0.2 },
  { id: "info", name: "정보 조회", ratio: 0.08, automationFit: 0.85, complexity: "low", repeatRisk: 0.05 },
  { id: "auth", name: "본인확인/인증", ratio: 0.06, automationFit: 0.7, complexity: "low", repeatRisk: 0.1 },
  { id: "agent", name: "상담원 연결 요청", ratio: 0.05, automationFit: 0.3, complexity: "medium", repeatRisk: 0.15 },
  { id: "etc", name: "기타", ratio: 0.04, automationFit: 0.4, complexity: "medium", repeatRisk: 0.15 },
];

// 업종별 문의유형 비중 조정 (총합 항상 1.0)
const INDUSTRY_INQUIRY_PRESETS = {
  금융: {
    simple: 0.18, order: 0.1, delivery: 0.05, change: 0.15, trouble: 0.1,
    as: 0.05, info: 0.18, auth: 0.12, agent: 0.04, etc: 0.03,
  },
  보험: {
    simple: 0.15, order: 0.12, delivery: 0.03, change: 0.18, trouble: 0.15,
    as: 0.08, info: 0.15, auth: 0.08, agent: 0.03, etc: 0.03,
  },
  "유통/이커머스": {
    simple: 0.22, order: 0.2, delivery: 0.2, change: 0.15, trouble: 0.08,
    as: 0.05, info: 0.05, auth: 0.02, agent: 0.02, etc: 0.01,
  },
  통신: {
    simple: 0.2, order: 0.1, delivery: 0.05, change: 0.12, trouble: 0.15,
    as: 0.15, info: 0.1, auth: 0.07, agent: 0.03, etc: 0.03,
  },
  "제조/서비스": {
    simple: 0.15, order: 0.1, delivery: 0.1, change: 0.1, trouble: 0.12,
    as: 0.2, info: 0.1, auth: 0.05, agent: 0.05, etc: 0.03,
  },
  공공: {
    simple: 0.25, order: 0.08, delivery: 0.03, change: 0.08, trouble: 0.1,
    as: 0.03, info: 0.25, auth: 0.1, agent: 0.05, etc: 0.03,
  },
};

function buildInquiryTypesForIndustry(industry) {
  const preset = INDUSTRY_INQUIRY_PRESETS[industry] || {};
  return DEFAULT_INQUIRY_TYPES_BASE.map((t) => ({
    ...t,
    ratio: preset[t.id] ?? t.ratio,
  }));
}

/* ========================================================================= */
/*  [INQUIRY-TYPE × SOLUTION WEIGHT MATRIX]                                  */
/*  각 문의유형이 특정 솔루션에 주는 효과 가중치 (0~1.3 범위)                */
/*  → 해당 유형 비중이 높을수록 해당 솔루션 편익이 증폭/감쇄                */
/* ========================================================================= */

const INQUIRY_SOLUTION_AFFINITY = {
  // [유형][solution key] = 가중치. 기준 1.0
  simple:   { chatbot: 1.3, voicebot: 1.25, routingBot: 1.1, aiKms: 0.9 },
  order:    { chatbot: 1.1, voicebot: 1.05, autoSummary: 1.1, routingBot: 1.0 },
  delivery: { chatbot: 1.25, voicebot: 1.15, routingBot: 1.05 },
  change:   { aiKms: 1.2, autoSummary: 1.1, aiQa: 1.1, chatbot: 0.8 },
  trouble:  { aiQa: 1.3, aiKms: 1.15, stt: 1.2, autoSummary: 1.15, chatbot: 0.5, voicebot: 0.6 },
  as:      { aiKms: 1.2, autoSummary: 1.1, routingBot: 1.1 },
  info:    { chatbot: 1.25, voicebot: 1.2, aiKms: 1.1 },
  auth:    { voicebot: 1.15, chatbot: 1.1 },
  agent:   { routingBot: 1.2, aiQa: 1.1 },
  etc:     {},
};

// 문의유형 비중 기반 솔루션 가중치 합산
function computeSolutionWeightFromInquiry(inquiryTypes, solutionKey) {
  let weight = 0;
  let totalRatio = 0;
  inquiryTypes.forEach((t) => {
    const affinity = INQUIRY_SOLUTION_AFFINITY[t.id]?.[solutionKey] ?? 1.0;
    weight += affinity * t.ratio;
    totalRatio += t.ratio;
  });
  return totalRatio > 0 ? weight / totalRatio : 1.0;
}

/* ========================================================================= */
/*  [MOCK COMPANIES]                                                          */
/* ========================================================================= */

function genFin(baseRev, baseOp, baseNet, source = "Mock 추정치") {
  const years = [2019, 2020, 2021, 2022, 2023];
  const variances = [0.78, 0.85, 0.92, 0.96, 1.0];
  return years.map((y, i) => ({
    fiscalYear: String(y),
    revenue: Math.round(baseRev * variances[i]),
    operatingIncome: Math.round(baseOp * variances[i]),
    netIncome: Math.round(baseNet * variances[i]),
    source,
    currency: "KRW",
    isConsolidated: true,
  }));
}

const MOCK_COMPANIES = [
  { id: "ssg", name: "SSG닷컴", aliases: ["ssg", "ssg.com", "쓱닷컴"], industry: "유통/이커머스",
    financialHistory: genFin(1_600_000_000_000, -50_000_000_000, -80_000_000_000), source: "Mock 추정치", updatedAt: "2024-03" },
  { id: "solity", name: "솔리티", aliases: ["solity"], industry: "제조/서비스",
    financialHistory: genFin(30_000_000_000, 2_000_000_000, 1_500_000_000), source: "Mock 추정치", updatedAt: "2024-01" },
  { id: "petdoc", name: "펫닥", aliases: ["petdoc", "pet-doc"], industry: "유통/이커머스",
    financialHistory: genFin(15_000_000_000, -1_000_000_000, -1_500_000_000), source: "Mock 추정치", updatedAt: "2024-01" },
  { id: "jbbank", name: "전북은행", aliases: ["jb", "jbbank"], industry: "금융",
    financialHistory: genFin(1_500_000_000_000, 200_000_000_000, 150_000_000_000), source: "Mock 추정치", updatedAt: "2023-12" },
  { id: "aig", name: "AIG손해보험", aliases: ["aig", "aig korea"], industry: "보험",
    financialHistory: genFin(500_000_000_000, 50_000_000_000, 38_000_000_000), source: "Mock 추정치", updatedAt: "2023-12" },
  { id: "kakaobank", name: "카카오뱅크", aliases: ["kakao bank", "kakaobank"], industry: "금융",
    financialHistory: genFin(1_900_000_000_000, 340_000_000_000, 270_000_000_000), source: "Mock 추정치", updatedAt: "2023-12" },
  { id: "skt", name: "SK텔레콤", aliases: ["skt", "sk telecom"], industry: "통신",
    financialHistory: genFin(17_000_000_000_000, 1_700_000_000_000, 1_100_000_000_000), source: "Mock 추정치", updatedAt: "2023-12" },
  { id: "kt", name: "KT", aliases: ["kt", "korea telecom"], industry: "통신",
    financialHistory: genFin(26_000_000_000_000, 1_700_000_000_000, 1_200_000_000_000), source: "Mock 추정치", updatedAt: "2023-12" },
  { id: "lgu", name: "LG유플러스", aliases: ["lg u+", "uplus"], industry: "통신",
    financialHistory: genFin(14_000_000_000_000, 1_000_000_000_000, 650_000_000_000), source: "Mock 추정치", updatedAt: "2023-12" },
  { id: "coupang", name: "쿠팡", aliases: ["coupang"], industry: "유통/이커머스",
    financialHistory: genFin(31_000_000_000_000, 600_000_000_000, 200_000_000_000), source: "Mock 추정치", updatedAt: "2023-12" },
  { id: "11st", name: "11번가", aliases: ["11st"], industry: "유통/이커머스",
    financialHistory: genFin(820_000_000_000, -150_000_000_000, -200_000_000_000), source: "Mock 추정치", updatedAt: "2023-12" },
  { id: "gmarket", name: "G마켓", aliases: ["gmarket"], industry: "유통/이커머스",
    financialHistory: genFin(500_000_000_000, -30_000_000_000, -40_000_000_000), source: "Mock 추정치", updatedAt: "2023-12" },
  { id: "samsung_life", name: "삼성생명", aliases: ["samsung life"], industry: "보험",
    financialHistory: genFin(36_000_000_000_000, 2_100_000_000_000, 1_800_000_000_000), source: "Mock 추정치", updatedAt: "2023-12" },
  { id: "hyundai_marine", name: "현대해상", aliases: ["hyundai marine"], industry: "보험",
    financialHistory: genFin(16_000_000_000_000, 800_000_000_000, 600_000_000_000), source: "Mock 추정치", updatedAt: "2023-12" },
  { id: "db_insurance", name: "DB손해보험", aliases: ["db insurance"], industry: "보험",
    financialHistory: genFin(17_000_000_000_000, 1_000_000_000_000, 850_000_000_000), source: "Mock 추정치", updatedAt: "2023-12" },
  { id: "kb_kookmin", name: "KB국민은행", aliases: ["kb bank", "국민은행"], industry: "금융",
    financialHistory: genFin(13_000_000_000_000, 4_200_000_000_000, 3_200_000_000_000), source: "Mock 추정치", updatedAt: "2023-12" },
  { id: "shinhan", name: "신한은행", aliases: ["shinhan"], industry: "금융",
    financialHistory: genFin(12_500_000_000_000, 4_100_000_000_000, 3_100_000_000_000), source: "Mock 추정치", updatedAt: "2023-12" },
  { id: "hana", name: "하나은행", aliases: ["hana bank"], industry: "금융",
    financialHistory: genFin(10_000_000_000_000, 3_500_000_000_000, 2_700_000_000_000), source: "Mock 추정치", updatedAt: "2023-12" },
  { id: "samsung_elec", name: "삼성전자", aliases: ["samsung"], industry: "제조/서비스",
    financialHistory: genFin(258_000_000_000_000, 6_500_000_000_000, 15_000_000_000_000), source: "Mock 추정치", updatedAt: "2023-12" },
  { id: "lg_elec", name: "LG전자", aliases: ["lg"], industry: "제조/서비스",
    financialHistory: genFin(84_000_000_000_000, 3_500_000_000_000, 1_200_000_000_000), source: "Mock 추정치", updatedAt: "2023-12" },
];

/* ========================================================================= */
/*  [INDUSTRY PRESETS] — 운영정보                                             */
/* ========================================================================= */

const INDUSTRY_PRESETS = {
  금융: { monthlyInboundVolume: 300_000, monthlyOutboundVolume: 50_000, agentCount: 300,
    averageAHTMinutes: 4.5, averageACWMinutes: 2.5, averageAgentAnnualCost: 42_000_000,
    operationHoursPerDay: 9, currentAutomationRate: 0.2,
    expectedSelfServiceRate: 0.3, expectedSttSummaryReductionRate: 0.35,
    expectedKmsProductivityRate: 0.12, expectedQaAutomationRate: 0.55,
    expectedForecastOptimizationRate: 0.07, expectedRepeatContactReductionRate: 0.12,
    riskAdjustmentFactor: 0.85 },
  보험: { monthlyInboundVolume: 200_000, monthlyOutboundVolume: 80_000, agentCount: 250,
    averageAHTMinutes: 6, averageACWMinutes: 3, averageAgentAnnualCost: 40_000_000,
    operationHoursPerDay: 10, currentAutomationRate: 0.15,
    expectedSelfServiceRate: 0.25, expectedSttSummaryReductionRate: 0.4,
    expectedKmsProductivityRate: 0.13, expectedQaAutomationRate: 0.6,
    expectedForecastOptimizationRate: 0.08, expectedRepeatContactReductionRate: 0.13,
    riskAdjustmentFactor: 0.85 },
  "유통/이커머스": { monthlyInboundVolume: 450_000, monthlyOutboundVolume: 30_000, agentCount: 200,
    averageAHTMinutes: 3.5, averageACWMinutes: 1.8, averageAgentAnnualCost: 36_000_000,
    operationHoursPerDay: 11, currentAutomationRate: 0.25,
    expectedSelfServiceRate: 0.4, expectedSttSummaryReductionRate: 0.3,
    expectedKmsProductivityRate: 0.1, expectedQaAutomationRate: 0.5,
    expectedForecastOptimizationRate: 0.09, expectedRepeatContactReductionRate: 0.16,
    riskAdjustmentFactor: 0.85 },
  통신: { monthlyInboundVolume: 600_000, monthlyOutboundVolume: 120_000, agentCount: 400,
    averageAHTMinutes: 4, averageACWMinutes: 2, averageAgentAnnualCost: 40_000_000,
    operationHoursPerDay: 12, currentAutomationRate: 0.3,
    expectedSelfServiceRate: 0.32, expectedSttSummaryReductionRate: 0.35,
    expectedKmsProductivityRate: 0.12, expectedQaAutomationRate: 0.6,
    expectedForecastOptimizationRate: 0.1, expectedRepeatContactReductionRate: 0.13,
    riskAdjustmentFactor: 0.85 },
  "제조/서비스": { monthlyInboundVolume: 80_000, monthlyOutboundVolume: 20_000, agentCount: 80,
    averageAHTMinutes: 5, averageACWMinutes: 2.5, averageAgentAnnualCost: 38_000_000,
    operationHoursPerDay: 9, currentAutomationRate: 0.1,
    expectedSelfServiceRate: 0.22, expectedSttSummaryReductionRate: 0.3,
    expectedKmsProductivityRate: 0.1, expectedQaAutomationRate: 0.45,
    expectedForecastOptimizationRate: 0.06, expectedRepeatContactReductionRate: 0.08,
    riskAdjustmentFactor: 0.85 },
  공공: { monthlyInboundVolume: 150_000, monthlyOutboundVolume: 10_000, agentCount: 120,
    averageAHTMinutes: 5.5, averageACWMinutes: 3, averageAgentAnnualCost: 34_000_000,
    operationHoursPerDay: 9, currentAutomationRate: 0.12,
    expectedSelfServiceRate: 0.22, expectedSttSummaryReductionRate: 0.3,
    expectedKmsProductivityRate: 0.09, expectedQaAutomationRate: 0.45,
    expectedForecastOptimizationRate: 0.05, expectedRepeatContactReductionRate: 0.08,
    riskAdjustmentFactor: 0.8 },
};

/* ========================================================================= */
/*  [LIB: FORMAT]                                                             */
/* ========================================================================= */

function formatCurrency(value, unit = "EOK") {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (unit === "EOK") {
    const v = abs / 100_000_000;
    const digits = v >= 100 ? 0 : v >= 10 ? 1 : 2;
    return sign + v.toLocaleString("ko-KR", { maximumFractionDigits: digits });
  }
  if (unit === "MAN") {
    const v = abs / 10_000;
    return sign + v.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
  }
  return sign + abs.toLocaleString("ko-KR");
}

function formatCurrencyWithUnit(value, unit = "EOK") {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${formatCurrency(value, unit)}${unitLabel(unit)}`;
}

function formatCompactCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 100_000_000) {
    const v = abs / 100_000_000;
    const d = v >= 100 ? 0 : v >= 10 ? 1 : 2;
    return `${sign}${v.toLocaleString("ko-KR", { maximumFractionDigits: d })}억`;
  }
  if (abs >= 10_000) return `${sign}${(abs / 10_000).toLocaleString("ko-KR", { maximumFractionDigits: 0 })}만`;
  return `${sign}${abs.toLocaleString("ko-KR")}`;
}

function unitLabel(unit) {
  if (unit === "EOK") return "억원";
  if (unit === "MAN") return "만원";
  return "원";
}

function formatPercent(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${(value * 100).toFixed(digits)}%`;
}

/* ========================================================================= */
/*  [SERVICES: COMPANY LOOKUP]                                                */
/* ========================================================================= */

const createMockCompanyLookup = (companies) => ({
  name: "mock",
  search: async (query) => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return [];
    return companies
      .filter((c) => c.name.toLowerCase().includes(q) || (c.aliases || []).some((a) => a.toLowerCase().includes(q)))
      .slice(0, 8);
  },
});
const companyLookupService = createMockCompanyLookup(MOCK_COMPANIES);

/* ========================================================================= */
/*  [LIB: CALCULATIONS]                                                       */
/* ========================================================================= */

const QA_SHARE_OF_LABOR = 0.05;
const REPEAT_SHARE_OF_CONTACTS = 0.3;

// 시나리오 배수 적용
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

// 시너지 배수 계산 (해당 카테고리 effectType에 대해)
function computeSynergyBonus(selectedSolutions, effectType) {
  let bonus = 0;
  SYNERGY_RULES.forEach((r) => {
    if (r.affects === effectType && selectedSolutions[r.a] && selectedSolutions[r.b]) {
      bonus += r.bonus;
    }
  });
  return bonus;
}

// 핵심 시나리오 계산기
function computeScenario(rawInput, scenario) {
  const input = applyScenarioMultiplier(rawInput, scenario);
  const risk = Math.max(0.3, Math.min(1, input.riskAdjustmentFactor));
  const selected = input.selectedSolutions || {};

  const laborCost = input.agentCount * input.averageAgentAnnualCost;
  const aht = Math.max(0.1, input.averageAHTMinutes);
  const acw = Math.max(0, input.averageACWMinutes);
  const total = aht + acw;
  const ahtShare = total > 0 ? aht / total : 0.7;
  const acwShare = total > 0 ? acw / total : 0.3;

  // 문의유형 기반 가중치 (각 솔루션별)
  const inquiryTypes = input.inquiryTypes || [];
  const w = (k) => computeSolutionWeightFromInquiry(inquiryTypes, k);

  // 시너지 보너스
  const synergySelf = computeSynergyBonus(selected, "selfService");
  const synergyAcw = computeSynergyBonus(selected, "acwReduction");
  const synergyAht = computeSynergyBonus(selected, "ahtReduction");
  const synergyQa = computeSynergyBonus(selected, "qaAutomation");
  const synergyForecast = computeSynergyBonus(selected, "forecast");
  const synergyRepeat = computeSynergyBonus(selected, "repeatReduction");

  // ----- 각 솔루션별 편익 (선택된 것만)
  const savingsBySolution = {};

  // 셀프서비스 그룹 (Chatbot / Voicebot / Routing)
  const incSelf = Math.max(0, input.expectedSelfServiceRate - input.currentAutomationRate);
  const selfBase = laborCost * incSelf * risk * (1 + synergySelf);

  if (selected.chatbot) {
    const s = SOLUTION_BY_KEY.chatbot;
    savingsBySolution.chatbot = selfBase * (s.baseBenefitRate / 0.18) * w("chatbot") * 0.45;
    // 셀프서비스 잠재 풀을 Chatbot/Voicebot/Routing이 나눠 갖는 구조
  } else savingsBySolution.chatbot = 0;

  if (selected.voicebot) {
    savingsBySolution.voicebot = selfBase * (SOLUTION_BY_KEY.voicebot.baseBenefitRate / 0.18) * w("voicebot") * 0.35;
  } else savingsBySolution.voicebot = 0;

  if (selected.routingBot) {
    savingsBySolution.routingBot = selfBase * (SOLUTION_BY_KEY.routingBot.baseBenefitRate / 0.18) * w("routingBot") * 0.2;
  } else savingsBySolution.routingBot = 0;

  const selfSavingsTotal = savingsBySolution.chatbot + savingsBySolution.voicebot + savingsBySolution.routingBot;
  const remainingAfterSelf = Math.max(0, laborCost - selfSavingsTotal);

  // ACW 영역 (STT / 자동요약)
  if (selected.stt) {
    savingsBySolution.stt = remainingAfterSelf * acwShare * input.expectedSttSummaryReductionRate * risk * (1 + synergyAcw) * w("stt") * 0.4;
  } else savingsBySolution.stt = 0;

  if (selected.autoSummary) {
    savingsBySolution.autoSummary = remainingAfterSelf * acwShare * input.expectedSttSummaryReductionRate * risk * (1 + synergyAcw) * w("autoSummary") * 0.55;
  } else savingsBySolution.autoSummary = 0;

  // AHT 영역 (AI KMS / AI Tutor)
  if (selected.aiKms) {
    savingsBySolution.aiKms = remainingAfterSelf * ahtShare * input.expectedKmsProductivityRate * risk * (1 + synergyAht) * w("aiKms") * 0.7;
  } else savingsBySolution.aiKms = 0;

  if (selected.aiTutor) {
    savingsBySolution.aiTutor = remainingAfterSelf * ahtShare * input.expectedKmsProductivityRate * risk * 0.4 * w("aiTutor");
  } else savingsBySolution.aiTutor = 0;

  // QA
  if (selected.aiQa) {
    savingsBySolution.aiQa = laborCost * QA_SHARE_OF_LABOR * input.expectedQaAutomationRate * risk * (1 + synergyQa) * w("aiQa");
  } else savingsBySolution.aiQa = 0;

  // Forecast / Dashboard
  const remainingAfterOps = Math.max(0, remainingAfterSelf - savingsBySolution.stt - savingsBySolution.autoSummary - savingsBySolution.aiKms - savingsBySolution.aiTutor);
  if (selected.forecast) {
    savingsBySolution.forecast = remainingAfterOps * input.expectedForecastOptimizationRate * risk * (1 + synergyForecast) * w("forecast") * 0.7;
  } else savingsBySolution.forecast = 0;
  if (selected.taDashboard) {
    savingsBySolution.taDashboard = remainingAfterOps * input.expectedForecastOptimizationRate * risk * (1 + synergyForecast) * 0.3 * w("taDashboard");
  } else savingsBySolution.taDashboard = 0;

  // 재문의 감소 (DB Clustering)
  if (selected.dbClustering) {
    savingsBySolution.dbClustering = remainingAfterOps * REPEAT_SHARE_OF_CONTACTS * input.expectedRepeatContactReductionRate * risk * (1 + synergyRepeat) * w("dbClustering");
  } else savingsBySolution.dbClustering = 0;

  const annualSavings = Object.values(savingsBySolution).reduce((s, v) => s + v, 0);

  // ----- 비용 계산 (선택된 솔루션만) -----
  const costs = input.costs || {};
  // 일회성 비용 (구축/연동/커스터마이징/교육/튜닝)
  const oneTimeCost =
    (costs.implementationCost || 0) +
    (costs.integrationCost || 0) +
    (costs.customizationCost || 0) +
    (costs.trainingCost || 0) +
    (costs.tuningCost || 0);

  // 반복 비용 (구독/유지보수/LLM/인프라)
  const annualRecurringCost =
    (costs.annualSubscriptionCost || 0) +
    (costs.annualMaintenanceCost || 0) +
    (costs.annualLlmApiCost || 0) +
    (costs.infrastructureCost || 0) +
    (costs.optionalCost || 0);

  const totalInvestmentCost3Y = oneTimeCost + annualRecurringCost * 3;

  // ----- ROI 계산 -----
  const currentAnnualCost = laborCost;
  const futureAnnualCost = Math.max(0, currentAnnualCost - annualSavings) + annualRecurringCost;
  const annualBenefit = annualSavings;
  const annualNetBenefit = annualBenefit - annualRecurringCost;
  const firstYearNetBenefit = annualBenefit - (oneTimeCost + annualRecurringCost);

  // 3년 누적
  const threeYearBenefit = annualBenefit * 3;
  const threeYearNet = threeYearBenefit - totalInvestmentCost3Y;
  const threeYearRoi = totalInvestmentCost3Y > 0 ? (threeYearNet / totalInvestmentCost3Y) * 100 : 0;
  // 1년 ROI (첫해 기준)
  const firstYearTotalCost = oneTimeCost + annualRecurringCost;
  const firstYearRoi = firstYearTotalCost > 0 ? ((annualBenefit - firstYearTotalCost) / firstYearTotalCost) * 100 : 0;

  // Payback
  const monthlyNet = annualNetBenefit / 12;
  const paybackMonths = monthlyNet > 0 ? oneTimeCost / monthlyNet : Infinity;

  return {
    scenario, currentAnnualCost, futureAnnualCost, annualSavings, annualBenefit,
    annualRecurringCost, oneTimeCost, totalInvestmentCost3Y,
    annualNetBenefit, firstYearNetBenefit,
    firstYearRoi, roiPercent: threeYearRoi, paybackMonths,
    threeYearCumulativeNetBenefit: threeYearNet,
    savingsBySolution, appliedInput: input,
  };
}

function computeAllScenarios(input) {
  return {
    conservative: computeScenario(input, "conservative"),
    base: computeScenario(input, "base"),
    aggressive: computeScenario(input, "aggressive"),
  };
}

function rankSolutionContributions(result) {
  return SOLUTIONS_CATALOG
    .map((s) => ({ key: s.key, label: s.label, value: result.savingsBySolution[s.key] || 0 }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
}

/* ========================================================================= */
/*  [HELPERS]                                                                 */
/* ========================================================================= */

function pickLatestFinancials(history) {
  if (!history || history.length === 0) return { revenue: 0, operatingIncome: 0, netIncome: 0 };
  const sorted = [...history].sort((a, b) => Number(b.fiscalYear) - Number(a.fiscalYear));
  const latest = sorted[0];
  return {
    revenue: latest.revenue ?? 0,
    operatingIncome: latest.operatingIncome ?? 0,
    netIncome: latest.netIncome ?? 0,
  };
}

function createEmptyFinancialHistory() {
  const currentYear = new Date().getFullYear() - 1;
  return Array.from({ length: 5 }, (_, i) => ({
    fiscalYear: String(currentYear - (4 - i)),
    revenue: null, operatingIncome: null, netIncome: null,
    source: "수동 입력", currency: "KRW", isConsolidated: true,
  }));
}

// 선택된 솔루션에 따라 비용 기본값 합산
function computeDefaultCostsFromSelection(selected) {
  let implementationCost = 0;
  let annualSubscriptionCost = 0;
  SOLUTIONS_CATALOG.forEach((s) => {
    if (selected[s.key]) {
      implementationCost += s.defaultImplementationCost;
      annualSubscriptionCost += s.defaultAnnualCost;
    }
  });
  return {
    implementationCost,
    integrationCost: Math.round(implementationCost * 0.15),
    customizationCost: Math.round(implementationCost * 0.1),
    annualSubscriptionCost,
    annualMaintenanceCost: Math.round(annualSubscriptionCost * 0.2),
    annualLlmApiCost: Math.round(annualSubscriptionCost * 0.3),
    trainingCost: 30_000_000,
    tuningCost: 20_000_000,
    infrastructureCost: 60_000_000,
    optionalCost: 0,
  };
}

/* ========================================================================= */
/*  [DEFAULTS]                                                                */
/* ========================================================================= */

const DEFAULT_COMPANY = MOCK_COMPANIES.find((c) => c.id === "jbbank");
const DEFAULT_LATEST = pickLatestFinancials(DEFAULT_COMPANY.financialHistory);

const DEFAULT_SELECTED_SOLUTIONS = {
  chatbot: true, voicebot: true, stt: true, autoSummary: true,
  aiKms: true, aiQa: true, forecast: true,
  aiTutor: false, taDashboard: false, routingBot: false, dbClustering: false,
};

const DEFAULT_INPUT = {
  companyName: DEFAULT_COMPANY.name,
  companyId: DEFAULT_COMPANY.id,
  industry: DEFAULT_COMPANY.industry,
  annualRevenue: DEFAULT_LATEST.revenue,
  annualOperatingProfit: DEFAULT_LATEST.operatingIncome,
  financialHistory: DEFAULT_COMPANY.financialHistory,
  ...INDUSTRY_PRESETS[DEFAULT_COMPANY.industry],
  selectedSolutions: DEFAULT_SELECTED_SOLUTIONS,
  inquiryTypes: buildInquiryTypesForIndustry(DEFAULT_COMPANY.industry),
  costs: computeDefaultCostsFromSelection(DEFAULT_SELECTED_SOLUTIONS),
};

/* ========================================================================= */
/*  [THEME]                                                                   */
/* ========================================================================= */

const THEME = {
  bg: "#0a0a0b", panel: "#101012", panelElev: "#141417",
  border: "#1f1f23", borderSoft: "rgba(255,255,255,0.06)",
  text: "#e6e6e8", textMuted: "#8a8a94", textDim: "#5a5a63",
  accent: "#7c86ff", accentSoft: "rgba(124,134,255,0.12)",
  positive: "#34d399", positiveSoft: "rgba(52,211,153,0.14)",
  negative: "#f87171", warn: "#fbbf24",
  chart: {
    before: "#6b7280", after: "#7c86ff",
    stroke: "rgba(255,255,255,0.08)",
    module: ["#7c86ff", "#34d399", "#22d3ee", "#fbbf24", "#f472b6", "#a78bfa", "#fb923c", "#60a5fa", "#4ade80", "#c084fc", "#f87171"],
    revenue: "#7c86ff", operating: "#34d399", net: "#fbbf24",
    heatmap: ["#1a1a1e", "#2a2a3a", "#3a3a55", "#4a4a78", "#5a5aa0", "#7c86ff"],
  },
};

/* ========================================================================= */
/*  [UI PRIMITIVES]                                                           */
/* ========================================================================= */

function Card({ children, className = "", style = {}, hover = false }) {
  return (
    <div
      className={`rounded-xl border transition-colors ${hover ? "hover:border-white/10" : ""} ${className}`}
      style={{ background: THEME.panel, borderColor: THEME.border, ...style }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children, right, unit }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 rounded-sm" style={{ background: THEME.accent }} />
        <h3 className="text-sm font-semibold tracking-tight" style={{ color: THEME.text }}>
          {children}
        </h3>
      </div>
      <div className="flex items-center gap-2">
        {right}
        {unit && (
          <div className="text-[10px]" style={{ color: THEME.textDim }}>
            단위: <span style={{ color: THEME.textMuted }}>{unit}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Label({ children, badge }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <label className="text-xs" style={{ color: THEME.textMuted }}>{children}</label>
      {badge}
    </div>
  );
}

function Badge({ children, tone = "default" }) {
  const tones = {
    default: { bg: "rgba(255,255,255,0.05)", color: THEME.textMuted, border: THEME.border },
    accent: { bg: THEME.accentSoft, color: THEME.accent, border: "rgba(124,134,255,0.22)" },
    positive: { bg: THEME.positiveSoft, color: THEME.positive, border: "rgba(52,211,153,0.22)" },
    warn: { bg: "rgba(251,191,36,0.1)", color: THEME.warn, border: "rgba(251,191,36,0.2)" },
  };
  const t = tones[tone] || tones.default;
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-md border"
      style={{ background: t.bg, color: t.color, borderColor: t.border }}>
      {children}
    </span>
  );
}

function CurrencyInput({ value, onChange, unit = "EOK", placeholder = "0" }) {
  const [focused, setFocused] = useState(false);
  const [rawText, setRawText] = useState("");
  const divisor = unit === "EOK" ? 100_000_000 : unit === "MAN" ? 10_000 : 1;
  const displayValue = focused
    ? rawText
    : value === null || value === undefined || Number.isNaN(value)
    ? ""
    : (value / divisor).toLocaleString("ko-KR", { maximumFractionDigits: unit === "KRW" ? 0 : 2 });
  return (
    <div className="flex items-center rounded-md border focus-within:border-white/20 transition-colors"
      style={{ borderColor: THEME.border, background: THEME.panelElev }}>
      <input
        type="text" inputMode="decimal" value={displayValue} placeholder={placeholder}
        onFocus={() => {
          setFocused(true);
          setRawText(value === null || value === undefined ? "" : String(value / divisor));
        }}
        onBlur={() => {
          setFocused(false);
          const cleaned = rawText.replace(/,/g, "").trim();
          if (cleaned === "" || cleaned === "-") onChange(null);
          else {
            const num = parseFloat(cleaned);
            if (!Number.isNaN(num)) onChange(num * divisor);
          }
        }}
        onChange={(e) => {
          const v = e.target.value;
          if (/^-?[\d,]*\.?\d*$/.test(v)) setRawText(v);
        }}
        className="w-full bg-transparent px-2.5 py-1.5 text-sm outline-none tabular-nums"
        style={{ color: THEME.text }}
      />
      <span className="pr-2.5 text-[10px] tabular-nums font-medium" style={{ color: THEME.textDim }}>
        {unitLabel(unit)}
      </span>
    </div>
  );
}

function NumberInput({ value, onChange, suffix, step = 1, min = 0, max }) {
  return (
    <div className="flex items-center rounded-md border focus-within:border-white/20 transition-colors"
      style={{ borderColor: THEME.border, background: THEME.panelElev }}>
      <input
        type="number" value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        step={step} min={min} max={max}
        className="w-full bg-transparent px-2.5 py-1.5 text-sm outline-none tabular-nums"
        style={{ color: THEME.text }}
      />
      {suffix && <span className="pr-2.5 text-xs tabular-nums" style={{ color: THEME.textDim }}>{suffix}</span>}
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
        <div className="absolute inset-x-0 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div className="absolute h-1 rounded-full" style={{ width: `${pct}%`, background: THEME.accent, left: 0 }} />
        <input type="range" value={value} min={min} max={max} step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer" />
        <div className="absolute w-3 h-3 rounded-full shadow pointer-events-none"
          style={{ left: `calc(${pct}% - 6px)`, background: "#fff", boxShadow: "0 0 0 3px rgba(124,134,255,0.25)" }} />
      </div>
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <div className="rounded-md border focus-within:border-white/20 transition-colors"
      style={{ borderColor: THEME.border, background: THEME.panelElev }}>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent px-2.5 py-1.5 text-sm outline-none appearance-none cursor-pointer"
        style={{ color: THEME.text }}>
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: THEME.panelElev, color: THEME.text }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ========================================================================= */
/*  [COMPANY AUTOCOMPLETE]                                                    */
/* ========================================================================= */

function CompanyAutocomplete({ value, onSelect, onChangeRaw, lookup, onClear }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => setQuery(value || ""), [value]);

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
      if (!query || query.length < 1) { setResults([]); return; }
      setLoading(true);
      try {
        const r = await lookup.search(query);
        if (active) setResults(r);
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [query, lookup]);

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-center rounded-md border focus-within:border-white/20 transition-colors"
        style={{ borderColor: THEME.border, background: THEME.panelElev }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="ml-2.5" style={{ color: THEME.textDim }}>
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path d="M20 20L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); onChangeRaw?.(e.target.value); }}
          onFocus={() => setOpen(true)}
          placeholder="회사명 검색 (SSG / 솔리티 / 전북은행 등)"
          className="w-full bg-transparent px-2 py-1.5 text-sm outline-none" style={{ color: THEME.text }} />
        {query && (
          <button onClick={() => { setQuery(""); setOpen(true); onClear?.(); }}
            className="pr-2 text-xs hover:opacity-80" style={{ color: THEME.textDim }} title="초기화">✕</button>
        )}
      </div>
      {open && query.length >= 1 && (
        <div className="absolute z-30 mt-1 w-full rounded-md border shadow-xl overflow-hidden"
          style={{ background: THEME.panelElev, borderColor: THEME.border, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
          {loading && <div className="px-3 py-2 text-xs" style={{ color: THEME.textDim }}>검색 중...</div>}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-xs" style={{ color: THEME.textDim }}>
              일치하는 회사가 없습니다. 수동 입력으로 진행하세요.
            </div>
          )}
          {!loading && results.map((c) => {
            const latest = pickLatestFinancials(c.financialHistory);
            return (
              <button key={c.id}
                onClick={() => { onSelect(c); setQuery(c.name); setOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/5 transition-colors">
                <div>
                  <div className="text-sm" style={{ color: THEME.text }}>{c.name}</div>
                  <div className="text-[10px]" style={{ color: THEME.textDim }}>
                    {c.industry} · 매출 {formatCompactCurrency(latest.revenue)}원 · {c.financialHistory.length}개년 재무
                  </div>
                </div>
                <Badge tone="accent">외부 조회</Badge>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ========================================================================= */
/*  [CHART TOOLTIP]                                                           */
/* ========================================================================= */

function ChartTooltip({ active, payload, label, unit = "EOK", renderLabel }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border px-3 py-2 shadow-xl"
      style={{ background: THEME.panelElev, borderColor: THEME.border, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
      {label && <div className="text-[11px] mb-1" style={{ color: THEME.textMuted }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs tabular-nums">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span style={{ color: THEME.textMuted }}>{p.name}</span>
          <span style={{ color: THEME.text }}>
            {renderLabel ? renderLabel(p.value) : formatCurrencyWithUnit(p.value, unit)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ========================================================================= */
/*  [CHARTS]                                                                  */
/* ========================================================================= */

function FinancialHistoryChart({ history, unit = "EOK" }) {
  const data = [...history].sort((a, b) => Number(a.fiscalYear) - Number(b.fiscalYear))
    .map((h) => ({ year: `${h.fiscalYear}`, 매출: h.revenue, 영업이익: h.operatingIncome, 순이익: h.netIncome }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 16, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={THEME.chart.stroke} vertical={false} />
        <XAxis dataKey="year" tick={{ fill: THEME.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: THEME.textMuted, fontSize: 11 }} axisLine={false} tickLine={false}
          tickFormatter={(v) => formatCurrency(v, unit)} width={60} />
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Legend wrapperStyle={{ fontSize: 11, color: THEME.textMuted, paddingTop: 8 }} iconType="circle" iconSize={8} />
        <Bar dataKey="매출" fill={THEME.chart.revenue} radius={[4, 4, 0, 0]} maxBarSize={32} />
        <Line type="monotone" dataKey="영업이익" stroke={THEME.chart.operating} strokeWidth={2} dot={{ r: 3, fill: THEME.chart.operating }} />
        <Line type="monotone" dataKey="순이익" stroke={THEME.chart.net} strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3, fill: THEME.chart.net }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function CostComparisonChart({ current, future, unit }) {
  const data = [
    { name: "도입 전", value: current, fill: THEME.chart.before },
    { name: "도입 후", value: future, fill: THEME.chart.after },
  ];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={THEME.chart.stroke} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: THEME.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: THEME.textMuted, fontSize: 11 }} axisLine={false} tickLine={false}
          tickFormatter={(v) => formatCurrency(v, unit)} width={60} />
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={90}>
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function SolutionSavingsChart({ result, unit }) {
  const rows = rankSolutionContributions(result);
  const total = rows.reduce((s, r) => s + r.value, 0);
  if (rows.length === 0) {
    return <div className="text-xs py-8 text-center" style={{ color: THEME.textDim }}>선택된 솔루션이 없습니다.</div>;
  }
  return (
    <div className="flex items-center gap-4">
      <div className="relative" style={{ width: 180, height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="label" innerRadius={55} outerRadius={82} paddingAngle={2} stroke="none">
              {rows.map((r, i) => (
                <Cell key={r.key} fill={THEME.chart.module[i % THEME.chart.module.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip unit={unit} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-[10px]" style={{ color: THEME.textDim }}>연간 절감</div>
          <div className="text-sm font-semibold tabular-nums" style={{ color: THEME.text }}>
            {formatCurrency(total, unit)}
          </div>
          <div className="text-[9px]" style={{ color: THEME.textDim }}>{unitLabel(unit)}</div>
        </div>
      </div>
      <div className="flex-1 grid grid-cols-1 gap-1 max-h-[200px] overflow-y-auto">
        {rows.map((r, i) => {
          const pct = total > 0 ? (r.value / total) * 100 : 0;
          return (
            <div key={r.key} className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: THEME.chart.module[i % THEME.chart.module.length] }} />
                <span className="truncate" style={{ color: THEME.textMuted }}>{r.label}</span>
              </div>
              <div className="flex items-center gap-2 tabular-nums flex-shrink-0">
                <span style={{ color: THEME.textDim }}>{pct.toFixed(0)}%</span>
                <span style={{ color: THEME.text, minWidth: 60, textAlign: "right" }}>
                  {formatCurrency(r.value, unit)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CostBreakdownChart({ costs, unit }) {
  const items = [
    { key: "implementation", label: "초기 구축비", value: costs.implementationCost || 0, kind: "oneTime" },
    { key: "integration", label: "연동 개발비", value: costs.integrationCost || 0, kind: "oneTime" },
    { key: "customization", label: "커스터마이징", value: costs.customizationCost || 0, kind: "oneTime" },
    { key: "training", label: "교육비", value: costs.trainingCost || 0, kind: "oneTime" },
    { key: "tuning", label: "튜닝비", value: costs.tuningCost || 0, kind: "oneTime" },
    { key: "subscription", label: "연간 구독료", value: costs.annualSubscriptionCost || 0, kind: "recurring" },
    { key: "maintenance", label: "유지보수 (연)", value: costs.annualMaintenanceCost || 0, kind: "recurring" },
    { key: "llm", label: "LLM/API (연)", value: costs.annualLlmApiCost || 0, kind: "recurring" },
    { key: "infra", label: "인프라 (연)", value: costs.infrastructureCost || 0, kind: "recurring" },
  ].filter((i) => i.value > 0);

  const total = items.reduce((s, i) => s + i.value, 0);

  return (
    <div className="grid grid-cols-1 gap-1.5">
      {items.map((item, i) => {
        const pct = total > 0 ? (item.value / total) * 100 : 0;
        return (
          <div key={item.key} className="flex items-center gap-2 text-[11px]">
            <span className="inline-block w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: item.kind === "oneTime" ? THEME.accent : THEME.positive }} />
            <span className="flex-1 truncate" style={{ color: THEME.textMuted }}>{item.label}</span>
            <div className="relative flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="absolute inset-y-0 left-0"
                style={{ width: `${pct}%`, background: item.kind === "oneTime" ? THEME.accent : THEME.positive }} />
            </div>
            <span className="tabular-nums text-right" style={{ color: THEME.text, minWidth: 60 }}>
              {formatCurrency(item.value, unit)}
            </span>
          </div>
        );
      })}
      <div className="mt-2 pt-2 border-t flex items-center gap-4 text-[10px]" style={{ borderColor: THEME.borderSoft }}>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: THEME.accent }} />
          <span style={{ color: THEME.textDim }}>일회성</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: THEME.positive }} />
          <span style={{ color: THEME.textDim }}>반복(연)</span>
        </div>
      </div>
    </div>
  );
}

function CumulativeBenefitChart({ result, unit }) {
  const data = [];
  const init = result.oneTimeCost;
  const maint = result.annualRecurringCost;
  let cumulative = -init;
  data.push({ year: "Year 0", value: cumulative });
  for (let y = 1; y <= 3; y++) {
    cumulative += result.annualSavings - maint;
    data.push({ year: `Year ${y}`, value: cumulative });
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
        <XAxis dataKey="year" tick={{ fill: THEME.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: THEME.textMuted, fontSize: 11 }} axisLine={false} tickLine={false}
          tickFormatter={(v) => formatCurrency(v, unit)} width={60} />
        <Tooltip content={<ChartTooltip unit={unit} />} />
        <Area type="monotone" dataKey="value" name="누적 순편익" stroke={THEME.accent} strokeWidth={2} fill="url(#benefitGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ScenarioComparisonChart({ results, unit }) {
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
        <YAxis tick={{ fill: THEME.textMuted, fontSize: 11 }} axisLine={false} tickLine={false}
          tickFormatter={(v) => formatCurrency(v, unit)} width={60} />
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Legend wrapperStyle={{ fontSize: 11, color: THEME.textMuted }} iconType="circle" iconSize={8} />
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
  return (
    <div className="pt-2">
      <div className="relative h-10">
        <div className="absolute top-1/2 left-0 right-0 h-[3px] -translate-y-1/2 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }} />
        {finite && <div className="absolute top-1/2 left-0 h-[3px] -translate-y-1/2 rounded-full" style={{ width: `${pct * 100}%`, background: THEME.accent }} />}
        <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full" style={{ left: 0, background: THEME.textMuted }} />
        {finite && (
          <div className="absolute top-1/2 -translate-y-1/2" style={{ left: `calc(${pct * 100}% - 8px)` }}>
            <div className="w-4 h-4 rounded-full" style={{ background: "#fff", boxShadow: `0 0 0 4px ${THEME.accentSoft}` }} />
          </div>
        )}
        <div className="absolute inset-x-0 top-full mt-1.5 flex justify-between text-[10px] tabular-nums" style={{ color: THEME.textDim }}>
          {[0, 6, 12, 18, 24, 30, 36].map((m) => <span key={m}>{m}M</span>)}
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between text-xs">
        <div style={{ color: THEME.textMuted }}>현재 (투자 시점)</div>
        <div style={{ color: THEME.text }}>
          {finite ? (
            <>
              <span className="tabular-nums font-semibold">{payback.toFixed(1)}개월</span>
              <span style={{ color: THEME.textMuted }} className="ml-1">후 원금 회수</span>
            </>
          ) : <span style={{ color: THEME.warn }}>현재 가정으로는 회수 어려움</span>}
        </div>
      </div>
    </div>
  );
}

// 문의유형 비중 차트
function InquiryTypePieChart({ inquiryTypes }) {
  const data = inquiryTypes.filter((t) => t.ratio > 0).map((t) => ({ name: t.name, value: t.ratio }));
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-4">
      <div className="relative" style={{ width: 160, height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={1} stroke="none">
              {data.map((_, i) => <Cell key={i} fill={THEME.chart.module[i % THEME.chart.module.length]} />)}
            </Pie>
            <Tooltip content={<ChartTooltip renderLabel={(v) => formatPercent(v)} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-[10px]" style={{ color: THEME.textDim }}>합계</div>
          <div className="text-sm font-semibold tabular-nums" style={{ color: total === 1 ? THEME.positive : THEME.warn }}>
            {(total * 100).toFixed(0)}%
          </div>
        </div>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: THEME.chart.module[i % THEME.chart.module.length] }} />
              <span className="truncate" style={{ color: THEME.textMuted }}>{d.name}</span>
            </div>
            <span className="tabular-nums" style={{ color: THEME.text }}>{(d.value * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 문의유형 × 솔루션 효과 히트맵
function InquirySolutionHeatmap({ inquiryTypes, selectedSolutions }) {
  const selectedKeys = SOLUTIONS_CATALOG.filter((s) => selectedSolutions[s.key]).map((s) => s.key);
  if (selectedKeys.length === 0) {
    return <div className="text-xs py-8 text-center" style={{ color: THEME.textDim }}>선택된 솔루션이 없습니다.</div>;
  }
  const filteredTypes = inquiryTypes.filter((t) => t.ratio > 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10px] tabular-nums">
        <thead>
          <tr>
            <th className="text-left py-2 px-1 sticky left-0 z-10" style={{ color: THEME.textDim, background: THEME.panel }}>문의유형</th>
            {selectedKeys.map((k) => (
              <th key={k} className="text-center py-2 px-1 font-normal" style={{ color: THEME.textDim, writingMode: "horizontal-tb" }}>
                {SOLUTION_BY_KEY[k].label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredTypes.map((t) => (
            <tr key={t.id}>
              <td className="py-1.5 px-1 sticky left-0 z-10" style={{ color: THEME.textMuted, background: THEME.panel }}>
                {t.name} <span style={{ color: THEME.textDim }}>({(t.ratio * 100).toFixed(0)}%)</span>
              </td>
              {selectedKeys.map((k) => {
                const affinity = INQUIRY_SOLUTION_AFFINITY[t.id]?.[k] ?? 1.0;
                // 0.5 ~ 1.3 → 0 ~ 1로 정규화
                const norm = Math.max(0, Math.min(1, (affinity - 0.5) / 0.8));
                const colorIdx = Math.round(norm * (THEME.chart.heatmap.length - 1));
                const bg = THEME.chart.heatmap[colorIdx];
                return (
                  <td key={k} className="text-center p-0.5">
                    <div className="rounded px-1 py-0.5 text-center"
                      style={{ background: bg, color: norm > 0.5 ? "#fff" : THEME.textMuted, fontSize: 10 }}
                      title={`${t.name} × ${SOLUTION_BY_KEY[k].label}: 가중치 ${affinity.toFixed(2)}`}>
                      {affinity.toFixed(2)}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center gap-2 text-[10px]" style={{ color: THEME.textDim }}>
        <span>낮음</span>
        <div className="flex gap-0.5">
          {THEME.chart.heatmap.map((c, i) => (
            <div key={i} className="w-4 h-3 rounded-sm" style={{ background: c }} />
          ))}
        </div>
        <span>높음</span>
        <span className="ml-2">(가중치 1.0 = 기준)</span>
      </div>
    </div>
  );
}

/* ========================================================================= */
/*  [KPI CARD]                                                                */
/* ========================================================================= */

function KpiCard({ label, value, sub, tone = "default", large, unit }) {
  const toneColor = tone === "positive" ? THEME.positive : tone === "accent" ? THEME.accent : THEME.text;
  return (
    <Card className="p-4 relative" hover>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] tracking-wide uppercase" style={{ color: THEME.textDim, letterSpacing: "0.04em" }}>{label}</div>
        {unit && (
          <div className="text-[10px]" style={{ color: THEME.textDim }}>
            단위: <span style={{ color: THEME.textMuted }}>{unit}</span>
          </div>
        )}
      </div>
      <div className={`mt-1.5 font-semibold tabular-nums ${large ? "text-2xl" : "text-xl"}`}
        style={{ color: toneColor, letterSpacing: "-0.02em" }}>
        {value}
      </div>
      {sub && <div className="mt-1 text-[11px]" style={{ color: THEME.textMuted }}>{sub}</div>}
    </Card>
  );
}

/* ========================================================================= */
/*  [FINANCIAL HISTORY TABLE]                                                 */
/* ========================================================================= */

function InlineCurrencyInput({ value, onChange, unit }) {
  const divisor = unit === "EOK" ? 100_000_000 : unit === "MAN" ? 10_000 : 1;
  const [focused, setFocused] = useState(false);
  const [rawText, setRawText] = useState("");
  const displayValue = focused
    ? rawText
    : value === null || value === undefined || Number.isNaN(value)
    ? ""
    : (value / divisor).toLocaleString("ko-KR", { maximumFractionDigits: unit === "KRW" ? 0 : 2 });
  return (
    <input type="text" inputMode="decimal" value={displayValue} placeholder="—"
      onFocus={() => { setFocused(true); setRawText(value === null || value === undefined ? "" : String(value / divisor)); }}
      onBlur={() => {
        setFocused(false);
        const cleaned = rawText.replace(/,/g, "").trim();
        if (cleaned === "" || cleaned === "-") onChange(null);
        else {
          const num = parseFloat(cleaned);
          if (!Number.isNaN(num)) onChange(num * divisor);
        }
      }}
      onChange={(e) => { const v = e.target.value; if (/^-?[\d,]*\.?\d*$/.test(v)) setRawText(v); }}
      className="w-full bg-transparent text-right text-xs outline-none px-1 py-1 rounded hover:bg-white/5 focus:bg-white/5"
      style={{ color: THEME.text }} />
  );
}

function FinancialHistoryTable({ history, onChange, unit }) {
  function updateRow(idx, field, value) {
    onChange(history.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  }
  function updateYear(idx, year) {
    onChange(history.map((row, i) => (i === idx ? { ...row, fiscalYear: year } : row)));
  }
  return (
    <div className="overflow-x-auto rounded-md border" style={{ borderColor: THEME.borderSoft }}>
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr style={{ background: "rgba(255,255,255,0.025)" }}>
            <th className="text-left font-medium py-2 px-3 w-[70px]" style={{ color: THEME.textDim }}>연도</th>
            <th className="text-right font-medium py-2 px-2" style={{ color: THEME.textDim }}>매출액</th>
            <th className="text-right font-medium py-2 px-2" style={{ color: THEME.textDim }}>영업이익</th>
            <th className="text-right font-medium py-2 px-2" style={{ color: THEME.textDim }}>순이익</th>
          </tr>
        </thead>
        <tbody>
          {history.map((row, i) => (
            <tr key={i} className="border-t" style={{ borderColor: THEME.borderSoft }}>
              <td className="px-2 py-1">
                <input value={row.fiscalYear} onChange={(e) => updateYear(i, e.target.value)}
                  className="w-full bg-transparent text-center text-xs outline-none" style={{ color: THEME.text }} />
              </td>
              <td className="px-1.5 py-1"><InlineCurrencyInput value={row.revenue} onChange={(v) => updateRow(i, "revenue", v)} unit={unit} /></td>
              <td className="px-1.5 py-1"><InlineCurrencyInput value={row.operatingIncome} onChange={(v) => updateRow(i, "operatingIncome", v)} unit={unit} /></td>
              <td className="px-1.5 py-1"><InlineCurrencyInput value={row.netIncome} onChange={(v) => updateRow(i, "netIncome", v)} unit={unit} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ========================================================================= */
/*  [SOLUTION SELECTOR]                                                       */
/* ========================================================================= */

function SolutionSelector({ selectedSolutions, onToggle }) {
  const categories = [
    { key: "셀프서비스", label: "셀프서비스" },
    { key: "상담지원", label: "상담지원" },
    { key: "품질관리", label: "품질관리" },
    { key: "운영최적화", label: "운영최적화" },
  ];
  return (
    <div className="space-y-3">
      {categories.map((cat) => {
        const items = SOLUTIONS_CATALOG.filter((s) => s.category === cat.key);
        return (
          <div key={cat.key}>
            <div className="text-[10px] uppercase mb-1.5 tracking-wide" style={{ color: THEME.textDim, letterSpacing: "0.04em" }}>
              {cat.label}
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {items.map((s) => {
                const isSel = selectedSolutions[s.key];
                return (
                  <button key={s.key} onClick={() => onToggle(s.key)}
                    className="flex items-start gap-2.5 px-3 py-2 rounded-md border transition-colors text-left"
                    style={{
                      borderColor: isSel ? "rgba(124,134,255,0.35)" : THEME.border,
                      background: isSel ? THEME.accentSoft : "transparent",
                    }}>
                    <div className="flex-shrink-0 mt-0.5 w-4 h-4 rounded border flex items-center justify-center"
                      style={{
                        borderColor: isSel ? THEME.accent : THEME.border,
                        background: isSel ? THEME.accent : "transparent",
                      }}>
                      {isSel && (
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8L6.5 11.5L13 4.5" stroke="#0a0a0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium" style={{ color: isSel ? THEME.accent : THEME.text }}>
                        {s.label}
                      </div>
                      <div className="text-[10px] mt-0.5" style={{ color: THEME.textDim }}>{s.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ========================================================================= */
/*  [INQUIRY TYPES TABLE]                                                     */
/* ========================================================================= */

function InquiryTypesTable({ inquiryTypes, onChange }) {
  const total = inquiryTypes.reduce((s, t) => s + t.ratio, 0);
  const isValid = Math.abs(total - 1) < 0.005;

  function updateRatio(id, ratio) {
    onChange(inquiryTypes.map((t) => (t.id === id ? { ...t, ratio } : t)));
  }
  function updateFit(id, automationFit) {
    onChange(inquiryTypes.map((t) => (t.id === id ? { ...t, automationFit } : t)));
  }
  function normalize() {
    if (total <= 0) return;
    onChange(inquiryTypes.map((t) => ({ ...t, ratio: t.ratio / total })));
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-md border" style={{ borderColor: THEME.borderSoft }}>
        <table className="w-full text-[11px] tabular-nums">
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.025)" }}>
              <th className="text-left font-medium py-2 px-3" style={{ color: THEME.textDim }}>문의유형</th>
              <th className="text-right font-medium py-2 px-2 w-[80px]" style={{ color: THEME.textDim }}>비중</th>
              <th className="text-right font-medium py-2 px-2 w-[90px]" style={{ color: THEME.textDim }}>자동화 적합도</th>
              <th className="text-left font-medium py-2 px-2 w-[60px]" style={{ color: THEME.textDim }}>복잡도</th>
            </tr>
          </thead>
          <tbody>
            {inquiryTypes.map((t) => (
              <tr key={t.id} className="border-t" style={{ borderColor: THEME.borderSoft }}>
                <td className="px-3 py-1.5" style={{ color: THEME.text }}>{t.name}</td>
                <td className="px-2 py-1">
                  <div className="flex items-center justify-end">
                    <input type="number" step="1" min="0" max="100"
                      value={Math.round(t.ratio * 1000) / 10}
                      onChange={(e) => updateRatio(t.id, Number(e.target.value) / 100)}
                      className="w-12 bg-transparent text-right outline-none rounded px-1 py-0.5 hover:bg-white/5 focus:bg-white/5"
                      style={{ color: THEME.text }} />
                    <span className="ml-0.5" style={{ color: THEME.textDim }}>%</span>
                  </div>
                </td>
                <td className="px-2 py-1">
                  <div className="flex items-center justify-end">
                    <input type="number" step="0.05" min="0" max="1"
                      value={t.automationFit} onChange={(e) => updateFit(t.id, Number(e.target.value))}
                      className="w-12 bg-transparent text-right outline-none rounded px-1 py-0.5 hover:bg-white/5 focus:bg-white/5"
                      style={{ color: THEME.text }} />
                  </div>
                </td>
                <td className="px-2 py-1.5 text-[10px]">
                  <Badge tone={t.complexity === "high" ? "warn" : t.complexity === "medium" ? "default" : "positive"}>
                    {t.complexity === "high" ? "高" : t.complexity === "medium" ? "中" : "低"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t" style={{ borderColor: THEME.border, background: "rgba(255,255,255,0.02)" }}>
              <td className="px-3 py-2 font-medium" style={{ color: THEME.textMuted }}>합계</td>
              <td className="px-2 py-2 text-right font-semibold" style={{ color: isValid ? THEME.positive : THEME.warn }}>
                {(total * 100).toFixed(1)}%
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
      {!isValid && (
        <div className="mt-2 flex items-center justify-between text-[10px]">
          <span style={{ color: THEME.warn }}>
            ⚠ 합계가 100%가 아닙니다 ({(total * 100).toFixed(1)}%).
          </span>
          <button onClick={normalize}
            className="px-2 py-0.5 rounded border hover:bg-white/5 transition-colors"
            style={{ borderColor: THEME.border, color: THEME.textMuted }}>
            자동 정규화
          </button>
        </div>
      )}
    </div>
  );
}

/* ========================================================================= */
/*  [MAIN PAGE]                                                               */
/* ========================================================================= */

function RoiPage() {
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [scenario, setScenario] = useState("base");
  const [unit, setUnit] = useState("EOK");
  const [autoFilledFields, setAutoFilledFields] = useState({
    industry: true, annualRevenue: true, annualOperatingProfit: true, financialHistory: true,
  });
  const [companySource, setCompanySource] = useState({
    source: DEFAULT_COMPANY.source, updatedAt: DEFAULT_COMPANY.updatedAt,
  });
  const [lookupState, setLookupState] = useState("success");
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);

  useEffect(() => {
    if (document.getElementById("pretendard-font")) return;
    const link = document.createElement("link");
    link.id = "pretendard-font"; link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css";
    document.head.appendChild(link);
  }, []);

  const results = useMemo(() => computeAllScenarios(input), [input]);
  const result = results[scenario];
  const solutionRanking = useMemo(() => rankSolutionContributions(result), [result]);

  function setField(key, value, opts = {}) {
    setInput((prev) => ({ ...prev, [key]: value }));
    if (opts.userEdit && autoFilledFields[key]) {
      setAutoFilledFields((prev) => ({ ...prev, [key]: false }));
    }
  }

  function toggleSolution(key) {
    setInput((prev) => {
      const nextSelected = { ...prev.selectedSolutions, [key]: !prev.selectedSolutions[key] };
      // 비용 기본값을 선택 변경에 맞춰 재계산(단, 유저가 수정한 값은 보존하기 어려우므로 간단 재계산)
      return { ...prev, selectedSolutions: nextSelected, costs: computeDefaultCostsFromSelection(nextSelected) };
    });
  }

  async function handleCompanySelect(company) {
    setLookupState("loading");
    await new Promise((r) => setTimeout(r, 400));
    const latest = pickLatestFinancials(company.financialHistory);
    setInput((prev) => ({
      ...prev,
      companyName: company.name, companyId: company.id, industry: company.industry,
      annualRevenue: latest.revenue, annualOperatingProfit: latest.operatingIncome,
      financialHistory: company.financialHistory,
      inquiryTypes: buildInquiryTypesForIndustry(company.industry),
    }));
    setAutoFilledFields({ industry: true, annualRevenue: true, annualOperatingProfit: true, financialHistory: true });
    setCompanySource({ source: company.source, updatedAt: company.updatedAt });
    setLookupState("success");
  }

  function handleCompanyRawChange(name) {
    setInput((prev) => ({ ...prev, companyName: name, companyId: null }));
    if (lookupState === "success") setLookupState("idle");
  }

  function handleCompanyClear() {
    setInput((prev) => ({ ...prev, companyName: "", companyId: null, financialHistory: createEmptyFinancialHistory() }));
    setLookupState("idle");
    setCompanySource({ source: null, updatedAt: null });
    setAutoFilledFields({ industry: false, annualRevenue: false, annualOperatingProfit: false, financialHistory: false });
  }

  function handleFinancialHistoryChange(nextHistory) {
    const latest = pickLatestFinancials(nextHistory);
    setInput((prev) => ({ ...prev, financialHistory: nextHistory, annualRevenue: latest.revenue, annualOperatingProfit: latest.operatingIncome }));
    setAutoFilledFields((prev) => ({ ...prev, financialHistory: false, annualRevenue: false, annualOperatingProfit: false }));
  }

  function applyIndustryPreset() {
    const preset = INDUSTRY_PRESETS[input.industry];
    if (!preset) return;
    setInput((prev) => ({ ...prev, ...preset, inquiryTypes: buildInquiryTypesForIndustry(input.industry) }));
  }

  function resetToDefault() {
    setInput(DEFAULT_INPUT);
    setScenario("base");
    setUnit("EOK");
    setAutoFilledFields({ industry: true, annualRevenue: true, annualOperatingProfit: true, financialHistory: true });
    setCompanySource({ source: DEFAULT_COMPANY.source, updatedAt: DEFAULT_COMPANY.updatedAt });
    setLookupState("success");
  }

  function setCost(key, value) {
    setInput((prev) => ({ ...prev, costs: { ...prev.costs, [key]: value || 0 } }));
  }

  function resetCostsToDefault() {
    setInput((prev) => ({ ...prev, costs: computeDefaultCostsFromSelection(prev.selectedSolutions) }));
  }

  const currentCost = result.currentAnnualCost;
  const futureCost = result.futureAnnualCost;
  const savingsRate = currentCost > 0 ? result.annualSavings / currentCost : 0;
  const topSolution = solutionRanking[0];
  const uLabel = unitLabel(unit);
  const selectedCount = Object.values(input.selectedSolutions).filter(Boolean).length;
  const selectedLabels = SOLUTIONS_CATALOG.filter((s) => input.selectedSolutions[s.key]).map((s) => s.label);

  const activeSynergies = SYNERGY_RULES.filter((r) => input.selectedSolutions[r.a] && input.selectedSolutions[r.b]);

  return (
    <div className="min-h-screen"
      style={{
        background: THEME.bg, color: THEME.text,
        fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
        fontFeatureSettings: "'ss01', 'ss02', 'cv11'",
      }}>
      {/* HEADER */}
      <header className="sticky top-0 z-20 border-b backdrop-blur"
        style={{ borderColor: THEME.border, background: "rgba(10,10,11,0.75)" }}>
        <div className="max-w-[1480px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: THEME.accentSoft }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M4 4L20 12L4 20V4Z" stroke={THEME.accent} strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight" style={{ color: THEME.text }}>
                AICC ROI Simulator
              </div>
              <div className="text-[11px]" style={{ color: THEME.textDim }}>
                솔루션 선택·문의유형 기반 ROI 시뮬레이터 · 제안/컨설팅용
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center text-[10px] mr-1" style={{ color: THEME.textDim }}>단위</div>
            <div className="flex items-center rounded-md border p-0.5" style={{ borderColor: THEME.border, background: THEME.panelElev }}>
              {[{ v: "EOK", l: "억원" }, { v: "MAN", l: "만원" }, { v: "KRW", l: "원" }].map((opt) => (
                <button key={opt.v} onClick={() => setUnit(opt.v)}
                  className="px-2 py-1 text-[11px] rounded-sm transition-colors"
                  style={{
                    background: unit === opt.v ? "rgba(255,255,255,0.06)" : "transparent",
                    color: unit === opt.v ? THEME.text : THEME.textMuted,
                    fontWeight: unit === opt.v ? 600 : 400,
                  }}>
                  {opt.l}
                </button>
              ))}
            </div>
            <button onClick={resetToDefault}
              className="px-3 py-1.5 text-xs rounded-md border hover:bg-white/5 transition-colors"
              style={{ borderColor: THEME.border, color: THEME.textMuted }}>
              기본값 복원
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1480px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[440px_1fr] gap-6">
          {/* ======= LEFT: INPUT PANEL ======= */}
          <div className="space-y-5">
            {/* 고객 기본정보 */}
            <Card className="p-4">
              <SectionTitle right={
                <button onClick={applyIndustryPreset}
                  className="text-[10px] px-2 py-1 rounded-md border hover:bg-white/5 transition-colors"
                  style={{ borderColor: THEME.border, color: THEME.textMuted }}>
                  업종 preset 적용
                </button>
              }>고객 기본정보</SectionTitle>
              <div className="space-y-3">
                <div>
                  <Label>회사명</Label>
                  <CompanyAutocomplete value={input.companyName} onSelect={handleCompanySelect}
                    onChangeRaw={handleCompanyRawChange} onClear={handleCompanyClear} lookup={companyLookupService} />
                  {lookupState === "loading" && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[10px]" style={{ color: THEME.textMuted }}>
                      <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: THEME.accent }} />
                      외부 재무정보 조회 중...
                    </div>
                  )}
                  {lookupState === "success" && input.companyId && companySource.source && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[10px]" style={{ color: THEME.textDim }}>
                      <Badge tone="accent">외부 조회</Badge>
                      <span>{companySource.source} · 기준 {companySource.updatedAt}</span>
                    </div>
                  )}
                </div>
                <div>
                  <Label badge={autoFilledFields.industry && input.companyId ? <Badge tone="accent">외부 조회</Badge> : input.companyId ? <Badge>수정됨</Badge> : null}>업종</Label>
                  <Select value={input.industry} onChange={(v) => setField("industry", v, { userEdit: true })}
                    options={INDUSTRIES.map((i) => ({ value: i, label: i }))} />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <Label badge={autoFilledFields.annualRevenue && input.companyId ? <Badge tone="accent">외부</Badge> : input.companyId ? <Badge>수정됨</Badge> : null}>최신 연매출</Label>
                    <CurrencyInput value={input.annualRevenue} onChange={(v) => setField("annualRevenue", v, { userEdit: true })} unit={unit} />
                  </div>
                  <div>
                    <Label badge={autoFilledFields.annualOperatingProfit && input.companyId ? <Badge tone="accent">외부</Badge> : input.companyId ? <Badge>수정됨</Badge> : null}>최신 영업이익</Label>
                    <CurrencyInput value={input.annualOperatingProfit} onChange={(v) => setField("annualOperatingProfit", v, { userEdit: true })} unit={unit} />
                  </div>
                </div>
              </div>
            </Card>

            {/* 5개년 재무 이력 */}
            <Card className="p-4">
              <SectionTitle unit={uLabel}>5개년 재무 이력</SectionTitle>
              <FinancialHistoryTable history={input.financialHistory} onChange={handleFinancialHistoryChange} unit={unit} />
              <div className="mt-2 text-[10px]" style={{ color: THEME.textDim }}>
                · 회사 선택 시 자동 입력 · 셀 직접 수정 가능 · 최신 연도는 상단 필드에 자동 반영
              </div>
            </Card>

            {/* 도입 솔루션 선택 */}
            <Card className="p-4">
              <SectionTitle right={<Badge tone="accent">{selectedCount}개 선택</Badge>}>도입 솔루션 선택</SectionTitle>
              <SolutionSelector selectedSolutions={input.selectedSolutions} onToggle={toggleSolution} />
              {activeSynergies.length > 0 && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: THEME.borderSoft }}>
                  <div className="text-[10px] mb-1.5" style={{ color: THEME.textDim }}>활성 시너지</div>
                  <div className="flex flex-wrap gap-1">
                    {activeSynergies.map((s, i) => (
                      <Badge key={i} tone="positive">{s.label} +{(s.bonus * 100).toFixed(0)}%</Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* 문의유형 구성 */}
            <Card className="p-4">
              <SectionTitle>문의유형 구성</SectionTitle>
              <InquiryTypesTable inquiryTypes={input.inquiryTypes} onChange={(v) => setInput((p) => ({ ...p, inquiryTypes: v }))} />
              <div className="mt-2 text-[10px]" style={{ color: THEME.textDim }}>
                · 업종 preset 적용 시 기본값 자동 입력 · 비중이 솔루션 효과에 반영됨
              </div>
            </Card>

            {/* 컨택센터 운영정보 */}
            <Card className="p-4">
              <SectionTitle>컨택센터 운영정보</SectionTitle>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div><Label>월 인입량</Label><NumberInput value={input.monthlyInboundVolume} onChange={(v) => setField("monthlyInboundVolume", v)} suffix="건" step={1000} /></div>
                  <div><Label>월 아웃바운드</Label><NumberInput value={input.monthlyOutboundVolume} onChange={(v) => setField("monthlyOutboundVolume", v)} suffix="건" step={1000} /></div>
                  <div><Label>상담사 수</Label><NumberInput value={input.agentCount} onChange={(v) => setField("agentCount", v)} suffix="명" /></div>
                  <div><Label>운영시간/일</Label><NumberInput value={input.operationHoursPerDay} onChange={(v) => setField("operationHoursPerDay", v)} suffix="h" /></div>
                  <div><Label>평균 AHT</Label><NumberInput value={input.averageAHTMinutes} onChange={(v) => setField("averageAHTMinutes", v)} suffix="분" step={0.1} /></div>
                  <div><Label>평균 ACW</Label><NumberInput value={input.averageACWMinutes} onChange={(v) => setField("averageACWMinutes", v)} suffix="분" step={0.1} /></div>
                </div>
                <div>
                  <Label>상담사 평균 인건비 (연)</Label>
                  <CurrencyInput value={input.averageAgentAnnualCost} onChange={(v) => setField("averageAgentAnnualCost", v)} unit={unit} />
                  <div className="mt-1 text-[10px] tabular-nums" style={{ color: THEME.textDim }}>
                    총 인건비: {formatCurrencyWithUnit(input.agentCount * input.averageAgentAnnualCost, unit)}
                  </div>
                </div>
              </div>
            </Card>

            {/* AICC 도입 가정 */}
            <Card className="p-4">
              <SectionTitle>AICC 도입 가정</SectionTitle>
              <div className="space-y-3.5">
                <div><Label>현재 자동화율</Label><SliderWithValue value={input.currentAutomationRate} onChange={(v) => setField("currentAutomationRate", v)} max={0.9} formatter={formatPercent} /></div>
                <div><Label>셀프처리율 목표</Label><SliderWithValue value={input.expectedSelfServiceRate} onChange={(v) => setField("expectedSelfServiceRate", v)} max={0.8} formatter={formatPercent} /></div>
                <div><Label>STT·자동요약 ACW 절감률</Label><SliderWithValue value={input.expectedSttSummaryReductionRate} onChange={(v) => setField("expectedSttSummaryReductionRate", v)} max={0.8} formatter={formatPercent} /></div>
                <div><Label>KMS 생산성 향상률</Label><SliderWithValue value={input.expectedKmsProductivityRate} onChange={(v) => setField("expectedKmsProductivityRate", v)} max={0.4} formatter={formatPercent} /></div>
                <div><Label>QA 자동화율</Label><SliderWithValue value={input.expectedQaAutomationRate} onChange={(v) => setField("expectedQaAutomationRate", v)} max={0.95} formatter={formatPercent} /></div>
                <div><Label>Forecast 효과</Label><SliderWithValue value={input.expectedForecastOptimizationRate} onChange={(v) => setField("expectedForecastOptimizationRate", v)} max={0.2} formatter={formatPercent} /></div>
                <div><Label>재문의 감소율</Label><SliderWithValue value={input.expectedRepeatContactReductionRate} onChange={(v) => setField("expectedRepeatContactReductionRate", v)} max={0.4} formatter={formatPercent} /></div>
                <div><Label>리스크 보정계수</Label><SliderWithValue value={input.riskAdjustmentFactor} onChange={(v) => setField("riskAdjustmentFactor", v)} min={0.5} max={1.0} formatter={(v) => `×${v.toFixed(2)}`} /></div>
              </div>
            </Card>

            {/* 당사 제안금액 */}
            <Card className="p-4">
              <SectionTitle right={
                <button onClick={resetCostsToDefault}
                  className="text-[10px] px-2 py-1 rounded-md border hover:bg-white/5 transition-colors"
                  style={{ borderColor: THEME.border, color: THEME.textMuted }}>
                  선택기반 재계산
                </button>
              }>당사 제안금액</SectionTitle>
              <div className="space-y-2.5">
                <div className="text-[10px] uppercase mb-1 tracking-wide" style={{ color: THEME.textDim, letterSpacing: "0.04em" }}>일회성 비용</div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div><Label>초기 구축비</Label><CurrencyInput value={input.costs.implementationCost} onChange={(v) => setCost("implementationCost", v)} unit={unit} /></div>
                  <div><Label>연동 개발비</Label><CurrencyInput value={input.costs.integrationCost} onChange={(v) => setCost("integrationCost", v)} unit={unit} /></div>
                  <div><Label>커스터마이징</Label><CurrencyInput value={input.costs.customizationCost} onChange={(v) => setCost("customizationCost", v)} unit={unit} /></div>
                  <div><Label>교육비</Label><CurrencyInput value={input.costs.trainingCost} onChange={(v) => setCost("trainingCost", v)} unit={unit} /></div>
                  <div><Label>튜닝비</Label><CurrencyInput value={input.costs.tuningCost} onChange={(v) => setCost("tuningCost", v)} unit={unit} /></div>
                </div>
                <div className="text-[10px] uppercase mb-1 tracking-wide mt-2" style={{ color: THEME.textDim, letterSpacing: "0.04em" }}>반복 비용 (연)</div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div><Label>구독료</Label><CurrencyInput value={input.costs.annualSubscriptionCost} onChange={(v) => setCost("annualSubscriptionCost", v)} unit={unit} /></div>
                  <div><Label>유지보수</Label><CurrencyInput value={input.costs.annualMaintenanceCost} onChange={(v) => setCost("annualMaintenanceCost", v)} unit={unit} /></div>
                  <div><Label>LLM/API</Label><CurrencyInput value={input.costs.annualLlmApiCost} onChange={(v) => setCost("annualLlmApiCost", v)} unit={unit} /></div>
                  <div><Label>인프라</Label><CurrencyInput value={input.costs.infrastructureCost} onChange={(v) => setCost("infrastructureCost", v)} unit={unit} /></div>
                </div>
                <div className="pt-2 mt-2 border-t grid grid-cols-2 gap-3 text-[11px]" style={{ borderColor: THEME.borderSoft }}>
                  <div>
                    <div style={{ color: THEME.textDim }}>일회성 합계</div>
                    <div className="tabular-nums font-semibold" style={{ color: THEME.accent }}>
                      {formatCurrencyWithUnit(result.oneTimeCost, unit)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: THEME.textDim }}>연간 반복</div>
                    <div className="tabular-nums font-semibold" style={{ color: THEME.positive }}>
                      {formatCurrencyWithUnit(result.annualRecurringCost, unit)}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* ======= RIGHT: RESULTS ======= */}
          <div className="space-y-5 min-w-0">
            {/* Selected Solutions Banner */}
            <Card className="p-3.5">
              <div className="flex items-start gap-3">
                <div className="text-[11px] uppercase flex-shrink-0 mt-0.5" style={{ color: THEME.textDim, letterSpacing: "0.04em" }}>
                  선택한 솔루션
                </div>
                <div className="flex flex-wrap gap-1 flex-1">
                  {selectedLabels.length > 0 ? (
                    selectedLabels.map((l, i) => <Badge key={i} tone="accent">{l}</Badge>)
                  ) : (
                    <span className="text-[11px]" style={{ color: THEME.warn }}>솔루션을 하나 이상 선택하세요</span>
                  )}
                </div>
              </div>
            </Card>

            {/* SCENARIO TABS */}
            <div className="flex items-center gap-1 p-1 rounded-lg border w-fit" style={{ borderColor: THEME.border, background: THEME.panel }}>
              {SCENARIOS.map((s) => {
                const active = s === scenario;
                return (
                  <button key={s} onClick={() => setScenario(s)}
                    className="px-3 py-1.5 text-xs rounded-md transition-colors"
                    style={{
                      background: active ? THEME.accentSoft : "transparent",
                      color: active ? THEME.accent : THEME.textMuted,
                      fontWeight: active ? 600 : 400,
                    }}>
                    {SCENARIO_LABEL[s]} 시나리오
                  </button>
                );
              })}
            </div>

            {/* KPI */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <KpiCard label="연간 절감액" value={formatCurrency(result.annualSavings, unit)} sub={`인건비의 ${formatPercent(savingsRate)} 절감`} tone="positive" large unit={uLabel} />
              <KpiCard label="총 투자비 (3Y)" value={formatCurrency(result.totalInvestmentCost3Y, unit)} sub={`초기 ${formatCurrencyWithUnit(result.oneTimeCost, unit)} + 연 ${formatCurrencyWithUnit(result.annualRecurringCost, unit)} × 3`} unit={uLabel} />
              <KpiCard label="3개년 순편익" value={formatCurrency(result.threeYearCumulativeNetBenefit, unit)} sub="Year 3 누적 (투자·운영비 차감)" tone="accent" unit={uLabel} />
              <KpiCard label="1년 ROI" value={`${result.firstYearRoi.toFixed(0)}%`} sub={`첫해 편익 ${formatCurrencyWithUnit(result.annualBenefit, unit)} 기준`} large tone="accent" />
              <KpiCard label="3년 ROI" value={`${result.roiPercent.toFixed(0)}%`} sub="3년 누적 대비 투자비" large tone="accent" />
              <KpiCard label="투자회수기간" value={Number.isFinite(result.paybackMonths) ? `${result.paybackMonths.toFixed(1)}개월` : "—"} sub={`초기투자 / 월순편익`} />
            </div>

            {/* Top Solution card */}
            <KpiCard label="가장 큰 절감 기여 솔루션" value={topSolution?.label || "—"} sub={`기여 절감액 ${topSolution ? formatCurrencyWithUnit(topSolution.value, unit) : "-"}`} tone="accent" />

            {/* EXEC SUMMARY */}
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: THEME.accentSoft }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L14.5 8.5L21 9.5L16.5 14L17.5 20.5L12 17.5L6.5 20.5L7.5 14L3 9.5L9.5 8.5L12 2Z" stroke={THEME.accent} strokeWidth="1.6" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-[11px] tracking-wide uppercase mb-1" style={{ color: THEME.textDim, letterSpacing: "0.04em" }}>
                    Executive Summary · {SCENARIO_LABEL[scenario]} · {selectedCount}개 솔루션
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: THEME.text }}>
                    <span style={{ color: THEME.textMuted }}>{input.companyName || "고객사"}의 현재 컨택센터 인건비는 </span>
                    <span className="font-semibold tabular-nums">{formatCurrencyWithUnit(currentCost, unit)}</span>
                    <span style={{ color: THEME.textMuted }}>이며, 선택한 AICC 솔루션 도입 시 연간 </span>
                    <span className="font-semibold tabular-nums" style={{ color: THEME.positive }}>{formatCurrencyWithUnit(result.annualSavings, unit)}</span>
                    <span style={{ color: THEME.textMuted }}> 절감 효과가 예상됩니다. 총 제안금액 </span>
                    <span className="font-semibold tabular-nums">{formatCurrencyWithUnit(result.oneTimeCost + result.annualRecurringCost, unit)}</span>
                    <span style={{ color: THEME.textMuted }}> (초기 + 첫해 반복) 기준 투자회수기간은 </span>
                    <span className="font-semibold tabular-nums" style={{ color: THEME.accent }}>
                      {Number.isFinite(result.paybackMonths) ? `${result.paybackMonths.toFixed(1)}개월` : "회수 어려움"}
                    </span>
                    <span style={{ color: THEME.textMuted }}>, 3년 누적 ROI는 </span>
                    <span className="font-semibold tabular-nums" style={{ color: THEME.positive }}>{result.roiPercent.toFixed(0)}%</span>
                    <span style={{ color: THEME.textMuted }}>로 전망됩니다.</span>
                  </p>
                  <div className="mt-3 pt-3 border-t text-xs" style={{ borderColor: THEME.borderSoft, color: THEME.textMuted }}>
                    핵심 기여 솔루션:{" "}
                    {solutionRanking.slice(0, 3).map((m, i) => (
                      <span key={m.key} className="tabular-nums">
                        {i > 0 && " · "}
                        <span style={{ color: THEME.text }}>{m.label}</span>{" "}
                        <span style={{ color: THEME.textDim }}>({formatCurrencyWithUnit(m.value, unit)})</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* 재무 추이 */}
            <Card className="p-5">
              <SectionTitle unit={uLabel}>{input.companyName || "고객사"} · 5개년 재무 추이</SectionTitle>
              <FinancialHistoryChart history={input.financialHistory} unit={unit} />
            </Card>

            {/* COST COMP + SOLUTION SAVINGS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card className="p-5">
                <SectionTitle unit={uLabel}>도입 전 vs 도입 후 연간 운영비</SectionTitle>
                <CostComparisonChart current={currentCost} future={futureCost} unit={unit} />
                <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-3 text-xs" style={{ borderColor: THEME.borderSoft }}>
                  <div>
                    <div style={{ color: THEME.textDim }}>도입 전 (인건비)</div>
                    <div className="tabular-nums font-semibold mt-0.5" style={{ color: THEME.text }}>{formatCurrencyWithUnit(currentCost, unit)}</div>
                  </div>
                  <div>
                    <div style={{ color: THEME.textDim }}>도입 후</div>
                    <div className="tabular-nums font-semibold mt-0.5" style={{ color: THEME.accent }}>{formatCurrencyWithUnit(futureCost, unit)}</div>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <SectionTitle unit={uLabel}>솔루션별 절감 기여도</SectionTitle>
                <SolutionSavingsChart result={result} unit={unit} />
              </Card>
            </div>

            {/* INVESTMENT COST BREAKDOWN + INQUIRY TYPE PIE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card className="p-5">
                <SectionTitle unit={uLabel}>투자비 구성 분해</SectionTitle>
                <CostBreakdownChart costs={input.costs} unit={unit} />
              </Card>

              <Card className="p-5">
                <SectionTitle>문의유형 비중</SectionTitle>
                <InquiryTypePieChart inquiryTypes={input.inquiryTypes} />
              </Card>
            </div>

            {/* INQUIRY X SOLUTION HEATMAP */}
            <Card className="p-5">
              <SectionTitle right={
                <button onClick={() => setShowHeatmap(!showHeatmap)}
                  className="text-[10px] px-2 py-1 rounded-md border hover:bg-white/5 transition-colors"
                  style={{ borderColor: THEME.border, color: THEME.textMuted }}>
                  {showHeatmap ? "접기" : "펼치기"}
                </button>
              }>문의유형 × 솔루션 효과 히트맵</SectionTitle>
              {showHeatmap && <InquirySolutionHeatmap inquiryTypes={input.inquiryTypes} selectedSolutions={input.selectedSolutions} />}
              {!showHeatmap && (
                <div className="text-[11px]" style={{ color: THEME.textDim }}>
                  어떤 문의유형에서 어떤 솔루션이 큰 효과를 내는지 확인할 수 있습니다. 가중치 1.0이 기준이며, 1.2~1.3이면 해당 조합에서 효과가 크게 증폭됩니다.
                </div>
              )}
            </Card>

            {/* 3Y CUMULATIVE */}
            <Card className="p-5">
              <SectionTitle right={<Badge>초기투자 {formatCurrencyWithUnit(result.oneTimeCost, unit)}</Badge>} unit={uLabel}>
                3개년 누적 순편익 추이
              </SectionTitle>
              <CumulativeBenefitChart result={result} unit={unit} />
              <div className="mt-3 pt-3 border-t grid grid-cols-4 gap-3 text-xs" style={{ borderColor: THEME.borderSoft }}>
                {[0, 1, 2, 3].map((y) => {
                  const val = -result.oneTimeCost + y * (result.annualSavings - result.annualRecurringCost);
                  return (
                    <div key={y}>
                      <div style={{ color: THEME.textDim }}>Year {y}</div>
                      <div className="tabular-nums font-semibold mt-0.5" style={{ color: val >= 0 ? THEME.positive : THEME.negative }}>
                        {formatCurrencyWithUnit(val, unit)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* SCENARIO COMPARISON */}
            <Card className="p-5">
              <SectionTitle unit={uLabel}>시나리오 비교</SectionTitle>
              <ScenarioComparisonChart results={results} unit={unit} />
              <div className="mt-4 overflow-x-auto rounded-md border" style={{ borderColor: THEME.borderSoft }}>
                <table className="w-full text-xs tabular-nums">
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.025)" }}>
                      <th className="text-left font-medium py-2 px-3" style={{ color: THEME.textDim }}>지표</th>
                      {SCENARIOS.map((s) => (
                        <th key={s} className="text-right font-medium py-2 px-3" style={{ color: s === scenario ? THEME.accent : THEME.textDim }}>
                          {SCENARIO_LABEL[s]}{s === scenario && " ●"}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "연간 절감액", key: "annualSavings" },
                      { label: "연간 순편익(반복)", key: "annualNetBenefit" },
                      { label: "1년 ROI", key: "firstYearRoi", kind: "pct0" },
                      { label: "3년 ROI", key: "roiPercent", kind: "pct0" },
                      { label: "투자회수기간", key: "paybackMonths", kind: "months" },
                      { label: "3년 누적 순편익", key: "threeYearCumulativeNetBenefit" },
                    ].map((row) => (
                      <tr key={row.key} className="border-t" style={{ borderColor: THEME.borderSoft }}>
                        <td className="py-2 px-3" style={{ color: THEME.textMuted }}>{row.label}</td>
                        {SCENARIOS.map((s) => {
                          const v = results[s][row.key];
                          let display;
                          if (row.kind === "pct0") display = `${v.toFixed(0)}%`;
                          else if (row.kind === "months") display = Number.isFinite(v) ? `${v.toFixed(1)}개월` : "—";
                          else display = formatCurrencyWithUnit(v, unit);
                          return (
                            <td key={s} className="py-2 px-3 text-right" style={{ color: s === scenario ? THEME.text : THEME.textMuted, fontWeight: s === scenario ? 600 : 400 }}>
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

            {/* PAYBACK */}
            <Card className="p-5">
              <SectionTitle>투자회수 타임라인</SectionTitle>
              <PaybackTimeline result={result} />
            </Card>

            {/* TOP DRIVERS */}
            <Card className="p-5">
              <SectionTitle unit={uLabel}>주요 ROI Driver (Top 3)</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {solutionRanking.slice(0, 3).map((m, i) => (
                  <div key={m.key} className="p-4 rounded-lg border" style={{ borderColor: THEME.borderSoft, background: "rgba(255,255,255,0.015)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-semibold" style={{ background: THEME.accentSoft, color: THEME.accent }}>
                        {i + 1}
                      </div>
                      <div className="text-sm font-medium" style={{ color: THEME.text }}>{m.label}</div>
                    </div>
                    <div className="text-lg font-semibold tabular-nums" style={{ color: THEME.text, letterSpacing: "-0.02em" }}>
                      {formatCurrency(m.value, unit)}
                    </div>
                    <div className="text-[11px] mt-1" style={{ color: THEME.textMuted }}>
                      전체 절감의 {formatPercent(result.annualSavings > 0 ? m.value / result.annualSavings : 0)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* ASSUMPTIONS */}
            <Card>
              <button onClick={() => setShowAssumptions(!showAssumptions)}
                className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 rounded-sm" style={{ background: THEME.accent }} />
                  <h3 className="text-sm font-semibold tracking-tight" style={{ color: THEME.text }}>가정값 · 계산식 보기</h3>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  style={{ color: THEME.textMuted, transform: showAssumptions ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              {showAssumptions && (
                <div className="px-5 pb-5 space-y-4 border-t" style={{ borderColor: THEME.borderSoft }}>
                  <div className="pt-4">
                    <div className="text-[11px] uppercase mb-2 tracking-wide" style={{ color: THEME.textDim, letterSpacing: "0.04em" }}>핵심 공식</div>
                    <div className="rounded-md p-3 font-mono text-[11px] leading-relaxed"
                      style={{ background: "rgba(255,255,255,0.02)", color: THEME.textMuted, border: `1px solid ${THEME.borderSoft}` }}>
                      <div>총 인건비 = 상담사 수 × 평균 연 인건비</div>
                      <div>각 솔루션 편익 = 관련 풀 × 효과율 × 리스크계수 × 문의유형가중치 × (1 + 시너지보너스)</div>
                      <div>일회성 비용 = 구축+연동+커스터마이징+교육+튜닝</div>
                      <div>반복 비용(연) = 구독+유지보수+LLM/API+인프라+옵션</div>
                      <div className="mt-2" style={{ color: THEME.text }}>1년 ROI = (연편익 − 첫해총비용) / 첫해총비용 × 100</div>
                      <div style={{ color: THEME.text }}>3년 ROI = (3×연편익 − 총3년비용) / 총3년비용 × 100</div>
                      <div style={{ color: THEME.text }}>투자회수기간(개월) = 일회성비용 / 월순편익</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase mb-2 tracking-wide" style={{ color: THEME.textDim, letterSpacing: "0.04em" }}>시너지 규칙</div>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      {SYNERGY_RULES.map((r, i) => {
                        const active = input.selectedSolutions[r.a] && input.selectedSolutions[r.b];
                        return (
                          <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-md"
                            style={{ background: "rgba(255,255,255,0.02)", opacity: active ? 1 : 0.5 }}>
                            <span style={{ color: active ? THEME.text : THEME.textMuted }}>{r.label}</span>
                            <Badge tone={active ? "positive" : "default"}>+{(r.bonus * 100).toFixed(0)}%</Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase mb-2 tracking-wide" style={{ color: THEME.textDim, letterSpacing: "0.04em" }}>시나리오 가정</div>
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
                </div>
              )}
            </Card>

            <div className="text-center text-[11px] pt-4 pb-8" style={{ color: THEME.textDim }}>
              본 시뮬레이터의 수치는 mock 데이터와 고객사 입력 기반 추정치입니다. 실 계약/PoC 데이터로 보정하여 최종 제안에 사용하세요.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ========================================================================= */
/*  APP                                                                       */
/* ========================================================================= */

export default function App() {
  return <RoiPage />;
}