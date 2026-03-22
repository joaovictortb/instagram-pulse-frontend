"use client";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "@/app/(dashboard)/layout";
import DashboardPage from "@/app/(dashboard)/dashboard/page";
import AnalyticsPage from "@/app/(dashboard)/analytics/page";
import ContentPage from "@/app/(dashboard)/content/page";
import CommentsPage from "@/app/(dashboard)/comments/page";
import AudiencePage from "@/app/(dashboard)/audience/page";
import GrowthAIPage from "@/app/(dashboard)/growth-ai/page";
import GrowthPlan7Page from "@/app/(dashboard)/growth-plan/page";
import ReportsPage from "@/app/(dashboard)/reports/page";
import SettingsPage from "@/app/(dashboard)/settings/page";
import InstagramConnectPage from "@/app/(dashboard)/instagram-connect/page";
import YoutubeImportPage from "@/app/(dashboard)/youtube-import/page";
import OrchestratorPage from "@/app/(dashboard)/orchestrator/page";
import StudioPage from "@/app/(dashboard)/studio/page";
import LoginPage from "@/app/login/page";
import Providers from "@/components/Providers";
import { AuthGuard } from "./components/AuthGuard";

export default function App() {
  return (
    <Providers>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AuthGuard />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={<DashboardLayout children={<DashboardPage />} />}
            />
            <Route
              path="/analytics"
              element={<DashboardLayout children={<AnalyticsPage />} />}
            />
            <Route
              path="/content"
              element={<DashboardLayout children={<ContentPage />} />}
            />
            <Route
              path="/comments"
              element={<DashboardLayout children={<CommentsPage />} />}
            />
            <Route
              path="/audience"
              element={<DashboardLayout children={<AudiencePage />} />}
            />
            <Route
              path="/growth-ai"
              element={<DashboardLayout children={<GrowthAIPage />} />}
            />
            <Route
              path="/growth-plan"
              element={<DashboardLayout children={<GrowthPlan7Page />} />}
            />
            <Route
              path="/reports"
              element={<DashboardLayout children={<ReportsPage />} />}
            />
            <Route
              path="/settings"
              element={<DashboardLayout children={<SettingsPage />} />}
            />
            <Route
              path="/instagram-connect"
              element={<DashboardLayout children={<InstagramConnectPage />} />}
            />
            <Route
              path="/youtube-import"
              element={<DashboardLayout children={<YoutubeImportPage />} />}
            />
            <Route
              path="/orchestrator"
              element={<DashboardLayout children={<OrchestratorPage />} />}
            />
            <Route
              path="/studio"
              element={<DashboardLayout children={<StudioPage />} />}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </Providers>
  );
}
