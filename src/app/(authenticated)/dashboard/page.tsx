import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return (
    <div>
      <Card className="p-6">
        <h1 className="text-2xl font-bold text-text-primary mb-4">
          Welcome, {session.user.name}!
        </h1>
        
        <div className="space-y-4">
          <Card variant="outlined" className="bg-primary-50 border-primary-200">
            <CardContent className="p-4">
              <p className="text-sm text-text-secondary">Role</p>
              <div className="mt-1">
                <Badge variant="default" size="md">
                  {session.user.role}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card variant="outlined" className="bg-success-50 border-success-200">
            <CardContent className="p-4">
              <p className="text-sm text-text-secondary">Email</p>
              <p className="text-lg font-semibold text-text-primary">{session.user.email}</p>
            </CardContent>
          </Card>

          {session.user.locationId && (
            <Card variant="outlined" className="bg-secondary-50 border-secondary-200">
              <CardContent className="p-4">
                <p className="text-sm text-text-secondary">Location ID</p>
                <p className="text-lg font-semibold text-text-primary">{session.user.locationId}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/sessions"
              className="block"
            >
              <Card className="hover:border-primary-500 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-text-primary">Sessions</h3>
                  <p className="text-sm text-text-secondary mt-1">View and manage sessions</p>
                </CardContent>
              </Card>
            </a>
            
            <a
              href="/clients"
              className="block"
            >
              <Card className="hover:border-primary-500 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-text-primary">Clients</h3>
                  <p className="text-sm text-text-secondary mt-1">Manage client information</p>
                </CardContent>
              </Card>
            </a>
            
            <a
              href="/users"
              className="block"
            >
              <Card className="hover:border-primary-500 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-text-primary">Users</h3>
                  <p className="text-sm text-text-secondary mt-1">Manage system users</p>
                </CardContent>
              </Card>
            </a>
          </div>
        </div>
      </Card>
    </div>
  )
}