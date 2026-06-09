import { uploadResource, pollResourceActive } from "../client.js";
import { UPLOAD_DEFAULT_MODEL } from "../models.js";

export const definition = {
  name: "infron__upload_asset",
  description:
    `Upload an image to Infron's media gateway and get back an asset:// URI to use as a face/reference in infron__video_reference (the virtual-portrait / "face" model).

Accepts a LOCAL file (file_path) OR a public http(s) URL (image_url). For a real person, the gateway runs a consistency / authorization review — this tool waits until the asset is Active (usually ~1–2 min) so it's ready to use immediately.

Returns:
  - asset_uri    : asset://… — pass this in reference_image_urls of infron__video_reference, and reference it in the prompt as @Image1
  - gcs_url      : the stored public URL
  - resource_id  : numeric asset id (poll /status/resources/{id} yourself if you set wait_for_active:false)
  - review_status: Active when ready

Free — no generation cost.`,
  inputSchema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Absolute path to a local image file. Provide this OR image_url.",
      },
      image_url: {
        type: "string",
        description: "Public http(s) URL of an image. Provide this OR file_path.",
      },
      model: {
        type: "string",
        description: `Asset-library model to register the upload under (the gateway requires a model field; not every model supports the asset library). Default: ${UPLOAD_DEFAULT_MODEL} (known-good). The returned asset works for the reference/virtual-portrait video model regardless.`,
      },
      wait_for_active: {
        type: "boolean",
        description: "Wait for the consistency review to reach Active before returning. Default: true. Set false to return immediately with review_status Processing.",
      },
    },
  },
};

export async function handler(args, ctx) {
  const filePath = args.file_path;
  const fileUrl = args.image_url;
  if (!filePath && !fileUrl) {
    return badRequest("Provide either file_path (a local image) or image_url (a public http(s) URL).");
  }

  const model = args.model || UPLOAD_DEFAULT_MODEL;
  const data = await uploadResource(ctx.apiKey, { filePath, fileUrl, model });

  const resourceId = data.id ?? null;
  let assetUri = data.upstream_asset_uri || null;
  let status = data.upstream_status || null;

  const wait = args.wait_for_active !== false;
  if (wait && status !== "Active" && resourceId != null) {
    const active = await pollResourceActive(ctx.apiKey, resourceId);
    assetUri = active.upstream_asset_uri || assetUri;
    status = active.upstream_status || status;
  }

  if (!assetUri) {
    throw new Error("Upload returned no asset URI. Raw: " + JSON.stringify(data).slice(0, 400));
  }

  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        status: "success",
        asset_uri: assetUri,
        gcs_url: data.gcs_url || null,
        resource_id: resourceId,
        review_status: status,
        model,
        hint: "Pass asset_uri in reference_image_urls of infron__video_reference, and reference it as @Image1 in the prompt.",
      }, null, 2),
    }],
  };
}

function badRequest(message) {
  return {
    isError: true,
    content: [{
      type: "text",
      text: JSON.stringify({ status: "error", error_type: "bad_request", message }, null, 2),
    }],
  };
}
