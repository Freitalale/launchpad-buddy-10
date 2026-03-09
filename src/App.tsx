import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Platforms from "./pages/Platforms";
import Logs from "./pages/Logs";
import Settings from "./pages/Settings";
import Integrations from "./pages/Integrations";

import Depositos from "./pages/Depositos";
import Saques from "./pages/Saques";
import Sacs from "./pages/Sacs";
import SystemHealth from "./pages/SystemHealth";
import Tutorial from "./pages/Tutorial";
import NotFound from "./pages/NotFound";
import ErrorPanel from "./pages/ErrorPanel";
import UsersPage from "./pages/Users";
import NotificationLogs from "./pages/NotificationLogs";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/platforms" element={<Platforms />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/depositos" element={<Depositos />} />
              <Route path="/saques" element={<Saques />} />
              <Route path="/sacs" element={<Sacs />} />
              <Route path="/errors" element={<ErrorPanel />} />
              <Route path="/eventos" element={<Integrations />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/integrations" element={<Integrations />} />
              <Route path="/health" element={<SystemHealth />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/tutorial" element={<Tutorial />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
