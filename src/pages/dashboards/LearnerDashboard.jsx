// src/pages/dashboards/LearnerDashboard.jsx
import React from 'react'
import StudentDashboard from './StudentDashboard'

export default function LearnerDashboard(props) {
  // Temporary wrapper to preserve behavior while renaming in stages.
  return <StudentDashboard {...props} />
}
