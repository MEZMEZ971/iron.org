import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminRoute } from "./components/auth/AdminRoute";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { SuccessFeedbackProvider } from "./context/SuccessFeedbackContext";
import { ProfileMenuProvider } from "./context/ProfileMenuContext";
import { ThemeProvider } from "./context/ThemeContext";
import { H5PortfolioProvider } from "./context/H5PortfolioContext";
import { UserProvider } from "./context/UserContext";
import { LocaleProvider } from "./i18n/LocaleContext";
import { AppLayout } from "./layouts/AppLayout";
import Home from "./pages/Home";
import Market from "./pages/Market";
import H5Trade from "./pages/H5Trade";
import H5Assets from "./pages/H5Assets";
import H5MyProfile from "./pages/H5MyProfile";
import H5Deposit from "./pages/H5Deposit";
import H5Withdrawal from "./pages/H5Withdrawal";
import Personal from "./pages/Personal";
import ProfileMenuPage from "./pages/ProfileMenuPage";
import Certification from "./pages/Certification";
import Invite from "./pages/Invite";
import Team from "./pages/Team";
import Settings from "./pages/Settings";
import HelpCenter from "./pages/HelpCenter";
import AdminDashboard from "./pages/AdminDashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <UserProvider>
            <H5PortfolioProvider>
            <ProfileMenuProvider>
              <SuccessFeedbackProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  <Route path="/" element={<ProtectedRoute />}>
                    <Route element={<AppLayout />}>
                      <Route index element={<Home />} />
                      <Route path="market" element={<Market />} />
                      <Route path="trade" element={<H5Trade />} />
                      <Route path="assets" element={<H5Assets />} />
                      <Route path="my" element={<H5MyProfile />} />
                      <Route path="contract" element={<Navigate to="/assets" replace />} />
                      <Route path="personal" element={<Personal />} />
                      <Route path="deposit" element={<H5Deposit />} />
                      <Route path="withdraw" element={<H5Withdrawal />} />
                      <Route path="profile" element={<Navigate to="/my" replace />} />
                      <Route path="profile-menu" element={<ProfileMenuPage />} />
                      <Route path="certification" element={<Certification />} />
                      <Route path="invite" element={<Invite />} />
                      <Route path="team" element={<Team />} />
                      <Route path="settings" element={<Settings />} />
                      <Route path="help" element={<HelpCenter />} />
                    </Route>

                    <Route element={<AdminRoute />}>
                      <Route path="admin-portal" element={<AdminDashboard />} />
                    </Route>
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
              </SuccessFeedbackProvider>
            </ProfileMenuProvider>
            </H5PortfolioProvider>
          </UserProvider>
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
