import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { getServerSiteSlug } from "@/lib/site/siteConfig";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function safeFilename(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug(request);
    const formData = await request.formData();
    const file = formData.get("file");
    const serviceId = Number(formData.get("service_id") ?? 0);

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "An image file is required." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be 10 MB or smaller." }, { status: 400 });
    }

    const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
    const baseName = safeFilename(file.name.replace(/\.[^.]+$/, "")) || "service-image";
    const path = `${siteSlug}/${serviceId || "new"}/${Date.now()}-${baseName}.${extension}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await supabaseAdmin.storage
      .from("service-images")
      .upload(path, bytes, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabaseAdmin.storage.from("service-images").getPublicUrl(path);

    return NextResponse.json({
      site_slug: siteSlug,
      image_url: data.publicUrl,
      path,
      message: "Service image uploaded.",
    });
  } catch (error) {
    console.error("SERVICE IMAGE UPLOAD ERROR:", error);
    return NextResponse.json({ error: "Service image could not be uploaded." }, { status: 500 });
  }
}
