export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    { ok: true, time: Date.now() },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    }
  );
}
