import {
  DownloadIcon,
  FolderIcon,
  HouseIcon,
  PanelsTopLeftIcon,
  PlusIcon,
  SettingsIcon,
} from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardDescription,
  CardFrame,
  CardFrameAction,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/shared/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/shared/components/ui/empty"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/shared/components/ui/tabs"

const stackItems = ["React 19", "Vite", "TypeScript", "Tailwind v4", "coss UI"]

export function CossShowcase() {
  return (
    <main className="isolate min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
          <div className="flex flex-col justify-center rounded-3xl border bg-card p-6 shadow-xs/5 sm:p-8 lg:p-10">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <Badge variant="info">coss installed</Badge>
              <Badge variant="success">particles ready</Badge>
            </div>
            <p className="mb-3 font-medium text-muted-foreground text-sm uppercase tracking-[0.2em]">
              React Vite Feature-Based
            </p>
            <h1 className="max-w-3xl text-balance font-heading font-semibold text-4xl tracking-tight sm:text-5xl lg:text-6xl">
              Agent Web is ready for coss-powered product UI.
            </h1>
            <p className="mt-5 max-w-2xl text-muted-foreground text-base leading-7 sm:text-lg">
              這個 starter 已接上 coss primitives 與 particles pattern，後續頁面可以從
              <code className="rounded-md bg-muted px-1.5 py-0.5 text-foreground">src/features</code>
              持續擴充。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button>
                <DownloadIcon aria-hidden="true" />
                使用 coss particle
              </Button>
              <Button variant="outline">
                <PanelsTopLeftIcon aria-hidden="true" />
                查看 UI primitives
              </Button>
            </div>
          </div>

          <CardFrame className="w-full">
            <CardFrameHeader>
              <CardFrameTitle>Project Structure</CardFrameTitle>
              <CardFrameDescription>Feature-based layout with shared UI</CardFrameDescription>
              <CardFrameAction>
                <Button variant="outline">
                  <PlusIcon aria-hidden="true" />
                  Add feature
                </Button>
              </CardFrameAction>
            </CardFrameHeader>
            <Card>
              <CardPanel>
                <Empty className="py-10 md:py-14">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FolderIcon aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>Ready for your first feature</EmptyTitle>
                    <EmptyDescription>
                      Add routes under <code>src/features/&lt;feature-name&gt;/router</code> and keep reusable UI in
                      <code> src/shared/components</code>.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </CardPanel>
            </Card>
          </CardFrame>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>coss particles in this starter</CardTitle>
            <CardDescription>
              This section adapts the coss card, button, and icon tabs particle patterns.
            </CardDescription>
          </CardHeader>
          <CardPanel>
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTab value="overview">
                  <HouseIcon aria-hidden="true" />
                  Overview
                </TabsTab>
                <TabsTab value="components">
                  <PanelsTopLeftIcon aria-hidden="true" />
                  Components
                </TabsTab>
                <TabsTab value="settings">
                  <SettingsIcon aria-hidden="true" />
                  Settings
                </TabsTab>
              </TabsList>
              <TabsPanel value="overview">
                <div className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-5">
                  {stackItems.map((item) => (
                    <div key={item} className="rounded-xl border bg-muted/40 p-4 text-sm font-medium">
                      {item}
                    </div>
                  ))}
                </div>
              </TabsPanel>
              <TabsPanel value="components">
                <p className="pt-4 text-muted-foreground text-sm leading-6">
                  coss primitives 已安裝在 <code>src/shared/components/ui</code>，包含 button、card、tabs、dialog、select、toast 等元件。
                </p>
              </TabsPanel>
              <TabsPanel value="settings">
                <p className="pt-4 text-muted-foreground text-sm leading-6">
                  Tailwind v4、coss tokens、Vite plugin 與 <code>@</code> alias 已設定完成。
                </p>
              </TabsPanel>
            </Tabs>
          </CardPanel>
        </Card>
      </div>
    </main>
  )
}
