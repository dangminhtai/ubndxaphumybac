import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/employee-report" element={<ProtectedRoute roles={['admin', 'staff', 'department_lead']}><EmployeeReport /></ProtectedRoute>} />
        <Route path="/my-reports" element={<ProtectedRoute roles={['staff', 'department_lead']}><MyReports /></ProtectedRoute>} />
        <Route path="/weekly-report" element={<Navigate to="/employee-report" replace />} />
        <Route path="/monthly-report" element={<ProtectedRoute roles={['staff', 'department_lead']}><MonthlyReport /></ProtectedRoute>} />
        <Route path="/monthly-summary" element={<ProtectedRoute roles={['admin']}><MonthlySummary /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/periods" element={<ProtectedRoute roles={['admin']}><AdminPeriods /></ProtectedRoute>} />
        <Route path="/admin/logs" element={<ProtectedRoute roles={['admin', 'viewer']}><AdminLogs /></ProtectedRoute>} />
        <Route path="/archive" element={<ProtectedRoute><Archive /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
