"use client";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "@/app/(dashboard)/layout";
import DashboardPage from "@/app/(dashboard)/dashboard/page";
import AnalyticsPage from "@/app/(dashboard)/analytics/page";
import ContentPage from "@/app/(dashboard)/content/page";
import CommentsPage from "@/app/(dashboard)/comments/page";
import AudiencePage from "@/app/(dashboard)/audience/page";
import GrowthAIPage from "@/app/(dashboard)/growth-ai/page";
import ReportsPage from "@/app/(dashboard)/reports/page";
import SettingsPage from "@/app/(dashboard)/settings/page";
import OrchestratorPage from "@/app/(dashboard)/orchestrator/page";
import Providers from "@/components/Providers";
import { AuthGuard } from "./components/AuthGuard";

export default function App() {
  return (
    <Providers>
      <BrowserRouter>
        <AuthGuard>
          <Routes>
            <Route element={<DashboardLayout children={<Navigate to="/dashboard" />} />}>
               <Route path="/" element={<Navigate to="/dashboard" />} />
            </Route>
            
            <Route path="/dashboard" element={<DashboardLayout children={<DashboardPage />} />} />
            <Route path="/analytics" element={<DashboardLayout children={<AnalyticsPage />} />} />
            <Route path="/content" element={<DashboardLayout children={<ContentPage />} />} />
            <Route path="/comments" element={<DashboardLayout children={<CommentsPage />} />} />
            <Route path="/audience" element={<DashboardLayout children={<AudiencePage />} />} />
            <Route path="/growth-ai" element={<DashboardLayout children={<GrowthAIPage />} />} />
            <Route path="/reports" element={<DashboardLayout children={<ReportsPage />} />} />
            <Route path="/settings" element={<DashboardLayout children={<SettingsPage />} />} />
            <Route path="/orchestrator" element={<DashboardLayout children={<OrchestratorPage />} />} />
          </Routes>
        </AuthGuard>
      </BrowserRouter>
    </Providers>
  );
}
