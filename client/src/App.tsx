import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import CitizenHome from "./pages/CitizenHome";
import ComplaintDetail from "./pages/ComplaintDetail";
import ComplaintList from "./pages/ComplaintList";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import Notifications from "./pages/Notifications";
import ReportIssue from "./pages/ReportIssue";
import AuthorityDashboard from "./pages/AuthorityDashboard";
import AuthorityReports from "./pages/AuthorityReports";
import AuthorityReportDetail from "./pages/AuthorityReportDetail";
import AdminManagement from "./pages/AdminManagement";
import DemoLogin from "./pages/DemoLogin";
import DemoWorkspace from "./pages/DemoWorkspace";
import DemoPreview from "./pages/DemoPreview";

function Router() {
  return <Switch>
    <Route path="/" component={Landing} />
    <Route path="/citizen" component={CitizenHome} />
    <Route path="/report" component={ReportIssue} />
    <Route path="/complaints" component={ComplaintList} />
    <Route path="/complaints/:publicId" component={ComplaintDetail} />
    <Route path="/notifications" component={Notifications} />
    <Route path="/authority" component={AuthorityDashboard} />
    <Route path="/authority/reports" component={AuthorityReports} />
    <Route path="/authority/reports/:id" component={AuthorityReportDetail} />
    <Route path="/admin" component={AdminManagement} />
    <Route path="/demo-login" component={DemoLogin} />
    <Route path="/demo" component={DemoWorkspace} />
    <Route path="/demo-preview/:role" component={DemoPreview} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster richColors position="top-right" /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
