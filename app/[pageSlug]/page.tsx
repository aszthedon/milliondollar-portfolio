import Link from "next/link";
import { notFound } from "next/navigation";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Container from "@/components/Container";
import Services from "@/components/sections/Services";
import Booking from "@/components/sections/Booking";
import Gallery from "@/components/sections/Gallery";
import Contact from "@/components/sections/Contact";
import { getServerSiteSlug } from "@/lib/site/siteConfig";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ pageSlug: string }> };

async function getPage(slug: string) {
  const siteSlug = getServerSiteSlug();
  const { data, error } = await supabaseAdmin.from("site_pages").select("*").eq("site_slug", siteSlug).eq("slug", slug).eq("status", "published").maybeSingle();
  if (error) throw error;
  return data;
}

function PageBody({ page }: { page: any }) {
  if (page.page_type === "services") return <Services />;
  if (page.page_type === "booking") return <Booking />;
  if (page.page_type === "gallery") return <Gallery />;
  if (page.page_type === "contact") return <Contact />;
  return <section className="bg-black py-16 text-white"><Container><div className="prose prose-invert max-w-none whitespace-pre-line text-lg leading-8 text-zinc-300">{page.body_content || "Add page content from the dashboard."}</div></Container></section>;
}

export default async function DynamicSitePage({ params }: Props) {
  const { pageSlug } = await params;
  const page = await getPage(pageSlug);
  if (!page) notFound();

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <section className="bg-black px-6 pb-16 pt-32 text-white md:px-10">
        <Container>
          <div className="max-w-4xl">
            {page.hero_eyebrow && <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-500">{page.hero_eyebrow}</p>}
            <h1 className="text-5xl font-black md:text-7xl">{page.hero_heading || page.title}</h1>
            {page.hero_description && <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-400">{page.hero_description}</p>}
            {page.cta_label && page.cta_href && <Link href={page.cta_href} className="mt-8 inline-block rounded-full bg-white px-6 py-3 font-black text-black">{page.cta_label}</Link>}
          </div>
        </Container>
      </section>
      <PageBody page={page} />
      <Footer />
    </main>
  );
}
