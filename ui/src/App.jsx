import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LegacyFrame from './components/LegacyFrame.jsx';
import Landing from './pages/Landing.jsx';
import Admin from './pages/Admin.jsx';
import Public from './pages/Public.jsx';
import Nurse from './pages/Nurse.jsx';
import Reception from './pages/Reception.jsx';
import Doctor from './pages/Doctor.jsx';
import Ambulance from './pages/Ambulance.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route path="/public" element={<Public />} />
      <Route path="/reception" element={<Reception />} />
      <Route path="/doctor" element={<Doctor />} />
      <Route path="/ambulance" element={<Ambulance />} />
      <Route path="/nurse" element={<Nurse />} />
      <Route path="/admin" element={<Admin />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
