import { siteConfig, serviceAreas, services } from "@/lib/site-data"

/**
 * Serialize JSON-LD safely for embedding in a <script> element. Escapes the
 * characters that could break out of the script context or corrupt parsing —
 * `<`, `>`, `&`, and the U+2028 / U+2029 line separators — so strings such as
 * "</script>" contained in trusted/plain-text data cannot terminate the tag.
 */
function safeJsonLd(data: object): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
}

function JsonLd({ data }: { data: object }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }} />
  )
}

export function OrganizationSchema() {
  const data = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${siteConfig.url}/#organization`,
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    telephone: siteConfig.phone,
    email: siteConfig.email,
    image: `${siteConfig.url}/hero-inspection.png`,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: "愛三街199號",
      addressLocality: "桃園區",
      addressRegion: "桃園市",
      addressCountry: "TW",
    },
    areaServed: serviceAreas.map((a) => ({ "@type": "City", name: `${a.name}市` })),
    makesOffer: services.map((s) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: s.name },
    })),
    sameAs: [siteConfig.line],
  }
  return <JsonLd data={data} />
}

export function BreadcrumbSchema({
  items,
}: {
  items: { name: string; url: string }[]
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${siteConfig.url}${item.url}`,
    })),
  }
  return <JsonLd data={data} />
}

export function FaqSchema({ faqs }: { faqs: { q: string; a: string }[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }
  return <JsonLd data={data} />
}

export function ArticleSchema({
  title,
  description,
  datePublished,
  dateModified,
  image,
  author,
  url,
}: {
  title: string
  description: string
  datePublished: string
  /** Omitted from the emitted JSON-LD entirely when not provided. */
  dateModified?: string
  /** Omitted from the emitted JSON-LD entirely when not provided. */
  image?: string
  author: string
  url: string
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    ...(image ? { image: `${siteConfig.url}${image}` } : {}),
    datePublished,
    ...(dateModified ? { dateModified } : {}),
    author: { "@type": "Organization", name: author },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: { "@type": "ImageObject", url: `${siteConfig.url}/hero-inspection.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${siteConfig.url}${url}` },
  }
  return <JsonLd data={data} />
}

export function ServiceSchema({
  name,
  description,
  url,
}: {
  name: string
  description: string
  url: string
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    provider: { "@type": "LocalBusiness", name: siteConfig.name, url: siteConfig.url },
    areaServed: serviceAreas.map((a) => ({ "@type": "City", name: `${a.name}市` })),
    url: `${siteConfig.url}${url}`,
  }
  return <JsonLd data={data} />
}
