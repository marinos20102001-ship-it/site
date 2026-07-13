import React from "react";
import { Helmet } from "react-helmet-async";

const SITE_NAME = "DM Accounting";
const BASE_URL = "https://dm-accounting.gr";
const DEFAULT_IMAGE = `${BASE_URL}/og-image.jpg`;

/**
 * Reusable SEO component for per-page meta tags.
 * Automatically sets title, description, canonical URL, and Open Graph tags.
 */
export default function SEO({ title, description, path = "/", image = DEFAULT_IMAGE, noindex = false }) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Λογιστικό Γραφείο & Φοροτεχνικές Υπηρεσίες`;
  const url = `${BASE_URL}${path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="el_GR" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
