# Control Monitor Screen - Implementation Specification

A detailed, granular prompt guide to recreate the Control Monitor dashboard screen with iOS-style stacked notification cards, KPI summary cards, and a complete dark/light design system using React, Tailwind CSS v4, and shadcn/ui components.

---

## 1. Design System Foundation

### 1.1 CSS Custom Properties (Theme Tokens)

Define all theme tokens as CSS custom properties on `:root` (light) and `.dark` (dark). Every component references these tokens — never hardcoded colors.

#### Light Mode (`:root`)

```css
:root {
  --background: #f7f8fa;
  --foreground: #0d1117;
  --card: #ffffff;
  --card-foreground: #0d1117;
  --popover: #ffffff;
  --popover-foreground: #0d1117;
  --primary: #1652f0;
  --primary-foreground: #ffffff;
  --secondary: #f0f2f5;
  --secondary-foreground: #0d1117;
  --muted: #f0f2f5;
  --muted-foreground: #4b5563;
  --accent: #e4e7ec;
  --accent-foreground: #0d1117;
  --destructive: #dc2626;
  --destructive-foreground: #ffffff;
  --border: #d0d5dd;
  --input: #d0d5dd;
  --ring: #1652f0;
  --radius: 6px;

  /* Trading-specific semantic colors */
  --buy: #00a36c;
  --buy-foreground: #ffffff;
  --buy-muted: rgba(0,163,108,0.1);
  --sell: #dc2626;
  --sell-foreground: #ffffff;
  --sell-muted: rgba(220,38,38,0.1);
  --warning: #d97706;
  --warning-foreground: #ffffff;
  --surface: #ffffff;
  --elevated: #f0f2f5;
}
```

#### Dark Mode (`.dark`)

```css
.dark {
  --background: #0b0d11;
  --foreground: #f0f2f5;
  --card: #13161c;
  --card-foreground: #f0f2f5;
  --popover: #1a1e26;
  --popover-foreground: #f0f2f5;
  --primary: #2563eb;
  --primary-foreground: #ffffff;
  --secondary: #1a1e26;
  --secondary-foreground: #f0f2f5;
  --muted: #1a1e26;
  --muted-foreground: #8a94a6;
  --accent: #232830;
  --accent-foreground: #f0f2f5;
  --destructive: #f43f5e;
  --destructive-foreground: #ffffff;
  --border: #323844;
  --input: #2a303c;
  --ring: #2563eb;

  /* Trading-specific semantic colors */
  --buy: #10b981;
  --buy-foreground: #ffffff;
  --buy-muted: rgba(16,185,129,0.12);
  --sell: #f43f5e;
  --sell-foreground: #ffffff;
  --sell-muted: rgba(244,63,94,0.12);
  --warning: #f59e0b;
  --warning-foreground: #0b0d11;
  --surface: #13161c;
  --elevated: #1a1e26;
}
```

### 1.2 Tailwind v4 Theme Registration

Register all CSS variables with Tailwind v4 using `@theme inline` so they can be used as utility classes (e.g., `bg-card`, `text-sell`, `border-border`):

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-buy: var(--buy);
  --color-buy-foreground: var(--buy-foreground);
  --color-buy-muted: var(--buy-muted);
  --color-sell: var(--sell);
  --color-sell-foreground: var(--sell-foreground);
  --color-sell-muted: var(--sell-muted);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-surface: var(--surface);
  --color-elevated: var(--elevated);

  --radius-sm: calc(var(--radius) - 2px);
  --radius-md: var(--radius);
  --radius-lg: calc(var(--radius) + 2px);
  --radius-xl: calc(var(--radius) + 6px);

  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono Variable', 'Fira Code', monospace;
}
```

### 1.3 Global Base Styles

```css
* {
  border-color: var(--border);
}

body {
  background-color: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans);
  font-size: 0.8125rem; /* 13px base – compact financial UI */
  line-height: 1.5;
  letter-spacing: -0.005em;
  -webkit-font-smoothing: antialiased;
}
```

### 1.4 Key Design Principles

- **Border visibility**: Use `--border: #323844` (dark) / `#d0d5dd` (light) for strong contrast against card backgrounds
- **Financial numbers**: Always use `tabular-nums` and monospace font for numeric values, IDs, and dates
- **Compact density**: Small font sizes (`text-xs` = 12px, `text-[11px]`, `text-[10px]`, `text-[9px]`) for information-dense financial UI
- **Color semantics**: Red (`--sell`) for overdue/critical, green (`--buy`) for completed/positive, amber (`--warning`) for due today, blue (`--primary`) for upcoming/default

---

## 2. Shared UI Components

### 2.1 Card Component

A rounded container with border and themed background. Used for KPI cards, task cards, and stacked notification groups.

```tsx
// Base: rounded-xl border border-border bg-card text-card-foreground
<Card className="rounded-xl border border-border bg-card text-card-foreground">
  <CardContent className="px-4 pb-4">
    {/* content */}
  </CardContent>
</Card>
```

### 2.2 Badge Component (with CVA variants)

Pill-shaped status indicators using `class-variance-authority`:

```tsx
const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
  {
    variants: {
      variant: {
        default:   'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline:   'border-border text-foreground',
        buy:       'border-transparent bg-buy-muted text-buy',
        sell:      'border-transparent bg-sell-muted text-sell',
        warning:   'border-transparent bg-warning/10 text-warning',
        muted:     'border-transparent bg-muted text-muted-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)
```

**Status-to-badge mapping:**
| Status     | Badge Variant | Visual                         |
|------------|---------------|--------------------------------|
| Overdue    | `sell`        | Red text on red-tinted bg      |
| Due Today  | `warning`     | Amber text on amber-tinted bg  |
| Upcoming   | `default`     | White text on blue bg           |
| Completed  | `buy`         | Green text on green-tinted bg  |

### 2.3 Button Component (with CVA variants)

```tsx
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5',
  {
    variants: {
      variant: {
        default:   'bg-primary text-primary-foreground hover:bg-primary/90',
        outline:   'border border-border bg-transparent text-foreground hover:bg-accent',
        ghost:     'bg-transparent text-foreground hover:bg-accent',
      },
      size: {
        xs: 'h-6 rounded px-2 text-[11px]',
        sm: 'h-7 rounded-md px-3 text-xs',
        md: 'h-8 rounded-lg px-4 text-xs',
        icon: 'h-7 w-7 rounded-md',
      },
    },
  }
)
```

### 2.4 Checkbox Component

Custom checkbox with high-contrast borders for dark mode visibility:

```tsx
<div className={cn(
  'h-4 w-4 rounded border-2 transition-colors flex items-center justify-center',
  isChecked
    ? 'bg-primary border-primary'           // Checked: filled blue
    : 'bg-transparent border-foreground/70', // Unchecked: strong visible border
  'peer-focus-visible:ring-2 peer-focus-visible:ring-ring',
)}>
  {isChecked && <Check className="size-2.5 text-primary-foreground" />}
</div>
```

**Key detail:** Use `border-2` (2px) and `border-foreground/70` for unchecked state. The default `border-border` is too subtle on dark card backgrounds. The `border-foreground/70` provides high contrast in both themes.

---

## 3. Page Layout Structure

The screen is a full-height flex column:

```
+--------------------------------------------------+
| HEADER BAR (fixed height)                        |
|   Title + subtitle  |  Action buttons            |
+--------------------------------------------------+
| SCROLLABLE CONTENT AREA (flex-1)                 |
|   +--------------------------------------------+ |
|   | KPI CARDS (4-column grid)                  | |
|   +--------------------------------------------+ |
|   | STACKED CARD GROUPS (vertical list)        | |
|   |   [ Collapsed Group 1 - stacked ]          | |
|   |   [ Collapsed Group 2 - stacked ]          | |
|   |   [ Expanded Group 3 - individual cards ]  | |
|   +--------------------------------------------+ |
+--------------------------------------------------+
```

```tsx
<div className="flex flex-col h-full">
  {/* Header */}
  <div className="flex items-center justify-between px-6 py-4 border-b border-border">
    <div>
      <h1 className="text-lg font-semibold tracking-tight">Control Monitor</h1>
      <p className="text-xs text-muted-foreground mt-0.5">
        23 total tasks · 11 require attention
      </p>
    </div>
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm">
        <SlidersHorizontal />
        Configure
      </Button>
    </div>
  </div>

  {/* Scrollable content */}
  <ScrollArea className="flex-1">
    <div className="p-6 space-y-6">
      {/* KPI Cards */}
      {/* Notification Stack Groups */}
    </div>
  </ScrollArea>
</div>
```

---

## 4. KPI Summary Cards

A 4-column grid of clickable metric cards. Clicking a card filters the task list by that status. Active card gets a blue ring.

### 4.1 Layout

```tsx
<div className="grid grid-cols-4 gap-4">
  {kpiCards.map(kpi => (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-150 hover:border-border/80',
        isActive && 'ring-1 ring-primary border-primary/40'
      )}
      onClick={() => setStatusFilter(isActive ? 'all' : kpi.key)}
    >
      <CardContent className="p-4">
        {/* ... */}
      </CardContent>
    </Card>
  ))}
</div>
```

### 4.2 Card Internal Structure

```
+------------------------------------------+
| LABEL (uppercase, xs, muted)    [ICON]   |
|                                          |
| COUNT (2xl, bold, colored)     TREND %   |
+------------------------------------------+
```

```tsx
{/* Top row: label + icon */}
<div className="flex items-center justify-between mb-3">
  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
    {kpi.label}
  </span>
  <div className={cn('p-1.5 rounded-md',
    kpi.key === 'overdue' && 'bg-sell-muted',
    kpi.key === 'due_today' && 'bg-warning/10',
    kpi.key === 'upcoming' && 'bg-primary/10',
    kpi.key === 'completed' && 'bg-buy-muted',
  )}>
    <Icon className={cn('w-3.5 h-3.5', config.color)} />
  </div>
</div>

{/* Bottom row: count + trend */}
<div className="flex items-end justify-between">
  <span className={cn('text-2xl font-bold tabular-nums tracking-tight', config.color)}>
    {kpi.count}
  </span>
  {kpi.trend && (
    <div className={cn(
      'flex items-center gap-0.5 text-[11px] font-medium tabular-nums',
      /* For overdue: up=bad(red), down=good(green). For others: up=good(green), down=bad(red) */
      kpi.key === 'overdue'
        ? (kpi.trend.up ? 'text-sell' : 'text-buy')
        : (kpi.trend.up ? 'text-buy' : 'text-sell')
    )}>
      {kpi.trend.up ? <ArrowUpRight /> : <ArrowDownRight />}
      {kpi.trend.value}%
    </div>
  )}
</div>
```

### 4.3 Status Color Mapping

| KPI        | Icon            | Count Color    | Icon BG           | Trend Logic           |
|------------|-----------------|----------------|-------------------|-----------------------|
| Overdue    | AlertTriangle   | `text-sell`    | `bg-sell-muted`   | Up = bad (red)        |
| Due Today  | Clock           | `text-warning` | `bg-warning/10`   | Down = bad (red)      |
| Upcoming   | CalendarClock   | `text-primary` | `bg-primary/10`   | No trend shown        |
| Completed  | CheckCircle2    | `text-buy`     | `bg-buy-muted`    | Up = good (green)     |

---

## 5. iOS Notification-Style Stacked Cards

This is the core UI pattern. Tasks are grouped by control name. Each group displays as a collapsed card stack (like iOS notifications from one app) or expands into individual task cards.

### 5.1 Data Grouping

```tsx
// Group tasks by control name into a Map
const groupedTasks = useMemo(() => {
  const groups = new Map<string, Task[]>()
  for (const task of filteredTasks) {
    if (!groups.has(task.control)) groups.set(task.control, [])
    groups.get(task.control)!.push(task)
  }
  return groups
}, [filteredTasks])
```

### 5.2 Collapsed State - The Stack Effect

The collapsed state creates the illusion of stacked cards by placing absolute-positioned "ghost cards" behind the front card. This mimics how iOS shows grouped notifications.

#### Stack Architecture (Cross-Section View)

```
                  ← left-5 / right-5 →
              ┌─────────────────────────┐  ← top-[14px]
              │   BACK GHOST CARD       │     (3rd card, most inset)
              │   bg-card, border-border│
         ┌────┤                         ├────┐  ← top-[7px]
         │    │   MIDDLE GHOST CARD     │    │     (2nd card)
         │    │   bg-card, border-border│    │
    ┌────┤    │                         │    ├────┐  ← top-0 (z-10)
    │    │    │   FRONT CARD (z-10)     │    │    │
    │    │    │   Full task preview     │    │    │
    │    │    │   bg-card, border-border│    │    │
    └────┤    │                         │    ├────┘
         │    │                         │    │
         └────┤                         ├────┘  ← bottom-[7px]
              │                         │
              └─────────────────────────┘  ← bottom-0
    ← left-0 / right-0 →  ← left-2.5 / right-2.5 →
```

#### Implementation

```tsx
{/* Wrapper: relative positioned, padding-bottom creates space for ghost card edges to peek out */}
<div
  className={cn(
    'relative cursor-pointer',
    stackCount >= 2 ? 'pb-[14px]' : stackCount >= 1 ? 'pb-[7px]' : '',
  )}
  onClick={() => toggleGroup(controlName)}
>
  {/* BACK GHOST CARD (3rd layer) – most inset horizontally, furthest down vertically */}
  {stackCount >= 2 && (
    <div className="absolute left-5 right-5 bottom-0 top-[14px] rounded-xl border border-border bg-card" />
  )}

  {/* MIDDLE GHOST CARD (2nd layer) – slightly inset, offset down */}
  {stackCount >= 1 && (
    <div className="absolute left-2.5 right-2.5 bottom-[7px] top-[7px] rounded-xl border border-border bg-card" />
  )}

  {/* FRONT CARD (top layer) – full width, z-10, contains the actual content */}
  <Card className="relative z-10 hover:border-border/80 transition-all">
    {/* Card content here */}
  </Card>
</div>
```

#### Key Details for the Stack Effect

1. **`stackCount`**: `Math.min(tasks.length - 1, 2)` — show maximum 2 ghost cards behind (3 visible layers total)
2. **Padding-bottom on wrapper**: Creates the vertical space for ghost cards to "peek out" below the front card
   - 2 stacks: `pb-[14px]` (14px padding)
   - 1 stack: `pb-[7px]` (7px padding)
   - 0 stacks (single task): no padding
3. **Ghost card positioning**:
   - Back card: `left-5 right-5` (most inset), `top-[14px] bottom-0` (lowest)
   - Middle card: `left-2.5 right-2.5` (slightly inset), `top-[7px] bottom-[7px]`
4. **Front card**: `relative z-10` — must be above the ghost cards
5. **All cards share**: `rounded-xl border border-border bg-card` — same visual style so they look like a real stack
6. **The progressive inset** (5px, 2.5px, 0px from each side) creates perspective depth — farther cards appear narrower

### 5.3 Front Card Content (Collapsed)

The front card shows a preview of the first task in the group:

```
+--------------------------------------------------------------+
| [x] ● Control Name                   [3 overdue] 10 tasks ∨  |
|      #340129 [Overdue]                         ● Critical     |
|      Desk Head Review    Extend to 3/9 due to travel         |
|      [MC] M. Chen    Due Mar 09, 2026                         |
+--------------------------------------------------------------+
   ┌──────────────────────────────────────────────────────┐ ← ghost
   └──────────────────────────────────────────────────────┘ ← ghost
```

#### Header Row

```tsx
<div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
  <Checkbox checked={allSelected} onClick={e => e.stopPropagation()} onChange={...} />
  <div className={cn('w-2 h-2 rounded-full shrink-0', PRIORITY_CONFIG[highestPriority].dotColor)} />
  <span className="text-xs font-semibold truncate flex-1">{controlName}</span>
  <div className="flex items-center gap-2 shrink-0">
    {groupOverdue > 0 && (
      <Badge variant="sell" className="text-[10px]">{groupOverdue} overdue</Badge>
    )}
    <span className="text-[11px] text-muted-foreground tabular-nums">
      {tasks.length} task{tasks.length !== 1 ? 's' : ''}
    </span>
    <ChevronDown className="w-4 h-4 text-muted-foreground" />
  </div>
</div>
```

#### Preview Body (First Task)

```tsx
<div className="px-4 pb-3.5 pt-1">
  <div className="flex items-start gap-3 ml-7"> {/* ml-7 aligns with text after checkbox */}
    <div className="flex-1 min-w-0">
      {/* Task ID + Status Badge + Priority */}
      <div className="flex items-center gap-2 mb-1">
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          #{firstTask.taskId}
        </span>
        <Badge variant={STATUS_CONFIG[firstTask.status].badgeVariant}>
          {STATUS_CONFIG[firstTask.status].label}
        </Badge>
        <div className="flex items-center gap-1 ml-auto">
          <div className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_CONFIG[firstTask.priority].dotColor)} />
          <span className="text-[11px] text-muted-foreground">{priorityLabel}</span>
        </div>
      </div>

      {/* Workflow step + Alert note */}
      <div className="flex items-center gap-4 text-xs">
        <span className="font-medium">{firstTask.workflowStep}</span>
        <span className="text-muted-foreground truncate">{firstTask.alertNote}</span>
      </div>

      {/* Assignee avatar + Due date */}
      <div className="flex items-center gap-4 mt-1.5 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          {/* Avatar circle with initials */}
          <div className="w-4 h-4 rounded-full bg-secondary flex items-center justify-center text-[9px] font-medium">
            {firstTask.assignee.split(' ').map(n => n[0]).join('')}
          </div>
          {firstTask.assignee}
        </div>
        <span className="tabular-nums">
          Due <span className={cn(
            firstTask.status === 'overdue' && 'text-sell font-medium',
            firstTask.status === 'due_today' && 'text-warning font-medium',
          )}>
            {formatDate(firstTask.dueDate)}
          </span>
        </span>
      </div>
    </div>
  </div>
</div>
```

### 5.4 Expanded State - Individual Task Cards

When the user clicks a collapsed stack, it expands to show a group header + individual task cards:

```
  [x] ● Flash vs Final PnL Variance Alert    [9 overdue] 10 tasks ∨
  +--------------------------------------------------------------+
  | [x] #340129 [Overdue]                            ● Critical  |
  |     Desk Head Review    Extend to 3/9 due to travel     ··· |
  |     [MC] M. Chen    Due Mar 09, 2026 (3d overdue)          |
  |                                       Created Feb 03, 2026  |
  +--------------------------------------------------------------+
  +--------------------------------------------------------------+
  | [x] #340646 [Overdue]                            ● Critical  |
  |     Desk Head Review    Extend to 3/9 due to travel     ··· |
  |     [SP] S. Patel    Due Mar 09, 2026 (3d overdue)         |
  |                                       Created Feb 04, 2026  |
  +--------------------------------------------------------------+
```

#### Expanded Group Header

```tsx
<div
  className="flex items-center gap-3 px-2 py-1.5 cursor-pointer rounded-lg hover:bg-muted/30 transition-colors"
  onClick={() => toggleGroup(controlName)}
>
  <Checkbox checked={allSelected} onClick={e => e.stopPropagation()} onChange={...} />
  <div className={cn('w-2 h-2 rounded-full shrink-0', priorityDotColor)} />
  <span className="text-xs font-semibold truncate">{controlName}</span>
  <div className="flex items-center gap-2 ml-auto shrink-0">
    <Badge variant="sell" className="text-[10px]">{groupOverdue} overdue</Badge>
    <span className="text-[11px] text-muted-foreground tabular-nums">
      {tasks.length} tasks
    </span>
    <ChevronRight className="w-4 h-4 text-muted-foreground rotate-90" />
  </div>
</div>
```

#### Individual Task Card

Each task card is a `<Card>` with selected state ring:

```tsx
<Card className={cn(
  'transition-all duration-150 hover:border-border/80',
  isSelected && 'ring-1 ring-primary/40 border-primary/30',
)}>
  <div className="px-4 py-3">
    {/* Row 1: Checkbox + Task ID + Status Badge + Priority + Actions menu */}
    <div className="flex items-center gap-3">
      <Checkbox checked={isSelected} onChange={...} />
      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
        #{task.taskId}
      </span>
      <Badge variant={statusBadgeVariant}>{statusLabel}</Badge>
      <div className="flex items-center gap-1 ml-auto">
        <div className={cn('w-1.5 h-1.5 rounded-full', priorityDotColor)} />
        <span className="text-[11px] text-muted-foreground">{priorityLabel}</span>
      </div>
      <DropdownMenu trigger={<Button variant="ghost" size="icon" className="h-6 w-6" />}>
        <DropdownMenuItem>View Details</DropdownMenuItem>
        <DropdownMenuItem>Reassign</DropdownMenuItem>
        <DropdownMenuItem>Add Note</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Escalate</DropdownMenuItem>
      </DropdownMenu>
    </div>

    {/* Row 2: Workflow step + Alert note (indented to align past checkbox) */}
    <div className="ml-7 mt-1.5">
      <div className="flex items-center gap-4 text-xs">
        <span className="font-medium">{task.workflowStep}</span>
        <span className="text-muted-foreground truncate">{task.alertNote}</span>
      </div>

      {/* Row 3: Assignee + Due date + Created date */}
      <div className="flex items-center gap-4 mt-1.5 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-secondary flex items-center justify-center text-[9px] font-medium">
            {initials}
          </div>
          {task.assignee}
        </div>
        <span className="tabular-nums">
          Due <span className={cn(
            task.status === 'overdue' && 'text-sell font-medium',
            task.status === 'due_today' && 'text-warning font-medium',
          )}>
            {formatDate(task.dueDate)}
          </span>
          {task.status !== 'completed' && (
            <span className="ml-1 text-muted-foreground">
              ({days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'today' : `in ${days}d`})
            </span>
          )}
        </span>
        <span className="tabular-nums ml-auto">
          Created {formatDate(task.createdDate)}
        </span>
      </div>
    </div>
  </div>
</Card>
```

---

## 6. State Management

### 6.1 Component State

```tsx
const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
```

### 6.2 Toggle Logic

**Group expand/collapse:**
```tsx
const toggleGroup = (group: string) => {
  setExpandedGroups(prev => {
    const next = new Set(prev)
    if (next.has(group)) next.delete(group)
    else next.add(group)
    return next
  })
}
```

**Select all in group** (also auto-expands when selecting):
```tsx
const toggleAllInGroup = (groupName: string, tasks: Task[]) => {
  const ids = tasks.map(t => t.id)
  const allSelected = ids.every(id => selectedTasks.has(id))
  if (!allSelected && !expandedGroups.has(groupName)) {
    setExpandedGroups(prev => new Set(prev).add(groupName))
  }
  setSelectedTasks(prev => {
    const next = new Set(prev)
    ids.forEach(id => allSelected ? next.delete(id) : next.add(id))
    return next
  })
}
```

### 6.3 Filtering

KPI cards double as filter buttons. Clicking one filters by status; clicking again resets to "all":

```tsx
onClick={() => setStatusFilter(isActive ? 'all' : kpi.key)}
```

---

## 7. Priority System

Priority is shown as a colored dot indicator:

| Priority | Dot Color              | Label    |
|----------|------------------------|----------|
| Critical | `bg-sell` (red)        | Critical |
| High     | `bg-warning` (amber)   | High     |
| Medium   | `bg-primary` (blue)    | Medium   |
| Low      | `bg-muted-foreground`  | Low      |

**Group priority**: Each group shows the highest priority of any task within it. Priority ordering: critical > high > medium > low.

```tsx
const highestPriority = tasks.reduce((acc, t) => {
  const order: Priority[] = ['critical', 'high', 'medium', 'low']
  return order.indexOf(t.priority) < order.indexOf(acc) ? t.priority : acc
}, 'low' as Priority)
```

---

## 8. Typography Scale

| Element              | Size         | Weight      | Font         | Extra                    |
|----------------------|-------------|-------------|--------------|--------------------------|
| Page title           | `text-lg`    | `semibold`  | Sans (Inter) | `tracking-tight`         |
| Subtitle             | `text-xs`    | Normal      | Sans         | `text-muted-foreground`  |
| KPI label            | `text-xs`    | `medium`    | Sans         | `uppercase tracking-wider` |
| KPI count            | `text-2xl`   | `bold`      | Sans         | `tabular-nums tracking-tight` |
| Trend percentage     | `text-[11px]`| `medium`    | Sans         | `tabular-nums`           |
| Control name         | `text-xs`    | `semibold`  | Sans         | `truncate`               |
| Task ID              | `text-[11px]`| Normal      | Mono         | `tabular-nums`           |
| Badge text           | `text-[11px]`| `medium`    | Sans         | (from CVA)               |
| Workflow step        | `text-xs`    | `medium`    | Sans         |                          |
| Alert note           | `text-xs`    | Normal      | Sans         | `text-muted-foreground truncate` |
| Assignee name        | `text-[11px]`| Normal      | Sans         | `text-muted-foreground`  |
| Date values          | `text-[11px]`| Normal      | Sans         | `tabular-nums`           |
| Avatar initials      | `text-[9px]` | `medium`    | Sans         | Inside 16px circle       |
| Task count           | `text-[11px]`| Normal      | Sans         | `tabular-nums`           |
| Overdue badge (group)| `text-[10px]`| `medium`    | Sans         | Badge `sell` variant     |

---

## 9. Spacing & Layout Constants

| Element                     | Value         |
|-----------------------------|---------------|
| Page padding                | `p-6` (24px)  |
| Section gap                 | `space-y-6`   |
| KPI grid                    | `grid-cols-4 gap-4` |
| KPI card padding            | `p-4` (16px)  |
| Stack group gap             | `space-y-5`   |
| Expanded cards gap          | `space-y-2`   |
| Card horizontal padding     | `px-4`        |
| Card vertical padding       | `pt-3.5 pb-3.5` |
| Checkbox-to-content indent  | `ml-7` (28px) |
| Ghost card inset (back)     | `left-5 right-5` (20px each side) |
| Ghost card inset (middle)   | `left-2.5 right-2.5` (10px each side) |
| Ghost card vertical offset  | 7px per layer |
| Avatar circle               | `w-4 h-4` (16px) |
| Priority dot (group header) | `w-2 h-2` (8px) |
| Priority dot (inline)       | `w-1.5 h-1.5` (6px) |

---

## 10. Interactions & Animations

| Interaction                | Effect                                     |
|----------------------------|--------------------------------------------|
| Hover on card              | `hover:border-border/80 transition-all`    |
| Click collapsed stack      | Expands to individual cards                |
| Click expanded header      | Collapses back to stack                    |
| Click checkbox (group)     | Selects all tasks + auto-expands group     |
| Click checkbox (task)      | Toggles individual selection               |
| Selected card              | `ring-1 ring-primary/40 border-primary/30` |
| Active KPI card            | `ring-1 ring-primary border-primary/40`    |
| Expanded header hover      | `hover:bg-muted/30`                        |
| Transition duration        | `duration-150` (150ms)                     |

---

## 11. Icons Used (Lucide React)

| Icon             | Usage                          |
|------------------|--------------------------------|
| AlertTriangle    | Overdue KPI icon               |
| Clock            | Due Today KPI icon             |
| CalendarClock    | Upcoming KPI icon              |
| CheckCircle2     | Completed KPI icon             |
| ChevronDown      | Collapsed stack indicator      |
| ChevronRight     | Expanded group (rotated 90deg) |
| Eye              | Review Selected button         |
| SlidersHorizontal| Configure button               |
| MoreHorizontal   | Task action menu trigger       |
| Search           | Empty state icon               |
| ArrowUpRight     | Trend up indicator             |
| ArrowDownRight   | Trend down indicator           |

---

## 12. Empty State

When no tasks match the current filter:

```tsx
<div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
  <Search className="w-8 h-8 mb-3 opacity-40" />
  <p className="text-sm font-medium">No tasks found</p>
  <p className="text-xs mt-1">Try adjusting your filters</p>
</div>
```

---

## 13. Dark vs Light Mode Differences

| Aspect               | Dark Mode                    | Light Mode                   |
|-----------------------|------------------------------|------------------------------|
| Background           | `#0b0d11` (near black)       | `#f7f8fa` (light gray)       |
| Card background      | `#13161c` (dark charcoal)    | `#ffffff` (white)            |
| Border color         | `#323844` (medium gray)      | `#d0d5dd` (medium gray)      |
| Foreground text      | `#f0f2f5` (near white)       | `#0d1117` (near black)       |
| Muted text           | `#8a94a6` (medium gray)      | `#4b5563` (dark gray)        |
| Sell/overdue red     | `#f43f5e` (rose)             | `#dc2626` (red)              |
| Buy/completed green  | `#10b981` (emerald)          | `#00a36c` (green)            |
| Warning amber        | `#f59e0b` (amber)            | `#d97706` (amber)            |
| Primary blue         | `#2563eb` (blue)             | `#1652f0` (blue)             |
| Ghost card fill      | `bg-card` (#13161c)          | `bg-card` (#ffffff)          |
| Checkbox unchecked   | `border-foreground/70`       | `border-foreground/70`       |

**Key principle:** Both themes use the same Tailwind utility classes. The visual difference comes entirely from the CSS custom property values swapping between `:root` and `.dark`.

---

## 14. Data Model

```typescript
type TaskStatus = 'overdue' | 'due_today' | 'upcoming' | 'completed'
type Priority = 'critical' | 'high' | 'medium' | 'low'

interface Task {
  id: string
  control: string        // Group name (e.g., "Flash vs Final PnL Variance Alert")
  taskId: number         // Display ID (e.g., 340129)
  workflowStep: string   // Current step (e.g., "Desk Head Review")
  alertNote: string      // Context note (e.g., "Extend to 3/9 due to travel")
  dueDate: string        // ISO date string (e.g., "2026-03-09")
  createdDate: string    // ISO date string
  assignee: string       // Display name (e.g., "M. Chen")
  status: TaskStatus
  priority: Priority
}
```

---

## 15. Utility Functions

```typescript
// Format date for display: "Mar 09, 2026"
function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

// Calculate days from "today" (positive = future, negative = past)
function daysFromNow(dateStr: string) {
  const now = new Date('2026-03-12T00:00:00')
  const d = new Date(dateStr + 'T00:00:00')
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

// Tailwind utility merger (shadcn pattern)
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```
