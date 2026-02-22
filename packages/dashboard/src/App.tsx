import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout.js";
import { ProtectedRoute, AuthRoute } from "./components/ProtectedRoute.js";
import SignIn from "./pages/auth/SignIn.js";
import SignUp from "./pages/auth/SignUp.js";
import Overview from "./pages/Overview.js";

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
      </Route>
    </Routes>
  );
}
