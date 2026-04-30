"use client";

import { Scale, Users, DollarSign, AlertTriangle } from "lucide-react";
import { StaggerContainer, StaggerItem } from "@/shared/components/AnimatedTransitions";
import { useMeuDia } from "@/features/meu-dia/hooks/useMeuDia";
import { Skeleton, KPISkeleton } from "@/shared/components/SkeletonLoaders";
import { MeuDiaBanner } from "../components/MeuDiaBanner";
import { StatsCard } from "../components/StatsCard";
import { FinancialChart } from "../components/FinancialChart";
import { ProcessDistributionChart } from "../components/ProcessDistributionChart";
import { ProcessTable } from "../components/ProcessTable";
import { UpcomingEvents } from "../components/UpcomingEvents";
import { useTranslation } from "react-i18next";

export default function DashboardOverview() {
  const { stats, isLoading } = useMeuDia();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="h-full flex flex-col gap-6 p-6 bg-background">
        <Skeleton className="h-[68px] w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <KPISkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-[300px] rounded-xl" />
          <Skeleton className="h-[300px] rounded-xl" />
        </div>
        <Skeleton className="h-[320px] rounded-xl" />
      </div>
    );
  }

  return (
    <StaggerContainer className="h-full flex flex-col gap-5 p-5 overflow-y-auto bg-background hide-scrollbar pb-12">

      {/* ── Welcome Banner ── */}
      <StaggerItem>
        <MeuDiaBanner />
      </StaggerItem>

      {/* ── KPI Cards ── */}
      <StaggerItem className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <StatsCard
          title={t("dashboard.activeProcesses")}
          value={stats?.totalProcessos ?? 4}
          subValue="No TJSP e TRF3"
          icon={Scale}
          iconClassName="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
          trend={{ value: "+2 este mês", direction: "up" }}
        />
        <StatsCard
          title={t("dashboard.totalClients")}
          value={stats?.totalClientes ?? 4}
          subValue="6 cadastrados"
          icon={Users}
          iconClassName="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
          trend={{ value: "+5 novos", direction: "up" }}
        />
        <StatsCard
          title={t("dashboard.fees")}
          value="R$ 137.000"
          subValue="Mês corrente"
          icon={DollarSign}
          iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
          trend={{ value: "+8%", direction: "up" }}
        />
        <StatsCard
          title={t("dashboard.criticalDeadlines")}
          value="3"
          subValue="1 audiência urgente"
          icon={AlertTriangle}
          iconClassName="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
          trend={{ value: "Atenção", direction: "down" }}
        />
      </StaggerItem>

      {/* ── Charts ── */}
      <StaggerItem className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[320px]">
        <div className="lg:col-span-8">
          <FinancialChart />
        </div>
        <div className="lg:col-span-4">
          <ProcessDistributionChart />
        </div>
      </StaggerItem>

      {/* ── Process Table + Upcoming Events ── */}
      <StaggerItem className="grid grid-cols-1 xl:grid-cols-3 gap-4 pb-8">
        <div className="xl:col-span-2">
          <ProcessTable />
        </div>
        <div className="xl:col-span-1">
          <UpcomingEvents />
        </div>
      </StaggerItem>

    </StaggerContainer>
  );
}
