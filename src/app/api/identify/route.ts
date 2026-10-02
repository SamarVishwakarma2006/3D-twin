import {
  identificationInput,
  localIdentification,
} from "../../../lib/providers";
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 20000)
    return Response.json({ error: "Request too large" }, { status: 413 });
  try {
    const reader = request.body?.getReader();
    if (!reader)
      return Response.json({ error: "Missing request body" }, { status: 400 });
    const decoder = new TextDecoder();
    let body = "",
      size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 20000) {
        await reader.cancel();
        return Response.json({ error: "Request too large" }, { status: 413 });
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    const parsed = identificationInput.safeParse(JSON.parse(body));
    if (!parsed.success)
      return Response.json(
        { error: "Invalid product metadata" },
        { status: 400 },
      );
    return Response.json(
      await localIdentification.identifyProduct(parsed.data),
    );
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}
