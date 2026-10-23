import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { PublicLayout } from './layouts/PublicLayout';
import { PortalLayout } from './layouts/PortalLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { GuestGuard, StaffGuard, AdminGuard } from './components/Guards';

import { HomePage } from './routes/public/HomePage';
import { AcAccommodationPage } from './routes/public/AcAccommodationPage';
import { NonAcAccommodationPage } from './routes/public/NonAcAccommodationPage';
import { PricingPage } from './routes/public/PricingPage';
import { FacilitiesPage } from './routes/public/FacilitiesPage';
import { GalleryPage } from './routes/public/GalleryPage';
import { HowItWorksPage } from './routes/public/HowItWorksPage';
import { FaqPage } from './routes/public/FaqPage';
import { ContactPage } from './routes/public/ContactPage';
import { LoginPage } from './routes/public/LoginPage';
import { RegisterPage } from './routes/public/RegisterPage';
import { ForgotPasswordPage } from './routes/public/ForgotPasswordPage';
import { BookingStatusPage } from './routes/public/BookingStatusPage';
import { LegalPage } from './routes/public/LegalPage';
import { BookingWizard } from './routes/public/BookingWizard';
import { NotFoundPage } from './routes/public/NotFoundPage';

import { DashboardPage } from './routes/portal/DashboardPage';
import { MyBookingsPage } from './routes/portal/MyBookingsPage';
import { MyBookingDetailPage } from './routes/portal/MyBookingDetailPage';
import { MyAccommodationPage } from './routes/portal/MyAccommodationPage';
import { PaymentsPage } from './routes/portal/PaymentsPage';
import { SupportListPage } from './routes/portal/SupportListPage';
import { NewSupportPage } from './routes/portal/NewSupportPage';
import { SupportTicketPage } from './routes/portal/SupportTicketPage';
import { ProfilePage } from './routes/portal/ProfilePage';

import { AdminDashboardPage } from './routes/admin/DashboardPage';
import { AdminBedsPage } from './routes/admin/BedsPage';
import { AdminBookingsPage } from './routes/admin/BookingsPage';
import { AdminBookingDetailPage } from './routes/admin/BookingDetailPage';
import { AdminReceptionPage } from './routes/admin/ReceptionPage';
import { AdminRatesPage } from './routes/admin/RatesPage';
import { AdminSettingsPage } from './routes/admin/SettingsPage';
import { AdminFinancePage } from './routes/admin/FinancePage';
import { AdminReportsPage } from './routes/admin/ReportsPage';
import { AdminCleaningPage } from './routes/admin/CleaningPage';
import { AdminMaintenancePage } from './routes/admin/MaintenancePage';
import { AdminWashroomsPage } from './routes/admin/WashroomsPage';
import { AdminStaffPage } from './routes/admin/StaffPage';
import { AdminPoliciesPage } from './routes/admin/PoliciesPage';

function StaffPlaceholder() {
  return (
    <div className="mx-auto max-w-3xl py-16">
      <h1 className="text-2xl font-semibold text-ink">Staff operations</h1>
      <p className="mt-2 text-sm text-muted">
        Staff operations are handled from the <a href="/admin" className="text-brand-900 underline">Admin Control Room</a>.
      </p>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'accommodation/ac', element: <AcAccommodationPage /> },
      { path: 'accommodation/non-ac', element: <NonAcAccommodationPage /> },
      { path: 'pricing', element: <PricingPage /> },
      { path: 'facilities', element: <FacilitiesPage /> },
      { path: 'gallery', element: <GalleryPage /> },
      { path: 'how-it-works', element: <HowItWorksPage /> },
      { path: 'faq', element: <FaqPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'book', element: <BookingWizard /> },
      { path: 'booking/status', element: <BookingStatusPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'legal/:slug', element: <LegalPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/portal',
    element: <GuestGuard />,
    children: [
      {
        element: <PortalLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'bookings', element: <MyBookingsPage /> },
          { path: 'bookings/:id', element: <MyBookingDetailPage /> },
          { path: 'accommodation', element: <MyAccommodationPage /> },
          { path: 'payments', element: <PaymentsPage /> },
          { path: 'support', element: <SupportListPage /> },
          { path: 'support/new', element: <NewSupportPage /> },
          { path: 'support/:id', element: <SupportTicketPage /> },
          { path: 'profile', element: <ProfilePage /> },
        ],
      },
    ],
  },
  {
    path: '/admin',
    element: <AdminGuard />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: 'reception', element: <AdminReceptionPage /> },
          { path: 'beds', element: <AdminBedsPage /> },
          { path: 'bookings', element: <AdminBookingsPage /> },
          { path: 'bookings/:id', element: <AdminBookingDetailPage /> },
          { path: 'cleaning', element: <AdminCleaningPage /> },
          { path: 'maintenance', element: <AdminMaintenancePage /> },
          { path: 'washrooms', element: <AdminWashroomsPage /> },
          { path: 'finance', element: <AdminFinancePage /> },
          { path: 'reports', element: <AdminReportsPage /> },
          { path: 'rates', element: <AdminRatesPage /> },
          { path: 'policies', element: <AdminPoliciesPage /> },
          { path: 'staff', element: <AdminStaffPage /> },
          { path: 'settings', element: <AdminSettingsPage /> },
        ],
      },
    ],
  },
  {
    path: '/staff',
    element: <StaffGuard><StaffPlaceholder /></StaffGuard>,
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}