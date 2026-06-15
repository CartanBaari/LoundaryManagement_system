import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import AppLayout, { AuthLoadingScreen } from "@/components/layout/AppLayout"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Dashboard from "./pages/Dashboard"
import Orders from "./pages/Orders"
import Users from "./pages/Users"
import Services from "./pages/Services"
import ItemsCategories from "./pages/ItemsCategories"
import Customers from "./pages/Customers"
import Staff from "./pages/Staff"
import Payments from "./pages/Payments"
import Invoices from "./pages/Invoices"
import PickupDelivery from "./pages/PickupDelivery"
import Inventory from "./pages/Inventory"
import Reports from "./pages/Reports"
import Notifications from "./pages/Notifications"
import Settings from "./pages/Settings"
import { Button } from "@/components/ui/button"
import "./index.css"

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <AuthLoadingScreen />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function RootRoute() {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <AuthLoadingScreen />
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
}

function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[#111827]">404</h1>
        <p className="mt-2 text-muted-foreground">Page not found</p>
        <Button className="mt-6" asChild>
          <a href="/dashboard">Back to Dashboard</a>
        </Button>
      </div>
    </div>
  )
}

const protectedPage = (Page) => (
  <ProtectedRoute>
    <AppLayout>
      <Page />
    </AppLayout>
  </ProtectedRoute>
)

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="light" storageKey="laundryhub-theme">
        <AuthProvider>
          <Toaster position="top-right" richColors closeButton />
          <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={protectedPage(Dashboard)} />
            <Route path="/orders" element={protectedPage(Orders)} />
            <Route path="/orders/create" element={<ProtectedRoute><Navigate to="/orders" replace /></ProtectedRoute>} />
            <Route path="/users" element={protectedPage(Users)} />
            <Route path="/services" element={protectedPage(Services)} />
            <Route path="/items-categories" element={protectedPage(ItemsCategories)} />
            <Route path="/customers" element={protectedPage(Customers)} />
            <Route path="/staff" element={protectedPage(Staff)} />
            <Route path="/payments" element={protectedPage(Payments)} />
            <Route path="/invoices" element={protectedPage(Invoices)} />
            <Route path="/pickup-delivery" element={protectedPage(PickupDelivery)} />
            <Route path="/inventory" element={protectedPage(Inventory)} />
            <Route path="/reports" element={protectedPage(Reports)} />
            <Route path="/notifications" element={protectedPage(Notifications)} />
            <Route path="/settings" element={protectedPage(Settings)} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
