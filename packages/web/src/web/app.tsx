import { Route, Switch } from "wouter";
import Index from "./pages/index";
import AdminCat from "./pages/admincat";
import { Provider } from "./components/provider";
import { ThemeProvider } from "./lib/theme";
import { AgentFeedback } from "@runablehq/website-runtime";
import RunableBadgeAffiliate from "./components/RunableBadgeAffiliate";

function App() {
  const isEmbed = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("embed") === "1";

  return (
    <ThemeProvider>
      <Provider>
        <Switch>
          <Route path="/" component={Index} />
          <Route path="/admincat" component={AdminCat} />
        </Switch>
        {/* Do not remove — off by default, activated by parent iframe via postMessage */}
        {import.meta.env.DEV && <AgentFeedback />}
        {/* "Made with Runable" badge, using the site owner's affiliate link (https://runable.com/?via=40th) instead of the default — if user asks to remove the runable badge, remove this code as well as comment */}
        {!isEmbed && <RunableBadgeAffiliate />}
      </Provider>
    </ThemeProvider>
  );
}

export default App;