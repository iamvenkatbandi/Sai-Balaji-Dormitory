import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { PublicLayout } from './layouts/PublicLayout';
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

import { PortalLayout } from './layouts/PortalLayout';
import { DashboardPage } from './routes/portal/DashboardPage';
import { MyBookingsPage } from './routes/portal/MyBookingsPage';
import { MyBookingDetailPage } from './routes/portal/MyBookingDetailPage';
import { MyAccommodationPage } from './routes/portal/MyAccommodationPage';
import { PaymentsPage } from './routes/portal/PaymentsPage';
import { SupportListPage } from './routes/portal/SupportListPage';
import { NewSupportPage } from './routes/portal/NewSupportPage';
import { SupportTicketPage } from './routes/portal/SupportTicketPage';
import { ProfilePage } from './routes/portal/ProfilePage';

function PhasePlaceholder({ name, phase }: { name: string; phase: string }) {
  return (
    <div className="mx-auto max-w-3xl py-16">
      <h1 className="text-2xl font-semibold text-ink">{name}</h1>
      <p className="mt-2 text-sm text-muted">This module is delivered in {phase}.</p>
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
    element: <GuestGuard><PortalLayout /></GuestGuard>,
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
  {
    path: '/staff',
    element: <StaffGuard><Outlet /></StaffGuard>,
    children: [
      { index: true, element: <PhasePlaceholder name="Staff operations" phase="Phase 4" /> },
      { path: '*', element: <PhasePlaceholder name="Staff operations" phase="Phase 4" /> },
    ],
  },
  {
    path: '/admin',
    element: <AdminGuard><Outlet /></AdminGuard>,
    children: [
      { index: true, element: <PhasePlaceholder name="Admin Control Room" phase="Phase 4" /> },
      { path: '*', element: <PhasePlaceholder name="Admin Control Room" phase="Phase 4" /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}