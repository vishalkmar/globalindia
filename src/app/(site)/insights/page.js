import { InsightsPage } from "@/components/content/InsightsPage";

export const metadata = {
  title: "Insights: Buying Guides and Quality Notes",
  description:
    "Practical articles on chemical raw material grades, COA and SDS, prices and handling from Global India, Delhi.",
  alternates: { canonical: "/insights" },
};

export default function Insights() {
  return <InsightsPage page={1} />;
}
