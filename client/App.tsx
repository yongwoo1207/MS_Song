import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Result from "./pages/Result";
import Songs from "./pages/Songs";
import Dday from "./pages/Dday";
import Community from "./pages/Community";
import My from "./pages/My";
import Notifications from "./pages/Notifications";
import Talk from "./pages/Talk";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import VersionWatcher from "@/components/VersionWatcher";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <VersionWatcher />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dday" element={<Dday />} />
          <Route path="/result" element={<Result />} />
          {/* 다른 입대일 노래: browsing someone else's charts */}
          <Route path="/songs" element={<Songs />} />
          <Route path="/community" element={<Community />} />
          <Route path="/community/popular" element={<Community />} />
          <Route path="/community/music" element={<Community />} />
          {/* Old topic links: show the whole board */}
          <Route path="/community/story" element={<Community />} />
          <Route path="/community/talk" element={<Community />} />
          <Route path="/me" element={<My />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/talk/:id" element={<Talk />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
