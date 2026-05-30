import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './Card';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from './Table';
import { Button } from './Button';

const toneMap = {
  indigo: {
    shell: 'from-[#f7f5ff] via-white to-[#eef6ff]',
    ring: 'border-indigo-100',
    badge: 'bg-indigo-100 text-indigo-700',
    icon: 'bg-indigo-100 text-[#3a2fd0]',
  },
  emerald: {
    shell: 'from-[#f3fff8] via-white to-[#eefbf6]',
    ring: 'border-emerald-100',
    badge: 'bg-emerald-100 text-emerald-700',
    icon: 'bg-emerald-100 text-emerald-700',
  },
  amber: {
    shell: 'from-[#fffaf0] via-white to-[#fff6e8]',
    ring: 'border-amber-100',
    badge: 'bg-amber-100 text-amber-700',
    icon: 'bg-amber-100 text-amber-700',
  },
  sky: {
    shell: 'from-[#f2fbff] via-white to-[#eef7ff]',
    ring: 'border-sky-100',
    badge: 'bg-sky-100 text-sky-700',
    icon: 'bg-sky-100 text-sky-700',
  },
};

const statToneMap = {
  indigo: 'bg-indigo-100 text-[#3a2fd0]',
  emerald: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  rose: 'bg-rose-100 text-rose-700',
  sky: 'bg-sky-100 text-sky-700',
  slate: 'bg-slate-100 text-slate-700',
};

const cellRenderer = (column, row) => {
  if (column.render) {
    return column.render(row[column.key], row);
  }

  return row[column.key];
};

const FeatureWorkspace = ({
  eyebrow,
  title,
  description,
  tone = 'indigo',
  actions = [],
  stats = [],
  filters = [],
  tableTitle,
  tableDescription,
  columns = [],
  rows = [],
  sidePanels = [],
}) => {
  const palette = toneMap[tone] || toneMap.indigo;

  return (
    <div className="space-y-8">
      <div className={`rounded-[32px] border bg-gradient-to-br ${palette.shell} ${palette.ring} p-6 md:p-8 shadow-sm`}>
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            {eyebrow && (
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">{eyebrow}</p>
            )}
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-3 text-lg text-slate-600">{description}</p>
          </div>
          {!!actions.length && (
            <div className="flex flex-wrap gap-3 xl:justify-end">
              {actions.map((action) => (
                <Button
                  key={action.label}
                  variant={action.variant || 'outline'}
                  className={action.className}
                  onClick={action.onClick}
                >
                  {action.icon && <action.icon className="mr-2 h-4 w-4" />}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        {!!stats.length && (
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {stats.map((stat) => (
              <Card key={stat.label} className="rounded-[28px] border-slate-100 shadow-[0_20px_50px_rgba(99,102,241,0.07)]">
                <CardContent className="space-y-5">
                  <div className="flex items-start justify-between">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${statToneMap[stat.tone || tone] || statToneMap.indigo}`}>
                      <stat.icon className="h-7 w-7" />
                    </div>
                    {stat.badge && (
                      <span className={`rounded-full px-3 py-1 text-sm font-medium ${palette.badge}`}>
                        {stat.badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-lg text-slate-600">{stat.label}</p>
                    <p className="mt-2 text-5xl font-bold tracking-tight text-slate-900">{stat.value}</p>
                  </div>
                  {stat.helper && <p className="text-sm text-slate-500">{stat.helper}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {!!filters.length && (
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          {filters.map((filter) => (
            <div key={filter.label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              {filter.icon && <filter.icon className="h-5 w-5 text-slate-400" />}
              {filter.content}
            </div>
          ))}
        </div>
      )}

      <Card className="rounded-[30px] border-indigo-100 p-0 shadow-[0_22px_70px_rgba(99,102,241,0.08)] overflow-hidden">
        <CardHeader className="border-b border-slate-100 px-7 py-6">
          <CardTitle className="text-3xl">{tableTitle}</CardTitle>
          <CardDescription>{tableDescription}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHead className="bg-[#fbfbff]">
              <TableRow className="hover:bg-transparent">
                {columns.map((column) => (
                  <TableHeader key={column.key}>{column.label}</TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={row.id || index} className="hover:bg-[#fafaff]">
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {cellRenderer(column, row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!!sidePanels.length && (
        <div className="grid gap-5 xl:grid-cols-2">
          {sidePanels.map((panel) => (
            <Card key={panel.title} className={panel.className || 'rounded-[30px] border-indigo-100'}>
              <CardHeader>
                <CardTitle className="text-3xl">{panel.title}</CardTitle>
                <CardDescription>{panel.description}</CardDescription>
              </CardHeader>
              <CardContent>{panel.content}</CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeatureWorkspace;
