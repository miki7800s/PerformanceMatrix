import { Link } from 'react-router-dom'
import { FileSpreadsheet, Lock, Sparkles, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  title?: string
  description?: string
}

/**
 * Onboarding screen shown instead of empty tables: illustration,
 * three-step explanation and one big call to action.
 */
export function EmptyState({
  title = 'Začněte prvním reportem',
  description = 'Nahrajte Power BI export ve formátu Excel a během pár sekund uvidíte Mission Control, Performance Matrix i heatmapu týmů.',
}: EmptyStateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card/85 backdrop-blur-sm animate-fade-in-up">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 py-16 text-center">
        <img
          src="/assets/planet-rocket-astronauts.svg"
          alt=""
          className="h-44 w-44 drop-shadow-xl"
          style={{ animation: 'scene-float 8s ease-in-out infinite' }}
        />
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>

        <Button asChild size="lg" className="h-12 px-8 text-base shadow-lg">
          <Link to="/import">
            <Upload className="h-5 w-5" />
            Nahrát první report
          </Link>
        </Button>

        <div className="mt-2 grid gap-3 text-left sm:grid-cols-3">
          {[
            {
              icon: FileSpreadsheet,
              title: '1 · Export z Power BI',
              text: 'Stačí běžný Excel export s výkonem operátorů.',
            },
            {
              icon: Sparkles,
              title: '2 · Okamžitá analýza',
              text: 'Dashboard sám ukáže hvězdy i kandidáty na coaching.',
            },
            {
              icon: Lock,
              title: '3 · Vše lokálně',
              text: 'Data zůstávají jen ve vašem prohlížeči, nikam se neposílají.',
            },
          ].map((step) => (
            <div
              key={step.title}
              className="rounded-xl border bg-background/60 p-3.5"
            >
              <step.icon className="h-4 w-4 text-[#2e7d00] dark:text-[#5ed312]" />
              <p className="mt-1.5 text-sm font-semibold">{step.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
