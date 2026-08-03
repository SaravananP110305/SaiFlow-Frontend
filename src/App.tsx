import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import ForgotPassword from "./pages/AuthPages/ForgotPassword";
import ResetPassword from "./pages/AuthPages/ResetPassword";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import ChangePassword from "./pages/ChangePassword";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Dashboard from "./modules/Dashboard/pages/Dashboard";
import UserManagement from "./modules/UserManagement/pages/UserManagement";
import UserRoleManagement from "./modules/UserManagement/pages/UserRoleManagement";
import AddEditRolePage from "./modules/UserManagement/pages/AddEditRolePage";
import AddEditUserPage from "./modules/UserManagement/pages/AddEditUserPage";
import UserDetailsPage from "./modules/UserManagement/pages/UserDetailsPage";
import MasterConfigPage from "./modules/Master/pages/MasterConfigPage";
import AddEditMasterPage from "./modules/Master/pages/AddEditMasterPage";
import LeadList from "./modules/LeadManagement/pages/LeadList";
import AddLead from "./modules/LeadManagement/pages/AddLead";
import LeadDetails from "./modules/LeadManagement/pages/LeadDetails";
import MyLeads from "./modules/ContactFollowUp/pages/MyLeads";
import FollowUps from "./modules/ContactFollowUp/pages/FollowUps";
import ContactLeadDetail from "./modules/ContactFollowUp/pages/ContactLeadDetail";
import { Meeting, initialMeetings } from "./modules/MeetingManagement/data/meetingsData";
import MeetingsScopePage from "./modules/MeetingManagement/pages/MeetingsScopePage";
import MeetingForm from "./modules/MeetingManagement/pages/MeetingForm";
import MeetingDetails from "./modules/MeetingManagement/pages/MeetingDetails";
import LeadReport from "./modules/Reports/pages/LeadReport";
import MeetingReport from "./modules/Reports/pages/MeetingReport";
import EmployeeReport from "./modules/Reports/pages/EmployeeReport";
import FollowUpReport from "./modules/Reports/pages/FollowUpReport";
import ClientReport from "./modules/Reports/pages/ClientReport";
import ProposalReport from "./modules/Reports/pages/ProposalReport";
import { ToastProvider } from "./context/ToastContext";
import { getStorage, setStorage } from "./utils/storage";
import { AuthProvider } from "./context/AuthContext";

import ClientList from "./modules/ClientManagement/pages/ClientList";
import AddClient from "./modules/ClientManagement/pages/AddClient";
import ClientDetails from "./modules/ClientManagement/pages/ClientDetails";
import QuotationList from "./modules/Quotation/pages/QuotationList";
import AddProposal from "./modules/Quotation/pages/AddProposal";
import SettingsPage from "./modules/Settings/pages/SettingsPage";


import {
  LEAD_SOURCES,
  INDUSTRIES,
  COUNTRIES,
  STATES,
  CITIES,
  DEPARTMENTS,
  DESIGNATIONS,
  PRIORITIES,
  TECHNOLOGIES,
  PROJECT_CATEGORIES,
  COMPANY_TYPES,
  PAYMENT_TYPES,
  FOLLOWUP_TYPES,
} from "./modules/Master/data/masterData";

// ────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [meetings, setMeetings] = useState<Meeting[]>(() => getStorage("saiflow_meetings", initialMeetings));

  const handleDeleteMeeting = (id: number) => {
    const updated = meetings.filter((m) => m.id !== id);
    setMeetings(updated);
    setStorage("saiflow_meetings", updated);
  };

  const handleUpdateMeetingStatus = (id: number, status: Meeting["status"], extra?: Partial<Meeting>) => {
    const updated = meetings.map((m) => m.id === id ? { ...m, status, ...extra } : m);
    setMeetings(updated);
    setStorage("saiflow_meetings", updated);
  };

  const handleSaveMeeting = (meeting: Meeting, isEdit: boolean) => {
    let updated: Meeting[];
    if (isEdit) {
      updated = meetings.map((m) => m.id === meeting.id ? meeting : m);
    } else {
      updated = [...meetings, meeting];
    }
    setMeetings(updated);
    setStorage("saiflow_meetings", updated);
  };

  return (
    <ToastProvider>
      <AuthProvider>
        <Router basename="/saiflow">
          <ScrollToTop />
        <Routes>
          {/* Dashboard Layout */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index path="/" element={<Dashboard />} />
            <Route path="/profile" element={<UserProfiles />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Leads Routes */}
            <Route
              path="/leads"
              element={
                <ProtectedRoute requiredPermission={{ module: 'leads', action: 'view' }}>
                  <LeadList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leads/add"
              element={
                <ProtectedRoute requiredPermission={{ module: 'leads', action: 'create' }}>
                  <AddLead />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leads/:id/edit"
              element={
                <ProtectedRoute requiredPermission={{ module: 'leads', action: 'edit' }}>
                  <AddLead />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leads/:id"
              element={
                <ProtectedRoute requiredPermission={{ module: 'leads', action: 'view' }}>
                  <LeadDetails />
                </ProtectedRoute>
              }
            />

            {/* Connect Routes */}
            <Route
              path="/connect"
              element={
                <ProtectedRoute requiredPermission={{ module: 'connect', action: 'view' }}>
                  <MyLeads />
                </ProtectedRoute>
              }
            />
            <Route
              path="/connect/contacts"
              element={
                <ProtectedRoute requiredPermission={{ module: 'connect', action: 'view' }}>
                  <MyLeads />
                </ProtectedRoute>
              }
            />
            <Route
              path="/connect/follow-ups"
              element={
                <ProtectedRoute requiredPermission={{ module: 'connect', action: 'view' }}>
                  <FollowUps />
                </ProtectedRoute>
              }
            />
            <Route
              path="/connect/follow-ups/:id"
              element={
                <ProtectedRoute requiredPermission={{ module: 'connect', action: 'view' }}>
                  <ContactLeadDetail isFollowUpView={true} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/connect/:id"
              element={
                <ProtectedRoute requiredPermission={{ module: 'connect', action: 'view' }}>
                  <ContactLeadDetail />
                </ProtectedRoute>
              }
            />

            {/* Meetings Routes */}
            <Route
              path="/meetings"
              element={
                <ProtectedRoute requiredPermission={{ module: 'meetings', action: 'view' }}>
                  <MeetingsScopePage
                    meetings={meetings}
                    onDeleteMeeting={handleDeleteMeeting}
                    onUpdateMeetingStatus={handleUpdateMeetingStatus}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meetings/add"
              element={
                <ProtectedRoute requiredPermission={{ module: 'meetings', action: 'create' }}>
                  <MeetingForm onSave={handleSaveMeeting} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meetings/:id/edit"
              element={
                <ProtectedRoute requiredPermission={{ module: 'meetings', action: 'edit' }}>
                  <MeetingForm onSave={handleSaveMeeting} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meetings/:id"
              element={
                <ProtectedRoute requiredPermission={{ module: 'meetings', action: 'view' }}>
                  <MeetingDetails />
                </ProtectedRoute>
              }
            />

            {/* Reports Routes */}
            <Route path="/reports" element={<Navigate to="/reports/leads" replace />} />
            <Route
              path="/reports/leads"
              element={
                <ProtectedRoute requiredPermission={{ module: 'reports', action: 'view' }}>
                  <LeadReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/meetings"
              element={
                <ProtectedRoute requiredPermission={{ module: 'reports', action: 'view' }}>
                  <MeetingReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/employees"
              element={
                <ProtectedRoute requiredPermission={{ module: 'reports', action: 'view' }}>
                  <EmployeeReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/follow-ups"
              element={
                <ProtectedRoute requiredPermission={{ module: 'reports', action: 'view' }}>
                  <FollowUpReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/clients"
              element={
                <ProtectedRoute requiredPermission={{ module: 'reports', action: 'view' }}>
                  <ClientReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/proposals"
              element={
                <ProtectedRoute requiredPermission={{ module: 'reports', action: 'view' }}>
                  <ProposalReport />
                </ProtectedRoute>
              }
            />

            {/* Manage Users Routes */}
            <Route
              path="/users"
              element={
                <ProtectedRoute requiredPermission={{ module: "users", action: "view" }}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/add"
              element={
                <ProtectedRoute requiredPermission={{ module: "users", action: "create" }}>
                  <AddEditUserPage mode="create" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/:id/edit"
              element={
                <ProtectedRoute requiredPermission={{ module: "users", action: "edit" }}>
                  <AddEditUserPage mode="edit" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/:id"
              element={
                <ProtectedRoute requiredPermission={{ module: "users", action: "view" }}>
                  <UserDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/roles"
              element={
                <ProtectedRoute requiredPermission={{ module: "roles", action: "view" }}>
                  <UserRoleManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/roles/add"
              element={
                <ProtectedRoute requiredPermission={{ module: "roles", action: "create" }}>
                  <AddEditRolePage mode="create" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/roles/:id/edit"
              element={
                <ProtectedRoute requiredPermission={{ module: "roles", action: "edit" }}>
                  <AddEditRolePage mode="edit" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/roles/:id/view"
              element={
                <ProtectedRoute requiredPermission={{ module: "roles", action: "view" }}>
                  <AddEditRolePage mode="view" />
                </ProtectedRoute>
              }
            />

            {/* Master Routes */}
            <Route
              path="/master/countries"
              element={
                <ProtectedRoute requiredPermission={{ module: 'master', action: 'view' }}>
                  <MasterConfigPage
                    pageTitle="Country"
                    itemNameSingular="country"
                    itemNamePlural="countries"
                    initialData={COUNTRIES}
                    storageKey="saiflow_master_countries"
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/master/states"
              element={
                <ProtectedRoute requiredPermission={{ module: 'master', action: 'view' }}>
                  <MasterConfigPage
                    pageTitle="State"
                    itemNameSingular="state"
                    itemNamePlural="states"
                    initialData={STATES as any}
                    storageKey="saiflow_master_states"
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/master/cities"
              element={
                <ProtectedRoute requiredPermission={{ module: 'master', action: 'view' }}>
                  <MasterConfigPage
                    pageTitle="City"
                    itemNameSingular="city"
                    itemNamePlural="cities"
                    initialData={CITIES as any}
                    storageKey="saiflow_master_cities"
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/master/departments"
              element={
                <ProtectedRoute requiredPermission={{ module: 'master', action: 'view' }}>
                  <MasterConfigPage
                    pageTitle="Department"
                    itemNameSingular="department"
                    itemNamePlural="departments"
                    initialData={DEPARTMENTS}
                    storageKey="saiflow_master_departments"
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/master/designations"
              element={
                <ProtectedRoute requiredPermission={{ module: 'master', action: 'view' }}>
                  <MasterConfigPage
                    pageTitle="Designation"
                    itemNameSingular="designation"
                    itemNamePlural="designations"
                    initialData={DESIGNATIONS as any}
                    storageKey="saiflow_master_designations"
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/master/lead-sources"
              element={
                <ProtectedRoute requiredPermission={{ module: 'master', action: 'view' }}>
                  <MasterConfigPage
                    pageTitle="Lead source"
                    itemNameSingular="lead source"
                    itemNamePlural="lead sources"
                    initialData={LEAD_SOURCES}
                    storageKey="saiflow_master_lead_sources"
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/master/industries"
              element={
                <ProtectedRoute requiredPermission={{ module: 'master', action: 'view' }}>
                  <MasterConfigPage
                    pageTitle="Industry"
                    itemNameSingular="industry"
                    itemNamePlural="industries"
                    initialData={INDUSTRIES}
                    storageKey="saiflow_master_industries"
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/master/tech-stack"
              element={
                <ProtectedRoute requiredPermission={{ module: 'master', action: 'view' }}>
                  <MasterConfigPage
                    pageTitle="Tech stack"
                    itemNameSingular="tech"
                    itemNamePlural="tech stack"
                    initialData={TECHNOLOGIES}
                    storageKey="saiflow_master_technologies"
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/master/priorities"
              element={
                <ProtectedRoute requiredPermission={{ module: 'master', action: 'view' }}>
                  <MasterConfigPage
                    pageTitle="Priority"
                    itemNameSingular="priority"
                    itemNamePlural="priorities"
                    initialData={PRIORITIES}
                    storageKey="saiflow_master_priorities"
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/master/services"
              element={
                <ProtectedRoute requiredPermission={{ module: 'master', action: 'view' }}>
                  <MasterConfigPage
                    pageTitle="Service"
                    itemNameSingular="service"
                    itemNamePlural="services"
                    initialData={PROJECT_CATEGORIES}
                    storageKey="saiflow_master_services"
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/master/company-types"
              element={
                <ProtectedRoute requiredPermission={{ module: 'master', action: 'view' }}>
                  <MasterConfigPage
                    pageTitle="Company type"
                    itemNameSingular="company type"
                    itemNamePlural="company types"
                    initialData={COMPANY_TYPES}
                    storageKey="saiflow_master_company_types"
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/master/payment-types"
              element={
                <ProtectedRoute requiredPermission={{ module: 'master', action: 'view' }}>
                  <MasterConfigPage
                    pageTitle="Payment type"
                    itemNameSingular="payment type"
                    itemNamePlural="payment types"
                    initialData={PAYMENT_TYPES}
                    storageKey="saiflow_master_payment_types"
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/master/followup-types"
              element={
                <ProtectedRoute requiredPermission={{ module: 'master', action: 'view' }}>
                  <MasterConfigPage
                    pageTitle="Follow-up type"
                    itemNameSingular="follow-up type"
                    itemNamePlural="follow-up types"
                    initialData={FOLLOWUP_TYPES}
                    storageKey="saiflow_master_followup_types"
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/master/:type/add"
              element={
                <ProtectedRoute requiredPermission={{ module: 'master', action: 'create' }}>
                  <AddEditMasterPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/master/:type/:id/edit"
              element={
                <ProtectedRoute requiredPermission={{ module: 'master', action: 'edit' }}>
                  <AddEditMasterPage />
                </ProtectedRoute>
              }
            />

            {/* Core Operational Routes */}
            <Route
              path="/clients"
              element={
                <ProtectedRoute requiredPermission={{ module: 'clients', action: 'view' }}>
                  <ClientList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients/add"
              element={
                <ProtectedRoute requiredPermission={{ module: 'clients', action: 'create' }}>
                  <AddClient />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients/:id/edit"
              element={
                <ProtectedRoute requiredPermission={{ module: 'clients', action: 'edit' }}>
                  <AddClient />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients/:id"
              element={
                <ProtectedRoute requiredPermission={{ module: 'clients', action: 'view' }}>
                  <ClientDetails />
                </ProtectedRoute>
              }
            />
            
            <Route path="/requirements" element={<Navigate to="/proposals" replace />} />
            <Route
              path="/proposals"
              element={
                <ProtectedRoute requiredPermission={{ module: 'proposals', action: 'view' }}>
                  <QuotationList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/proposals/add"
              element={
                <ProtectedRoute requiredPermission={{ module: 'proposals', action: 'create' }}>
                  <AddProposal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/proposals/:id/edit"
              element={
                <ProtectedRoute requiredPermission={{ module: 'proposals', action: 'edit' }}>
                  <AddProposal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute requiredPermission={{ module: 'settings', action: 'view' }}>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Auth Layout */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
      </AuthProvider>
    </ToastProvider>
  );
}
