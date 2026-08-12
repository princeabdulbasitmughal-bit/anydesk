import { Toaster } from "@/components/ui/sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ResearchProvider } from "@/contexts/ResearchContext";
import Assistant from "@/pages/Assistant";
import Datasets from "@/pages/Datasets";
import Findings from "@/pages/Findings";
import Home from "@/pages/Home";
import Models from "@/pages/Models";
import NotFound from "@/pages/NotFound";
import Results from "@/pages/Results";
import Runs from "@/pages/Runs";
import Tracks from "@/pages/Tracks";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Route, Switch } from "wouter";

function ResearchPage({ children }: { children: React.ReactNode }) {
  return <ResearchProvider><DashboardLayout>{children}</DashboardLayout></ResearchProvider>;
}

function Router() {
  return <Switch>
    <Route path="/">{() => <ResearchPage><Home /></ResearchPage>}</Route>
    <Route path="/datasets">{() => <ResearchPage><Datasets /></ResearchPage>}</Route>
    <Route path="/models">{() => <ResearchPage><Models /></ResearchPage>}</Route>
    <Route path="/runs">{() => <ResearchPage><Runs /></ResearchPage>}</Route>
    <Route path="/results">{() => <ResearchPage><Results /></ResearchPage>}</Route>
    <Route path="/tracks">{() => <ResearchPage><Tracks /></ResearchPage>}</Route>
    <Route path="/findings">{() => <ResearchPage><Findings /></ResearchPage>}</Route>
    <Route path="/assistant">{() => <ResearchPage><Assistant /></ResearchPage>}</Route>
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
