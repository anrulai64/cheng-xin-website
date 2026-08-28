"use client"

// TEMPORARY verification harness for A10-C-FIX4 (CleanEnterOnReturn).
// Not linked from anywhere, no auth required. DELETE after verification.

import * as React from "react"
import { RichTextEditor } from "../admin/(protected)/articles/rich-text-editor"

export default function EnterFixTestPage() {
  const [html, setHtml] = React.useState(
    "<h2>Heading Test</h2><p><strong>Bold text</strong> then more.</p><p style=\"text-align:center\">Centered paragraph</p><ul><li>List item one</li></ul><blockquote><p>A quote</p></blockquote>",
  )
  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <h1>Enter Fix Test Harness</h1>
      <RichTextEditor value={html} onChange={setHtml} ariaLabel="test editor" />
      <h2 style={{ marginTop: 24 }}>Raw HTML output</h2>
      <pre style={{ whiteSpace: "pre-wrap", border: "1px solid #ccc", padding: 8 }}>{html}</pre>
    </div>
  )
}
