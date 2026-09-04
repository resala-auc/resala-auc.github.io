import { buildAcceptanceEmailHtml } from "../../supabase/functions/submit/index.ts";
for (const position of ["Head", "Co-Head", "Member"] as const) {
  const html = buildAcceptanceEmailHtml({
    fullName: "Nour Hassan",
    committee: "Tech Team",
    headName: "The Navigator",
    position,
    onboardingUrl: "https://x/?email=n%40aucegypt.edu"
  });
  const m = html.match(/class="rolename ink"[^>]*>([^<]+)</);
  console.log(`  position=${position.padEnd(8)} -> role card reads: "${m?.[1]}"`);
}
