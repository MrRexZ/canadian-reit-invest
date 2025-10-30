# Dashboard Shadcn Redesign Implementation Plan

## Overview
Transform the current custom dashboard implementation to use Shadcn's official sidebar and dashboard components, matching the design shown in the reference image (CleanShot 2025-10-28).

## Reference Design Analysis
The target design shows:
- **Left sidebar navigation** with icon + text menu items
- **Top header/breadcrumb area** with page title and action buttons
- **Metric cards** in a grid layout showing KPIs with trend indicators
- **Chart visualization** with tabs for different time periods
- **Data table** with sortable columns and action menus
- **Clean spacing and typography** following Shadcn design tokens

## Required Shadcn Components

### Core UI Components to Install
1. **`sidebar`** (registry:ui)
   - Main sidebar component with provider
   - Dependencies: @radix-ui/react-slot, class-variance-authority, lucide-react
   - Reference: `@shadcn/sidebar`

2. **`breadcrumb`** (registry:ui)
   - Page navigation breadcrumbs
   - Dependencies: @radix-ui/react-slot
   - Reference: `@shadcn/breadcrumb`

3. **`card`** (registry:ui)
   - Metric cards for KPI display
   - Already installed, may need style adjustments
   - Reference: `@shadcn/card`

4. **`chart`** (registry:ui)
   - Chart components for data visualization
   - Dependencies: recharts@2.15.4, lucide-react
   - Reference: `@shadcn/chart`

5. **`separator`** (registry:ui)
   - Visual dividers between sections
   - Dependencies: @radix-ui/react-separator
   - Reference: `@shadcn/separator`

### Block Components for Reference
1. **`dashboard-01`** (registry:block)
   - Complete dashboard layout example
   - Includes sidebar, charts, and data table
   - Dependencies: @dnd-kit/core, @tanstack/react-table, zod, @tabler/icons-react
   - Use as reference for layout structure

2. **`sidebar-01`** (registry:block)
   - Simple sidebar with grouped navigation
   - Use as reference for sidebar implementation

## Implementation Steps

### Phase 1: Install Dependencies
1. **Install Shadcn components**
   ```bash
   npx shadcn@latest add sidebar
   npx shadcn@latest add breadcrumb
   npx shadcn@latest add chart
   npx shadcn@latest add separator
   ```

2. **Install additional dependencies** (if not already present)
   ```bash
   npm install recharts@2.15.4 lucide-react @radix-ui/react-slot class-variance-authority @radix-ui/react-separator
   ```

### Phase 2: Create New Layout Components

#### 2.1 Create AppSidebar Component
**File:** `src/components/app-sidebar.tsx`

**Structure:**
```tsx
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter
} from '@/components/ui/sidebar'
import { Home, Building2, BarChart3, DollarSign, Users } from 'lucide-react'

// Features:
// - Company logo/name in header
// - Navigation items with icons
// - Active state highlighting
// - User profile section in footer
// - Support for both admin and investor role menus
```

**Navigation Items:**
- **Admin:**
  - Home / Dashboard
  - Create REIT
  - Browse REITs
  - Browse Investments
  - Issue Dividends

- **Investor:**
  - Home / Dashboard
  - Browse REITs
  - My Investments

#### 2.2 Create DashboardLayout Component
**File:** `src/components/dashboard-layout.tsx`

**Structure:**
```tsx
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'

// Features:
// - Wrap entire dashboard in SidebarProvider
// - AppSidebar on left
// - SidebarInset for main content area
// - Sticky header with breadcrumbs and actions
// - Responsive layout (collapsible sidebar on mobile)
```

#### 2.3 Create MetricCard Component
**File:** `src/components/metric-card.tsx`

**Structure:**
```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from 'lucide-react'

// Props:
// - title: string
// - value: string | number
// - trend: 'up' | 'down' | 'neutral'
// - trendValue: string (e.g., "+12.5%")
// - description: string
// - icon?: React.ReactNode

// Features:
// - Display metric value prominently
// - Show trend indicator with color coding
// - Optional icon in header
// - Description text below trend
```

#### 2.4 Create ChartContainer Component
**File:** `src/components/chart-container.tsx`

**Structure:**
```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { AreaChart, Area } from 'recharts'

// Features:
// - Tabbed interface for time periods (Last 3 months, Last 30 days, Last 7 days)
// - Responsive area chart
// - Tooltip on hover
// - Legend support
// - Customizable colors matching design system
```

### Phase 3: Update Existing Pages

#### 3.1 Refactor AdminTabs Component
**File:** `src/features/canadianreitinvest/canadianreitinvest-feature.tsx`

**Changes:**
- Remove custom sidebar implementation
- Replace with DashboardLayout wrapper
- Move tab buttons to AppSidebar navigation
- Update content area to use SidebarInset
- Add breadcrumb navigation based on active tab
- Add page-level header with actions (e.g., "Quick Create" button)

**Before:**
```tsx
<div className="flex gap-0">
  <aside className="p-4 bg-sidebar border-r fixed left-0 top-[52px] bottom-0 w-[220px]">
    <nav className="flex flex-col space-y-2">
      <button>...</button>
    </nav>
  </aside>
  <section className="ml-[220px] flex-1 p-6">
    {content}
  </section>
</div>
```

**After:**
```tsx
<SidebarProvider>
  <AppSidebar role="admin" activeTab={tab} onTabChange={setTab} />
  <SidebarInset>
    <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-6">
      <Breadcrumb>...</Breadcrumb>
      <div className="ml-auto">
        <Button>Quick Create</Button>
      </div>
    </header>
    <main className="flex-1 p-6">
      {content}
    </main>
  </SidebarInset>
</SidebarProvider>
```

#### 3.2 Refactor InvestorPage Component
**File:** `src/features/investor/investor-page.tsx`

**Changes:**
- Same pattern as AdminTabs
- Use DashboardLayout with investor-specific navigation
- Add dashboard overview with metrics (if applicable)

#### 3.3 Create Admin Dashboard Overview
**File:** `src/features/canadianreitinvest/ui/admin-dashboard-overview.tsx`

**New component for admin home/dashboard tab:**

**Features:**
- 4 metric cards in grid layout:
  - Total Raised Revenue
  - New Investors (this period)
  - Active Investments
  - Growth Rate
- Area chart showing fundraising trends
- Recent activities table
- Quick actions section

**Layout:**
```tsx
<div className="space-y-6">
  {/* Metrics Grid */}
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <MetricCard title="Total Revenue" value="$1,250.00" trend="up" trendValue="+12.5%" />
    <MetricCard title="New Investors" value="1,234" trend="down" trendValue="-20%" />
    <MetricCard title="Active Investments" value="45,678" trend="up" trendValue="+12.5%" />
    <MetricCard title="Growth Rate" value="4.5%" trend="up" trendValue="+4.5%" />
  </div>

  {/* Chart Section */}
  <ChartContainer title="Total Visitors" description="Total for the last 3 months">
    {/* Area chart with tabs */}
  </ChartContainer>

  {/* Recent Activities Table */}
  <Card>
    <CardHeader>
      <CardTitle>Recent Investments</CardTitle>
    </CardHeader>
    <CardContent>
      <Table>...</Table>
    </CardContent>
  </Card>
</div>
```

#### 3.4 Update Browse REITs Page
**File:** `src/features/canadianreitinvest/ui/canadianreitinvest-ui-browse-reits.tsx`

**Changes:**
- Remove custom header (`<h3>Browse REITs (Admin)</h3>`)
- Page title now comes from breadcrumb
- Add section header with description using Typography components
- Use proper Card components for any summary sections
- Maintain existing Table but ensure it follows Shadcn table styling

#### 3.5 Update Browse Investments Page
**File:** `src/features/canadianreitinvest/ui/canadianreitinvest-ui-browse-investments.tsx`

**Changes:**
- Same pattern as Browse REITs
- Add filter/search section in header
- Use Shadcn's data table patterns if time permits

#### 3.6 Update Dividends Page
**File:** `src/features/canadianreitinvest/ui/admin-dividend-page.tsx`

**Changes:**
- Remove custom header
- Add instructional Card at top explaining the process
- Maintain existing form but ensure consistent spacing

### Phase 4: Styling and Theme Adjustments

#### 4.1 Update CSS Variables
**File:** `src/index.css` or theme configuration

**Ensure these CSS variables are set:**
```css
:root {
  --sidebar-background: 0 0% 98%;
  --sidebar-foreground: 240 5.3% 26.1%;
  --sidebar-primary: 240 5.9% 10%;
  --sidebar-primary-foreground: 0 0% 98%;
  --sidebar-accent: 240 4.8% 95.9%;
  --sidebar-accent-foreground: 240 5.9% 10%;
  --sidebar-border: 220 13% 91%;
  --sidebar-ring: 217.2 91.2% 59.8%;
}
```

#### 4.2 Update Typography
- Use Shadcn's typography utilities
- Ensure consistent heading sizes
- Match font weights to design system

#### 4.3 Update Spacing
- Follow Shadcn's spacing scale
- Use gap-4, gap-6 for consistent spacing
- Ensure proper padding in containers

### Phase 5: Navigation and Routing

#### 5.1 Update Navigation Logic
**Changes needed:**
- Replace `tab` state with proper routing if desired
- OR keep tab state but sync with URL params
- Ensure breadcrumbs update based on active page
- Add navigation transitions (optional)

#### 5.2 Add Breadcrumb Logic
**Create breadcrumb configuration:**
```tsx
const breadcrumbMap = {
  'create': [{ label: 'Home', href: '/' }, { label: 'Create REIT' }],
  'browse': [{ label: 'Home', href: '/' }, { label: 'Browse REITs' }],
  'investments': [{ label: 'Home', href: '/' }, { label: 'Investments' }],
  'dividends': [{ label: 'Home', href: '/' }, { label: 'Issue Dividends' }]
}
```

### Phase 6: Mobile Responsiveness

#### 6.1 Sidebar Behavior
- Ensure sidebar collapses on mobile (<768px)
- Add hamburger menu button in header
- Implement sheet/drawer for mobile sidebar
- Test touch interactions

#### 6.2 Layout Adjustments
- Stack metric cards vertically on mobile
- Ensure tables scroll horizontally if needed
- Adjust chart heights for mobile viewports

### Phase 7: Accessibility

#### 7.1 Keyboard Navigation
- Ensure all sidebar items are keyboard accessible
- Add proper focus indicators
- Support escape key to close mobile sidebar

#### 7.2 Screen Reader Support
- Add proper ARIA labels to navigation items
- Ensure breadcrumbs are announced correctly
- Add skip-to-content link if needed

#### 7.3 Color Contrast
- Verify all text meets WCAG AA standards
- Check trend indicators have sufficient contrast
- Ensure active states are distinguishable

### Phase 8: Data Integration

#### 8.1 Metric Calculations
**Create data hooks for metrics:**

**File:** `src/features/canadianreitinvest/hooks/use-admin-metrics.ts`
```tsx
export function useAdminMetrics() {
  // Calculate:
  // - Total raised (excluding refunded)
  // - New investors count
  // - Active investments count
  // - Growth rate (period over period)
  
  return {
    totalRevenue,
    newInvestors,
    activeInvestments,
    growthRate,
    isLoading
  }
}
```

#### 8.2 Chart Data
**Create chart data hook:**

**File:** `src/features/canadianreitinvest/hooks/use-fundraising-chart-data.ts`
```tsx
export function useFundraisingChartData(period: '3months' | '30days' | '7days') {
  // Aggregate investment data by time period
  // Return data in format for recharts
  
  return {
    chartData: [{ date: 'Jun 23', visitors: 100 }, ...],
    isLoading
  }
}
```

## File Structure Summary

### New Files to Create
```
src/
├── components/
│   ├── app-sidebar.tsx              # Main sidebar component
│   ├── dashboard-layout.tsx         # Layout wrapper with sidebar
│   ├── metric-card.tsx              # KPI metric card component
│   └── chart-container.tsx          # Chart wrapper with tabs
│
├── features/canadianreitinvest/
│   ├── ui/
│   │   └── admin-dashboard-overview.tsx  # Admin home page
│   └── hooks/
│       ├── use-admin-metrics.ts     # Admin metrics data
│       └── use-fundraising-chart-data.ts  # Chart data
```

### Files to Modify
```
src/
├── features/canadianreitinvest/
│   ├── canadianreitinvest-feature.tsx              # Replace AdminTabs layout
│   └── ui/
│       ├── canadianreitinvest-ui-browse-reits.tsx  # Remove custom headers
│       ├── canadianreitinvest-ui-browse-investments.tsx
│       └── admin-dividend-page.tsx
│
├── features/investor/
│   └── investor-page.tsx                           # Replace layout
│
└── index.css                                       # Add sidebar CSS variables
```

## Testing Checklist

### Visual Testing
- [ ] Sidebar displays correctly on desktop
- [ ] Sidebar collapses properly on mobile
- [ ] Active navigation item is highlighted
- [ ] Breadcrumbs update when changing pages
- [ ] Metric cards display with correct formatting
- [ ] Trend indicators show correct colors
- [ ] Charts render without errors
- [ ] Charts are responsive
- [ ] Tables are properly styled
- [ ] Overall spacing matches design system

### Functional Testing
- [ ] Navigation between tabs works
- [ ] Sidebar state persists (if applicable)
- [ ] Mobile hamburger menu opens/closes
- [ ] Chart tabs switch correctly
- [ ] Metrics update when data changes
- [ ] All existing functionality still works

### Accessibility Testing
- [ ] Keyboard navigation works throughout
- [ ] Focus indicators are visible
- [ ] Screen reader announces navigation correctly
- [ ] Color contrast meets WCAG AA
- [ ] No accessibility warnings in browser console

### Performance Testing
- [ ] No layout shift on page load
- [ ] Charts render smoothly
- [ ] Navigation transitions are smooth
- [ ] No unnecessary re-renders

## Implementation Priority

### Must Have (P0)
1. Install Shadcn sidebar component
2. Create AppSidebar with navigation
3. Create DashboardLayout wrapper
4. Refactor AdminTabs to use new layout
5. Refactor InvestorPage to use new layout
6. Add breadcrumb navigation
7. Update page headers

### Should Have (P1)
8. Create MetricCard component
9. Create admin dashboard overview page
10. Implement metric calculations
11. Add ChartContainer component
12. Create fundraising chart
13. Mobile responsiveness

### Nice to Have (P2)
14. Chart data aggregation
15. Smooth transitions
16. Loading states for metrics
17. Empty states for charts
18. Advanced table features

## Dependencies to Install

```bash
# Core Shadcn components
npx shadcn@latest add sidebar
npx shadcn@latest add breadcrumb
npx shadcn@latest add chart
npx shadcn@latest add separator

# Additional dependencies (if not present)
npm install recharts@2.15.4
npm install lucide-react
npm install @radix-ui/react-slot
npm install @radix-ui/react-separator
npm install class-variance-authority
```

## Estimated Timeline

- **Phase 1-2:** 2-3 hours (Setup and core components)
- **Phase 3:** 3-4 hours (Page refactoring)
- **Phase 4:** 1-2 hours (Styling)
- **Phase 5-6:** 2-3 hours (Navigation and mobile)
- **Phase 7:** 1-2 hours (Accessibility)
- **Phase 8:** 2-3 hours (Data integration)

**Total: 11-17 hours**

## Success Criteria

1. ✅ Dashboard matches reference design aesthetically
2. ✅ All existing functionality preserved
3. ✅ Mobile responsive design works
4. ✅ Accessibility standards met
5. ✅ Performance is not degraded
6. ✅ Code is maintainable and follows Shadcn patterns
7. ✅ No console errors or warnings
8. ✅ Smooth transitions and interactions

## Notes

- Reference the `dashboard-01` block component from Shadcn for implementation patterns
- Keep existing business logic intact - this is primarily a UI refactoring
- Test thoroughly with real data before deployment
- Consider creating a Storybook for new components (optional)
- Document any deviations from Shadcn patterns with reasons

## Additional Resources

- Shadcn Sidebar Documentation: https://ui.shadcn.com/docs/components/sidebar
- Shadcn Chart Documentation: https://ui.shadcn.com/docs/components/chart
- Dashboard Block Example: `@shadcn/dashboard-01`
- Reference Image: `/Users/anthonytjuatja/Dev/hackathon/canadian-reit-invest/.github/spec/v1/tasks/ref_image.png`
