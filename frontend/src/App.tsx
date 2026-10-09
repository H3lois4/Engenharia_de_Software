import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { LoginScreen } from "./auth/LoginScreen";
import { Navbar } from "./components/Navbar";
import { ChatPage } from "./features/chat/ChatPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { NotificationsPage } from "./features/notifications/NotificationsPage";
import { ThemeProvider } from "./theme/ThemeProvider";

function Shell() {
  const { user } = useAuth();

  if (!user) return <LoginScreen />;

  return (
    <div className="min-h-full bg-bg text-text">
      <Navbar />
      <main className="mx-auto max-w-6xl p-6">
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/notificacoes" element={<NotificationsPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Shell />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
