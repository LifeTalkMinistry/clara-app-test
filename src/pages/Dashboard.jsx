import { Navigate } from "react-router-dom";

const CLARA_HOME_PATH = "/community?view=home";

/**
 * Legacy Dashboard is retired.
 *
 * CLARA Home now lives exclusively inside Community Home. Keeping this route
 * as a redirect protects old bookmarks while preventing the retired dashboard
 * and its duplicate financial-carousel host from entering the runtime bundle.
 */
export default function Dashboard() {
  return <Navigate to={CLARA_HOME_PATH} replace />;
}
