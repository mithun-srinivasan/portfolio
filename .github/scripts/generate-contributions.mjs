import { writeFileSync } from "node:fs";

const LOGIN = process.env.GITHUB_LOGIN || "mithun-srinivasan";
const TOKEN = process.env.GITHUB_TOKEN;
const OUT = "assets/data/github.json";

const GRAPHQL = `
query($login: String!) {
  user(login: $login) {
    contributionsCollection(
      from: "2025-01-01T00:00:00Z"
      to: "2026-12-31T23:59:59Z"
    ) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
            color
          }
        }
      }
    }
    repositories(privacy: PUBLIC, first: 100, orderBy: { field: CREATED_AT, direction: DESC }) {
      totalCount
    }
  }
}
`;

async function main() {
  if (!TOKEN) {
    console.error("GITHUB_TOKEN is not set");
    process.exit(1);
  }

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "portfolio-contrib-refresh",
    },
    body: JSON.stringify({ query: GRAPHQL, variables: { login: LOGIN } }),
  });

  if (!res.ok) {
    console.error(`GraphQL request failed: ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const json = await res.json();
  if (json.errors) {
    console.error("GraphQL errors:", JSON.stringify(json.errors));
    process.exit(1);
  }

  const user = json.data.user;
  if (!user) {
    console.error(`User ${LOGIN} not found`);
    process.exit(1);
  }

  const cal = user.contributionsCollection.contributionCalendar;
  const days = [];
  for (const week of cal.weeks) {
    for (const day of week.contributionDays) {
      days.push([day.date, day.color, day.contributionCount]);
    }
  }

  days.sort((a, b) => a[0].localeCompare(b[0]));

  const data = {
    generated: new Date().toISOString().slice(0, 10),
    contributions: cal.totalContributions,
    repos: user.repositories.totalCount,
    days,
  };

  writeFileSync(OUT, JSON.stringify(data));
  console.log(`Wrote ${OUT}: ${data.contributions} contributions, ${data.repos} repos, ${days.length} days`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
