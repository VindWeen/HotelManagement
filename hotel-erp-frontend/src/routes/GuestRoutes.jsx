import { lazy, Suspense } from "react";
import { Navigate, Route } from "react-router-dom";
import FullscreenLoader from "../components/guest/FullscreenLoader";
import GuestLayout from "../layouts/GuestLayout";
import GuestProtectedRoute from "./GuestProtectedRoute";

const GUEST_LOADER_MIN_MS = 1000;

function lazyWithMinDelay(importer, minDelay = GUEST_LOADER_MIN_MS) {
  return lazy(() =>
    Promise.all([
      importer(),
      new Promise((resolve) => setTimeout(resolve, minDelay)),
    ]).then(([moduleExports]) => moduleExports),
  );
}

const HomePage = lazyWithMinDelay(() => import("../pages/guest/HomePage"));
const ArticlesPage = lazyWithMinDelay(() => import("../pages/guest/ArticlesPage"));
const ArticleDetailPage = lazyWithMinDelay(() => import("../pages/guest/ArticleDetailPage"));
const AttractionsPage = lazyWithMinDelay(() => import("../pages/guest/AttractionsPage"));
const AttractionDetailPage = lazyWithMinDelay(() => import("../pages/guest/AttractionDetailPage"));
const ReviewsPage = lazyWithMinDelay(() => import("../pages/guest/ReviewsPage"));
const GuestDashboardPage = lazyWithMinDelay(() => import("../pages/guest/DashboardPage"));
const GuestProfilePage = lazyWithMinDelay(() => import("../pages/guest/ProfilePage"));
const MyBookingPage = lazyWithMinDelay(() => import("../pages/guest/MyBookingPage"));
const BookingPage = lazyWithMinDelay(() => import("../pages/guest/BookingPage"));

// New pages for Payment and Services
const DepositPaymentPage = lazyWithMinDelay(() => import("../pages/guest/payment/DepositPaymentPage"));
const PaymentResultPage = lazyWithMinDelay(() => import("../pages/guest/payment/PaymentResultPage"));
const GuestServicesPage = lazyWithMinDelay(() => import("../pages/guest/services/GuestServicesPage"));
const GuestOrderServicePage = lazyWithMinDelay(() => import("../pages/guest/services/GuestOrderServicePage"));
const GuestMyOrdersPage = lazyWithMinDelay(() => import("../pages/guest/services/GuestMyOrdersPage"));


function RouteFallback() {
  return <FullscreenLoader />;
}

function withSuspense(node) {
  return <Suspense fallback={<RouteFallback />}>{node}</Suspense>;
}

export default function GuestRoutes() {
  return (
    <Route element={<GuestLayout />}>
      <Route path="/" element={withSuspense(<HomePage />)} />
      <Route path="/booking" element={withSuspense(<BookingPage />)} />
      <Route path="/articles" element={withSuspense(<ArticlesPage />)} />
      <Route path="/articles/:slug" element={withSuspense(<ArticleDetailPage />)} />
      <Route path="/attractions" element={withSuspense(<AttractionsPage />)} />
      <Route path="/attractions/:id" element={withSuspense(<AttractionDetailPage />)} />
      <Route path="/reviews" element={withSuspense(<ReviewsPage />)} />
      <Route
        path="/guest"
        element={
          <GuestProtectedRoute>
            <Navigate to="/guest/dashboard" replace />
          </GuestProtectedRoute>
        }
      />
      <Route
        path="/guest/dashboard"
        element={
          <GuestProtectedRoute>
            {withSuspense(<GuestDashboardPage />)}
          </GuestProtectedRoute>
        }
      />
      <Route
        path="/guest/profile"
        element={
          <GuestProtectedRoute>
            {withSuspense(<GuestProfilePage />)}
          </GuestProtectedRoute>
        }
      />
      <Route
        path="/guest/my-bookings"
        element={
          <GuestProtectedRoute>
            {withSuspense(<MyBookingPage />)}
          </GuestProtectedRoute>
        }
      />
      <Route
        path="/guest/payment/deposit/:bookingId"
        element={
          <GuestProtectedRoute>
            {withSuspense(<DepositPaymentPage />)}
          </GuestProtectedRoute>
        }
      />
      <Route
        path="/guest/payment/result"
        element={
          withSuspense(<PaymentResultPage />)
        }
      />
      <Route
        path="/guest/services"
        element={
          <GuestProtectedRoute>
            {withSuspense(<GuestServicesPage />)}
          </GuestProtectedRoute>
        }
      />
      <Route
        path="/guest/services/order"
        element={
          <GuestProtectedRoute>
            {withSuspense(<GuestOrderServicePage />)}
          </GuestProtectedRoute>
        }
      />
      <Route
        path="/guest/my-orders"
        element={
          <GuestProtectedRoute>
            {withSuspense(<GuestMyOrdersPage />)}
          </GuestProtectedRoute>
        }
      />
    </Route>
  );
}
