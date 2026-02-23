import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout.js";
import { ProtectedRoute, AuthRoute } from "./components/ProtectedRoute.js";
import SignIn from "./pages/auth/SignIn.js";
import SignUp from "./pages/auth/SignUp.js";
import Overview from "./pages/Overview.js";
import Projects from "./pages/Projects.js";
import ProjectDetail from "./pages/ProjectDetail.js";
import TeamMembers from "./pages/TeamMembers.js";
import OrgSettings from "./pages/Settings.js";

export default function App() {
  return (
    <Routes>
      <Route
        path="/signin"
        element={
          <AuthRoute>
            <SignIn />
          </AuthRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <AuthRoute>
            <SignUp />
          </AuthRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Overview />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:projectId" element={<ProjectDetail />} />
        <Route path="team" element={<TeamMembers />} />
        <Route path="settings" element={<OrgSettings />} />
      </Route>
    </Routes>
  );
}
