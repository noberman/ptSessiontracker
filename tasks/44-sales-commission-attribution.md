# Task 44: Sales Commission Attribution & Enhancement System

## Overview
Enhance the commission v2 system (Task 43) with sophisticated sales commission handling, including package-level configuration, sales attribution splits, and support for front desk collaboration scenarios.

**Prerequisites**: Task 43 must be completed and deployed  
**Estimated Duration**: 1 week  
**Risk Level**: Medium (affects commission calculations)  
**Business Value**: Critical for accurate sales commission tracking and team collaboration

## Business Requirements

### Core Problems to Solve
1. **Sales Splits**: Front desk and trainers often collaborate on sales and need to split commission
2. **Package-Specific Rates**: Different package types should have different commission rates
3. **Attribution Tracking**: Need to know who actually made the sale vs who delivers the service
4. **Historical Accuracy**: Commission rates and attributions must be immutable once set

### Key Scenarios
- **Solo Trainer Sale**: Trainer sells package to their own client (100% commission)
- **Front Desk Assist**: Front desk helps close sale with trainer (50/50 split typical)
- **Manager Override**: Manager sells package but assigns commission to trainer(s)
- **Team Sale**: Multiple people involved in closing a large package deal

## Technical Design

### Phase 1: Database Schema Enhancement

#### Step 1.1: Enhance PackageType Model
```prisma
model PackageType {
  id                        String   @id @default(cuid())
  organizationId            String
  name                      String
  defaultSessions           Int?
  defaultPrice              Float?
  isActive                  Boolean  @default(true)
  sortOrder                 Int      @default(0)
  
  // NEW: Sales commission configuration
  salesCommissionType       CommissionType  @default(PERCENTAGE)  // PERCENTAGE, FLAT_FEE, NONE
  salesCommissionRate       Float?          // Percentage (0-100) or flat amount
  isCommissionable          Boolean         @default(true)
  minimumPriceForCommission Float?          // Only pay commission above this price
  commissionNotes           String?         // Instructions for sales team
  
  // Relations
  organization              Organization @relation(fields: [organizationId], references: [id])
  packages                  Package[]
  
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt
  
  @@unique([organizationId, name])
  @@index([organizationId])
  @@map("package_types")
}

enum CommissionType {
  PERCENTAGE
  FLAT_FEE
  NONE
}
```

#### Step 1.2: Create Sales Attribution Model
```prisma
model PackageSalesAttribution {
  id                String   @id @default(cuid())
  packageId         String
  userId            String
  splitPercentage   Float    // 0-100 (their share of the commission)
  role              String?  // TRAINER, FRONT_DESK, MANAGER, etc.
  
  // Snapshot data at time of sale (immutable)
  commissionRate    Float?   // The rate that was applicable at sale time
  commissionType    CommissionType?
  calculatedAmount  Float?   // Actual commission amount for this person
  
  // Relations
  package           Package  @relation(fields: [packageId], references: [id], onDelete: Cascade)
  user              User     @relation(fields: [userId], references: [id])
  
  createdAt         DateTime @default(now())
  
  @@unique([packageId, userId])
  @@index([userId])
  @@index([packageId])
  @@map("package_sales_attributions")
}
```

#### Step 1.3: Update Package Model
```prisma
model Package {
  // ... existing fields ...
  
  // NEW: Sales commission fields
  soldByUserId              String?   // Primary seller (for quick reference)
  soldBy                    User?     @relation("PackagesSold", fields: [soldByUserId], references: [id])
  salesCommissionRate       Float?    // Actual rate used (snapshot from PackageType)
  salesCommissionType       CommissionType?  // Type used at sale time
  totalCommissionAmount     Float?    // Total commission for this package
  
  // Relations
  salesAttributions         PackageSalesAttribution[]
  
  @@index([soldByUserId])
}
```

#### Step 1.4: Update User Model Relations
```prisma
model User {
  // ... existing fields ...
  
  // NEW: Sales relations
  packagesSold              Package[] @relation("PackagesSold")
  salesAttributions         PackageSalesAttribution[]
}
```

### Phase 2: Migration Strategy

#### Step 2.1: Create Migration for New Fields
```sql
-- Add commission fields to package_types
ALTER TABLE package_types 
ADD COLUMN sales_commission_type VARCHAR(20) DEFAULT 'PERCENTAGE',
ADD COLUMN sales_commission_rate DECIMAL(10,2),
ADD COLUMN is_commissionable BOOLEAN DEFAULT true,
ADD COLUMN minimum_price_for_commission DECIMAL(10,2),
ADD COLUMN commission_notes TEXT;

-- Create sales attribution table
CREATE TABLE package_sales_attributions (
  id VARCHAR(30) PRIMARY KEY,
  package_id VARCHAR(30) NOT NULL,
  user_id VARCHAR(30) NOT NULL,
  split_percentage DECIMAL(5,2) NOT NULL,
  role VARCHAR(50),
  commission_rate DECIMAL(10,2),
  commission_type VARCHAR(20),
  calculated_amount DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_package_user UNIQUE(package_id, user_id),
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Add fields to packages
ALTER TABLE packages
ADD COLUMN sold_by_user_id VARCHAR(30),
ADD COLUMN sales_commission_rate DECIMAL(10,2),
ADD COLUMN sales_commission_type VARCHAR(20),
ADD COLUMN total_commission_amount DECIMAL(10,2),
ADD FOREIGN KEY (sold_by_user_id) REFERENCES users(id);

-- Create indexes
CREATE INDEX idx_package_sales_user ON package_sales_attributions(user_id);
CREATE INDEX idx_package_sales_package ON package_sales_attributions(package_id);
CREATE INDEX idx_packages_sold_by ON packages(sold_by_user_id);
```

#### Step 2.2: Data Migration Script
```typescript
// scripts/migrate-sales-commission.ts
async function migrateSalesCommission() {
  // 1. Set default commission rates for existing package types
  const packageTypes = await prisma.packageType.findMany()
  
  for (const type of packageTypes) {
    await prisma.packageType.update({
      where: { id: type.id },
      data: {
        salesCommissionType: 'PERCENTAGE',
        salesCommissionRate: 8, // Default 8% - adjust as needed
        isCommissionable: true
      }
    })
  }
  
  // 2. Create attributions for existing packages
  const packages = await prisma.package.findMany({
    include: {
      client: {
        include: {
          primaryTrainer: true
        }
      }
    }
  })
  
  for (const pkg of packages) {
    if (pkg.client.primaryTrainerId) {
      // Assume primary trainer sold it (100% attribution)
      await prisma.packageSalesAttribution.create({
        data: {
          packageId: pkg.id,
          userId: pkg.client.primaryTrainerId,
          splitPercentage: 100,
          role: 'TRAINER',
          commissionRate: 8, // Default assumption
          commissionType: 'PERCENTAGE'
        }
      })
      
      // Update package with snapshot data
      await prisma.package.update({
        where: { id: pkg.id },
        data: {
          soldByUserId: pkg.client.primaryTrainerId,
          salesCommissionRate: 8,
          salesCommissionType: 'PERCENTAGE',
          totalCommissionAmount: pkg.totalValue * 0.08
        }
      })
    }
  }
  
  console.log('✅ Sales commission migration complete')
}
```

### Phase 3: Backend Services

#### Step 3.1: Sales Attribution Service
```typescript
// src/lib/commission/sales/SalesAttributionService.ts
export class SalesAttributionService {
  /**
   * Create sales attribution for a package
   */
  async createAttribution(
    packageId: string,
    attributions: Array<{
      userId: string
      splitPercentage: number
      role?: string
    }>
  ) {
    // Validate splits total 100%
    const total = attributions.reduce((sum, a) => sum + a.splitPercentage, 0)
    if (Math.abs(total - 100) > 0.01) {
      throw new Error(`Splits must total 100%, got ${total}%`)
    }
    
    // Get package and type for commission info
    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
      include: { packageTypeModel: true }
    })
    
    if (!pkg) throw new Error('Package not found')
    
    const commissionRate = pkg.packageTypeModel?.salesCommissionRate || 0
    const commissionType = pkg.packageTypeModel?.salesCommissionType || 'NONE'
    
    // Create attributions
    const createdAttributions = []
    for (const attr of attributions) {
      // Calculate this person's commission amount
      let calculatedAmount = 0
      if (commissionType === 'PERCENTAGE') {
        calculatedAmount = pkg.totalValue * (commissionRate / 100) * (attr.splitPercentage / 100)
      } else if (commissionType === 'FLAT_FEE') {
        calculatedAmount = commissionRate * (attr.splitPercentage / 100)
      }
      
      const created = await prisma.packageSalesAttribution.create({
        data: {
          packageId,
          userId: attr.userId,
          splitPercentage: attr.splitPercentage,
          role: attr.role,
          commissionRate,
          commissionType,
          calculatedAmount
        }
      })
      createdAttributions.push(created)
    }
    
    // Update package with total commission
    const totalCommission = createdAttributions.reduce((sum, a) => sum + (a.calculatedAmount || 0), 0)
    await prisma.package.update({
      where: { id: packageId },
      data: {
        soldByUserId: attributions[0]?.userId, // Primary seller
        salesCommissionRate: commissionRate,
        salesCommissionType: commissionType,
        totalCommissionAmount: totalCommission
      }
    })
    
    return createdAttributions
  }
  
  /**
   * Get sales commission for a user in a period
   */
  async getUserSalesCommission(userId: string, startDate: Date, endDate: Date) {
    const attributions = await prisma.packageSalesAttribution.findMany({
      where: {
        userId,
        package: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      },
      include: {
        package: {
          include: {
            client: true,
            packageTypeModel: true
          }
        }
      }
    })
    
    const totalCommission = attributions.reduce((sum, attr) => {
      return sum + (attr.calculatedAmount || 0)
    }, 0)
    
    return {
      totalCommission,
      packageCount: attributions.length,
      attributions
    }
  }
}
```

#### Step 3.2: Update Commission Calculator
```typescript
// src/lib/commission/v2/CommissionCalculatorV2.ts (UPDATE)
export class CommissionCalculatorV2 {
  // ... existing code ...
  
  /**
   * Calculate sales commission using new attribution system
   */
  async calculateSalesCommission(
    userId: string,
    period: { start: Date; end: Date }
  ): Promise<{
    total: number
    details: Array<{
      packageId: string
      packageName: string
      clientName: string
      saleValue: number
      splitPercentage: number
      commission: number
    }>
  }> {
    const attributions = await prisma.packageSalesAttribution.findMany({
      where: {
        userId,
        package: {
          createdAt: {
            gte: period.start,
            lte: period.end
          },
          active: true
        }
      },
      include: {
        package: {
          include: {
            client: true
          }
        }
      }
    })
    
    const details = attributions.map(attr => ({
      packageId: attr.packageId,
      packageName: attr.package.name,
      clientName: attr.package.client.name,
      saleValue: attr.package.totalValue,
      splitPercentage: attr.splitPercentage,
      commission: attr.calculatedAmount || 0
    }))
    
    const total = details.reduce((sum, d) => sum + d.commission, 0)
    
    return { total, details }
  }
}
```

### Phase 4: API Endpoints

#### Step 4.1: Package Type Management
```typescript
// src/app/api/package-types/[id]/commission/route.ts
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'PT_MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const body = await req.json()
  const { commissionType, commissionRate, isCommissionable, minimumPrice, notes } = body
  
  const updated = await prisma.packageType.update({
    where: { id: params.id },
    data: {
      salesCommissionType: commissionType,
      salesCommissionRate: commissionRate,
      isCommissionable,
      minimumPriceForCommission: minimumPrice,
      commissionNotes: notes
    }
  })
  
  return NextResponse.json(updated)
}
```

#### Step 4.2: Sales Attribution API
```typescript
// src/app/api/packages/[id]/attribution/route.ts
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const body = await req.json()
  const { attributions } = body // Array of { userId, splitPercentage, role }
  
  const service = new SalesAttributionService()
  const created = await service.createAttribution(params.id, attributions)
  
  return NextResponse.json(created)
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const attributions = await prisma.packageSalesAttribution.findMany({
    where: { packageId: params.id },
    include: { user: true }
  })
  
  return NextResponse.json(attributions)
}
```

### Phase 5: Frontend UI Components

#### Step 5.1: Package Type Commission Settings
```typescript
// src/components/package-types/PackageTypeCommissionForm.tsx
export function PackageTypeCommissionForm({ packageType, onSave }) {
  const [formData, setFormData] = useState({
    salesCommissionType: packageType?.salesCommissionType || 'PERCENTAGE',
    salesCommissionRate: packageType?.salesCommissionRate || 8,
    isCommissionable: packageType?.isCommissionable ?? true,
    minimumPriceForCommission: packageType?.minimumPriceForCommission || null,
    commissionNotes: packageType?.commissionNotes || ''
  })
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Commission Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            checked={formData.isCommissionable}
            onCheckedChange={(checked) => 
              setFormData({ ...formData, isCommissionable: checked })
            }
          />
          <Label>Enable sales commission for this package type</Label>
        </div>
        
        {formData.isCommissionable && (
          <>
            <div>
              <Label>Commission Type</Label>
              <RadioGroup
                value={formData.salesCommissionType}
                onValueChange={(value) => 
                  setFormData({ ...formData, salesCommissionType: value })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PERCENTAGE" />
                  <Label>Percentage of sale value</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="FLAT_FEE" />
                  <Label>Flat fee per package</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div>
              <Label>
                Commission Rate
                {formData.salesCommissionType === 'PERCENTAGE' ? ' (%)' : ' ($)'}
              </Label>
              <Input
                type="number"
                value={formData.salesCommissionRate}
                onChange={(e) => 
                  setFormData({ ...formData, salesCommissionRate: parseFloat(e.target.value) })
                }
                min="0"
                max={formData.salesCommissionType === 'PERCENTAGE' ? "100" : undefined}
                step={formData.salesCommissionType === 'PERCENTAGE' ? "0.1" : "1"}
              />
            </div>
            
            <div>
              <Label>Minimum Price for Commission (Optional)</Label>
              <Input
                type="number"
                value={formData.minimumPriceForCommission || ''}
                onChange={(e) => 
                  setFormData({ 
                    ...formData, 
                    minimumPriceForCommission: e.target.value ? parseFloat(e.target.value) : null 
                  })
                }
                placeholder="No minimum"
              />
              <p className="text-sm text-gray-500 mt-1">
                Commission only applies if package is sold above this price
              </p>
            </div>
            
            <div>
              <Label>Commission Notes (Optional)</Label>
              <Textarea
                value={formData.commissionNotes}
                onChange={(e) => 
                  setFormData({ ...formData, commissionNotes: e.target.value })
                }
                placeholder="Instructions for sales team..."
                rows={3}
              />
            </div>
            
            {/* Preview */}
            <Alert>
              <AlertTitle>Commission Preview</AlertTitle>
              <AlertDescription>
                {formData.salesCommissionType === 'PERCENTAGE' ? (
                  <span>
                    On a $500 package: ${(500 * formData.salesCommissionRate / 100).toFixed(2)} commission
                  </span>
                ) : (
                  <span>
                    Fixed ${formData.salesCommissionRate} per package sold
                  </span>
                )}
              </AlertDescription>
            </Alert>
          </>
        )}
        
        <Button onClick={() => onSave(formData)}>
          Save Commission Settings
        </Button>
      </CardContent>
    </Card>
  )
}
```

#### Step 5.2: Sales Attribution Component
```typescript
// src/components/packages/SalesAttributionForm.tsx
export function SalesAttributionForm({ 
  packageId, 
  packageValue,
  packageType,
  onSave 
}) {
  const [attributionMode, setAttributionMode] = useState<'single' | 'split'>('single')
  const [attributions, setAttributions] = useState([
    { userId: '', splitPercentage: 100, role: 'TRAINER' }
  ])
  
  const { data: eligibleUsers } = useSWR('/api/users/sales-eligible')
  const totalPercentage = attributions.reduce((sum, a) => sum + a.splitPercentage, 0)
  
  const addAttribution = () => {
    setAttributions([
      ...attributions,
      { userId: '', splitPercentage: 0, role: 'TRAINER' }
    ])
  }
  
  const removeAttribution = (index: number) => {
    setAttributions(attributions.filter((_, i) => i !== index))
  }
  
  const updateAttribution = (index: number, field: string, value: any) => {
    const updated = [...attributions]
    updated[index] = { ...updated[index], [field]: value }
    setAttributions(updated)
  }
  
  const calculateCommission = (splitPercentage: number) => {
    if (!packageType?.isCommissionable) return 0
    
    const rate = packageType.salesCommissionRate || 0
    const type = packageType.salesCommissionType
    
    if (type === 'PERCENTAGE') {
      return packageValue * (rate / 100) * (splitPercentage / 100)
    } else if (type === 'FLAT_FEE') {
      return rate * (splitPercentage / 100)
    }
    return 0
  }
  
  if (!packageType?.isCommissionable) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Commission</AlertTitle>
        <AlertDescription>
          This package type does not have sales commission enabled.
        </AlertDescription>
      </Alert>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Commission Attribution</CardTitle>
        <p className="text-sm text-gray-500">
          Who should receive commission for this sale?
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Attribution Mode */}
        <RadioGroup value={attributionMode} onValueChange={setAttributionMode}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="single" />
            <Label>Single person (100% commission)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="split" />
            <Label>Split between multiple people</Label>
          </div>
        </RadioGroup>
        
        {/* Attribution List */}
        <div className="space-y-3">
          {attributions.map((attr, index) => (
            <div key={index} className="flex items-center gap-3">
              <Select
                value={attr.userId}
                onValueChange={(value) => updateAttribution(index, 'userId', value)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Trainers</SelectLabel>
                    {eligibleUsers?.trainers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Front Desk</SelectLabel>
                    {eligibleUsers?.frontDesk.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Managers</SelectLabel>
                    {eligibleUsers?.managers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              
              {attributionMode === 'split' && (
                <>
                  <Input
                    type="number"
                    value={attr.splitPercentage}
                    onChange={(e) => updateAttribution(index, 'splitPercentage', parseFloat(e.target.value))}
                    className="w-20"
                    min="0"
                    max="100"
                  />
                  <span className="text-sm">%</span>
                  
                  {attributions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttribution(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
              
              {/* Commission Preview */}
              <span className="text-sm text-gray-500 min-w-[100px] text-right">
                ${calculateCommission(attr.splitPercentage).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        
        {/* Add Person Button */}
        {attributionMode === 'split' && attributions.length < 5 && (
          <Button
            variant="outline"
            size="sm"
            onClick={addAttribution}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Person
          </Button>
        )}
        
        {/* Total Validation */}
        {attributionMode === 'split' && (
          <Alert variant={totalPercentage === 100 ? 'default' : 'destructive'}>
            <AlertDescription>
              Total: {totalPercentage}% 
              {totalPercentage !== 100 && ' (must equal 100%)'}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Commission Summary */}
        <div className="border-t pt-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Package Value:</span>
              <span>${packageValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Commission Rate:</span>
              <span>
                {packageType.salesCommissionType === 'PERCENTAGE' 
                  ? `${packageType.salesCommissionRate}%`
                  : `$${packageType.salesCommissionRate} flat`
                }
              </span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Total Commission:</span>
              <span>
                ${attributions.reduce((sum, a) => sum + calculateCommission(a.splitPercentage), 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        
        <Button 
          onClick={() => onSave(attributions)}
          disabled={totalPercentage !== 100}
          className="w-full"
        >
          Save Attribution
        </Button>
      </CardContent>
    </Card>
  )
}
```

#### Step 5.3: Package Creation Flow Update
```typescript
// src/components/packages/CreatePackageForm.tsx (UPDATE)
export function CreatePackageForm() {
  const [step, setStep] = useState(1) // 1: Package details, 2: Attribution
  const [packageData, setPackageData] = useState({})
  const [createdPackageId, setCreatedPackageId] = useState(null)
  
  const handlePackageCreate = async (data) => {
    const response = await fetch('/api/packages', {
      method: 'POST',
      body: JSON.stringify(data)
    })
    const package = await response.json()
    setCreatedPackageId(package.id)
    setPackageData(package)
    setStep(2) // Move to attribution step
  }
  
  const handleAttributionSave = async (attributions) => {
    await fetch(`/api/packages/${createdPackageId}/attribution`, {
      method: 'POST',
      body: JSON.stringify({ attributions })
    })
    // Complete the flow
    router.push('/packages')
  }
  
  return (
    <div>
      {step === 1 && (
        <PackageDetailsForm onSubmit={handlePackageCreate} />
      )}
      
      {step === 2 && createdPackageId && (
        <SalesAttributionForm
          packageId={createdPackageId}
          packageValue={packageData.totalValue}
          packageType={packageData.packageTypeModel}
          onSave={handleAttributionSave}
        />
      )}
    </div>
  )
}
```

### Phase 6: Reporting & Analytics

#### Step 6.1: Sales Commission Report
```typescript
// src/components/reports/SalesCommissionReport.tsx
export function SalesCommissionReport({ startDate, endDate }) {
  const { data: report } = useSWR(
    `/api/reports/sales-commission?start=${startDate}&end=${endDate}`
  )
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Sales Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${report?.totalCommission.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Packages Sold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report?.packageCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Avg Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(report?.totalCommission / report?.packageCount || 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Split Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report?.splitSalesCount}</div>
            <p className="text-xs text-gray-500">Involving multiple people</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Commission Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Seller(s)</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report?.details.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatDate(row.createdAt)}</TableCell>
                  <TableCell>{row.packageName}</TableCell>
                  <TableCell>{row.clientName}</TableCell>
                  <TableCell>
                    {row.attributions.map(a => (
                      <div key={a.userId} className="text-sm">
                        {a.userName} ({a.splitPercentage}%)
                      </div>
                    ))}
                  </TableCell>
                  <TableCell>${row.packageValue.toFixed(2)}</TableCell>
                  <TableCell>
                    {row.attributions.map(a => (
                      <div key={a.userId} className="text-sm">
                        ${a.calculatedAmount.toFixed(2)}
                      </div>
                    ))}
                  </TableCell>
                  <TableCell>
                    <Badge variant="success">Calculated</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

### Phase 7: Testing Plan

#### Test Scenarios
1. **Single Seller (100%)**
   - Create package with trainer as sole seller
   - Verify commission calculated correctly
   - Verify appears in trainer's commission report

2. **50/50 Split (Trainer + Front Desk)**
   - Create package with 50/50 split
   - Verify both people receive correct amounts
   - Test with percentage and flat fee commissions

3. **Manager Override**
   - Manager creates package, assigns 100% to trainer
   - Verify manager gets no commission
   - Verify trainer gets full commission

4. **Complex Split (3+ people)**
   - Create package with 40/30/30 split
   - Verify all calculations correct
   - Verify total equals expected commission

5. **Non-Commissionable Package**
   - Create package type with commission disabled
   - Verify no attribution UI shown
   - Verify no commission calculated

6. **Minimum Price Threshold**
   - Set minimum price for commission
   - Sell below threshold - verify no commission
   - Sell above threshold - verify commission applies

### Phase 8: Migration & Deployment

#### Step 8.1: Deployment Checklist
- [ ] Run migration script on staging
- [ ] Test all scenarios on staging
- [ ] Create backup of production database
- [ ] Deploy schema changes to production
- [ ] Run data migration script
- [ ] Verify existing packages have attributions
- [ ] Test new package creation flow
- [ ] Verify commission calculations
- [ ] Monitor for 24 hours

#### Step 8.2: Rollback Plan
```sql
-- If needed, rollback changes
ALTER TABLE package_types 
DROP COLUMN sales_commission_type,
DROP COLUMN sales_commission_rate,
DROP COLUMN is_commissionable,
DROP COLUMN minimum_price_for_commission,
DROP COLUMN commission_notes;

DROP TABLE package_sales_attributions;

ALTER TABLE packages
DROP COLUMN sold_by_user_id,
DROP COLUMN sales_commission_rate,
DROP COLUMN sales_commission_type,
DROP COLUMN total_commission_amount;
```

### Phase 9: Documentation & Training

#### User Documentation
1. **For Managers**: How to set package commission rates
2. **For Sales Team**: How to split commissions
3. **For Trainers**: Understanding sales vs execution commission
4. **For Finance**: Running commission reports

#### Technical Documentation
1. Database schema changes
2. API endpoint documentation
3. Commission calculation logic
4. Attribution rules and constraints

## Success Criteria
- [ ] Package types have configurable commission rates
- [ ] Sales can be attributed to multiple people with splits
- [ ] Commission calculations include proper attribution
- [ ] Historical data properly migrated
- [ ] Reports show sales vs execution commission separately
- [ ] Front desk staff can receive commission splits
- [ ] No disruption to existing commission calculations

## Timeline
- Day 1-2: Database schema and migration
- Day 3: Backend services and APIs
- Day 4-5: Frontend UI components
- Day 6: Testing and bug fixes
- Day 7: Documentation and deployment

## Dependencies
- Task 43 must be completed and stable
- Need decision on default commission rates for package types
- Need list of users who can receive sales commission

## Notes
- Consider future enhancement: Commission campaigns (temporary rate boosts)
- Consider future enhancement: Commission tiers based on sales volume
- Consider future enhancement: Automated split rules (e.g., front desk always gets 10%)