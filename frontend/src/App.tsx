import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmployeeReport from './pages/EmployeeReport';
import MonthlyReport from './pages/MonthlyReport';
import AdminUsers from './pages/AdminUsers';
import AdminPeriods from './pages/AdminPeriods';
import MyReports from './pages/MyReports';
import ProtectedRoute from './components/ProtectedRoute';
import ChangePassword from './pages/ChangePassword';
import MonthlySummary from './pages/MonthlySummary';
import AdminLogs from './pages/AdminLogs';
import Archive from './pages/Archive';
import Notifications from './pages/Notifications';
import WorkSchedules from './pages/WorkSchedules';
import WorkScheduleForm from './pages/WorkScheduleForm';
import WorkScheduleStats from './pages/WorkScheduleStats';

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/employee-report" element={<ProtectedRoute roles={['admin', 'staff', 'department_lead', 'user']}><EmployeeReport /></ProtectedRoute>} />
        <Route path="/my-reports" element={<ProtectedRoute roles={['staff', 'department_lead', 'user']}><MyReports /></ProtectedRoute>} />
        <Route path="/weekly-report" element={<Navigate to="/employee-report" replace />} />
        <Route path="/monthly-report" element={<ProtectedRoute roles={['staff', 'department_lead', 'user']}><MonthlyReport /></ProtectedRoute>} />
        <Route path="/monthly-summary" element={<ProtectedRoute roles={['admin']}><MonthlySummary /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/periods" element={<ProtectedRoute roles={['admin']}><AdminPeriods /></ProtectedRoute>} />
        <Route path="/admin/logs" element={<ProtectedRoute roles={['admin', 'viewer']}><AdminLogs /></ProtectedRoute>} />
        <Route path="/archive" element={<ProtectedRoute roles={['admin', 'viewer', 'department_lead', 'office_clerk']}><Archive /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/work-schedules" element={<ProtectedRoute><WorkSchedules /></ProtectedRoute>} />
        <Route path="/work-schedules/:id" element={<ProtectedRoute><WorkSchedules /></ProtectedRoute>} />
        <Route path="/work-schedules/new" element={<ProtectedRoute roles={['admin', 'department_lead']}><WorkScheduleForm /></ProtectedRoute>} />
        <Route path="/work-schedules/stats" element={<ProtectedRoute roles={['admin', 'department_lead']}><WorkScheduleStats /></ProtectedRoute>} />
        <Route path="/work-schedules/:id/edit" element={<ProtectedRoute roles={['admin', 'department_lead']}><WorkScheduleForm /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
