"use client"

import * as React from "react"
import { Plus } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Public「案例介紹 / 常見問題」tabs for the CMS Case Study detail page.
 *
 * Presentation + interactivity ONLY. All HTML handed in via `introHtml` and
 * each `faqs[].answerHtml` is ALREADY sanitized on the server (sanitizeCaseHtml)
 * — this client component never sanitizes and only renders trusted markup
 * inside the scoped `.case-content` wrapper. Empty-state decisions (hiding the
 * whole section, or dropping a dead tab) are made on the server; this component
 * assumes at least one side has content.
 */

export type CaseFaqItem = {
  id: string
  question: string
  /** Server-sanitized answer HTML. */
  answerHtml: string
}

type TabKey = "intro" | "faq"

export function CaseInfoTabs({
  introHtml,
  faqs,
}: {
  introHtml: string | null
  faqs: CaseFaqItem[]
}) {
  const hasIntro = Boolean(introHtml)
  const hasFaq = faqs.length > 0

  // Default to 案例介紹 when present, otherwise 常見問題.
  const [active, setActive] = React.useState<TabKey>(hasIntro ? "intro" : "faq")
  const showTabBar = hasIntro && hasFaq

  return (
    <section className="mt-12" aria-label="案例介紹與常見問題">
      {showTabBar ? (
        <div role="tablist" aria-label="案例資訊分頁" className="flex gap-1 border-b border-border">
          <TabButton
            id="tab-intro"
            controls="panel-intro"
            selected={active === "intro"}
            onSelect={() => setActive("intro")}
          >
            案例介紹
          </TabButton>
          <TabButton
            id="tab-faq"
            controls="panel-faq"
            selected={active === "faq"}
            onSelect={() => setActive("faq")}
          >
            常見問題
          </TabButton>
        </div>
      ) : (
        <h2 className="border-b border-border pb-3 font-serif text-2xl font-bold text-primary">
          {hasIntro ? "案例介紹" : "常見問題"}
        </h2>
      )}

      {/* 案例介紹 panel */}
      {hasIntro && (active === "intro" || !showTabBar) ? (
        <div
          id="panel-intro"
          role={showTabBar ? "tabpanel" : undefined}
          aria-labelledby={showTabBar ? "tab-intro" : undefined}
          className="pt-6"
        >
          <div
            className="case-content leading-relaxed text-foreground"
            dangerouslySetInnerHTML={{ __html: introHtml as string }}
          />
        </div>
      ) : null}

      {/* 常見問題 panel */}
      {hasFaq && (active === "faq" || !showTabBar) ? (
        <div
          id="panel-faq"
          role={showTabBar ? "tabpanel" : undefined}
          aria-labelledby={showTabBar ? "tab-faq" : undefined}
          className="pt-6"
        >
          <FaqAccordion faqs={faqs} />
        </div>
      ) : null}
    </section>
  )
}

function TabButton({
  id,
  controls,
  selected,
  onSelect,
  children,
}: {
  id: string
  controls: string
  selected: boolean
  onSelect: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-controls={controls}
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        "-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
        selected
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

function FaqAccordion({ faqs }: { faqs: CaseFaqItem[] }) {
  const [openId, setOpenId] = React.useState<string | null>(null)

  return (
    <div className="flex flex-col divide-y divide-border rounded-2xl border border-border">
      {faqs.map((faq) => {
        const isOpen = openId === faq.id
        const panelId = `faq-panel-${faq.id}`
        const buttonId = `faq-button-${faq.id}`
        return (
          <div key={faq.id}>
            <h3 className="m-0">
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenId(isOpen ? null : faq.id)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-accent/40"
              >
                <Plus
                  className={cn(
                    "size-5 shrink-0 text-primary transition-transform duration-200",
                    isOpen && "rotate-45",
                  )}
                  aria-hidden
                />
                <span className="font-semibold text-foreground">{faq.question}</span>
              </button>
            </h3>
            {isOpen ? (
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className="px-5 pb-5 pl-12"
              >
                <div
                  className="case-content leading-relaxed text-foreground"
                  dangerouslySetInnerHTML={{ __html: faq.answerHtml }}
                />
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
