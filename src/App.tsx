import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { useAuth } from '@/hooks/useAuth';
import { HomePage, EventsPage, EventDetailPage, AboutPage, ContactPage } from '@/pages/PublicPages';
import { SignInPage, SignUpPage, ForgotPasswordPage } from '@/pages/AuthPages';
import { DashboardPage, BookingsPage, BookingPage, PaymentPage, BookingDetailPage, TicketPage, ProfilePage } from '@/pages/StudentPages';
import {
  AdminDashboardPage,
  AdminBookingsPage,
  AdminPaymentsPage,
  AdminEventsPage,
  AdminAttendeesPage,
  AdminCheckInsPage,
  AdminWaitlistsPage,
  AdminAuditPage,
  AdminSettingsPage,
} from '@/pages/AdminPages';
import { LoadingState } from '@/components/ui';

function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingState />;
  return user ? <Outlet /> : <Navigate to={`/sign-in?redirect=${encodeURIComponent(location.pathname)}`} replace />;
}

function AdminRoute() {
  const { user, isStaff, loading } = useAuth();
  if (loading) return <LoadingState />;
  if (!user) return <Navigate to="/sign-in?redirect=/admin" replace />;
  return isStaff ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:slug" element={<EventDetailPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/events/:slug/book" element={<BookingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/bookings" element={<BookingsPage />} />
          <Route path="/dashboard/bookings/:id" element={<BookingDetailPage />} />
          <Route path="/dashboard/bookings/:id/payment" element={<PaymentPage />} />
          <Route path="/dashboard/tickets/:id" element={<TicketPage />} />
          <Route path="/dashboard/profile" element={<ProfilePage />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/events" element={<AdminEventsPage />} />
            <Route path="/admin/bookings" element={<AdminBookingsPage />} />
            <Route path="/admin/payments" element={<AdminPaymentsPage />} />
            <Route path="/admin/attendees" element={<AdminAttendeesPage />} />
            <Route path="/admin/check-ins" element={<AdminCheckInsPage />} />
            <Route path="/admin/waitlists" element={<AdminWaitlistsPage />} />
            <Route path="/admin/audit" element={<AdminAuditPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
