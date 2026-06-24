import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ConfirmProvider } from "@/context/ConfirmContext";
import Layout from "@/components/Layout";
import CookieBanner from "@/components/CookieBanner";
import ProtectedRoute from "@/components/ProtectedRoute";
import Home from "@/pages/Home";
import Services from "@/pages/Services";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Login from "@/pages/Login";
import ClientDashboard from "@/pages/ClientDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import TaxCalculator from "@/pages/TaxCalculator";
import SimpleBooks from "@/pages/SimpleBooks";
import Quote from "@/pages/Quote";
import Privacy from "@/pages/Privacy";
import Blog from "@/pages/Blog";
import { Toaster } from "sonner";

function App() {
  return (
    <div className="App">
      <ThemeProvider>
        <AuthProvider>
          <ConfirmProvider>
            <BrowserRouter>
            <Toaster position="top-right" />
            <Routes>
              <Route path="/" element={<Layout><Home /></Layout>} />
              <Route path="/services" element={<Layout><Services /></Layout>} />
              <Route path="/about" element={<Layout><About /></Layout>} />
              <Route path="/contact" element={<Layout><Contact /></Layout>} />
              <Route path="/tax-calculator" element={<Layout><TaxCalculator /></Layout>} />
              <Route path="/quote" element={<Layout><Quote /></Layout>} />
              <Route path="/blog" element={<Layout><Blog /></Layout>} />
              <Route path="/privacy" element={<Layout><Privacy /></Layout>} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute role="client">
                    <Layout><ClientDashboard /></Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/books"
                element={
                  <ProtectedRoute role="client">
                    <Layout><SimpleBooks /></Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute role="admin">
                    <Layout><AdminDashboard /></Layout>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Layout><Home /></Layout>} />
            </Routes>
            <CookieBanner />
          </BrowserRouter>
          </ConfirmProvider>
        </AuthProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;

