import { uploadResource } from "../client.js";
import { UPLOAD_DEFAULT_MODEL } from "../models.js";

export const definition = {
  name: "infron__upload_image",
  description:
    `Upload a LOCAL image file to Infron and get back a publicly-accessible URL usable as a reference image.

Use this when the user has an image ON DISK (a local file path) but another tool needs a public URL — e.g. before infron__video_reference (face / portrait → video), infron__image_edit (source_image_urls), or infron__video_from_image (start_image_url). Those tools do NOT accept local file paths; upload the file here first, then pass the returned \`reference_url\`.

Returns:
  - reference_url : a public GCS URL, immediately usable as an image URL in the tools above
  - asset_uri     : an alternative asset:// URI the gateway also accepts
  - resource_id   : the numeric resource id

Free — no generation cost. Accepts png / jpg / jpeg / webp / gif / bmp.`,
  inputSchema: {
    type: "object",
    required: ["file_path"],
    properties: {
      file_path: {
        type: "string",
        description: "Absolute path to a local image file to upload.",
      },
      model: {
        type: "string",
        description: `Optional. The asset-library model to register the upload under (the gateway requires a model field, and not every model supports the asset library). Default: ${UPLOAD_DEFAULT_MODEL}, which is known-good. The returned public URL works as a reference for ANY tool regardless of this value, so the default is almost always fine.`,
      },
    },
  },
};

export async function handler(args, ctx) {
  const filePath = args.file_path;
  if (!filePath || typeof filePath !== "string") {
    return {
      isError: true,
      content: [{
        type: "text",
        text: JSON.stringify({
          status: "error",
          error_type: "bad_request",
          message: "file_path is required (an absolute path to a local image file).",
        }, null, 2),
      }],
    };
  }

  const model = args.model || UPLOAD_DEFAULT_MODEL;
  const data = await uploadResource(ctx.apiKey, { filePath, model });

  const referenceUrl = data.gcs_url || null;
  const assetUri = data.upstream_asset_uri || null;
  if (!referenceUrl && !assetUri) {
    throw new Error(
      "Upload succeeded but returned neither a gcs_url nor an asset URI. Raw: " +
        JSON.stringify(data).slice(0, 400)
    );
  }

  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        status: "success",
        reference_url: referenceUrl,
        asset_uri: assetUri,
        resource_id: data.id ?? null,
        upstream_status: data.upstream_status ?? null,
        file_name: data.file_name ?? null,
        model,
        hint: "Pass `reference_url` into reference_image_urls (infron__video_reference), source_image_urls (infron__image_edit), or start_image_url (infron__video_from_image).",
      }, null, 2),
    }],
  };
}
