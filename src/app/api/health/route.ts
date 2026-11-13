export async function GET() {
  return Response.json({
    status: "ok",
    service: "service-komputer",
    timestamp: new Date().toISOString(),
  });
}