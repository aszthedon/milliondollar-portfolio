import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

function getTemplateName(body: Record<string, unknown>) {
  return String(
    body.template_name || body.title || body.name || "Untitled Contract Template"
  ).trim();
}

function getTemplateContent(body: Record<string, unknown>) {
  return String(
    body.contract_body ||
      body.content ||
      body.body ||
      body.template_body ||
      ""
  ).trim();
}

async function insertTemplateWithFallback({
  templateName,
  templateContent,
}: {
  templateName: string;
  templateContent: string;
}) {
  const now = new Date().toISOString();

  const attempts: Record<string, unknown>[] = [
    {
      template_name: templateName,
      title: templateName,
      contract_body: templateContent,
      content: templateContent,
      body: templateContent,
      template_body: templateContent,
      created_at: now,
      updated_at: now,
    },
    {
      template_name: templateName,
      title: templateName,
      contract_body: templateContent,
      content: templateContent,
      created_at: now,
      updated_at: now,
    },
    {
      template_name: templateName,
      title: templateName,
      content: templateContent,
    },
    {
      title: templateName,
      content: templateContent,
    },
  ];

  const errors: string[] = [];

  for (const payload of attempts) {
    const { data, error } = await supabaseAdmin
      .from("contract_templates")
      .insert(payload)
      .select("*")
      .single();

    if (!error) {
      return data;
    }

    errors.push(error.message);
  }

  throw new Error(errors.join(" | "));
}

export async function GET(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("contract_templates")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(200);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      templates: data ?? [],
      message: "Contract templates loaded.",
    });
  } catch (error) {
    console.error("LOAD CONTRACT TEMPLATES ERROR:", error);

    return NextResponse.json(
      {
        error: "Contract templates could not be loaded.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const body = await request.json().catch(() => ({}));

    const templateName = getTemplateName(body);
    const templateContent = getTemplateContent(body);

    if (!templateName) {
      return NextResponse.json(
        {
          error: "Template name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!templateContent) {
      return NextResponse.json(
        {
          error: "Template content is required.",
        },
        {
          status: 400,
        }
      );
    }

    const template = await insertTemplateWithFallback({
      templateName,
      templateContent,
    });

    return NextResponse.json({
      template,
      message: "Contract template created.",
    });
  } catch (error) {
    console.error("CREATE CONTRACT TEMPLATE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Contract template could not be created.",
      },
      {
        status: 500,
      }
    );
  }
}