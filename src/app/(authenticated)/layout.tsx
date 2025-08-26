import { NavigationLayout } from '@/components/navigation/NavigationLayout'

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <NavigationLayout>{children}</NavigationLayout>
}