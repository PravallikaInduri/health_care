import { Navigate } from "react-router-dom";
import { getToken, getRole } from "../utils/auth";

interface Props {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute = ({
  children,
  allowedRoles,
}: Props) => {
  const token = getToken();

  const role = getRole();

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (
    allowedRoles &&
    role &&
    !allowedRoles.includes(role)
  ) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
