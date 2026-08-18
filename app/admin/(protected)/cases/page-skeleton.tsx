import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/**
 * Shared skeleton for the Case Study CMS admin pages (STEP 2 — navigation
 * skeleton only). Renders a title, description, and a placeholder card.
 * No data fetching, forms, or tables yet.
 */
export function CasesPageSkeleton({
  title,
  description,
  placeholder,
}: {
  title: string
  description: string
  placeholder: string
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>即將推出</CardTitle>
          <CardDescription>此功能正在建置中。</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{placeholder}</p>
        </CardContent>
      </Card>
    </div>
  )
}
