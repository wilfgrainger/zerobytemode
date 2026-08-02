import { releaseInfo } from "../../lib/release";

export const dynamic = "force-static";

export function GET() {
  return Response.json(releaseInfo, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
