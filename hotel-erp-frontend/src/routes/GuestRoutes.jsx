import { lazy, Suspense } from "react";
import { Navigate, Route } from "react-router-dom";
import GuestLayout from "../layouts/GuestLayout";
import GuestProtectedRoute from "./GuestProtectedRoute";

const HomePage = lazy(() => import("../pages/guest/HomePage"));
const ArticlesPage = lazy(() => import("../pages/guest/ArticlesPage"));
const ArticleDetailPage = lazy(() => import("../pages/guest/ArticleDetailPage"));
const AttractionsPage = lazy(() => import("../pages/guest/AttractionsPage"));
const AttractionDetailPage = lazy(() => import("../pages/guest/AttractionDetailPage"));
const ReviewsPage = lazy(() => import("../pages/guest/ReviewsPage"));
const GuestDashboardPage = lazy(() => import("../pages/guest/dashboard/DashboardPage"));
const GuestProfilePage = lazy(() => import("../pages/guest/profile/ProfilePage"));
const MyBookingPage = lazy(() => import("../pages/guest/mybooking/MyBookingPage"));

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: "40vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Manrope', sans-serif",
        color: "#6b7280",
        fontSize: 14,
      }}
    >
      Đang tải trang...
    </div>
  );
}

function withSuspense(node) {
  return <Suspense fallback={<RouteFallback />}>{node}</Suspense>;
}

export default function GuestRoutes() {
  return (
    <Route element={<GuestLayout />}>
      <Route path="/" element={withSuspense(<HomePage />)} />
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
    </Route>
  );
}
