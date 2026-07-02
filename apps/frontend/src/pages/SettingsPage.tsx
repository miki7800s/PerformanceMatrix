import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Moon, RotateCcw, Save, Sun } from 'lucide-react'
import { toast } from 'sonner'
import { useReportData } from '@/hooks/useReportData'
import { useSettings, DEFAULT_SETTINGS } from '@/hooks/useSettings'
import { useTheme } from '@/hooks/useTheme'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface SettingsForm {
  defaultPeriod: string
  defaultManager: string
  pageSize: number
  thresholdGood: number
  thresholdOk: number
  thresholdWarning: number
}

const PAGE_SIZES = [10, 20, 50, 100]

export function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettings()
  const { theme, toggleTheme } = useTheme()
  const { periods, records } = useReportData()

  const managers = useMemo(
    () =>
      [...new Set(records.map((r) => r.manager))].sort((a, b) =>
        a.localeCompare(b, 'cs'),
      ),
    [records],
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsForm>({
    defaultValues: {
      defaultPeriod: settings.defaultPeriod,
      defaultManager: settings.defaultManager,
      pageSize: settings.pageSize,
      thresholdGood: settings.thresholds.good,
      thresholdOk: settings.thresholds.ok,
      thresholdWarning: settings.thresholds.warning,
    },
  })

  useEffect(() => {
    reset({
      defaultPeriod: settings.defaultPeriod,
      defaultManager: settings.defaultManager,
      pageSize: settings.pageSize,
      thresholdGood: settings.thresholds.good,
      thresholdOk: settings.thresholds.ok,
      thresholdWarning: settings.thresholds.warning,
    })
  }, [settings, reset])

  const onSubmit = (values: SettingsForm) => {
    const good = Number(values.thresholdGood)
    const ok = Number(values.thresholdOk)
    const warning = Number(values.thresholdWarning)
    if (!(good > ok && ok > warning)) {
      toast.error(
        'Hranice KPI musí být sestupné: zelená > neutrální > oranžová.',
      )
      return
    }
    updateSettings({
      defaultPeriod: values.defaultPeriod,
      defaultManager: values.defaultManager,
      pageSize: Number(values.pageSize),
      thresholds: { good, ok, warning },
    })
    toast.success('Nastavení bylo uloženo.')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nastavení"
        description="Předvolby aplikace – vše se ukládá pouze lokálně v prohlížeči"
        showPeriod={false}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vzhled</CardTitle>
            <CardDescription>
              Režim se přepíná okamžitě a pamatuje si ho prohlížeč.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="outline" onClick={toggleTheme}>
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              {theme === 'dark'
                ? 'Přepnout na světlý režim'
                : 'Přepnout na tmavý režim'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Výchozí hodnoty</CardTitle>
            <CardDescription>
              Použijí se při startu aplikace a jako výchozí filtry.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Výchozí období</span>
              <Select {...register('defaultPeriod')}>
                <option value="">Nejnovější importované</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Výchozí manager</span>
              <Select {...register('defaultManager')}>
                <option value="">Všichni manažeři</option>
                {managers.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Řádků v tabulkách</span>
              <Select {...register('pageSize')}>
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </Select>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Barevné hranice KPI</CardTitle>
            <CardDescription>
              Procentní hodnoty: ≥ zelená hranice = výborné, ≥ neutrální =
              v pořádku, ≥ oranžová = varování, pod ní = kritické. 100 % není
              maximum.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#006300] dark:text-[#2ec02e]">
                Zelená od (%)
              </span>
              <Input
                type="number"
                step="0.5"
                {...register('thresholdGood', {
                  required: true,
                  valueAsNumber: true,
                  min: 0,
                  max: 300,
                })}
              />
              {errors.thresholdGood && (
                <span className="text-xs text-destructive">
                  Zadejte číslo 0–300.
                </span>
              )}
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Neutrální od (%)</span>
              <Input
                type="number"
                step="0.5"
                {...register('thresholdOk', {
                  required: true,
                  valueAsNumber: true,
                  min: 0,
                  max: 300,
                })}
              />
              {errors.thresholdOk && (
                <span className="text-xs text-destructive">
                  Zadejte číslo 0–300.
                </span>
              )}
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#9a6a00] dark:text-[#fab219]">
                Oranžová od (%)
              </span>
              <Input
                type="number"
                step="0.5"
                {...register('thresholdWarning', {
                  required: true,
                  valueAsNumber: true,
                  min: 0,
                  max: 300,
                })}
              />
              {errors.thresholdWarning && (
                <span className="text-xs text-destructive">
                  Zadejte číslo 0–300.
                </span>
              )}
            </label>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={!isDirty}>
            <Save className="h-4 w-4" />
            Uložit nastavení
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetSettings()
              reset({
                defaultPeriod: DEFAULT_SETTINGS.defaultPeriod,
                defaultManager: DEFAULT_SETTINGS.defaultManager,
                pageSize: DEFAULT_SETTINGS.pageSize,
                thresholdGood: DEFAULT_SETTINGS.thresholds.good,
                thresholdOk: DEFAULT_SETTINGS.thresholds.ok,
                thresholdWarning: DEFAULT_SETTINGS.thresholds.warning,
              })
              toast.success('Nastavení bylo obnoveno na výchozí hodnoty.')
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Obnovit výchozí
          </Button>
        </div>
      </form>
    </div>
  )
}
